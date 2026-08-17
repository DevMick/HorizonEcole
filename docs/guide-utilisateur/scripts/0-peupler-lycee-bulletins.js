/**
 * Génère les bulletins des deux premiers trimestres du lycée.
 *
 * Tant qu'un bulletin n'est pas « généré » par l'administration, il n'existe
 * pas pour les familles : l'espace du parent et celui de l'élève affichent
 * « En préparation ». On en génère deux sur trois — le troisième reste non
 * généré, ce qui permet au guide de montrer les deux états côte à côte.
 *
 *   node scripts/0-peupler-lycee-bulletins.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RACINE_DEPOT = path.resolve(__dirname, '..', '..', '..');
const env = fs.readFileSync(path.join(RACINE_DEPOT, '.env'), 'utf8');
for (const ligne of env.split(/\r?\n/)) {
  const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const {
  prisma,
  unscopedPrisma,
  runWithEstablishment,
} = require(path.join(RACINE_DEPOT, 'packages/database/dist/index.js'));

const CODE_ECOLE = 'lycee-moderne-de-cocody';

async function main() {
  const ecole = await unscopedPrisma.establishment.findFirst({
    where: { code: CODE_ECOLE },
    select: { id: true, name: true },
  });
  if (!ecole) throw new Error(`Établissement « ${CODE_ECOLE} » introuvable.`);

  await runWithEstablishment(ecole.id, async () => {
    const annee = await prisma.academicYear.findFirst({ where: { name: '2025-2026' } });
    const classe = await prisma.schoolClass.findFirst({ where: { name: '6ème A' } });
    const trimestres = await prisma.semesters.findMany({
      where: { academic_year_id: annee.id },
      orderBy: { start_date: 'asc' },
    });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    let generes = 0;
    for (const trimestre of trimestres.slice(0, 2)) {
      const existe = await prisma.bulletin_releases.findFirst({
        where: { semester_id: trimestre.id, class_id: classe.id },
      });
      if (existe) continue;
      await prisma.bulletin_releases.create({
        data: {
          id: crypto.randomUUID(),
          academic_year_id: annee.id,
          semester_id: trimestre.id,
          class_id: classe.id,
          generated_at: new Date(trimestre.end_date),
          generated_by: admin?.id ?? null,
          updated_at: new Date(),
        },
      });
      console.log(`  Bulletins générés — ${trimestre.name}`);
      generes++;
    }
    if (!generes) console.log('  Rien à générer : les bulletins existent déjà.');
    console.log(`  ${trimestres[2].name} laissé non généré, à dessein.`);
  });
}

main()
  .catch((e) => {
    console.error('  ÉCHEC :', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await unscopedPrisma.$disconnect().catch(() => {});
  });
