import { randomUUID } from 'crypto';
import { menuKeysForSchoolType } from '@school/types';
import { prisma, unscopedPrisma } from '@school/database';

/**
 * Un rôle protégé (ex. « Administrateur ») reçoit automatiquement les menus de
 * son type d'établissement — il ne peut pas être édité manuellement, donc c'est
 * le seul moyen pour lui d'obtenir les nouveaux menus créés dans l'application.
 * Appelé à la lecture (liste/détail des rôles, login, refresh, /me) pour rester
 * toujours synchronisé sans migration à chaque nouveau menu.
 *
 * La cible n'est pas la liste complète des menus mais celle du type d'école :
 * l'administrateur d'une école primaire reçoit le module CP1 → CM2 et non la
 * pédagogie du secondaire, et réciproquement. Sans ce tri, l'administrateur
 * d'une école primaire se voyait privé de tout son module — les clés
 * `/primary/*` ne figuraient nulle part dans la liste canonique.
 */
export async function syncProtectedRoleMenus(roleId: string): Promise<void> {
  const targetMenuKeys = await menuKeysForRole(roleId);
  if (targetMenuKeys.length === 0) return;

  const current = await prisma.roleMenu.findMany({ where: { roleId }, select: { menuKey: true } });
  const currentKeys = new Set(current.map((m) => m.menuKey));
  const targetKeys = new Set(targetMenuKeys);

  const toAdd = targetMenuKeys.filter((k) => !currentKeys.has(k));
  const toRemove = [...currentKeys].filter((k) => !targetKeys.has(k));

  if (toAdd.length === 0 && toRemove.length === 0) return;

  await prisma.$transaction([
    ...(toRemove.length
      ? [prisma.roleMenu.deleteMany({ where: { roleId, menuKey: { in: toRemove } } })]
      : []),
    ...(toAdd.length
      ? [prisma.roleMenu.createMany({ data: toAdd.map((menuKey) => ({ id: randomUUID(), roleId, menuKey })) })]
      : []),
  ]);
}

/**
 * Menus autorisés pour l'établissement auquel appartient un rôle. Renvoie une
 * liste vide si le rôle est introuvable — mieux vaut ne rien synchroniser que
 * de retirer ses menus à un rôle qu'on n'a pas su rattacher.
 */
export async function menuKeysForRole(roleId: string): Promise<string[]> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { establishment_id: true },
  });
  if (!role?.establishment_id) return [];

  return menuKeysForEstablishment(role.establishment_id);
}

/** Menus autorisés pour un établissement, d'après son type d'école. */
export async function menuKeysForEstablishment(establishmentId: string): Promise<string[]> {
  // `establishment` est la table du cloisonnement lui-même : elle se lit avec
  // le client non cloisonné, comme partout ailleurs dans les services.
  const establishment = await unscopedPrisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { schoolType: true },
  });

  return menuKeysForSchoolType(establishment?.schoolType);
}
