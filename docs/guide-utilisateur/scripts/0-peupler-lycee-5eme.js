/**
 * Ajoute une seconde classe — 5ème A — au lycée de démonstration.
 *
 * Raison d'être : l'espace Propriétaire est un outil de **comparaison**. Avec
 * une seule classe, le classement des classes n'a qu'une ligne, le filtre par
 * classe n'offre aucun choix (il se masque de lui-même), et « effectif moyen
 * par classe » égale l'effectif tout court. Rien de ce que l'écran sait faire
 * n'est démontrable.
 *
 * La 5ème A est volontairement **plus faible et moins assidue** que la 6ème A :
 * un écart entre les deux classes est ce qui rend lisibles le classement, les
 * écarts-types et les alertes.
 *
 * Réutilise les matières et les enseignants existants. Idempotent.
 *
 *   node scripts/0-peupler-lycee-5eme.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RACINE_DEPOT = path.resolve(__dirname, '..', '..', '..');
const bcrypt = require(path.join(RACINE_DEPOT, 'apps/api/node_modules/bcryptjs'));
const { DOSSIERS } = require('./config');

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

let graine = 55555;
function alea() {
  graine = (graine * 1103515245 + 12345) % 2147483648;
  return graine / 2147483648;
}
const entre = (min, max) => min + alea() * (max - min);
const note = (min, max) => Math.round(entre(min, max) * 4) / 4;

function motDePasse() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from({ length: 14 }, () => a[crypto.randomInt(a.length)]).join('');
}

/** 18 élèves de 5ème, nés un an avant ceux de 6ème. */
const ELEVES = [
  ['Abdoul', 'Sanogo', 'M', '2012-04-18', 'Abidjan'],
  ['Akissi', 'N’Dri', 'F', '2012-09-02', 'Bouaké'],
  ['Alain', 'Tapé', 'M', '2013-01-25', 'Daloa'],
  ['Awa', 'Camara', 'F', '2012-06-11', 'Abidjan'],
  ['Blaise', 'Kouassi', 'M', '2012-11-07', 'Yamoussoukro'],
  ['Carine', 'Ahoua', 'F', '2013-02-19', 'Abidjan'],
  ['Djibril', 'Diallo', 'M', '2012-08-23', 'Korhogo'],
  ['Estelle', 'Bohoussou', 'F', '2012-12-14', 'Abidjan'],
  ['Fabrice', 'Yeboua', 'M', '2013-03-30', 'Abengourou'],
  ['Hawa', 'Bamba', 'F', '2012-05-05', 'Man'],
  ['Idriss', 'Coulibaly', 'M', '2012-10-21', 'Odienné'],
  ['Josiane', 'Kablan', 'F', '2013-01-09', 'Abidjan'],
  ['Kevin', 'Gnaba', 'M', '2012-07-16', 'Gagnoa'],
  ['Mariam', 'Fofana', 'F', '2012-03-28', 'Abidjan'],
  ['Patrick', 'Adou', 'M', '2013-04-12', 'Divo'],
  ['Salimata', 'Koné', 'F', '2012-09-26', 'Ferkessédougou'],
  ['Thierry', 'Ouattara', 'M', '2012-12-03', 'Abidjan'],
  ['Viviane', 'Ekra', 'F', '2013-02-07', 'Agboville'],
];

/** Coefficients de 5ème — différents de la 6ème, pour que le filtre se voie. */
const COEFFICIENTS = {
  FRA: 4, MAT: 4, ANG: 3, HG: 2, SVT: 2, PC: 2, ECM: 1, EPS: 1,
};
const HEURES = { FRA: 5, MAT: 5, ANG: 4, HG: 3, SVT: 2, PC: 3, ECM: 1, EPS: 2 };

const GRILLE = {
  MONDAY: ['MAT', 'MAT', 'FRA', 'ANG', 'PC', 'HG', 'EPS'],
  TUESDAY: ['FRA', 'FRA', 'MAT', 'SVT', 'ANG', 'PC', 'ECM'],
  WEDNESDAY: ['MAT', 'ANG', 'FRA', 'HG', 'EPS', null, null],
  THURSDAY: ['FRA', 'MAT', 'PC', 'SVT', 'ANG', 'HG', 'MAT'],
  FRIDAY: ['MAT', 'FRA', 'ECM', 'ANG', 'SVT', 'HG', 'FRA'],
};

