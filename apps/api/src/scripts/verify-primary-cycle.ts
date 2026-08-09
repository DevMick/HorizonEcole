/**
 * Vérification de bout en bout du cycle primaire (`pnpm --filter api verify:primary`).
 *
 * Crée une classe CM1 jetable, installe sa grille, ouvre les compositions du
 * niveau, saisit des notes, contrôle les moyennes et les rangs, vérifie le cas
 * particulier de l'examen blanc CM2 (EPS ajoutée, diviseur 9,5), produit les
 * PDF — puis supprime tout ce qu'elle a créé.
 *
 * Les valeurs attendues sont écrites en dur : c'est ce qui en fait un test.
 * Une classe CM1 note sur 170 points ramenés sur 20 (÷ 8,5), donc 149 points
 * valent 17,53 — si un jour le calcul dérive, le script échoue ici.
 */
import '../load-env';
import { prisma, runWithEstablishment, unscopedPrisma } from '@school/database';
import { randomUUID } from 'crypto';
import { provisionClass, getClassGrid } from '../services/primary/primary-class.service';
import * as evaluations from '../services/primary/primary-evaluation.service';
import { saveGrades, getEntryGrid } from '../services/primary/primary-grade.service';
import { computeEvaluationResults } from '../services/primary/primary-results.service';
import {
  generateRankingSheetPDF,
  generateClassBulletinsPDF,
} from '../services/primary/primary-pdf.service';

// Court : `students.student_number` est un VARCHAR(20).
const SUFFIX = String(Date.now()).slice(-8);
const CLASS_NAME = `ZZ-SMOKE-CM1 ${SUFFIX}`;

