import '../src/load-env';
import { randomUUID } from 'crypto';
import { unscopedPrisma } from '@school/database';
import { menuKeysForSchoolType } from '@school/types';

/**
 * Rattrapage : donne son rôle « Administrateur » protégé aux établissements
 * créés avant que `createEstablishment` ne le crée d'office.
 *
 * Sans ce rôle, l'écran des rôles est vide à l'ouverture de l'école et le compte
 * administrateur n'y apparaît rattaché à rien. Le script est idempotent : il
 * laisse intact tout établissement disposant déjà d'un rôle protégé, et ne
 * touche qu'aux comptes ADMIN dont le `roleId` est vide.
 *
 * Lancer depuis apps/api :  npx tsx scripts/backfill-admin-roles.mts
 */
const ADMIN_ROLE_NAME = 'Administrateur';

async function main() {
  const establishments = await unscopedPrisma.establishment.findMany({
    select: { id: true, name: true, schoolType: true },
  });

  let createdRoles = 0;
  let linkedUsers = 0;

  for (const establishment of establishments) {
    const existing = await unscopedPrisma.role.findFirst({
      where: { establishment_id: establishment.id, isProtected: true },
      select: { id: true },
    });

    let roleId = existing?.id;

    if (!roleId) {
      const role = await unscopedPrisma.role.create({
        data: {
          id: randomUUID(),
          establishment_id: establishment.id,
          name: ADMIN_ROLE_NAME,
          description: `Accès complet aux menus d'un établissement de type ${String(establishment.schoolType).toLowerCase()}.`,
          isProtected: true,
          menus: {
            create: menuKeysForSchoolType(establishment.schoolType).map((menuKey) => ({
              id: randomUUID(),
              menuKey,
            })),
          },
        },
        select: { id: true },
      });
      roleId = role.id;
      createdRoles += 1;
      console.log(`+ rôle « ${ADMIN_ROLE_NAME} » créé pour ${establishment.name}`);
    }

    // Les comptes ADMIN déjà rattachés à un rôle sont laissés tels quels.
    const orphans = await unscopedPrisma.user.updateMany({
      where: { establishment_id: establishment.id, role: 'ADMIN', roleId: null },
      data: { roleId },
    });
    if (orphans.count > 0) {
      linkedUsers += orphans.count;
      console.log(`  ${orphans.count} compte(s) ADMIN rattaché(s) — ${establishment.name}`);
    }
  }

  console.log(`\nTerminé : ${createdRoles} rôle(s) créé(s), ${linkedUsers} compte(s) rattaché(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => unscopedPrisma.$disconnect());
