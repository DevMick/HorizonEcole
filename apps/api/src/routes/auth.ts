import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { UserRole } from '@school/types';

import config from '@school/config';
import { prisma, runWithEstablishment, unscopedPrisma } from '@school/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { TokenService } from '../services/token.service';
import { AuditService } from '../services/audit.service';

const router = Router();

// Enable cookie parser for this router
router.use(cookieParser());

// ============================================================================
// Validation Schemas (Zod)
// ============================================================================

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    role: z.enum(['ADMIN', 'TEACHER', 'ACCOUNTANT', 'STUDENT', 'PARENT', 'OWNER']),
    phone: z.string().optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});

// ============================================================================
// Helper Functions
// ============================================================================

function getClientIp(req: AuthRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress;
}

function getUserAgent(req: AuthRequest): string | undefined {
  return req.headers['user-agent'];
}

const customRoleSelect = {
  select: { id: true, name: true, isProtected: true, menus: { select: { menuKey: true } } },
} as const;

/**
 * Relit les menus du rôle personnalisé au moment de répondre.
 *
 * Il n'y a plus de resynchronisation : les menus de tous les rôles, protégés
 * compris, sont choisis par l'administrateur. Les remettre d'office à leur
 * valeur par défaut annulerait ses modifications à la première reconnexion de
 * l'utilisateur concerné — sans que rien ne le signale.
 *
 * La relecture, elle, reste utile : elle garantit que le jeton et le menu
 * reflètent l'état courant du rôle, et non celui d'une session ouverte avant la
 * modification.
 */
async function withFreshCustomRole<T extends { customRole: { id: string; isProtected: boolean; menus: { menuKey: string }[] } | null }>(
  user: T,
): Promise<T> {
  if (!user.customRole) return user;
  const menus = await prisma.roleMenu.findMany({ where: { roleId: user.customRole.id }, select: { menuKey: true } });
  return { ...user, customRole: { ...user.customRole, menus } };
}

function toAuthUserDto(user: any) {
  const { customRole, ...rest } = user;
  return {
    ...rest,
    customRole: customRole
      ? { id: customRole.id, name: customRole.name, isProtected: customRole.isProtected, menuKeys: customRole.menus.map((m: any) => m.menuKey) }
      : null,
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/auth/login
 * Login with email and password
 * Returns access token + httpOnly refresh token cookie
 */
router.post('/login', validate(loginSchema), async (req: AuthRequest, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    // Client non cloisonne : a cet instant on ignore encore l'etablissement du
    // compte — c'est precisement ce que la connexion etablit. L'email reste
    // unique sur toute la plateforme, l'identification est donc sans ambiguite.
    const user = await unscopedPrisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        establishment_id: true,
        establishment: { select: { id: true, name: true, code: true, schoolType: true, isActive: true } },
        firstName: true,
        lastName: true,
        role: true,
        roleId: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        customRole: customRoleSelect,
      },
    });

    // Check if user exists
    if (!user) {
      await AuditService.logFailedLogin(
        email,
        'User not found',
        getClientIp(req),
        getUserAgent(req)
      );
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      await AuditService.logFailedLogin(
        email,
        'User account is inactive',
        getClientIp(req),
        getUserAgent(req)
      );
      return res.status(401).json({
        success: false,
        error: 'Account is inactive',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await AuditService.logFailedLogin(
        email,
        'Invalid password',
        getClientIp(req),
        getUserAgent(req)
      );
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // L'établissement doit exister et être actif : sans lui, aucune donnée ne
    // serait lisible, et le compte n'aurait pas de périmètre.
    if (!user.establishment_id || !user.establishment || !user.establishment.isActive) {
      await AuditService.logFailedLogin(
        email,
        'Establishment inactive or missing',
        getClientIp(req),
        getUserAgent(req)
      );
      return res.status(403).json({
        success: false,
        error: "Votre établissement n'est pas actif. Contactez l'administration.",
      });
    }

    const establishmentId = user.establishment_id;

    // Tout ce qui suit écrit ou lit des données de l'école (journal d'audit,
    // rôle personnalisé) : le contexte d'établissement doit donc être ouvert,
    // exactement comme le fera le middleware d'authentification par la suite.
    await runWithEstablishment(establishmentId, async () => {
      // Generate tokens
      let accessToken: string;
      let refreshToken: { token: string; id: string };

      try {
        accessToken = TokenService.generateAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
          establishmentId,
        });

        refreshToken = await TokenService.generateRefreshToken(user.id);
      } catch (tokenError: any) {
        console.error('Token generation error:', tokenError);
        throw new Error(`Token generation failed: ${tokenError?.message || 'Unknown error'}`);
      }

      // Log successful login (non-blocking - don't fail login if audit fails)
      try {
        await AuditService.logLogin(user.id, getClientIp(req), getUserAgent(req));
      } catch (auditError: any) {
        console.error('Audit logging error (non-critical):', auditError);
        // Continue with login even if audit logging fails
      }

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken.token, {
        httpOnly: true,
        secure: config.server.nodeEnv === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return access token and user data
      const freshUser = await withFreshCustomRole({ customRole: user.customRole });

      res.json({
        success: true,
        data: {
          user: toAuthUserDto({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role as UserRole,
            roleId: user.roleId,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            customRole: freshUser.customRole,
          }),
          establishment: {
            id: user.establishment.id,
            name: user.establishment.name,
            code: user.establishment.code,
            schoolType: user.establishment.schoolType,
          },
          accessToken,
        },
        message: 'Login successful',
      });
    });
  } catch (error: any) {
    // Enhanced error logging for debugging
    console.error('Login error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
    });
    
    // Determine error type and provide appropriate response
    let errorMessage = 'Login failed';
    let statusCode = 500;
    
    // Handle Prisma errors
    if (error?.code === 'P2002') {
      errorMessage = 'Database constraint violation';
      statusCode = 409;
    } else if (error?.code === 'P2025') {
      errorMessage = 'Record not found';
      statusCode = 404;
    } else if (error?.message) {
      // Include error message in development for debugging
      if (config.server.nodeEnv === 'development') {
        errorMessage = `Login failed: ${error.message}`;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      ...(config.server.nodeEnv === 'development' && {
        details: error?.message,
        stack: error?.stack,
      }),
    });
  }
});

