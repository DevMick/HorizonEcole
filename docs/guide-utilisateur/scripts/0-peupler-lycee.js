/**
 * Peuple « Lycée Moderne de Cocody » avec une classe de 6ème complète, de quoi
 * illustrer les quatre espaces de l'application : administration, enseignant,
 * parent et élève.
 *
 * Les écritures passent par le client Prisma **du projet**, dans un contexte
 * d'établissement (`runWithEstablishment`) : l'extension multi-tenant renseigne
 * alors `establishment_id` d'elle-même, exactement comme le fait l'API après
 * authentification. Écrire avec un client nu laisserait ce champ à null et les
 * données seraient invisibles dans l'application.
 *
 * Le script est **idempotent** : relancé, il complète au lieu de dupliquer.
 *
 *   node scripts/0-peupler-lycee.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RACINE_DEPOT = path.resolve(__dirname, '..', '..', '..');
const bcrypt = require(path.join(RACINE_DEPOT, 'apps/api/node_modules/bcryptjs'));
const { DOSSIERS, assurerDossiers } = require('./config');

// Le paquet lit DATABASE_URL à l'import : on le fournit avant de le charger.
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

/** Mot de passe lisible, du même genre que ceux générés par l'application. */
function motDePasse() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from({ length: 14 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
}

/** Tirage reproductible : deux exécutions donnent les mêmes notes. */
let graine = 20252026;
function alea() {
  graine = (graine * 1103515245 + 12345) % 2147483648;
  return graine / 2147483648;
}
const entre = (min, max) => min + alea() * (max - min);
const note = (min, max) => Math.round(entre(min, max) * 4) / 4;

// ── Référentiel de la 6ème ──────────────────────────────────────────────────

const MATIERES = [
  { code: 'FRA', name: 'Français', coefficient: 4, heures: 5 },
  { code: 'MAT', name: 'Mathématiques', coefficient: 4, heures: 5 },
  { code: 'ANG', name: 'Anglais', coefficient: 2, heures: 4 },
  { code: 'HG', name: 'Histoire-Géographie', coefficient: 2, heures: 3 },
  { code: 'SVT', name: 'Sciences de la Vie et de la Terre', coefficient: 2, heures: 2 },
  { code: 'PC', name: 'Physique-Chimie', coefficient: 2, heures: 2 },
  { code: 'ECM', name: 'Éducation Civique et Morale', coefficient: 1, heures: 1 },
  { code: 'EPS', name: 'Éducation Physique et Sportive', coefficient: 1, heures: 2 },
];

const ENSEIGNANTS = [
  { prenom: 'Koffi', nom: 'N’Guessan', matiere: 'FRA', contrat: 'CDI', principal: true },
  { prenom: 'Awa', nom: 'Sangaré', matiere: 'MAT', contrat: 'CDI' },
  { prenom: 'Serge', nom: 'Bamba', matiere: 'ANG', contrat: 'CDD' },
  { prenom: 'Mariam', nom: 'Coulibaly', matiere: 'HG', contrat: 'CDI' },
  { prenom: 'Jean-Marc', nom: 'Aka', matiere: 'SVT', contrat: 'CDI' },
  { prenom: 'Fatou', nom: 'Diomandé', matiere: 'PC', contrat: 'CDD' },
  { prenom: 'Ibrahim', nom: 'Ouattara', matiere: 'ECM', contrat: 'VACATAIRE' },
  { prenom: 'Nadège', nom: 'Yao', matiere: 'EPS', contrat: 'CDI' },
];

/** 25 élèves de 6ème : 13 filles, 12 garçons, nés en 2013-2014. */
const ELEVES = [
  ['Adjoua', 'Kouadio', 'F', '2013-03-12', 'Abidjan'],
  ['Ahmed', 'Bakayoko', 'M', '2013-07-04', 'Bouaké'],
  ['Aminata', 'Cissé', 'F', '2014-01-19', 'Abidjan'],
  ['Aristide', 'Gnahoré', 'M', '2013-05-27', 'Daloa'],
  ['Assetou', 'Doumbia', 'F', '2013-11-08', 'Korhogo'],
  ['Bakary', 'Traoré', 'M', '2014-02-14', 'Abidjan'],
  ['Bintou', 'Keita', 'F', '2013-09-30', 'Man'],
  ['Cédric', 'Boni', 'M', '2013-04-22', 'Abidjan'],
  ['Christelle', 'Amani', 'F', '2014-03-05', 'Yamoussoukro'],
  ['Désiré', 'Kouamé', 'M', '2013-08-17', 'Abidjan'],
  ['Emmanuella', 'Tanoh', 'F', '2013-12-01', 'Abengourou'],
  ['Franck', 'Zadi', 'M', '2014-05-11', 'Abidjan'],
  ['Grâce', 'Ehoua', 'F', '2013-06-25', 'San-Pédro'],
  ['Habib', 'Fofana', 'M', '2013-10-13', 'Odienné'],
  ['Ines', 'Kacou', 'F', '2014-04-02', 'Abidjan'],
  ['Junior', 'Assi', 'M', '2013-02-28', 'Abidjan'],
  ['Kadidja', 'Touré', 'F', '2013-07-21', 'Ferkessédougou'],
  ['Landry', 'Gbagbo', 'M', '2014-06-09', 'Gagnoa'],
  ['Léa', 'Konan', 'F', '2013-01-16', 'Abidjan'],
  ['Marcel', 'Yapi', 'M', '2013-09-03', 'Bondoukou'],
  ['Nadia', 'Sylla', 'F', '2014-02-24', 'Abidjan'],
  ['Olivier', 'Djédjé', 'M', '2013-11-29', 'Divo'],
  ['Prisca', 'Guei', 'F', '2013-05-07', 'Duékoué'],
  ['Rachelle', 'Koné', 'F', '2014-01-31', 'Abidjan'],
  ['Yann', 'Brou', 'M', '2013-12-18', 'Agboville'],
];

const HORAIRES = [
  ['07:30', '08:20', 'COURS'],
  ['08:20', '09:10', 'COURS'],
  ['09:10', '10:00', 'COURS'],
  ['10:00', '10:15', 'RECREATION'],
  ['10:15', '11:05', 'COURS'],
  ['11:05', '11:55', 'COURS'],
  ['11:55', '14:00', 'PAUSE'],
  ['14:00', '14:50', 'COURS'],
  ['14:50', '15:40', 'COURS'],
];

/** Grille hebdomadaire : jour → créneaux de cours → code matière. */
const GRILLE = {
  MONDAY: ['FRA', 'FRA', 'MAT', 'ANG', 'HG', 'SVT', 'EPS'],
  TUESDAY: ['MAT', 'MAT', 'FRA', 'PC', 'ANG', 'HG', 'ECM'],
  WEDNESDAY: ['FRA', 'ANG', 'MAT', 'SVT', 'EPS', null, null],
  THURSDAY: ['MAT', 'FRA', 'HG', 'PC', 'ANG', 'SVT', 'FRA'],
  FRIDAY: ['FRA', 'MAT', 'ECM', 'ANG', 'HG', 'PC', 'MAT'],
};

const EVALUATIONS = [
  { nom: 'Devoir 1', numero: 1, coefficient: 1 },
  { nom: 'Devoir 2', numero: 2, coefficient: 1 },
  { nom: 'Composition', numero: 3, coefficient: 2 },
];

// ── Peuplement ──────────────────────────────────────────────────────────────

const comptes = { enseignants: [], parents: [], eleves: [] };
const resume = [];
const trace = (m) => {
  console.log('  ' + m);
  resume.push(m);
};

async function main() {
  assurerDossiers();

  const ecole = await unscopedPrisma.establishment.findFirst({
    where: { code: CODE_ECOLE },
    select: { id: true, name: true, code: true, schoolType: true },
  });
  if (!ecole) throw new Error(`Établissement « ${CODE_ECOLE} » introuvable. Lancez d'abord 0-creer-lycee.js.`);
  console.log(`\n  ${ecole.name} — ${ecole.schoolType}\n`);

  await runWithEstablishment(ecole.id, async () => {
    // 1. Année scolaire ─────────────────────────────────────────────────────
    let annee = await prisma.academicYear.findFirst({ where: { name: '2025-2026' } });
    if (!annee) {
      annee = await prisma.academicYear.create({
        data: { id: uuid(), name: '2025-2026', startYear: 2025, endYear: 2026, isCurrent: true },
      });
    }
    trace(`Année scolaire ${annee.name} (en cours)`);

    // 2. Trimestres ─────────────────────────────────────────────────────────
    const TRIMESTRES = [
      ['1er Trimestre', '2025-09-15', '2025-12-19'],
      ['2e Trimestre', '2026-01-05', '2026-03-27'],
      ['3e Trimestre', '2026-04-06', '2026-06-26'],
    ];
    const trimestres = [];
    for (const [nom, debut, fin] of TRIMESTRES) {
      let t = await prisma.semesters.findFirst({ where: { name: nom, academic_year_id: annee.id } });
      if (!t) {
        t = await prisma.semesters.create({
          data: {
            id: uuid(),
            name: nom,
            start_date: new Date(debut),
            end_date: new Date(fin),
            academic_year_id: annee.id,
            coefficient: 1,
            updated_at: new Date(),
          },
        });
      }
      trimestres.push(t);
    }
    trace(`${trimestres.length} trimestres`);

    // 3. Matières ───────────────────────────────────────────────────────────
    const matieres = {};
    for (const m of MATIERES) {
      let s = await prisma.subjects.findFirst({ where: { code: m.code } });
      if (!s) {
        s = await prisma.subjects.create({
          data: { id: uuid(), name: m.name, code: m.code, coefficient: m.coefficient },
        });
      }
      matieres[m.code] = s;
    }
    trace(`${Object.keys(matieres).length} matières`);

    // 4. Classe de 6ème ─────────────────────────────────────────────────────
    let classe = await prisma.schoolClass.findFirst({ where: { name: '6ème A' } });
    if (!classe) {
      classe = await prisma.schoolClass.create({
        data: { id: uuid(), name: '6ème A', level: '6EME', capacity: 30, cycle: 'SECONDAIRE' },
      });
    }
    trace(`Classe ${classe.name} (${classe.cycle})`);

    // 5. Salle de classe ────────────────────────────────────────────────────
    let salle = await prisma.classrooms.findFirst({ where: { name: 'Salle 12' } });
    if (!salle) {
      salle = await prisma.classrooms.create({
        data: { id: uuid(), name: 'Salle 12', capacity: 35, updated_at: new Date() },
      });
    }
    trace(`Salle ${salle.name}`);

    // 6. Créneaux horaires ──────────────────────────────────────────────────
    for (const [debut, fin, type] of HORAIRES) {
      const existe = await prisma.horaires.findFirst({ where: { start_time: debut, end_time: fin } });
      if (!existe) {
        await prisma.horaires.create({
          data: { id: uuid(), start_time: debut, end_time: fin, type },
        });
      }
    }
    trace(`${HORAIRES.length} créneaux horaires`);

    // 7. Enseignants et leurs comptes ───────────────────────────────────────
    const enseignants = {};
    for (const e of ENSEIGNANTS) {
      const email = `${e.prenom}.${e.nom}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z.]/g, '') + '@lyceecocody.edu.ci';

      let ens = await prisma.teachers.findFirst({ where: { email } });
      if (!ens) {
        const mdp = motDePasse();
        const utilisateur = await prisma.user.create({
          data: {
            id: uuid(),
            email,
            passwordHash: await bcrypt.hash(mdp, 12),
            role: 'TEACHER',
            firstName: e.prenom,
            lastName: e.nom,
            isActive: true,
            updatedAt: new Date(),
          },
        });
        ens = await prisma.teachers.create({
          data: {
            id: uuid(),
            first_name: e.prenom,
            last_name: e.nom,
            email,
            phone: '07 00 00 00 0' + (Object.keys(enseignants).length % 10),
            contract_type: e.contrat,
            hire_date: new Date('2025-09-01'),
            specialties: matieres[e.matiere].name,
            qualifications: 'Licence',
            user_id: utilisateur.id,
            generated_password: mdp,
            updated_at: new Date(),
          },
        });
        comptes.enseignants.push({ nom: `${e.prenom} ${e.nom}`, email, motDePasse: mdp, matiere: matieres[e.matiere].name });
      }
      enseignants[e.matiere] = ens;

      // Matière enseignée, puis affectation à la classe pour l'année.
      const lien = await prisma.teacher_subjects.findFirst({
        where: { teacher_id: ens.id, subject_id: matieres[e.matiere].id },
      });
      if (!lien) {
        await prisma.teacher_subjects.create({
          data: { id: uuid(), teacher_id: ens.id, subject_id: matieres[e.matiere].id },
        });
      }
      const affectation = await prisma.teacher_class_assignments.findFirst({
        where: {
          teacher_id: ens.id,
          class_id: classe.id,
          subject_id: matieres[e.matiere].id,
          academic_year_id: annee.id,
        },
      });
      if (!affectation) {
        await prisma.teacher_class_assignments.create({
          data: {
            id: uuid(),
            teacher_id: ens.id,
            class_id: classe.id,
            subject_id: matieres[e.matiere].id,
            academic_year_id: annee.id,
            updated_at: new Date(),
          },
        });
      }
    }
    trace(`${ENSEIGNANTS.length} enseignants, affectés à la 6ème A`);

    // 8. Professeur principal ───────────────────────────────────────────────
    const principal = ENSEIGNANTS.find((e) => e.principal);
    const dejaPrincipal = await prisma.class_main_teachers.findFirst({
      where: { class_id: classe.id, academic_year_id: annee.id },
    });
    if (!dejaPrincipal) {
      await prisma.class_main_teachers.create({
        data: {
          id: uuid(),
          academic_year_id: annee.id,
          teacher_id: enseignants[principal.matiere].id,
          class_id: classe.id,
          updated_at: new Date(),
        },
      });
    }
    trace(`Professeur principal : ${principal.prenom} ${principal.nom}`);

    // 9. Grille de matières de la classe ────────────────────────────────────
    for (const m of MATIERES) {
      const existe = await prisma.class_subjects.findFirst({
        where: { class_id: classe.id, subject_id: matieres[m.code].id },
      });
      if (!existe) {
        await prisma.class_subjects.create({
          data: {
            id: uuid(),
            class_id: classe.id,
            subject_id: matieres[m.code].id,
            teacher_id: enseignants[m.code].id,
            hours_per_week: m.heures,
            coefficient: m.coefficient,
          },
        });
      }
    }
    trace(`Grille de ${MATIERES.length} matières avec coefficients`);

    // 10. Emploi du temps ───────────────────────────────────────────────────
    const creneauxCours = HORAIRES.filter((h) => h[2] === 'COURS');
    let poses = 0;
    for (const [jour, codes] of Object.entries(GRILLE)) {
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        if (!code || !creneauxCours[i]) continue;
        const [debut, fin] = creneauxCours[i];
        const existe = await prisma.class_timetables.findFirst({
          where: {
            academic_year_id: annee.id,
            class_id: classe.id,
            day_of_week: jour,
            start_time: debut,
          },
        });
        if (existe) continue;
        await prisma.class_timetables.create({
          data: {
            id: uuid(),
            academic_year_id: annee.id,
            class_id: classe.id,
            day_of_week: jour,
            start_time: debut,
            end_time: fin,
            subject_id: matieres[code].id,
            teacher_id: enseignants[code].id,
            classroom_id: salle.id,
            updated_at: new Date(),
          },
        });
        poses++;
      }
    }
    trace(`Emploi du temps : ${poses} séances posées`);

    // 11. Élèves, comptes, inscriptions, parents ────────────────────────────
    const eleves = [];
    let rang = 0;
    for (const [prenom, nom, genre, naissance, lieu] of ELEVES) {
      rang++;
      const matricule = `2026-${String(rang).padStart(4, '0')}`;
      let eleve = await prisma.student.findFirst({ where: { studentNumber: matricule } });

      if (!eleve) {
        const mdp = motDePasse();
        const emailEleve = `eleve-${matricule}.${ecole.code}@comptes.souverain.local`;
        const utilisateur = await prisma.user.create({
          data: {
            id: uuid(),
            email: emailEleve,
            passwordHash: await bcrypt.hash(mdp, 12),
            role: 'STUDENT',
            firstName: prenom,
            lastName: nom,
            isActive: true,
            updatedAt: new Date(),
          },
        });
        eleve = await prisma.student.create({
          data: {
            id: uuid(),
            userId: utilisateur.id,
            studentNumber: matricule,
            firstName: prenom,
            lastName: nom,
            dateOfBirth: new Date(naissance),
            placeOfBirth: lieu,
            gender: genre, // la base stocke « F » ou « M »
            nationality: 'Ivoirienne',
            classId: classe.id,
            enrollmentDate: new Date('2025-09-15'),
            status: 'ACTIVE',
            isStateAssigned: rang % 5 === 0,
            generatedPassword: mdp,
            updatedAt: new Date(),
          },
        });
        comptes.eleves.push({ nom: `${prenom} ${nom}`, matricule, email: emailEleve, motDePasse: mdp });
      }
      eleves.push(eleve);

      // Inscription dans la classe pour l'année.
      const inscrit = await prisma.inscriptions.findFirst({
        where: { academic_year_id: annee.id, class_id: classe.id, student_id: eleve.id },
      });
      if (!inscrit) {
        await prisma.inscriptions.create({
          data: {
            id: uuid(),
            academic_year_id: annee.id,
            class_id: classe.id,
            student_id: eleve.id,
            updated_at: new Date(),
          },
        });
      }

      // Un parent par élève, sauf deux fratries pour illustrer le cas.
      const fratrie = rang === 2 ? 1 : rang === 20 ? 19 : null;
      if (fratrie) {
        const aine = eleves[fratrie - 1];
        const lienAine = await prisma.student_parents.findFirst({ where: { student_id: aine.id } });
        if (lienAine) {
          const dejaLie = await prisma.student_parents.findFirst({
            where: { student_id: eleve.id, parent_id: lienAine.parent_id },
          });
          if (!dejaLie) {
            await prisma.student_parents.create({
              data: {
                id: uuid(),
                student_id: eleve.id,
                parent_id: lienAine.parent_id,
                relation: lienAine.relation,
              },
            });
          }
          continue;
        }
      }

      const relation = rang % 2 === 0 ? 'MERE' : 'PERE';
      const prenomParent = relation === 'MERE' ? 'Madeleine' : 'Étienne';
      const emailParent = `parent.${nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')}${rang}@example.com`;

      let parent = await prisma.parents.findFirst({ where: { email: emailParent } });
      if (!parent) {
        const mdp = motDePasse();
        const utilisateur = await prisma.user.create({
          data: {
            id: uuid(),
            email: emailParent,
            passwordHash: await bcrypt.hash(mdp, 12),
            role: 'PARENT',
            firstName: prenomParent,
            lastName: nom,
            isActive: true,
            updatedAt: new Date(),
          },
        });
        parent = await prisma.parents.create({
          data: {
            id: uuid(),
            user_id: utilisateur.id,
            first_name: prenomParent,
            last_name: nom,
            relation,
            phone: `05 ${String(10 + rang).padStart(2, '0')} 45 67 ${String(rang).padStart(2, '0')}`,
            email: emailParent,
            profession: rang % 3 === 0 ? 'Commerçant(e)' : rang % 3 === 1 ? 'Enseignant(e)' : 'Infirmier(ère)',
            is_primary_contact: true,
            is_financial_responsible: true,
            generated_password: mdp,
            updated_at: new Date(),
          },
        });
        comptes.parents.push({
          nom: `${prenomParent} ${nom}`,
          email: emailParent,
          motDePasse: mdp,
          enfant: `${prenom} ${nom}`,
        });
      }

      const lie = await prisma.student_parents.findFirst({
        where: { student_id: eleve.id, parent_id: parent.id },
      });
      if (!lie) {
        await prisma.student_parents.create({
          data: { id: uuid(), student_id: eleve.id, parent_id: parent.id, relation },
        });
      }
    }
    trace(`${eleves.length} élèves inscrits en 6ème A, avec parents rattachés`);

    // 12. Types d'évaluation ────────────────────────────────────────────────
    const typesParMatiere = {};
    for (const m of MATIERES) {
      typesParMatiere[m.code] = [];
      for (const ev of EVALUATIONS) {
        let type = await prisma.evaluation_types.findFirst({
          where: {
            name: ev.nom,
            class_id: classe.id,
            subject_id: matieres[m.code].id,
            academic_year_id: annee.id,
          },
        });
        if (!type) {
          type = await prisma.evaluation_types.create({
            data: {
              id: uuid(),
              name: ev.nom,
              teacher_id: enseignants[m.code].id,
              academic_year_id: annee.id,
              class_id: classe.id,
              subject_id: matieres[m.code].id,
              coefficient: ev.coefficient,
              number: ev.numero,
              max_note: 20,
              updated_at: new Date(),
            },
          });
        }
        typesParMatiere[m.code].push(type);
      }
    }
    trace(`${MATIERES.length * EVALUATIONS.length} types d'évaluation`);

    // 13. Notes du 1er trimestre ────────────────────────────────────────────
    const trimestre = trimestres[0];
    let notesPosees = 0;
    for (const eleve of eleves) {
      // Un niveau propre à chaque élève, pour que le classement ait du sens.
      const niveau = entre(7, 16.5);
      for (const m of MATIERES) {
        for (const type of typesParMatiere[m.code]) {
          const existe = await prisma.grades.findFirst({
            where: { student_id: eleve.id, evaluation_type_id: type.id, semester_id: trimestre.id },
          });
          if (existe) continue;
          await prisma.grades.create({
            data: {
              id: uuid(),
              academic_year_id: annee.id,
              teacher_id: enseignants[m.code].id,
              subject_id: matieres[m.code].id,
              semester_id: trimestre.id,
              student_id: eleve.id,
              class_id: classe.id,
              evaluation_type_id: type.id,
              note: Math.max(0, Math.min(20, note(niveau - 3.5, niveau + 3.5))),
              max_note: 20,
              updated_at: new Date(),
            },
          });
          notesPosees++;
        }
      }
    }
    trace(`${notesPosees} notes saisies au 1er trimestre`);

    // 14. Conduite ──────────────────────────────────────────────────────────
    let reglages = await prisma.conduct_settings.findFirst({ where: { academic_year_id: annee.id } });
    if (!reglages) {
      reglages = await prisma.conduct_settings.create({
        data: {
          id: uuid(),
          academic_year_id: annee.id,
          base_note: 20,
          hours_per_point: 2,
          default_session_hours: 1,
          period_minutes: 50,
          coefficient: 1,
          updated_at: new Date(),
        },
      });
    }
    let conduites = 0;
    for (const eleve of eleves) {
      const existe = await prisma.conduct_grades.findFirst({
        where: { student_id: eleve.id, semester_id: trimestre.id },
      });
      if (existe) continue;
      const heures = Math.round(entre(0, 8) * 2) / 2;
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
    trace(`${conduites} notes de conduite`);

    // 15. Échéancier de paiement ────────────────────────────────────────────
    let echeancier = await prisma.payment_conditions.findFirst({
      where: { name: 'Scolarité 6ème — 3 versements' },
    });
    if (!echeancier) {
      echeancier = await prisma.payment_conditions.create({
        data: {
          id: uuid(),
          name: 'Scolarité 6ème — 3 versements',
          description: 'Inscription à la rentrée, puis deux versements trimestriels.',
          is_active: true,
          updated_at: new Date(),
        },
      });
      const TRANCHES = [
        ['Inscription et 1er versement', 150000, '2025-09-15'],
        ['2e versement', 100000, '2026-01-05'],
        ['3e versement', 100000, '2026-04-06'],
      ];
      let n = 0;
      for (const [libelle, montant, echeance] of TRANCHES) {
        n++;
        await prisma.payment_condition_lines.create({
          data: {
            id: uuid(),
            payment_condition_id: echeancier.id,
            line_number: n,
            label: libelle,
            amount: montant,
            due_date: new Date(echeance),
          },
        });
      }
    }
    // Affectation de l'échéancier à la classe.
    if (!classe.payment_condition_id) {
      await prisma.schoolClass.update({
        where: { id: classe.id },
        data: { payment_condition_id: echeancier.id },
      });
    }
    trace(`Échéancier « ${echeancier.name} » affecté à la 6ème A`);
  });

  // Les identifiants des comptes créés, hors de la base, pour l'utilisateur.
  const fichier = path.join(DOSSIERS.sessions, 'lycee-comptes.json');
  let anciens = {};
  if (fs.existsSync(fichier)) {
    try {
      anciens = JSON.parse(fs.readFileSync(fichier, 'utf8'));
    } catch {
      anciens = {};
    }
  }
  const fusion = {
    etablissement: 'Lycée Moderne de Cocody',
    enseignants: [...(anciens.enseignants || []), ...comptes.enseignants],
    parents: [...(anciens.parents || []), ...comptes.parents],
    eleves: [...(anciens.eleves || []), ...comptes.eleves],
  };
  fs.writeFileSync(fichier, JSON.stringify(fusion, null, 2), 'utf8');

  console.log(`\n  Comptes créés : ${comptes.enseignants.length} enseignants, ` +
    `${comptes.parents.length} parents, ${comptes.eleves.length} élèves`);
  console.log(`  Identifiants écrits dans sessions/lycee-comptes.json`);
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
