/**
 * Retire la clé de menu « /owner/ressources » des rôles enregistrés.
 *
 * L'écran Ressources a été supprimé de l'application. Les rôles « Propriétaire »
 * créés avant cette suppression portent encore sa clé : elle ne mène plus nulle
 * part, et l'écran des rôles la compterait dans son total sans jamais
 * l'afficher.
 *
 *   node scripts/0-retirer-menu-ressources.js
 */
const fs = require('fs');
const path = require('path');

const RACINE_DEPOT = path.resolve(__dirname, '..', '..', '..');
const env = fs.readFileSync(path.join(RACINE_DEPOT, '.env'), 'utf8');
for (const ligne of env.split(/\r?\n/)) {
  const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { unscopedPrisma } = require(path.join(RACINE_DEPOT, 'packages/database/dist/index.js'));

const CLE = '/owner/ressources';

async function main() {
  const concernes = await unscopedPrisma.roleMenu.findMany({
    where: { menuKey: CLE },
    select: { id: true, role: { select: { name: true, establishment_id: true } } },
  });

  if (concernes.length === 0) {
    console.log(`  Aucun rôle ne porte « ${CLE} ».`);
    return;
  }

  for (const ligne of concernes) {
    console.log(`  rôle « ${ligne.role.name} » — clé retirée`);
  }

  const { count } = await unscopedPrisma.roleMenu.deleteMany({ where: { menuKey: CLE } });
  console.log(`\n  ${count} ligne(s) supprimée(s).`);
}

main()
  .catch((e) => {
    console.error('  ÉCHEC :', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await unscopedPrisma.$disconnect().catch(() => {});
  });
