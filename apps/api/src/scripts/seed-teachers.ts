/**
 * Seed : crée 10 enseignants de démonstration dans le premier établissement trouvé.
 * Idempotent : un email déjà présent dans l'établissement est ignoré.
 *
 * Usage : cd apps/api && npx tsx src/scripts/seed-teachers.ts
 */
import { unscopedPrisma as db, runWithEstablishment, prisma } from '@school/database';

const TEACHERS = [
  { firstName: 'Marie',    lastName: 'Dupont',      email: 'marie.dupont@ecole.ci',      phone: '0701000001', contractType: 'CDI',      specialties: 'Mathématiques',          qualifications: 'Licence Mathématiques' },
  { firstName: 'Jean',     lastName: 'Konaté',      email: 'jean.konate@ecole.ci',        phone: '0701000002', contractType: 'CDI',      specialties: 'Sciences naturelles',    qualifications: 'Licence Sciences' },
  { firstName: 'Fatou',    lastName: 'Diallo',      email: 'fatou.diallo@ecole.ci',       phone: '0701000003', contractType: 'CDI',      specialties: 'Français',               qualifications: 'Licence Lettres' },
  { firstName: 'Pierre',   lastName: 'Ouédraogo',   email: 'pierre.ouedraogo@ecole.ci',   phone: '0701000004', contractType: 'CDD',      specialties: 'Éducation physique',     qualifications: 'Licence STAPS' },
  { firstName: 'Aminata',  lastName: 'Traoré',      email: 'aminata.traore@ecole.ci',     phone: '0701000005', contractType: 'CDI',      specialties: 'Histoire-Géographie',    qualifications: 'Master Histoire' },
  { firstName: 'Ibrahim',  lastName: 'Coulibaly',   email: 'ibrahim.coulibaly@ecole.ci',  phone: '0701000006', contractType: 'CDD',      specialties: 'Anglais',                qualifications: 'Licence Anglais' },
  { firstName: 'Cécile',   lastName: 'Kamara',      email: 'cecile.kamara@ecole.ci',      phone: '0701000007', contractType: 'VACATAIRE', specialties: 'Arts plastiques',       qualifications: 'BTS Arts appliqués' },
  { firstName: 'Moussa',   lastName: 'Sanogo',      email: 'moussa.sanogo@ecole.ci',      phone: '0701000008', contractType: 'VACATAIRE', specialties: 'Musique',               qualifications: 'Licence Musicologie' },
  { firstName: 'Agnès',    lastName: 'Yao',         email: 'agnes.yao@ecole.ci',          phone: '0701000009', contractType: 'CDI',      specialties: 'Éducation civique',      qualifications: 'Licence Sciences sociales' },
  { firstName: 'Kofi',     lastName: 'Asante',      email: 'kofi.asante@ecole.ci',        phone: '0701000010', contractType: 'CDD',      specialties: 'Informatique',           qualifications: 'Licence Informatique' },
] as const;

async function main() {
  const establishments = await db.establishment.findMany({
    select: { id: true, name: true, schoolType: true },
    orderBy: { createdAt: 'asc' },
  });

  if (establishments.length === 0) {
    console.error('Aucun établissement trouvé.');
    process.exit(1);
  }

  for (const establishment of establishments) {
    console.log(`\n=== ${establishment.name} [${establishment.schoolType}] ===`);

    await runWithEstablishment(establishment.id, async () => {
      let created = 0;
      let skipped = 0;

      for (const data of TEACHERS) {
        const existing = await prisma.teachers.findFirst({
          where: { email: data.email },
          select: { id: true },
        });

        if (existing) {
          console.log(`  ⏭  ${data.lastName} ${data.firstName} — déjà présent`);
          skipped++;
          continue;
        }

        await prisma.teachers.create({
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            contract_type: data.contractType,
            hire_date: new Date('2024-09-01'),
            specialties: data.specialties,
            qualifications: data.qualifications,
          },
        });

        console.log(`  ✅ ${data.lastName} ${data.firstName} (${data.contractType})`);
        created++;
      }

      console.log(`  → ${created} créé(s), ${skipped} ignoré(s).`);
    });
  }
}

main()
  .catch((err) => { console.error('ERREUR :', err); process.exit(1); })
  .finally(() => db.$disconnect());
