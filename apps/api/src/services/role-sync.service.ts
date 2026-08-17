import { randomUUID } from 'crypto';
import {
  menuKeysForSchoolType,
  ownerMenuKeysForSchoolType,
  PROTECTED_OWNER_ROLE_NAME,
} from '@school/types';
import { prisma, unscopedPrisma } from '@school/database';

/**
 * Menus par défaut d'un établissement, et création du rôle Propriétaire.
 *
 * Il n'y a **plus de resynchronisation automatique** : les menus de tous les
 * rôles, protégés compris, sont choisis par l'administrateur depuis l'écran des
 * rôles. Les remettre d'office à leur valeur canonique annulerait chacune de
 * ses modifications à la lecture suivante.
 *
 * Ce que cela coûte, et qu'il faut savoir : un écran ajouté à l'application
 * dans une version future n'atterrira plus tout seul dans le menu des rôles
 * existants. Il faudra le cocher — les boutons « Tout » de chaque groupe sont
 * là pour ça.
 */

/**
 * Type d'école. `establishment` est la table du cloisonnement lui-même : elle
 * se lit avec le client non cloisonné, comme partout ailleurs dans les services.
 */
async function schoolTypeOf(establishmentId: string): Promise<string | null> {
  const establishment = await unscopedPrisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { schoolType: true },
  });
  return establishment?.schoolType ?? null;
}

/** Menus d'administration ouverts par le type d'école. */
export async function menuKeysForEstablishment(establishmentId: string): Promise<string[]> {
  return menuKeysForSchoolType(await schoolTypeOf(establishmentId));
}

/** Menus de l'espace Propriétaire ouverts par le type d'école. */
export async function ownerMenuKeysForEstablishment(establishmentId: string): Promise<string[]> {
  return ownerMenuKeysForSchoolType(await schoolTypeOf(establishmentId));
}

/**
 * Garantit l'existence du rôle « Propriétaire » d'un établissement.
 *
 * Les écoles créées avant l'introduction de ce rôle n'en ont pas : plutôt
 * qu'une migration de données, qui devrait deviner le type de chaque école et
 * fabriquer ses lignes de menus, il est créé à la première lecture de la page
 * des rôles. Rien à jouer, rien à rattraper.
 *
 * Renvoie `true` si le rôle vient d'être créé.
 */
export async function ensureOwnerRole(establishmentId: string): Promise<boolean> {
  const existing = await prisma.role.findFirst({
    where: { name: PROTECTED_OWNER_ROLE_NAME },
    select: { id: true },
  });
  if (existing) return false;

  const schoolType = await schoolTypeOf(establishmentId);
  const menuKeys = ownerMenuKeysForSchoolType(schoolType);

  await prisma.role.create({
    data: {
      id: randomUUID(),
      name: PROTECTED_OWNER_ROLE_NAME,
      description:
        "Accès en lecture seule aux tableaux de bord analytiques de l'établissement.",
      isProtected: true,
      menus: {
        create: menuKeys.map((menuKey) => ({ id: randomUUID(), menuKey })),
      },
    },
  });

  return true;
}