const EVALUATIONS = [
  { nom: 'Devoir 1', numero: 1, coefficient: 1 },
  { nom: 'Devoir 2', numero: 2, coefficient: 1 },
  { nom: 'Composition', numero: 3, coefficient: 2 },
];

const trace = (m) => console.log('  ' + m);
const comptes = [];

async function main() {
  const ecole = await unscopedPrisma.establishment.findFirst({
    where: { code: CODE_ECOLE },
    select: { id: true, name: true, code: true },
  });
  if (!ecole) throw new Error(`Établissement « ${CODE_ECOLE} » introuvable.`);
  console.log(`\n  ${ecole.name}\n`);

  await runWithEstablishment(ecole.id, async () => {
    const annee = await prisma.academicYear.findFirst({ where: { name: '2025-2026' } });
    const trimestres = await prisma.semesters.findMany({
      where: { academic_year_id: annee.id },
      orderBy: { start_date: 'asc' },
    });
    const matieres = new Map(
      (await prisma.subjects.findMany()).map((m) => [m.code, m]),
    );
    const enseignants = await prisma.teachers.findMany();
    const parMatiere = new Map();
    for (const e of enseignants) {
      for (const [code, m] of matieres) {
        if (e.specialties === m.name) parMatiere.set(code, e);
      }
    }
    const salle = await prisma.classrooms.findFirst({ where: { name: 'Salle 12' } });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    // ── La classe ──────────────────────────────────────────────────────────
    let classe = await prisma.schoolClass.findFirst({ where: { name: '5ème A' } });
    if (!classe) {
      classe = await prisma.schoolClass.create({
        data: { id: uuid(), name: '5ème A', level: '5EME', capacity: 30, cycle: 'SECONDAIRE' },
      });
    }
    trace(`Classe ${classe.name}`);

    // Une seconde salle : sans elle, les deux classes se partagent la même et
    // l'écran Ressources signalerait un conflit permanent.
    let salle2 = await prisma.classrooms.findFirst({ where: { name: 'Salle 8' } });
    if (!salle2) {
      salle2 = await prisma.classrooms.create({
        data: { id: uuid(), name: 'Salle 8', capacity: 30, updated_at: new Date() },
      });
      trace('Salle 8 créée');
    }

    // ── Grille et affectations ─────────────────────────────────────────────
    for (const [code, coefficient] of Object.entries(COEFFICIENTS)) {
      const matiere = matieres.get(code);
      const prof = parMatiere.get(code);
      if (!matiere || !prof) continue;

      const existe = await prisma.class_subjects.findFirst({
        where: { class_id: classe.id, subject_id: matiere.id },
      });
      if (!existe) {
        await prisma.class_subjects.create({
          data: {
            id: uuid(),
            class_id: classe.id,
            subject_id: matiere.id,
            teacher_id: prof.id,
            hours_per_week: HEURES[code],
            coefficient,
          },
        });
      }
      const affecte = await prisma.teacher_class_assignments.findFirst({
        where: { teacher_id: prof.id, class_id: classe.id, subject_id: matiere.id, academic_year_id: annee.id },
      });
      if (!affecte) {
        await prisma.teacher_class_assignments.create({
          data: {
            id: uuid(), teacher_id: prof.id, class_id: classe.id, subject_id: matiere.id,
            academic_year_id: annee.id, updated_at: new Date(),
          },
        });
      }
    }
    trace(`Grille de ${Object.keys(COEFFICIENTS).length} matières`);

    const principal = parMatiere.get('MAT');
    const dejaPrincipal = await prisma.class_main_teachers.findFirst({
      where: { class_id: classe.id, academic_year_id: annee.id },
    });
    if (!dejaPrincipal && principal) {
      await prisma.class_main_teachers.create({
        data: {
          id: uuid(), academic_year_id: annee.id, teacher_id: principal.id,
          class_id: classe.id, updated_at: new Date(),
        },
      });
      trace(`Professeur principal : ${principal.first_name} ${principal.last_name}`);
    }

    // ── Emploi du temps ────────────────────────────────────────────────────
    const creneaux = (await prisma.horaires.findMany({ where: { type: 'COURS' }, orderBy: { start_time: 'asc' } }));
    let poses = 0;
    for (const [jour, codes] of Object.entries(GRILLE)) {
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        if (!code || !creneaux[i]) continue;
        const matiere = matieres.get(code);
        const prof = parMatiere.get(code);
        if (!matiere || !prof) continue;
        const existe = await prisma.class_timetables.findFirst({
          where: { academic_year_id: annee.id, class_id: classe.id, day_of_week: jour, start_time: creneaux[i].start_time },
        });
        if (existe) continue;
        await prisma.class_timetables.create({
          data: {
            id: uuid(), academic_year_id: annee.id, class_id: classe.id, day_of_week: jour,
            start_time: creneaux[i].start_time, end_time: creneaux[i].end_time,
            subject_id: matiere.id, teacher_id: prof.id, classroom_id: salle2.id,
            updated_at: new Date(),
          },
        });
        poses++;
      }
    }
    trace(`Emploi du temps : ${poses} séances`);

    // ── Élèves, comptes, inscriptions, parents ─────────────────────────────
    const eleves = [];
    let rang = 100;
    for (const [prenom, nom, genre, naissance, lieu] of ELEVES) {
      rang++;
      const matricule = `2026-${String(rang).padStart(4, '0')}`;
      let eleve = await prisma.student.findFirst({ where: { studentNumber: matricule } });
      if (!eleve) {
        const mdp = motDePasse();
        const emailEleve = `eleve-${matricule}.${ecole.code}@comptes.souverain.local`;
        const u = await prisma.user.create({
          data: {
            id: uuid(), email: emailEleve, passwordHash: await bcrypt.hash(mdp, 12),
            role: 'STUDENT', firstName: prenom, lastName: nom, isActive: true, updatedAt: new Date(),
          },
        });
        eleve = await prisma.student.create({
          data: {
            id: uuid(), userId: u.id, studentNumber: matricule, firstName: prenom, lastName: nom,
            dateOfBirth: new Date(naissance), placeOfBirth: lieu, gender: genre,
            nationality: 'Ivoirienne', classId: classe.id, enrollmentDate: new Date('2025-09-15'),
            status: 'ACTIVE', isStateAssigned: rang % 6 === 0, generatedPassword: mdp,
            updatedAt: new Date(),
          },
        });
        comptes.push({ nom: `${prenom} ${nom}`, matricule, email: emailEleve, motDePasse: mdp });
      }
      eleves.push(eleve);

      const inscrit = await prisma.inscriptions.findFirst({
        where: { academic_year_id: annee.id, class_id: classe.id, student_id: eleve.id },
      });
      if (!inscrit) {
        await prisma.inscriptions.create({
          data: {
            id: uuid(), academic_year_id: annee.id, class_id: classe.id,
            student_id: eleve.id, updated_at: new Date(),
          },
        });
      }

      const emailParent = `parent.${nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')}${rang}@example.com`;
      let parent = await prisma.parents.findFirst({ where: { email: emailParent } });
      if (!parent) {
        const relation = rang % 2 === 0 ? 'MERE' : 'PERE';
        const mdp = motDePasse();
        const u = await prisma.user.create({
          data: {
            id: uuid(), email: emailParent, passwordHash: await bcrypt.hash(mdp, 12),
            role: 'PARENT', firstName: relation === 'MERE' ? 'Clarisse' : 'Bernard',
            lastName: nom, isActive: true, updatedAt: new Date(),
          },
        });
        parent = await prisma.parents.create({
          data: {
            id: uuid(), user_id: u.id, first_name: relation === 'MERE' ? 'Clarisse' : 'Bernard',
            last_name: nom, relation, phone: `05 ${String(40 + (rang % 50)).padStart(2, '0')} 12 34 ${String(rang % 100).padStart(2, '0')}`,
            email: emailParent, profession: 'Commerçant(e)', is_primary_contact: true,
            is_financial_responsible: true, generated_password: mdp, updated_at: new Date(),
          },
        });
        await prisma.student_parents.create({
          data: { id: uuid(), student_id: eleve.id, parent_id: parent.id, relation },
        });
      }
    }
    trace(`${eleves.length} élèves inscrits, avec parents`);

    // ── Types d'évaluation et notes des trois trimestres ───────────────────
    const typesParMatiere = new Map();
    for (const code of Object.keys(COEFFICIENTS)) {
      const matiere = matieres.get(code);
      const prof = parMatiere.get(code);
      if (!matiere || !prof) continue;
      const liste = [];
      for (const ev of EVALUATIONS) {
        let type = await prisma.evaluation_types.findFirst({
          where: { name: ev.nom, class_id: classe.id, subject_id: matiere.id, academic_year_id: annee.id },
        });
        if (!type) {
          type = await prisma.evaluation_types.create({
            data: {
              id: uuid(), name: ev.nom, teacher_id: prof.id, academic_year_id: annee.id,
              class_id: classe.id, subject_id: matiere.id, coefficient: ev.coefficient,
              number: ev.numero, max_note: 20, updated_at: new Date(),
            },
          });
        }
        liste.push(type);
      }
      typesParMatiere.set(code, liste);
    }

    // Niveau moyen plus bas qu'en 6ème : c'est l'écart qui rend le classement
    // et les alertes lisibles.
    let notes = 0;
    for (const trimestre of trimestres) {
      for (const [index, eleve] of eleves.entries()) {
        const niveau = 6.5 + ((index * 29) % 80) / 10 + entre(-0.4, 0.6);
        for (const [code, types] of typesParMatiere) {
          const matiere = matieres.get(code);
          const prof = parMatiere.get(code);
          for (const type of types) {
            const existe = await prisma.grades.findFirst({
              where: { student_id: eleve.id, evaluation_type_id: type.id, semester_id: trimestre.id },
            });
            if (existe) continue;
            await prisma.grades.create({
              data: {
                id: uuid(), academic_year_id: annee.id, teacher_id: prof.id,
                subject_id: matiere.id, semester_id: trimestre.id, student_id: eleve.id,
                class_id: classe.id, evaluation_type_id: type.id,
                note: Math.max(0, Math.min(20, note(niveau - 3, niveau + 3))),
                max_note: 20, updated_at: new Date(),
              },
            });
            notes++;
          }
        }
      }
    }
    trace(`${notes} notes saisies sur les trois trimestres`);

    // ── Conduite ───────────────────────────────────────────────────────────
    let conduites = 0;
    for (const trimestre of trimestres) {
      for (const eleve of eleves) {
        const existe = await prisma.conduct_grades.findFirst({
          where: { student_id: eleve.id, semester_id: trimestre.id },
        });
        if (existe) continue;
        const heures = Math.round(entre(0, 12) * 2) / 2;
        const penalite = Math.round((heures / 2) * 100) / 100;
        const finale = Math.max(0, 20 - penalite);
        await prisma.conduct_grades.create({
          data: {
            id: uuid(), academic_year_id: annee.id, semester_id: trimestre.id,
            class_id: classe.id, student_id: eleve.id, base_note: 20,
            absence_hours: heures, penalty: penalite, computed_note: finale,
            final_note: finale, is_validated: true, computed_at: new Date(),
            validated_at: new Date(), updated_at: new Date(),
          },
        });
        conduites++;
      }
    }
    trace(`${conduites} notes de conduite`);

    // ── Bulletins des deux premiers trimestres ─────────────────────────────
    for (const trimestre of trimestres.slice(0, 2)) {
      const existe = await prisma.bulletin_releases.findFirst({
        where: { semester_id: trimestre.id, class_id: classe.id },
      });
      if (existe) continue;
      await prisma.bulletin_releases.create({
        data: {
          id: uuid(), academic_year_id: annee.id, semester_id: trimestre.id,
          class_id: classe.id, generated_at: new Date(trimestre.end_date),
          generated_by: admin?.id ?? null, updated_at: new Date(),
        },
      });
    }
    trace('Bulletins des trimestres 1 et 2 générés');
  });

  if (comptes.length) {
    const fichier = path.join(DOSSIERS.sessions, 'lycee-comptes.json');
    const tout = fs.existsSync(fichier) ? JSON.parse(fs.readFileSync(fichier, 'utf8')) : {};
    tout.eleves5eme = comptes;
    fs.writeFileSync(fichier, JSON.stringify(tout, null, 2), 'utf8');
    console.log(`\n  ${comptes.length} comptes élèves consignés dans sessions/lycee-comptes.json`);
  }
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
