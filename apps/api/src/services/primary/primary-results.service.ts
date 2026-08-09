import { prisma } from '@school/database';
import { getMention, type PrimaryScale } from './class-profiles';

/**
 * Moyennes, rangs et statistiques d'une composition du primaire.
 *
 * Le calcul tient en une ligne — `moyenne = somme des notes / diviseur` — mais
 * tout est dans ce qu'on met dans la somme :
 *
 *  - une matière **non saisie** compte 0. Un tableau incomplet donne donc une
 *    moyenne basse, jamais une moyenne « optimiste » calculée sur un sous-
 *    ensemble : `missingCount` permet à l'écran de signaler la saisie en cours.
 *  - un élève **absent** (au moins une matière marquée absente) est écarté du
 *    classement et des statistiques, comme sur les fiches papier, mais reste
 *    listé pour que l'enseignant le voie.
 *  - un élève **sans aucune note** n'est pas classé non plus : il n'a pas
 *    composé, ce n'est pas un zéro.
 */

const round2 = (value: number) => Math.round(value * 100) / 100;

export type PrimaryStudentStatus = 'ADMIS' | 'EXAMEN' | 'REDOUBLE' | 'NON_CLASSE';

export interface PrimaryStudentResult {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  notes: Record<string, number | null>;
  total: number;
  average: number | null;
  rank: number | null;
  isExAequo: boolean;
  mention: string | null;
  status: PrimaryStudentStatus;
  isAbsent: boolean;
  missingCount: number;
  gradedCount: number;
}

/**
 * Statut d'un élève au regard des seuils de sa classe. Entre les deux seuils,
 * la décision n'est pas automatique : elle revient au conseil des maîtres,
 * d'où `EXAMEN` plutôt qu'un arbitrage arbitraire.
 */
function resolveStatus(
  average: number | null,
  thresholds: { admission: number; redoublement: number },
): PrimaryStudentStatus {
  if (average === null) return 'NON_CLASSE';
  if (average >= thresholds.admission) return 'ADMIS';
  if (average < thresholds.redoublement) return 'REDOUBLE';
  return 'EXAMEN';
}

/** Ligne classable : une moyenne à comparer, un rang et un ex æquo à écrire. */
interface Rankable {
  rank: number | null;
  isExAequo: boolean;
}

/**
 * Rangs par moyenne décroissante, avec ex æquo : deux élèves à égalité
 * partagent le même rang, et le rang suivant saute d'autant (1, 2, 2, 4).
 *
 * `getAverage` dit où lire la moyenne : `average` sur une composition,
 * `yearAverage` sur le bilan annuel. Sans ce paramètre, un classement annuel
 * lirait un champ absent et donnerait tout le monde premier ex æquo.
 */
function assignRanks<T extends Rankable>(
  results: T[],
  getAverage: (row: T) => number | null = (row) =>
    (row as unknown as PrimaryStudentResult).average,
): void {
  const ranked = results
    .filter((result) => getAverage(result) !== null)
    .sort((left, right) => (getAverage(right) ?? 0) - (getAverage(left) ?? 0));

  let previousAverage: number | null = null;
  let previousRank = 0;

  ranked.forEach((result, index) => {
    const average = getAverage(result);
    const rank = previousAverage !== null && average === previousAverage ? previousRank : index + 1;
    result.rank = rank;
    previousAverage = average;
    previousRank = rank;
  });

  const countByAverage = new Map<number, number>();
  ranked.forEach((result) => {
    const key = getAverage(result) as number;
    countByAverage.set(key, (countByAverage.get(key) ?? 0) + 1);
  });
  ranked.forEach((result) => {
    result.isExAequo = (countByAverage.get(getAverage(result) as number) ?? 0) > 1;
  });
}

export interface PrimaryEvaluationResults {
  evaluation: {
    id: string;
    name: string;
    date: Date;
    isExam: boolean;
    isLocked: boolean;
    divisor: number;
    averageScale: PrimaryScale;
    publishedAt: Date | null;
  };
  class: { id: string; name: string; level: string | null };
  academicYear: { id: string; name: string };
  thresholds: { admission: number; redoublement: number };
  subjects: Array<{ subjectId: string; name: string; code: string; maxScore: number; sortOrder: number }>;
  totalMaxScore: number;
  results: PrimaryStudentResult[];
  stats: {
    enrolled: number;
    composed: number;
    absent: number;
    classAverage: number | null;
    bestAverage: number | null;
    worstAverage: number | null;
    bestTotal: number | null;
    worstTotal: number | null;
    successRate: number | null;
  };
  recap: {
    boys: PrimaryGenderRecap;
    girls: PrimaryGenderRecap;
    total: PrimaryGenderRecap;
  };
}