async function main() {
  const classId = randomUUID();
  const studentIds: string[] = [];
  let yearId = '';
  let createdYear = false;

  try {
    // --- Année scolaire (réutilise l'année en cours si elle existe) ---
    const existingYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    if (existingYear) {
      yearId = existingYear.id;
    } else {
      yearId = randomUUID();
      await prisma.academicYear.create({
        data: { id: yearId, name: `2098-2099`, startYear: 2098, endYear: 2099 },
      });
      createdYear = true;
    }
    console.log('Année    :', yearId);

    // --- Classe CM1 du primaire ---
    await prisma.schoolClass.create({
      data: { id: classId, name: CLASS_NAME, level: 'CM1', cycle: 'PRIMAIRE' },
    });
    console.log('Classe   :', CLASS_NAME);

    // --- Provisionnement de la grille ---
    await provisionClass(classId);
    const grid = await getClassGrid(classId);
    console.log(
      'Grille   :',
      grid.subjects.map((s) => `${s.name}/${s.maxScore}`).join(' + '),
      '| total',
      grid.totalMaxScore,
      '| ÷',
      grid.settings?.divisor,
      '→ /' + grid.settings?.averageScale,
    );

    const expectedDivisor = 8.5;
    if (grid.settings?.divisor !== expectedDivisor) {
      throw new Error(`Diviseur CM1 attendu ${expectedDivisor}, obtenu ${grid.settings?.divisor}`);
    }

    // --- Élèves ---
    const roster = [
      { first: 'Awa', last: 'KONE', gender: 'F' },
      { first: 'Yao', last: 'BAMBA', gender: 'M' },
      { first: 'Ines', last: 'DIALLO', gender: 'F' },
    ];
    for (const [index, person] of roster.entries()) {
      const id = randomUUID();
      studentIds.push(id);
      await prisma.student.create({
        data: {
          id,
          studentNumber: `SMOKE-${SUFFIX}-${index}`,
          firstName: person.first,
          lastName: person.last,
          dateOfBirth: new Date('2015-05-10'),
          gender: person.gender,
          classId,
          enrollmentDate: new Date(),
        },
      });
    }
    console.log('Élèves   :', roster.length);

    // --- Compositions du niveau ---
    const created = await evaluations.provisionDefaults(classId, yearId);
    console.log('Composit.:', created.map((e) => e.name).join(', '));

    const first = created[0];
    const detail = await evaluations.getById(first.id);

    // --- Saisie des notes ---
    // Awa : 45+40+16+48 = 149 → 149/8,5 = 17,53
    // Yao : 25+30+10+20 =  85 →  85/8,5 = 10,00
    // Inès: 10+12+ 5+ 8 =  35 →  35/8,5 =  4,12
    const noteTable = [
      [45, 40, 16, 48],
      [25, 30, 10, 20],
      [10, 12, 5, 8],
    ];
    const entries = studentIds.flatMap((studentId, row) =>
      detail.subjects!.map((subject, col) => ({
        studentId,
        subjectId: subject.subjectId,
        note: noteTable[row][col],
      })),
    );
    const saved = await saveGrades(first.id, entries);
    console.log('Notes    :', saved.saved, 'enregistrées');

    const entryGrid = await getEntryGrid(first.id);
    if (entryGrid.students.length !== 3) throw new Error('Tableau de saisie incomplet');

    // --- Résultats ---
    const results = await computeEvaluationResults(first.id);
    console.log('\nRésultats :');
    results.results.forEach((r) => {
      console.log(
        `  ${String(r.rank ?? '-').padStart(2)}. ${r.fullName.padEnd(14)} total ${String(r.total).padStart(6)} → ${String(r.average).padStart(6)}  ${r.mention}  ${r.status}`,
      );
    });
    console.log(
      '  Moyenne de classe :',
      results.stats.classAverage,
      '| admis',
      results.recap.total.admitted,
      '| redoublants',
      results.recap.total.repeating,
      '| réussite',
      results.stats.successRate + ' %',
    );

    const awa = results.results.find((r) => r.lastName === 'KONE');
    if (awa?.average !== 17.53) throw new Error(`Moyenne attendue 17.53, obtenue ${awa?.average}`);
    if (awa?.rank !== 1) throw new Error(`Rang attendu 1, obtenu ${awa?.rank}`);
    if (awa?.status !== 'ADMIS') throw new Error(`Statut attendu ADMIS, obtenu ${awa?.status}`);

    const ines = results.results.find((r) => r.lastName === 'DIALLO');
    if (ines?.status !== 'REDOUBLE') throw new Error(`Statut attendu REDOUBLE, obtenu ${ines?.status}`);

    // --- Absence ---
    await saveGrades(first.id, [
      { studentId: studentIds[1], subjectId: detail.subjects![0].subjectId, isAbsent: true },
    ]);
    const afterAbsence = await computeEvaluationResults(first.id);
    const yao = afterAbsence.results.find((r) => r.lastName === 'BAMBA');
    if (!yao?.isAbsent || yao.average !== null) throw new Error('Absence non prise en compte');
    console.log('\nAbsence  : Yao écarté du classement ✓');

    // --- Examen blanc CM2 : vérifie le diviseur 9,5 sur une classe CM2 ---
    const cm2Id = randomUUID();
    await prisma.schoolClass.create({
      data: { id: cm2Id, name: `ZZ-SMOKE-CM2 ${SUFFIX}`, level: 'CM2', cycle: 'PRIMAIRE' },
    });
    await provisionClass(cm2Id);
    const exam = await evaluations.create({
      academicYearId: yearId,
      classId: cm2Id,
      name: 'EXAMEN BLANC 1',
      date: new Date(),
    });
    console.log(
      'CM2 exam :',
      exam.subjects!.map((s) => `${s.name}/${s.maxScore}`).join(' + '),
      '→ ÷',
      exam.divisor,
      exam.isExam ? '(examen blanc)' : '',
    );
    if (exam.divisor !== 9.5) throw new Error(`Diviseur examen blanc attendu 9.5, obtenu ${exam.divisor}`);
    await prisma.schoolClass.delete({ where: { id: cm2Id } });

    // --- PDF ---
    const ranking = await generateRankingSheetPDF(first.id);
    console.log('\nPDF      : fiche de classement →', ranking);
    const bulletins = await generateClassBulletinsPDF(first.id);
    console.log('PDF      :', bulletins.count, 'bulletins →', bulletins.path);

    console.log('\n✅ Chaîne complète validée.');
  } finally {
    // Nettoyage : la suppression de la classe cascade sur grille, compositions,
    // notes et élèves — on ne laisse rien derrière soi.
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    await prisma.schoolClass.deleteMany({ where: { name: { startsWith: 'ZZ-SMOKE-' } } });
    if (createdYear) await prisma.academicYear.delete({ where: { id: yearId } }).catch(() => {});
    await prisma.$disconnect();
    console.log('🧹 Données de test supprimées.');
  }
}

/**
 * Le script écrit des données d'école : il doit donc s'exécuter dans le
 * contexte d'un établissement, exactement comme une requête authentifiée. À
 * défaut de contexte, la contrainte NOT NULL sur `establishment_id` rejetterait
 * l'écriture — c'est le garde-fou voulu, pas un accident.
 */
async function run() {
  const establishment = await unscopedPrisma.establishment.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });

  if (!establishment) {
    console.error(
      "Aucun établissement en base : créez-en un (page « Créer un établissement ») avant de lancer cette vérification.",
    );
    process.exit(1);
  }

  console.log(`Établissement : ${establishment.name}\n`);
  await runWithEstablishment(establishment.id, main);
}

run().catch(async (error) => {
  console.error('\n❌', error);
  process.exit(1);
});
