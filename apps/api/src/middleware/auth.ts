import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@school/types';
import { runWithEstablishment, unscopedPrisma } from '@school/database';
import { TokenService } from '../services/token.service';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    /** Établissement du compte — cloisonne tout ce que la requête pourra lire. */
    establishmentId: string;
  };
}

/**
 * Middleware to authenticate requests using JWT access token
 *
 * En plus de valider le jeton, il **ouvre le contexte d'établissement** dans
 * lequel s'exécutera toute la suite de la requête. C'est ce contexte que lit le
 * client Prisma pour restreindre chaque requête à l'école du compte connecté
 * (cf. packages/database/src/tenant.ts) : aucun service n'a donc à s'en
 * préoccuper, et aucun ne peut l'oublier.
 *
 * La lecture du compte se fait volontairement sur le client **non cloisonné** :
 * à cet instant on ne connaît pas encore l'établissement — c'est précisément ce
 * qu'on cherche à établir.
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid access token in the Authorization header',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token using TokenService
    const decoded = TokenService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: 'Please login again to get a new access token',
      });
    }

    // Verify user still exists and is active
    const user = await unscopedPrisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        establishment_id: true,
        establishment: { select: { isActive: true } },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive user',
        message: 'User account is not active',
      });
    }

    if (!user.establishment_id || user.establishment?.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Établissement inactif',
        message: "Le compte n'est rattaché à aucun établissement actif",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      establishmentId: user.establishment_id,
    };

    // Tout ce qui suit — routeurs, services, requêtes Prisma — s'exécute dans le
    // contexte de cet établissement.
    runWithEstablishment(user.establishment_id, () => next());
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
    });
  }
};

/**
 * Optional authentication - does not fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = TokenService.verifyAccessToken(token);

    if (decoded) {
      const user = await unscopedPrisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          establishment_id: true,
        },
      });

      if (user && user.isActive && user.establishment_id) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          establishmentId: user.establishment_id,
        };
        // Même règle que pour `authenticate` : dès qu'un compte est reconnu, la
        // suite de la requête est cloisonnée sur son établissement.
        return runWithEstablishment(user.establishment_id, () => next());
      }
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

/**
 * Legacy authorize middleware (deprecated - use requireRole from rbac.ts instead)
 * @deprecated Use requireRole from rbac.ts
 */
export const authorize = (...roles: (UserRole | string)[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Alias for authenticate - for backward compatibility
 */
export const authenticateToken = authenticate;

/**
 * Re-export requireRole from rbac module for convenience
 */
export { requireRole } from './rbac';