interface PrimaryGenderRecap {
  enrolled: number;
  composed: number;
  admitted: number;
  repeating: number;
  underReview: number;
  successRate: number | null;
}

function buildRecap(results: PrimaryStudentResult[], enrolled: number): PrimaryGenderRecap {
  const composed = results.filter((result) => result.average !== null).length;
  const admitted = results.filter((result) => result.status === 'ADMIS').length;

  return {
    enrolled,
    composed,
    admitted,
    repeating: results.filter((result) => result.status === 'REDOUBLE').length,
    underReview: results.filter((result) => result.status === 'EXAMEN').length,
    successRate: composed > 0 ? round2((admitted / composed) * 100) : null,
  };
}

/** Résultats complets d'une composition : notes, moyennes, rangs, statistiques. */
export async function computeEvaluationResults(
  evaluationId: string,
): Promise<PrimaryEvaluationResults> {
  const evaluation = await prisma.primary_evaluations.findUnique({
    where: { id: evaluationId },
    include: {
      class: { select: { id: true, name: true, level: true } },
      academicYear: { select: { id: true, name: true } },
      release: true,
      subjects: {
        orderBy: { sort_order: 'asc' },
        include: { subject: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  if (!evaluation) {
    throw new Error('Composition non trouvée');
  }

  const [settings, students, grades] = await Promise.all([
    prisma.primary_class_settings.findUnique({ where: { class_id: evaluation.class_id } }),
    prisma.student.findMany({
      where: { classId: evaluation.class_id, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentNumber: true,
        gender: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.primary_grades.findMany({
      where: { evaluation_id: evaluationId },
      select: { student_id: true, subject_id: true, note: true, is_absent: true },
    }),
  ]);

  const divisor = Number(evaluation.divisor) || 1;
  const scale = evaluation.average_scale as PrimaryScale;
  const thresholds = {
    admission: settings ? Number(settings.moyenne_admission) : scale / 2,
    redoublement: settings ? Number(settings.moyenne_redoublement) : scale / 2 - 1,
  };

  const gradesByStudent = new Map<string, Map<string, { note: number | null; isAbsent: boolean }>>();
  grades.forEach((grade) => {
    const bucket = gradesByStudent.get(grade.student_id) ?? new Map();
    bucket.set(grade.subject_id, {
      note: grade.note === null ? null : Number(grade.note),
      isAbsent: grade.is_absent,
    });
    gradesByStudent.set(grade.student_id, bucket);
  });

  const results: PrimaryStudentResult[] = students.map((student) => {
    const bucket = gradesByStudent.get(student.id) ?? new Map();
    const notes: Record<string, number | null> = {};

    let total = 0;
    let missingCount = 0;
    let gradedCount = 0;
    let isAbsent = false;

    evaluation.subjects.forEach((row) => {
      const entry = bucket.get(row.subject_id);
      if (entry?.isAbsent) isAbsent = true;

      const note = entry && !entry.isAbsent ? entry.note : null;
      notes[row.subject_id] = note;

      if (note === null) {
        missingCount += 1;
      } else {
        total += note;
        gradedCount += 1;
      }
    });

    const isRanked = !isAbsent && gradedCount > 0;
    const average = isRanked ? round2(total / divisor) : null;

    return {
      studentId: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.lastName} ${student.firstName}`.trim(),
      gender: student.gender,
      notes,
      total: round2(total),
      average,
      rank: null,
      isExAequo: false,
      mention: average !== null ? getMention(average, scale) : null,
      status: resolveStatus(average, thresholds),
      isAbsent,
      missingCount,
      gradedCount,
    };
  });

  assignRanks(results);

  const composedResults = results.filter((result) => result.average !== null);
  const averages = composedResults.map((result) => result.average as number);
  const totals = composedResults.map((result) => result.total);
  const admitted = composedResults.filter((result) => result.status === 'ADMIS').length;

  const boys = results.filter((result) => result.gender === 'M');
  const girls = results.filter((result) => result.gender === 'F');

  return {
    evaluation: {
      id: evaluation.id,
      name: evaluation.name,
      date: evaluation.date,
      isExam: evaluation.is_exam,
      isLocked: evaluation.is_locked,
      divisor,
      averageScale: scale,
      publishedAt: evaluation.release?.generated_at ?? null,
    },
    class: evaluation.class,
    academicYear: evaluation.academicYear,
    thresholds,
    subjects: evaluation.subjects.map((row) => ({
      subjectId: row.subject_id,
      name: row.subject.name,
      code: row.subject.code,
      maxScore: row.max_score,
      sortOrder: row.sort_order,
    })),
    totalMaxScore: evaluation.subjects.reduce((sum, row) => sum + row.max_score, 0),
    results: results.sort((left, right) => {
      // Classés d'abord, par rang ; les non-classés ferment la liste par ordre
      // alphabétique — c'est la lecture d'une fiche de classement.
      if (left.rank !== null && right.rank !== null) return left.rank - right.rank;
      if (left.rank !== null) return -1;
      if (right.rank !== null) return 1;
      return left.fullName.localeCompare(right.fullName);
    }),
    stats: {
      enrolled: students.length,
      composed: composedResults.length,
      absent: results.filter((result) => result.isAbsent).length,
      classAverage:
        averages.length > 0
          ? round2(averages.reduce((sum, value) => sum + value, 0) / averages.length)
          : null,
      bestAverage: averages.length > 0 ? Math.max(...averages) : null,
      worstAverage: averages.length > 0 ? Math.min(...averages) : null,
      bestTotal: totals.length > 0 ? Math.max(...totals) : null,
      worstTotal: totals.length > 0 ? Math.min(...totals) : null,
      successRate:
        composedResults.length > 0 ? round2((admitted / composedResults.length) * 100) : null,
    },
    recap: {
      boys: buildRecap(boys, boys.length),
      girls: buildRecap(girls, girls.length),
      total: buildRecap(results, students.length),
    },
  };
}

/**
 * Bilan annuel d'une classe : pour chaque élève, sa moyenne à chaque
 * composition de l'année, sa moyenne annuelle, son rang annuel et sa décision.
 *
 * La moyenne annuelle est la moyenne arithmétique des moyennes obtenues aux
 * compositions auxquelles l'élève a composé — une composition non composée ne
 * pénalise pas l'année, contrairement à une matière non saisie dans une
 * composition donnée. C'est la lecture des conseils de fin d'année : on juge
 * sur ce que l'élève a réellement rendu.
 */
export async function getClassAnnualReport(classId: string, academicYearId: string) {
  const [schoolClass, academicYear, settings] = await Promise.all([
    prisma.schoolClass.findUnique({
      where: { id: classId },
      select: { id: true, name: true, level: true, cycle: true },
    }),
    prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true, name: true },
    }),
    prisma.primary_class_settings.findUnique({ where: { class_id: classId } }),
  ]);

  if (!schoolClass) throw new Error('Classe non trouvée');
  if (!academicYear) throw new Error('Année académique non trouvée');

  const evaluations = await prisma.primary_evaluations.findMany({
    where: { academic_year_id: academicYearId, class_id: classId },
    orderBy: [{ sort_order: 'asc' }, { date: 'asc' }],
    select: { id: true, name: true, date: true, is_exam: true, sort_order: true },
  });

  // Séquentiel : chaque composition fait quelques requêtes, et une année
  // entière en parallèle sature inutilement le pool Prisma.
  const computed = [];
  for (const evaluation of evaluations) {
    computed.push({ evaluation, results: await computeEvaluationResults(evaluation.id) });
  }

  const scale = computed[0]?.results.evaluation.averageScale ?? 20;
  const thresholds = {
    admission: settings ? Number(settings.moyenne_admission) : scale / 2,
    redoublement: settings ? Number(settings.moyenne_redoublement) : scale / 2 - 1,
  };

  const students = await prisma.student.findMany({
    where: { classId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, studentNumber: true, gender: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const rows = students.map((student) => {
    const averages: Record<string, number | null> = {};
    const scored: number[] = [];

    computed.forEach(({ evaluation, results }) => {
      const own = results.results.find((result) => result.studentId === student.id);
      const average = own?.average ?? null;
      averages[evaluation.id] = average;
      if (average !== null) scored.push(average);
    });

    const yearAverage =
      scored.length > 0
        ? round2(scored.reduce((sum, value) => sum + value, 0) / scored.length)
        : null;

    return {
      studentId: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.lastName} ${student.firstName}`,
      gender: student.gender,
      averages,
      composedCount: scored.length,
      yearAverage,
      rank: null as number | null,
      isExAequo: false,
      mention: yearAverage === null ? null : getMention(yearAverage, scale as PrimaryScale),
      status: resolveStatus(yearAverage, thresholds),
    };
  });

  // Rang annuel, même règle d'ex æquo que sur une composition — mais calculé
  // sur la moyenne de l'année, pas sur celle d'une composition.
  assignRanks(rows, (row) => row.yearAverage);

  const yearScores = rows
    .map((row) => row.yearAverage)
    .filter((value): value is number => value !== null);
  const admitted = rows.filter((row) => row.status === 'ADMIS').length;

  return {
    class: schoolClass,
    academicYear,
    scale,
    thresholds,
    evaluations: evaluations.map((evaluation) => ({
      id: evaluation.id,
      name: evaluation.name,
      date: evaluation.date,
      isExam: evaluation.is_exam,
      sortOrder: evaluation.sort_order,
    })),
    results: rows,
    stats: {
      enrolled: students.length,
      composed: yearScores.length,
      classAverage:
        yearScores.length > 0
          ? round2(yearScores.reduce((sum, value) => sum + value, 0) / yearScores.length)
          : null,
      bestAverage: yearScores.length > 0 ? Math.max(...yearScores) : null,
      worstAverage: yearScores.length > 0 ? Math.min(...yearScores) : null,
      admitted,
      repeating: rows.filter((row) => row.status === 'REDOUBLE').length,
      underReview: rows.filter((row) => row.status === 'EXAMEN').length,
      successRate:
        yearScores.length > 0 ? round2((admitted / yearScores.length) * 100) : null,
    },
  };
}

/**
 * Parcours annuel d'un élève : ses résultats à chaque composition de l'année,
 * plus la moyenne annuelle.
 *
 * `publishedOnly` sépare les deux publics : l'administration et l'enseignant
 * voient tout, les familles seulement ce qui a été publié — sans quoi les
 * résultats seraient lisibles en ligne avant d'être communiqués.
 */
export async function getStudentYearResults(
  studentId: string,
  academicYearId: string,
  options: { publishedOnly?: boolean } = {},
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentNumber: true,
      gender: true,
      classId: true,
      class: { select: { id: true, name: true, level: true, cycle: true } },
    },
  });

  if (!student) throw new Error('Élève non trouvé');
  if (!student.classId || student.class?.cycle !== 'PRIMAIRE') {
    return { student, class: student.class ?? null, evaluations: [], yearAverage: null };
  }

  const evaluations = await prisma.primary_evaluations.findMany({
    where: {
      academic_year_id: academicYearId,
      class_id: student.classId,
      ...(options.publishedOnly ? { release: { isNot: null } } : {}),
    },
    orderBy: [{ sort_order: 'asc' }, { date: 'asc' }],
    select: { id: true },
  });

  const reports = [];
  for (const { id } of evaluations) {
    // Séquentiel : chaque composition fait quelques requêtes, et une année
    // entière en parallèle sature inutilement le pool Prisma.
    const computed = await computeEvaluationResults(id);
    const own = computed.results.find((result) => result.studentId === studentId);
    if (!own) continue;

    reports.push({
      evaluation: computed.evaluation,
      subjects: computed.subjects,
      thresholds: computed.thresholds,
      result: own,
      classAverage: computed.stats.classAverage,
      composed: computed.stats.composed,
    });
  }

  const scored = reports
    .map((report) => report.result.average)
    .filter((average): average is number => average !== null);

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      studentNumber: student.studentNumber,
      gender: student.gender,
    },
    class: student.class,
    evaluations: reports,
    yearAverage:
      scored.length > 0
        ? round2(scored.reduce((sum, value) => sum + value, 0) / scored.length)
        : null,
  };
}
