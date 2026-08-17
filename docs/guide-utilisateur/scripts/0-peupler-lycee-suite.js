/**
 * Complète le peuplement du lycée : notes des trois trimestres, conduite
 * trimestrielle, et surtout l'assiduité — appels par séance et heures
 * d'absence.
 *
 * Pourquoi une seconde passe : la première ne remplissait que le 1er trimestre.
 * Or l'application se place d'elle-même sur le trimestre « actif », déduit de
 * la date du jour ; l'écran de saisie des notes s'ouvrait donc sur un trimestre
 * vide. Et sans appel enregistré, quatre écrans restaient muets : la liste de
 * présence de l'administration, celle de l'enseignant, les présences du parent
 * et celles de l'élève — la conduite, calculée à partir des absences, n'avait
 * elle non plus rien à montrer.
 *
 * Idempotent : relancé, il ne double aucune ligne.
 *
 *   node scripts/0-peupler-lycee-suite.js
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

let graine = 987654321;
function alea() {
  graine = (graine * 1103515245 + 12345) % 2147483648;
  return graine / 2147483648;
}
const entre = (min, max) => min + alea() * (max - min);
const note = (min, max) => Math.round(entre(min, max) * 4) / 4;

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
    const trimestres = await prisma.semesters.findMany({
      where: { academic_year_id: annee.id },
      orderBy: { start_date: 'asc' },
    });
    const eleves = await prisma.student.findMany({
      where: { classId: classe.id },
      orderBy: { lastName: 'asc' },
    });
    const grille = await prisma.class_subjects.findMany({
      where: { class_id: classe.id },
      include: { subjects: true },
    });
    const types = await prisma.evaluation_types.findMany({
      where: { class_id: classe.id, academic_year_id: annee.id },
    });

    // ── Notes des 2e et 3e trimestres ──────────────────────────────────────
    // Le niveau d'un élève reste cohérent d'un trimestre à l'autre : sans cela,
    // le classement annuel n'aurait aucun sens et le bulletin serait absurde.
    const niveaux = new Map(eleves.map((e, i) => [e.id, 7 + ((i * 37) % 95) / 10]));
    let posees = 0;
    for (const trimestre of trimestres.slice(1)) {
      for (const eleve of eleves) {
        const niveau = niveaux.get(eleve.id) + entre(-0.6, 0.8); // légère progression
        for (const cs of grille) {
          for (const type of types.filter((t) => t.subject_id === cs.subject_id)) {
            const existe = await prisma.grades.findFirst({
              where: {
                student_id: eleve.id,
                evaluation_type_id: type.id,
                semester_id: trimestre.id,
              },
            });
            if (existe) continue;
            await prisma.grades.create({
              data: {
                id: uuid(),
                academic_year_id: annee.id,
                teacher_id: type.teacher_id,
                subject_id: cs.subject_id,
                semester_id: trimestre.id,
                student_id: eleve.id,
                class_id: classe.id,
                evaluation_type_id: type.id,
                note: Math.max(0, Math.min(20, note(niveau - 3.5, niveau + 3.5))),
                max_note: 20,
                updated_at: new Date(),
              },
            });
            posees++;
          }
        }
      }
    }
    trace(`${posees} notes ajoutées (2e et 3e trimestres)`);

    // ── Appels par séance ──────────────────────────────────────────────────
    // Huit semaines du 1er trimestre, sur l'emploi du temps réel de la classe.
    const seances = await prisma.class_timetables.findMany({
      where: { class_id: classe.id, academic_year_id: annee.id },
    });
    const JOURS = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };

    /** Lundi de la semaine du 22 septembre 2025, puis huit semaines. */
    const semaines = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(Date.UTC(2025, 8, 22));
      d.setUTCDate(d.getUTCDate() + i * 7);
      return d;
    });

    let seancesCreees = 0;
    let appels = 0;
    const heuresParEleve = new Map();
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
          // ~4 % d'absences, 2 % de retards : une classe ordinaire.
          const tirage = alea();
          const statut = tirage < 0.04 ? 'ABSENT' : tirage < 0.06 ? 'LATE' : 'PRESENT';
          await prisma.attendance_records.create({
            data: {
              id: uuid(),
              session_id: session.id,
              student_id: eleve.id,
              status: statut,
              is_justified: statut === 'ABSENT' ? alea() < 0.5 : false,
            },
          });
          appels++;
          if (statut === 'ABSENT') {
            heuresParEleve.set(eleve.id, (heuresParEleve.get(eleve.id) || 0) + 1);
          }
        }
      }
    }
    trace(`${seancesCreees} séances d'appel, ${appels} présences enregistrées`);

    // ── Heures d'absence par matière, base du calcul de la conduite ────────
    let absences = 0;
    for (const [eleveId, heures] of heuresParEleve) {
      const cs = grille[Math.floor(alea() * grille.length)];
      const existe = await prisma.student_absences.findFirst({
        where: {
          student_id: eleveId,
          semester_id: trimestres[0].id,
          subject_id: cs.subject_id,
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
          subject_id: cs.subject_id,
          teacher_id: cs.teacher_id,
          hours_absent: heures,
          date: new Date(Date.UTC(2025, 9, 15)),
          updated_at: new Date(),
        },
      });
      absences++;
    }
    trace(`${absences} relevés d'heures d'absence`);

    // ── Conduite des 2e et 3e trimestres ───────────────────────────────────
    let conduites = 0;
    for (const trimestre of trimestres.slice(1)) {
      for (const eleve of eleves) {
        const existe = await prisma.conduct_grades.findFirst({
          where: { student_id: eleve.id, semester_id: trimestre.id },
        });
        if (existe) continue;
        const heures = Math.round(entre(0, 6) * 2) / 2;
        const penalite = Math.round((heures / 2) * 100) / 100;
        const finale = Math.max(0, 20 - penalite);
        await prisma.conduct_grades.create({
          data: {
            id: uuid(),
            academic_year_id: annee.id,
            semester_id: trimestre.id,
            class_id: classe.id,
            student_id: eleve.id,
            base_note: 20,
            absence_hours: heures,
            penalty: penalite,
            computed_note: finale,
            final_note: finale,
            is_validated: true,
            computed_at: new Date(),
            validated_at: new Date(),
            updated_at: new Date(),
          },
        });
        conduites++;
      }
    }
    trace(`${conduites} notes de conduite ajoutées`);
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
