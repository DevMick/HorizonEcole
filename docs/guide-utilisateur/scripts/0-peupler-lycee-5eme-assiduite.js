/**
 * Complète la 5ème A par son assiduité : appels par séance, heures d'absence,
 * et recalcul de la conduite à partir de ces heures.
 *
 * Sans cela, la classe restait muette sur tous les écrans d'assiduité — et le
 * filtre par classe de l'espace Propriétaire affichait « — » pour son taux de
 * présence, ce qui donnait l'impression d'un écran cassé alors que la donnée
 * manquait simplement.
 *
 * La 5ème A est délibérément **moins assidue** que la 6ème A : sans écart entre
 * les deux classes, comparer n'apprend rien.
 *
 * La conduite est **recalculée** depuis les absences réellement enregistrées,
 * et non tirée au hasard comme à la création de la classe : une note de
 * conduite qui ne découle pas des appels affichés serait indéfendable devant
 * une famille.
 *
 * Idempotent.
 *
 *   node scripts/0-peupler-lycee-5eme-assiduite.js
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

let graine = 7788991;
function alea() {
  graine = (graine * 1103515245 + 12345) % 2147483648;
  return graine / 2147483648;
}

const trace = (m) => console.log('  ' + m);

/** Un créneau de 50 minutes compte pour une heure de cours. */
const HEURES_PAR_SEANCE = 1;

async function main() {
  const ecole = await unscopedPrisma.establishment.findFirst({
    where: { code: CODE_ECOLE },
    select: { id: true, name: true },
  });
  if (!ecole) throw new Error(`Établissement « ${CODE_ECOLE} » introuvable.`);
  console.log(`\n  ${ecole.name}\n`);

  await runWithEstablishment(ecole.id, async () => {
    const annee = await prisma.academicYear.findFirst({ where: { name: '2025-2026' } });
    const classe = await prisma.schoolClass.findFirst({ where: { name: '5ème A' } });
    if (!classe) throw new Error('Classe « 5ème A » introuvable.');

    const trimestres = await prisma.semesters.findMany({
      where: { academic_year_id: annee.id },
      orderBy: { start_date: 'asc' },
    });
    const eleves = await prisma.student.findMany({
      where: { classId: classe.id },
      orderBy: { lastName: 'asc' },
    });
    const seances = await prisma.class_timetables.findMany({
      where: { class_id: classe.id, academic_year_id: annee.id },
    });
    const reglages = await prisma.conduct_settings.findFirst({
      where: { academic_year_id: annee.id },
    });

    const JOURS = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };
    /** Mêmes huit semaines que la 6ème A, pour que les deux se comparent. */
    const semaines = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(Date.UTC(2025, 8, 22));
      d.setUTCDate(d.getUTCDate() + i * 7);
      return d;
    });

    let seancesCreees = 0;
    let appels = 0;
    /** eleveId → matiereId → heures manquées. */
    const heures = new Map();

    for (const lundi of semaines) {
      for (const s of seances) {
        const decalage = JOURS[s.day_of_week];
        if (!decalage) continue;
        const date = new Date(lundi);
        date.setUTCDate(date.getUTCDate() + decalage - 1);

        let session = await prisma.attendance_sessions.findFirst({
          where: {
            class_id: classe.id,
            subject_id: s.subject_id,
            date,
            start_time: s.start_time,
          },
        });
        if (!session) {
          session = await prisma.attendance_sessions.create({
            data: {
              id: uuid(),
              academic_year_id: annee.id,
              class_id: classe.id,
              subject_id: s.subject_id,
              teacher_id: s.teacher_id,
              date,
              start_time: s.start_time,
              end_time: s.end_time,
              timetable_id: s.id,
              session_number: 1,
              updated_at: new Date(),
            },
          });
          seancesCreees++;
        }

        for (const eleve of eleves) {
          const existe = await prisma.attendance_records.findFirst({
            where: { session_id: session.id, student_id: eleve.id },
          });
          if (existe) continue;
          // ~7 % d'absences, 3 % de retards : sensiblement plus qu'en 6ème A.
          const tirage = alea();
          const statut = tirage < 0.07 ? 'ABSENT' : tirage < 0.1 ? 'LATE' : 'PRESENT';
          const justifiee = statut === 'ABSENT' && alea() < 0.45;
          await prisma.attendance_records.create({
            data: {
              id: uuid(),
              session_id: session.id,
              student_id: eleve.id,
              status: statut,
              is_justified: justifiee,
            },
          });
          appels++;

          // Seules les absences non justifiées pèsent sur la conduite.
          if (statut === 'ABSENT' && !justifiee) {
            if (!heures.has(eleve.id)) heures.set(eleve.id, new Map());
            const parMatiere = heures.get(eleve.id);
            parMatiere.set(
              s.subject_id,
              (parMatiere.get(s.subject_id) ?? 0) + HEURES_PAR_SEANCE,
            );
          }
        }
      }
    }
    trace(`${seancesCreees} séances d'appel, ${appels} pointages`);

    // ── Heures d'absence, matière par matière ──────────────────────────────
    const grille = await prisma.class_subjects.findMany({ where: { class_id: classe.id } });
    const profParMatiere = new Map(grille.map((g) => [g.subject_id, g.teacher_id]));

    let releves = 0;
    for (const [eleveId, parMatiere] of heures) {
      for (const [matiereId, total] of parMatiere) {
        const existe = await prisma.student_absences.findFirst({
          where: {
            student_id: eleveId,
            semester_id: trimestres[0].id,
            subject_id: matiereId,
          },
        });
        if (existe) continue;
        await prisma.student_absences.create({
          data: {
            id: uuid(),
            academic_year_id: annee.id,
            student_id: eleveId,
            class_id: classe.id,
            semester_id: trimestres[0].id,
            subject_id: matiereId,
            teacher_id: profParMatiere.get(matiereId) ?? seances[0].teacher_id,
            hours_absent: total,
            date: new Date(Date.UTC(2025, 9, 15)),
            updated_at: new Date(),
          },
        });
        releves++;
      }
    }
    trace(`${releves} relevés d'heures d'absence`);

    // ── Conduite recalculée sur ces heures ─────────────────────────────────
    // La règle est celle de l'application : 20 au départ, un point par tranche
    // pleine de `hours_per_point` heures manquées sans justificatif.
    const base = Number(reglages?.base_note ?? 20);
    const parPoint = Number(reglages?.hours_per_point ?? 2);

    let recalculees = 0;
    for (const eleve of eleves) {
      const total = [...(heures.get(eleve.id)?.values() ?? [])].reduce((s, v) => s + v, 0);
      const penalite = Math.floor(total / parPoint);
      const finale = Math.max(0, base - penalite);

      const existante = await prisma.conduct_grades.findFirst({
        where: { student_id: eleve.id, semester_id: trimestres[0].id },
      });
      const donnees = {
        base_note: base,
        absence_hours: total,
        penalty: penalite,
        computed_note: finale,
        final_note: finale,
        is_validated: true,
        computed_at: new Date(),
        validated_at: new Date(),
        updated_at: new Date(),
      };
      if (existante) {
        await prisma.conduct_grades.update({ where: { id: existante.id }, data: donnees });
      } else {
        await prisma.conduct_grades.create({
          data: {
            id: uuid(),
            academic_year_id: annee.id,
            semester_id: trimestres[0].id,
            class_id: classe.id,
            student_id: eleve.id,
            ...donnees,
          },
        });
      }
      recalculees++;
    }
    trace(`${recalculees} notes de conduite recalculées sur les absences réelles`);
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