/**
 * POST /api/auth/register
 * Register a new user (ADMIN only)
 */
router.post(
  '/register',
  authenticate,
  requireRole('ADMIN'),
  validate(registerSchema),
  async (req: AuthRequest, res) => {
    try {
      const { email, password, firstName, lastName, role, phone } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          passwordHash,
          firstName,
          lastName,
          role,
          phone,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Log user creation
      await AuditService.logUserCreation(
        req.user!.id,
        newUser.id,
        { email, firstName, lastName, role },
        getClientIp(req),
        getUserAgent(req)
      );

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'User created successfully',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using httpOnly refresh token cookie
 */
router.post('/refresh', async (req: AuthRequest, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not found',
      });
    }

    // Verify refresh token
    const userId = await TokenService.verifyRefreshToken(refreshToken);

    if (!userId) {
      // Clear invalid cookie
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    // Get user data — non cloisonne : le contexte n'est pas encore ouvert.
    const user = await unscopedPrisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        establishment_id: true,
        firstName: true,
        lastName: true,
        role: true,
        roleId: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        customRole: customRoleSelect,
      },
    });

    if (!user || !user.isActive) {
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    // Generate new access token
    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      establishmentId: user.establishment_id ?? undefined,
    });

    // Optionally rotate refresh token (more secure)
    // For now, we keep the same refresh token

    // La relecture du rôle personnalisé touche des données de l'école : elle
    // doit se faire dans le contexte de l'établissement du compte.
    const freshUser = user.establishment_id
      ? await runWithEstablishment(user.establishment_id, () => withFreshCustomRole(user))
      : await withFreshCustomRole(user);

    res.json({
      success: true,
      data: {
        user: toAuthUserDto(freshUser),
        accessToken,
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and revoke refresh token
 */
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // Revoke refresh token if present
    if (refreshToken) {
      try {
        const decoded = TokenService.verifyAccessToken(refreshToken);
        if (decoded) {
          // This won't work directly as verifyAccessToken expects access token format
          // We need to decode the refresh token differently
          // For simplicity, we'll revoke all user tokens
          await TokenService.revokeAllUserTokens(req.user!.id);
        }
      } catch (error) {
        // Token already invalid, just clear cookie
      }
    }

    // Log logout
    await AuditService.logLogout(req.user!.id, getClientIp(req), getUserAgent(req));

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        roleId: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        customRole: customRoleSelect,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const freshUser = await withFreshCustomRole(user);

    res.json({
      success: true,
      data: toAuthUserDto(freshUser),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change current user's password
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Log password change
      await AuditService.logPasswordChange(user.id, getClientIp(req), getUserAgent(req));

      // Revoke all refresh tokens for security
      await TokenService.revokeAllUserTokens(user.id);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
      });
    }
  }
);

export default router;
