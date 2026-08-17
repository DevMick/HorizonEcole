import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import config from '@school/config';
import { PROTECTED_ADMIN_ROLE_NAME, PROTECTED_OWNER_ROLE_NAME } from '@school/types';
import { prisma } from '@school/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

// Comptes « personnel » génériques (secrétaires, comptables, etc.) — les
// rôles TEACHER/STUDENT/PARENT ont leurs propres parcours de création
// (fiches enseignant/élève/parent) et ne sont pas gérés ici.
//
// Le niveau système (droits API) n'est pas librement saisi : ADMIN reste déduit
// du rôle personnalisé (Role) protégé « Administrateur ». Pour les autres
// comptes, `systemRole` permet de choisir explicitement entre ACCOUNTANT (par
// défaut) et OWNER — le propriétaire, en lecture seule sur /api/owner/*, ne peut
// pas se déduire d'un rôle personnalisé puisqu'il n'en utilise aucun.
// Voir POST / et PATCH /:id.
const SYSTEM_ROLES = ['ADMIN', 'ACCOUNTANT', 'OWNER'] as const;

type SystemRole = (typeof SYSTEM_ROLES)[number];

/** Niveaux système explicitement saisissables (ADMIN reste déduit). */
const ASSIGNABLE_SYSTEM_ROLES = ['ACCOUNTANT', 'OWNER'] as const;

const numericPassword = z
  .string()
  .regex(/^\d+$/, 'Le mot de passe doit être uniquement numérique')
  .min(6, 'Le mot de passe doit contenir au moins 6 chiffres');

const getUsersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.string().optional(),
  }),
});

const createUserSchema = z.object({
  body: z
    .object({
      email: z.string().email('Email invalide'),
      firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
      lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
      phone: z.string().optional(),
      roleId: z.string().min(1, 'Rôle requis').optional(),
      systemRole: z.enum(ASSIGNABLE_SYSTEM_ROLES).optional(),
      password: numericPassword,
      isActive: z.boolean().optional(),
    })
    // Le rôle personnalisé n'a aucun effet sur un compte OWNER : sa branche de
    // menu est évaluée avant tout filtrage par `customRole.menuKeys`. On cesse
    // donc de l'exiger dans ce seul cas, plutôt que de faire choisir un rôle
    // sans portée.
    .refine((body) => body.systemRole === 'OWNER' || Boolean(body.roleId), {
      message: 'Rôle requis',
      path: ['roleId'],
    }),
});

const updateUserSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    email: z.string().email('Email invalide').optional(),
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().optional(),
    roleId: z.string().min(1, 'Rôle requis').optional(),
    systemRole: z.enum(ASSIGNABLE_SYSTEM_ROLES).optional(),
    isActive: z.boolean().optional(),
    password: numericPassword.optional(),
  }),
});

const idParamSchema = z.object({ params: z.object({ id: z.string() }) });

/**
 * Niveau système dérivé du rôle personnalisé choisi.
 *
 * Deux rôles protégés cohabitent depuis l'ajout du profil Propriétaire, et
 * c'est désormais **le nom** qui décide, plus le seul caractère protégé. La
 * nuance est une question de sécurité : la règle précédente — « protégé donc
 * ADMIN » — aurait donné les pleins droits d'administration à quiconque se
 * voyait attribuer le rôle « Propriétaire », c'est-à-dire exactement le profil
 * qu'on veut cantonner à la lecture.
 *
 * Tout autre rôle personnalisé laisse le choix au formulaire, ACCOUNTANT par
 * défaut.
 */
function systemRoleOf(
  customRole: { name: string; isProtected: boolean } | null,
  requested: SystemRole,
): SystemRole {
  if (!customRole?.isProtected) return requested;
  if (customRole.name === PROTECTED_OWNER_ROLE_NAME) return 'OWNER';
  if (customRole.name === PROTECTED_ADMIN_ROLE_NAME) return 'ADMIN';
  return requested;
}

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  roleId: true,
  isActive: true,
  isProtected: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  customRole: { select: { id: true, name: true, isProtected: true } },
} as const;

const EMAIL_TAKEN_MESSAGE = 'Un utilisateur avec cet email existe déjà';

/**
 * Reconnaît la collision d'email remontée par la base.
 *
 * Le contrôle préalable (`findUnique` sur l'email) passe par le client
 * cloisonné : il ne voit que les comptes de l'établissement courant. La
 * contrainte SQL, elle, est globale — `users.email` est `@unique` sans
 * `establishment_id`. Un email déjà pris par une autre école traverse donc le
 * contrôle et n'échoue qu'à l'écriture.
 *
 * On traduit ce cas en 409, comme le contrôle préalable, plutôt qu'en 500 : le
 * message reste le même dans les deux cas, sans révéler l'établissement qui
 * détient l'adresse.
 */
