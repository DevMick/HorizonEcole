/**
 * Donne vie à l'écran Finance du lycée : types de frais, factures,
 * encaissements et dépenses.
 *
 * Sans ces lignes, tout l'écran Propriétaire › Finance affiche « — » et le
 * message « Aucune facture sur cette année » : le recouvrement n'a pas de base
 * de calcul. Les échéanciers, eux, existaient déjà — l'application les avait
 * créés d'elle-même en affectant l'échéancier à la classe (25 plans, 75
 * tranches).
 *
 * Le recouvrement simulé est volontairement **imparfait** : environ deux tiers
 * des familles à jour, quelques-unes en règlement partiel, quelques-unes qui
 * n'ont rien versé. Un taux de 100 % ne montrerait aucun des indicateurs qui
 * font l'intérêt de l'écran — vieillissement de la créance, retards, relances.
 *
 * Idempotent : relancé, il ne crée rien en double.
 *
 *   node scripts/0-peupler-lycee-finance.js
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
const uuid = () => crypto.randomUUID();

let graine = 4242424;
function alea() {
  graine = (graine * 1103515245 + 12345) % 2147483648;
  return graine / 2147483648;
}

const MODES = ['CASH', 'MOBILE_MONEY', 'VIREMENT', 'CHEQUE'];
const trace = (m) => console.log('  ' + m);

async function main() {
  const ecole = await unscopedPrisma.establishment.findFirst({
    where: { code: CODE_ECOLE },
    select: { id: true, name: true },
  });
  if (!ecole) throw new Error(`Établissement « ${CODE_ECOLE} » introuvable.`);
  console.log(`\n  ${ecole.name}\n`);

  await runWithEstablishment(ecole.id, async () => {
    const annee = await prisma.academicYear.findFirst({ where: { name: '2025-2026' } });
    const classe = await prisma.schoolClass.findFirst({ where: { name: '6ème A' } });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    // ── Types de frais ─────────────────────────────────────────────────────
    const TYPES = [
      { name: 'Frais d’inscription', part: 150000 },
      { name: 'Scolarité — 2e versement', part: 100000 },
      { name: 'Scolarité — 3e versement', part: 100000 },
    ];
    const types = [];
    for (const t of TYPES) {
      let type = await prisma.payment_types.findFirst({ where: { name: t.name, level: '6EME' } });
      if (!type) {
        type = await prisma.payment_types.create({
          data: { id: uuid(), level: '6EME', name: t.name },
        });
      }
      types.push({ ...t, id: type.id });
    }
    trace(`${types.length} types de frais`);

    // ── Une facture par élève ──────────────────────────────────────────────
    const plans = await prisma.custom_payment_plans.findMany({
      where: { academic_year_id: annee.id },
      include: { custom_payment_plan_installments: { orderBy: { installment_number: 'asc' } } },
    });

    let factures = 0;
    let numero = 1;
    for (const plan of plans) {
      if (!plan.student_id) continue;
      const existe = await prisma.invoices.findFirst({
        where: { student_id: plan.student_id, academic_year_id: annee.id },
      });
      if (existe) continue;

      const facture = await prisma.invoices.create({
        data: {
          id: uuid(),
          invoice_number: `F2026-${String(numero).padStart(4, '0')}`,
          student_id: plan.student_id,
          class_id: classe.id,
          academic_year_id: annee.id,
          custom_payment_plan_id: plan.id,
          total_amount: plan.total_amount,
          status: 'ISSUED',
          issued_at: new Date(Date.UTC(2025, 8, 15)),
          created_by: admin?.id ?? null,
        },
      });
      // Les lignes détaillent ce que recouvre le montant : c'est ce qui
      // alimente « Recettes par type de frais ».
      for (const t of types) {
        await prisma.invoice_lines.create({
          data: {
            id: uuid(),
            invoice_id: facture.id,
            payment_type_id: t.id,
            description: t.name,
            amount: t.part,
          },
        });
      }
      numero++;
      factures++;
    }
    trace(`${factures} factures émises`);

    // ── Encaissements ──────────────────────────────────────────────────────
    // Trois familles de comportements, pour que l'écran ait quelque chose à
    // montrer : à jour, partiel, défaillant.
    let versements = 0;
    let rang = 0;
    for (const plan of plans) {
      rang++;
      const tirage = alea();
      // 64 % à jour, 24 % partiels, 12 % sans aucun versement.
      const profil = tirage < 0.64 ? 'complet' : tirage < 0.88 ? 'partiel' : 'aucun';
      if (profil === 'aucun') continue;

      const tranches = plan.custom_payment_plan_installments;
      const aRegler = profil === 'complet' ? tranches.length : 1 + Math.floor(alea() * 2);

      for (let i = 0; i < Math.min(aRegler, tranches.length); i++) {
        const tranche = tranches[i];
        const deja = await prisma.student_payments.findFirst({
          where: { custom_payment_plan_installment_id: tranche.id },
        });
        if (deja) continue;

        // Réglé peu après l'échéance, parfois avec quelques jours de retard.
        const echeance = new Date(tranche.due_date);
        const jours = Math.floor(alea() * 25) - 3;
        const paiement = new Date(echeance);
        paiement.setUTCDate(paiement.getUTCDate() + jours);

        await prisma.student_payments.create({
          data: {
            id: uuid(),
            student_id: plan.student_id,
            academic_year_id: annee.id,
            custom_payment_plan_installment_id: tranche.id,
            amount: tranche.amount,
            expected_amount: tranche.amount,
            payment_date: paiement,
            payment_method: MODES[Math.floor(alea() * MODES.length)],
            receipt_number: `R2026-${String(rang).padStart(3, '0')}-${tranche.installment_number}`,
            status: 'PAID',
            recorded_by: admin?.id ?? null,
            updated_at: new Date(),
          },
        });
        await prisma.custom_payment_plan_installments.update({
          where: { id: tranche.id },
          data: { is_paid: true, paid_at: paiement },
        });
        versements++;
      }
    }
    trace(`${versements} versements encaissés`);

    // ── Dépenses ───────────────────────────────────────────────────────────
    // Sans elles, la courbe des charges est absente et la marge n'est pas
    // calculable : l'écran le dit lui-même.
    const DEPENSES = [
      ['SALAIRES', 1850000, 'Salaires du personnel enseignant', 9],
      ['SALAIRES', 1850000, 'Salaires du personnel enseignant', 10],
      ['SALAIRES', 1850000, 'Salaires du personnel enseignant', 11],
      ['SALAIRES', 1850000, 'Salaires du personnel enseignant', 0],
      ['ENERGIE', 145000, 'Électricité et eau', 9],
      ['ENERGIE', 162000, 'Électricité et eau', 11],
      ['FOURNITURES', 320000, 'Fournitures scolaires et papeterie', 8],
      ['MAINTENANCE', 210000, 'Réfection des salles', 8],
      ['TRANSPORT', 95000, 'Carburant du véhicule de service', 10],
      ['ACTIVITES', 180000, 'Sortie pédagogique', 1],
      ['ASSURANCES', 240000, 'Assurance de l’établissement', 8],
    ];
    let depenses = 0;
    for (const [categorie, montant, description, mois] of DEPENSES) {
      const annee_ = mois >= 8 ? 2025 : 2026;
      const date = new Date(Date.UTC(annee_, mois, 5));
      const existe = await prisma.expenses.findFirst({ where: { description, date } });
      if (existe) continue;
      await prisma.expenses.create({
        data: {
          id: uuid(),
          category: categorie,
          amount: montant,
          date,
          description,
          status: 'PAID',
          payment_method: 'VIREMENT',
          recorded_by: admin?.id ?? null,
        },
      });
      depenses++;
    }
    trace(`${depenses} dépenses enregistrées`);
  });
}

main()
  .catch((e) => {
    console.error('\n  ÉCHEC :', e.message);
    if (e.meta) console.error('  ', JSON.stringify(e.meta));
    process.exitCode = 1;
  })
  .finally(async () => {
    await unscopedPrisma.$disconnect().catch(() => {});
  });
