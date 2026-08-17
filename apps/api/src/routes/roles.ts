import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import { prisma } from '@school/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  ADMIN_LOCKED_MENU_KEY,
  OWNER_HOME_MENU_KEY,
  PROTECTED_ADMIN_ROLE_NAME,
  PROTECTED_OWNER_ROLE_NAME,
} from '@school/types';
import {
  ensureOwnerRole,
  menuKeysForEstablishment,
  ownerMenuKeysForEstablishment,
} from '../services/role-sync.service';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const roleBodySchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  menuKeys: z.array(z.string()).default([]),
});

const createRoleSchema = z.object({ body: roleBodySchema });
const updateRoleSchema = z.object({
  params: z.object({ id: z.string() }),
  body: roleBodySchema.partial(),
});
const idParamSchema = z.object({ params: z.object({ id: z.string() }) });

// ============================================================================
// Helpers
// ============================================================================

function toRoleDto(role: any) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    isProtected: role.isProtected,
    menuKeys: (role.menus || []).map((m: any) => m.menuKey),
    usersCount: role._count?.users ?? 0,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

const roleInclude = { menus: true, _count: { select: { users: true } } };

/**
 * Ne retient que les menus qui existent pour le type de l'établissement.
 *
 * L'écran des rôles ne propose déjà que ceux-là ; ce filtre est la garantie
 * côté serveur — cocher « Coefficients » dans une école primaire donnerait un
 * menu vers un écran sans objet.
 *
 * Le rôle « Propriétaire » a son propre référentiel : les sept écrans
 * analytiques, et eux seuls. Les deux jeux ne se mélangent jamais — un
 * propriétaire n'a rien à faire dans les écrans de gestion, et un comptable
 * rien à faire dans les tableaux de bord de pilotage.
 */
async function allowedMenuKeys(
  req: AuthRequest,
  menuKeys: string[],
  role?: { name: string } | null,
): Promise<string[]> {
  if (role?.name === PROTECTED_OWNER_ROLE_NAME) {
    const allowed = new Set(await ownerMenuKeysForEstablishment(req.user!.establishmentId));
    const retained = menuKeys.filter((key) => allowed.has(key));

    // « Vue d'ensemble » ne se décoche pas : c'est la page d'atterrissage après
    // connexion et la cible de toute adresse inconnue. La retirer enfermerait
    // le propriétaire dans une redirection sur elle-même.
    return retained.includes(OWNER_HOME_MENU_KEY) ? retained : [OWNER_HOME_MENU_KEY, ...retained];
  }

  const allowed = new Set(await menuKeysForEstablishment(req.user!.establishmentId));
  const retained = menuKeys.filter((key) => allowed.has(key));

  // L'écran des rôles ne se retire pas de l'« Administrateur » : c'est depuis
  // lui qu'on répare une coche malheureuse. L'en priver enfermerait
  // l'établissement dehors, sans aucun moyen de revenir en arrière par
  // l'interface.
  if (role?.name === PROTECTED_ADMIN_ROLE_NAME && !retained.includes(ADMIN_LOCKED_MENU_KEY)) {
    return [ADMIN_LOCKED_MENU_KEY, ...retained];
  }

  return retained;
}

// ============================================================================
// Routes
// ============================================================================

router.get('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    // Rattrapage des écoles ouvertes avant l'introduction du rôle Propriétaire.
    // Même principe que la resynchronisation des menus ci-dessous : la page des
    // rôles est le seul endroit où ce manque se verrait, c'est donc là qu'il se
    // comble — sans migration de données à jouer.
    await ensureOwnerRole(req.user!.establishmentId);

    // Plus de resynchronisation automatique : les menus de tous les rôles,
    // protégés compris, sont désormais choisis à la main. Les remettre d'office
    // à leur valeur par défaut annulerait chaque modification à la lecture
    // suivante de cette page.
    const roles = await prisma.role.findMany({
      include: roleInclude,
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: roles.map(toRoleDto) });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

router.get('/:id', authenticate, requireRole('ADMIN'), validate(idParamSchema), async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: roleInclude,
    });
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }
    res.json({ success: true, data: toRoleDto(role) });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch role' });
  }
});

router.post('/', authenticate, requireRole('ADMIN'), validate(createRoleSchema), async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const menuKeys = await allowedMenuKeys(req, req.body.menuKeys);

    // Le nom d'un rôle n'est unique qu'au sein d'un établissement.
    const existing = await prisma.role.findFirst({ where: { name } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Un rôle avec ce nom existe déjà' });
    }

    const role = await prisma.role.create({
      data: {
        id: randomUUID(),
        name,
        description,
        menus: {
          create: menuKeys.map((menuKey: string) => ({ id: randomUUID(), menuKey })),
        },
      },
      include: roleInclude,
    });

    res.status(201).json({ success: true, data: toRoleDto(role), message: 'Rôle créé avec succès' });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, error: 'Failed to create role' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), validate(updateRoleSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    // Les menus de **tous** les rôles s'éditent, protégés compris : c'est
    // l'administrateur qui décide des écrans ouverts à chaque profil.
    //
    // Leur nom, en revanche, reste verrouillé : ce sont « Administrateur » et
    // « Propriétaire » qui font dériver le rôle système des comptes qui les
    // portent (cf. routes/users.ts). Renommer l'un romprait ce lien sans que
    // rien ne le signale — un compte créé ensuite se retrouverait comptable.
    if (existingRole.isProtected && name !== undefined && name !== existingRole.name) {
      return res.status(403).json({
        success: false,
        error: 'Le nom de ce rôle est verrouillé : il détermine les droits des comptes qui le portent.',
      });
    }

    const menuKeys =
      req.body.menuKeys === undefined
        ? undefined
        : await allowedMenuKeys(req, req.body.menuKeys, existingRole);

    if (name && name !== existingRole.name) {
      const nameTaken = await prisma.role.findFirst({ where: { name } });
      if (nameTaken) {
        return res.status(409).json({ success: false, error: 'Un rôle avec ce nom existe déjà' });
      }
    }

    const role = await prisma.$transaction(async (tx) => {
      if (menuKeys !== undefined) {
        await tx.roleMenu.deleteMany({ where: { roleId: id } });
      }
      return tx.role.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
          ...(menuKeys !== undefined && {
            menus: { create: menuKeys.map((menuKey: string) => ({ id: randomUUID(), menuKey })) },
          }),
        },
        include: roleInclude,
      });
    });

    res.json({ success: true, data: toRoleDto(role), message: 'Rôle modifié avec succès' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), validate(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }
    if (role.isProtected) {
      return res.status(403).json({ success: false, error: 'Ce rôle est protégé et ne peut pas être supprimé.' });
    }
    if (role._count.users > 0) {
      return res.status(409).json({
        success: false,
        error: `Ce rôle est affecté à ${role._count.users} utilisateur(s). Réaffectez-les avant de le supprimer.`,
      });
    }

    await prisma.role.delete({ where: { id } });
    res.json({ success: true, message: 'Rôle supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, error: 'Failed to delete role' });
  }
});

export default router;