function isEmailConflict(error: unknown): boolean {
  const e = error as { code?: string; meta?: { target?: unknown } };
  if (e?.code !== 'P2002') return false;
  const target = e.meta?.target;
  return Array.isArray(target) ? target.includes('email') : target === 'email';
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/users
 * Liste des comptes personnel (ADMIN/ACCOUNTANT), recherche + filtre par rôle système.
 */
router.get('/', authenticate, requireRole('ADMIN'), validate(getUsersSchema), async (req, res) => {
  try {
    const { search, role } = req.query as { search?: string; role?: string };

    const where: any = { role: { in: SYSTEM_ROLES } };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', authenticate, requireRole('ADMIN'), validate(idParamSchema), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect,
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users
 * Crée un compte personnel (mot de passe numérique, 6 chiffres minimum).
 */
router.post('/', authenticate, requireRole('ADMIN'), validate(createUserSchema), async (req, res) => {
  try {
    const { email, firstName, lastName, phone, roleId, systemRole, password, isActive } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: EMAIL_TAKEN_MESSAGE });
    }

    let customRole = null;
    if (roleId !== undefined) {
      customRole = await prisma.role.findUnique({ where: { id: roleId } });
      if (!customRole) {
        return res.status(400).json({ success: false, error: 'Rôle introuvable' });
      }
    }
    const role: SystemRole = systemRoleOf(customRole, systemRole ?? 'ACCOUNTANT');

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role,
        roleId,
        isActive: isActive ?? true,
      },
      select: userSelect,
    });

    res.status(201).json({ success: true, data: user, message: 'Utilisateur créé avec succès' });
  } catch (error) {
    if (isEmailConflict(error)) {
      return res.status(409).json({ success: false, error: EMAIL_TAKEN_MESSAGE });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

/**
 * PATCH /api/users/:id
 * Met à jour un compte personnel ; `password` optionnel réinitialise le mot de passe.
 */
router.patch('/:id', authenticate, requireRole('ADMIN'), validate(updateUserSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, phone, roleId, systemRole, isActive, password } = req.body;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (email && email !== target.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({ success: false, error: EMAIL_TAKEN_MESSAGE });
      }
    }

    // Le rôle protégé (« Administrateur ») donne ADMIN. Sinon on retient le
    // niveau système demandé ; à défaut, celui du compte s'il est déjà OWNER —
    // un simple changement de rôle personnalisé ne doit pas rétrograder
    // silencieusement un propriétaire en comptable.
    const fallbackRole: SystemRole = target.role === 'OWNER' ? 'OWNER' : 'ACCOUNTANT';
    let derivedRole: SystemRole | undefined;
    if (roleId !== undefined) {
      const customRole = await prisma.role.findUnique({ where: { id: roleId } });
      if (!customRole) {
        return res.status(400).json({ success: false, error: 'Rôle introuvable' });
      }
      derivedRole = systemRoleOf(customRole, systemRole ?? fallbackRole);
    } else if (systemRole !== undefined) {
      derivedRole = systemRole;
    }

    // Empêche de retirer le dernier ADMIN actif en le rétrogradant ou en le désactivant.
    if (
      (derivedRole !== undefined && derivedRole !== 'ADMIN' && target.role === 'ADMIN') ||
      (isActive === false && target.role === 'ADMIN')
    ) {
      const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (activeAdmins <= 1) {
        return res.status(409).json({ success: false, error: 'Impossible de modifier le dernier administrateur actif' });
      }
    }

    const data: any = {
      ...(email !== undefined && { email }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(derivedRole !== undefined && { role: derivedRole }),
      ...(roleId !== undefined && { roleId }),
      ...(isActive !== undefined && { isActive }),
    };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    }

    const user = await prisma.user.update({ where: { id }, data, select: userSelect });

    res.json({ success: true, data: user, message: 'Utilisateur modifié avec succès' });
  } catch (error) {
    if (isEmailConflict(error)) {
      return res.status(409).json({ success: false, error: EMAIL_TAKEN_MESSAGE });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticate, requireRole('ADMIN'), validate(idParamSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (req.user!.id === id) {
      return res.status(403).json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (target.isProtected) {
      return res.status(403).json({ success: false, error: 'Ce compte administrateur est protégé et ne peut pas être supprimé.' });
    }

    if (target.role === 'ADMIN') {
      const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (activeAdmins <= 1) {
        return res.status(409).json({ success: false, error: 'Impossible de supprimer le dernier administrateur actif' });
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

export default router;
