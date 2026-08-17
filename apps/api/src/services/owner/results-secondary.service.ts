import { Prisma, prisma } from '@school/database';

import { normalize, round2, coefficientsOf } from '../school-space.service';
import { getMention } from '../primary/class-profiles';
import {
  average,
  bucketize,
  metric,
  rankWithTies,
  ratio,
  round,
  series,
  standardDeviation,
  type Metric,
  type Series,
} from './compare.helper';
import { historyOf, type OwnerAcademicYear, type ResolvedYears } from './academic-year.helper';
import { PASS_MARK_20 } from './thresholds';

/**
 * Résultats pédagogiques — SECONDAIRE, indicateurs `SEC-01` à `SEC-21` (§4.c).
 *
 * **La formule n'est pas réécrite ici.** Normalisation des barèmes, arrondi et
 * coefficients viennent de `school-space.service`, le service qui produit déjà
 * les bulletins des espaces Parent et Élève. C'est la condition pour que la
 * moyenne d'établissement affichée au propriétaire tombe sur les moyennes que
 * lisent les familles : deux implémentations d'une même moyenne finiraient par
 * diverger, et l'écart ne se verrait qu'au pire moment.
 *
 * **Volume.** `grades` est le point chaud du profil (§6.8) : mille élèves,
 * quarante matières et trois trimestres font quelques centaines de milliers de
 * lignes. Rien n'est donc chargé à plat. Les ventilations passent par
 * `groupBy`, avec `max_note` **dans la clé de regroupement** — c'est ce qui
 * permet d'appliquer la normalisation après coup, sur des agrégats. Seules les
 * moyennes au grain élève exigent un passage individuel, et elles se calculent
 * classe par classe.
 *
 * **Confidentialité.** Aucun nom d'élève ne sort d'ici. Les enseignants
 * n'apparaissent qu'en initiales (§11-Q2(b)).
 */

export interface SecondaryFilters {
  /** `L5` — trimestre. */
  semesterId?: string;
  /** `L1` — niveau. */
  level?: string;
  /** `L2` — classe. */
  classId?: string;
  /** `L4` — matière. */
  subjectId?: string;
}

interface ClassRef {
  id: string;
  name: string;
  level: string | null;
}

/** Moyenne générale d'un élève, sans jamais porter son identité au-delà de l'id. */
interface StudentAverage {
  studentId: string;
  classId: string;
  level: string | null;
  average: number;
}

interface SubjectAggregate {
  subjectId: string;
  name: string;
  value: number;
  gradesCount: number;
}

// ---------------------------------------------------------------------------
// Lectures élémentaires
// ---------------------------------------------------------------------------

function gradeWhere(
  academicYearId: string,
  filters: SecondaryFilters,
  classId?: string,
): Prisma.gradesWhereInput {
  return {
    academic_year_id: academicYearId,
    ...(classId ? { class_id: classId } : {}),
    ...(filters.semesterId ? { semester_id: filters.semesterId } : {}),
    ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
    ...(!classId && (filters.classId || filters.level)
      ? {
          class: {
            ...(filters.classId ? { id: filters.classId } : {}),
            ...(filters.level ? { level: filters.level } : {}),
          },
        }
      : {}),
  };
}

/** Classes du secondaire concernées par les filtres. */
async function readClasses(filters: SecondaryFilters): Promise<ClassRef[]> {
  return prisma.schoolClass.findMany({
    where: {
      cycle: 'SECONDAIRE',
      ...(filters.classId ? { id: filters.classId } : {}),
      ...(filters.level ? { level: filters.level } : {}),
    },
    select: { id: true, name: true, level: true },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });
}

/** Notes d'une classe, agrégées au grain (élève, matière, barème, trimestre). */
export interface ClassGradeRow {
  studentId: string;
  subjectId: string;
  semesterId: string;
  maxNote: number;
  sum: number;
  count: number;
}

export interface ClassGrades {
  klass: ClassRef;
  rows: ClassGradeRow[];
  coefficients: Map<string, number>;
}

/**
 * Notes d'une classe, en **une** requête pour toute l'année.
 *
 * Le trimestre fait partie de la clé de regroupement plutôt que du filtre :
 * une seule lecture sert alors la moyenne annuelle *et* les trois moyennes
 * trimestrielles. Filtrer trimestre par trimestre multiplierait les requêtes
 * par le nombre de trimestres, pour relire exactement les mêmes lignes.
 */
async function readClassGrades(
  academicYearId: string,
  klass: ClassRef,
  filters: SecondaryFilters,
): Promise<ClassGrades> {
  const [rows, coefficients] = await Promise.all([
    prisma.grades.groupBy({
      by: ['student_id', 'subject_id', 'max_note', 'semester_id'],
      where: gradeWhere(academicYearId, filters, klass.id),
      _sum: { note: true },
      _count: { _all: true },
    }),
    coefficientsOf(klass.id),
  ]);

  return {
    klass,
    coefficients,
    rows: rows.map((row) => ({
      studentId: row.student_id,
      subjectId: row.subject_id,
      semesterId: row.semester_id,
      maxNote: row.max_note,
      sum: Number(row._sum.note ?? 0),
      count: row._count._all,
    })),
  };
}

/**
 * Moyennes générales des élèves d'une classe — fonction pure.
 *
 * Reconstitue exactement la chaîne du bulletin : moyenne de matière arrondie à
 * deux décimales, **puis** pondération par les coefficients. Inverser ces deux
 * étapes décale le résultat au centième, et c'est ce centième qui ferait
 * diverger le tableau de bord du bulletin remis à la famille.
 *
 * `semesterId` restreint le calcul à un trimestre ; sans lui, l'année entière.
 */
export function studentAveragesOf(
  { klass, rows, coefficients }: ClassGrades,
  semesterId?: string,
): StudentAverage[] {
  /** (élève → matière → { somme des notes normalisées, somme des poids }). */
  const perStudent = new Map<string, Map<string, { sum: number; weight: number }>>();

  for (const row of rows) {
    if (semesterId && row.semesterId !== semesterId) continue;

    const contribution = contributionOf(row.maxNote, row.sum, row.count);

    if (!perStudent.has(row.studentId)) perStudent.set(row.studentId, new Map());
    const bySubject = perStudent.get(row.studentId)!;
    const current = bySubject.get(row.subjectId) ?? { sum: 0, weight: 0 };
    bySubject.set(row.subjectId, {
      sum: current.sum + contribution.sum,
      weight: current.weight + contribution.weight,
    });
  }

  const averages: StudentAverage[] = [];

  for (const [studentId, bySubject] of perStudent) {
    let weighted = 0;
    let coefficientSum = 0;

    for (const [subjectId, totals] of bySubject) {
      if (totals.weight <= 0) continue;
      const subjectAverage = round2(totals.sum / totals.weight);
      const coefficient = coefficients.get(subjectId) ?? 1;
      weighted += subjectAverage * coefficient;
      coefficientSum += coefficient;
    }

    if (coefficientSum > 0) {
      averages.push({
        studentId,
        classId: klass.id,
        level: klass.level,
        average: round2(weighted / coefficientSum),
      });
    }
  }

  return averages;
}

/** Moyennes par matière, normalisées sur 20 (`SEC-04`). */
async function subjectAveragesOf(
  academicYearId: string,
  filters: SecondaryFilters,
  subjectNames: Map<string, string>,
): Promise<SubjectAggregate[]> {
  const rows = await prisma.grades.groupBy({
    by: ['subject_id', 'max_note'],
    where: gradeWhere(academicYearId, filters),
    _sum: { note: true },
    _count: { _all: true },
  });

  const totals = new Map<string, { sum: number; weight: number; count: number }>();

  for (const row of rows) {
    const contribution = contributionOf(row.max_note, Number(row._sum.note ?? 0), row._count._all);
    const current = totals.get(row.subject_id) ?? { sum: 0, weight: 0, count: 0 };
    totals.set(row.subject_id, {
      sum: current.sum + contribution.sum,
      weight: current.weight + contribution.weight,
      count: current.count + row._count._all,
    });
  }

  return [...totals.entries()]
    .filter(([, value]) => value.weight > 0)
    .map(([subjectId, value]) => ({
      subjectId,
      name: subjectNames.get(subjectId) ?? 'Matière inconnue',
      value: round2(value.sum / value.weight),
      gradesCount: value.count,
    }))
    .sort((left, right) => right.value - left.value);
}

/**
 * Moyenne de chaque matière, trimestre par trimestre.
 *
 * C'est le croisement qui manquait : `bySubject` donne un instantané de
 * l'année, `bySemester` donne l'évolution de l'établissement — ni l'un ni
 * l'autre ne dit *quelle matière* décroche, ni *quand*. Or c'est la question
 * que se pose un directeur devant une moyenne générale qui baisse.
 *
 * Un trimestre sans note donne `null` et non zéro : la courbe s'interrompt
 * plutôt que de plonger, ce qui distinguera toujours « pas encore saisi » de
 * « résultats effondrés ».
 */
async function subjectTimelineOf(
  academicYearId: string,
  filters: SecondaryFilters,
  subjectNames: Map<string, string>,
  semesters: Array<{ id: string; name: string }>,
): Promise<SubjectTimeline[]> {
  if (semesters.length === 0) return [];

  const rows = await prisma.grades.groupBy({
    by: ['subject_id', 'semester_id', 'max_note'],
    where: gradeWhere(academicYearId, filters),
    _sum: { note: true },
    _count: { _all: true },
  });

  const totals = new Map<string, Map<string, { sum: number; weight: number }>>();
  for (const row of rows) {
    const contribution = contributionOf(row.max_note, Number(row._sum.note ?? 0), row._count._all);
    if (!totals.has(row.subject_id)) totals.set(row.subject_id, new Map());
    const parTrimestre = totals.get(row.subject_id)!;
    const courant = parTrimestre.get(row.semester_id) ?? { sum: 0, weight: 0 };
    parTrimestre.set(row.semester_id, {
      sum: courant.sum + contribution.sum,
      weight: courant.weight + contribution.weight,
    });
  }

  return [...totals.entries()]
    .map(([subjectId, parTrimestre]) => {
      const points = semesters.map((semester) => {
        const cumul = parTrimestre.get(semester.id);
        return {
          key: `${subjectId}-${semester.id}`,
          label: semester.name,
          value: cumul && cumul.weight > 0 ? round2(cumul.sum / cumul.weight) : null,
          previous: null,
        };
      });

      // Variation entre le premier et le dernier trimestre réellement notés.
      const mesures = points.filter((point) => point.value !== null);
      const variation =
        mesures.length >= 2
          ? round2((mesures[mesures.length - 1].value as number) - (mesures[0].value as number))
          : null;

      return {
        subjectId,
        name: subjectNames.get(subjectId) ?? 'Matière inconnue',
        points,
        variation,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

/**
 * Contribution d'un groupe de notes de même barème à la moyenne d'une matière.
 *
 * La moyenne de référence est une moyenne **pondérée** : le service des
 * bulletins accumule `value × weight` au numérateur et `weight` au
 * dénominateur (`school-space.service.ts:244-245`). Omettre le facteur au
 * numérateur doublerait silencieusement le poids des notes sur 10 — une erreur
 * invisible tant que l'établissement n'utilise que des barèmes sur 20.
 *
 * Comme le barème fait partie de la clé de regroupement, la transformation
 * s'applique à la somme du groupe aussi bien qu'à chaque note.
 */
function contributionOf(maxNote: number, sum: number, count: number) {
  const unit = normalize(1, maxNote);
  return { sum: unit.value * unit.weight * sum, weight: unit.weight * count };
}

/** Initiales d'un enseignant — le nom complet reste hors périmètre (§11-Q2). */
function initialsOf(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();
  return `${first}. ${last}.`.trim();
}

// ---------------------------------------------------------------------------
// Instantané d'une année
// ---------------------------------------------------------------------------

export interface SecondarySnapshot {
  generalAverage: number | null;
  successRate: number | null;
  standardDeviation: number | null;
  gradesCount: number;
  bulletinCoverage: number | null;
  coefficientEffect: number | null;
  completeAverage: number | null;
  byLevel: Map<string, number>;
  byClass: Map<string, number>;
  bySubject: SubjectAggregate[];
  byTeacher: Array<{ key: string; label: string; value: number; gradesCount: number }>;
  bySemester: Array<{ key: string; label: string; value: number | null }>;
  subjectTimeline: SubjectTimeline[];
  evaluationTypes: Map<string, number>;
  gradeDistribution: Map<string, number>;
  averageDistribution: Map<string, number>;
  mentions: Map<string, number>;
  classStats: Array<{
    classId: string;
    name: string;
    level: string | null;
    average: number;
    successRate: number | null;
    standardDeviation: number | null;
    students: number;
  }>;
  subjectWeights: Array<{ key: string; label: string; value: number }>;
}

const EMPTY_SNAPSHOT: SecondarySnapshot = {
  generalAverage: null,
  successRate: null,
  standardDeviation: null,
  gradesCount: 0,
  bulletinCoverage: null,
  coefficientEffect: null,
  completeAverage: null,
  byLevel: new Map(),
  byClass: new Map(),
  bySubject: [],
  byTeacher: [],
  bySemester: [],
  subjectTimeline: [],
  evaluationTypes: new Map(),
  gradeDistribution: new Map(),
  averageDistribution: new Map(),
  mentions: new Map(),
  classStats: [],
  subjectWeights: [],
};

async function snapshotOf(
  year: OwnerAcademicYear,
  filters: SecondaryFilters,
): Promise<SecondarySnapshot> {
  const classes = await readClasses(filters);
  if (classes.length === 0) return EMPTY_SNAPSHOT;

  const [subjects, semesters, teachers, evaluationTypes, gradesCount, releases] = await Promise.all([
    prisma.subjects.findMany({ select: { id: true, name: true } }),
    prisma.semesters.findMany({
      where: { academic_year_id: year.id },
      select: { id: true, name: true, coefficient: true, start_date: true },
      orderBy: { start_date: 'asc' },
    }),
    prisma.teachers.findMany({ select: { id: true, first_name: true, last_name: true } }),
    prisma.grades.groupBy({
      by: ['evaluation_type_id'],
      where: gradeWhere(year.id, filters),
      _count: { _all: true },
    }),
    prisma.grades.count({ where: gradeWhere(year.id, filters) }),
    prisma.bulletin_releases.count({
      where: {
        academic_year_id: year.id,
        ...(filters.semesterId ? { semester_id: filters.semesterId } : {}),
        class_id: { in: classes.map((klass) => klass.id) },
      },
    }),
  ]);

  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));

  const [classGrades, subjectAverages, subjectTimeline, teacherRows, noteRows, typeNames] =
    await Promise.all([
      Promise.all(classes.map((klass) => readClassGrades(year.id, klass, filters))),
      subjectAveragesOf(year.id, filters, subjectNames),
      subjectTimelineOf(year.id, filters, subjectNames, semesters),
      prisma.grades.groupBy({
        by: ['teacher_id', 'max_note'],
        where: gradeWhere(year.id, filters),
        _sum: { note: true },
        _count: { _all: true },
      }),
      // Les notes distinctes sont peu nombreuses : les regrouper évite de
      // ramener des centaines de milliers de lignes pour un histogramme.
      prisma.grades.groupBy({
        by: ['note', 'max_note'],
        where: gradeWhere(year.id, filters),
        _count: { _all: true },
      }),
      prisma.evaluation_types.findMany({ select: { id: true, name: true } }),
    ]);

  const allAverages = classGrades.flatMap((grades) => studentAveragesOf(grades));
  const values = allAverages.map((row) => row.average);

  // --- Ventilations au grain élève -----------------------------------------
  const byLevel = new Map<string, number>();
  const byClass = new Map<string, number>();
  const groupedByLevel = new Map<string, number[]>();
  const groupedByClass = new Map<string, number[]>();

  for (const row of allAverages) {
    const level = row.level ?? 'Sans niveau';
    if (!groupedByLevel.has(level)) groupedByLevel.set(level, []);
    groupedByLevel.get(level)!.push(row.average);
    if (!groupedByClass.has(row.classId)) groupedByClass.set(row.classId, []);
    groupedByClass.get(row.classId)!.push(row.average);
  }

  for (const [level, list] of groupedByLevel) {
    const mean = average(list);
    if (mean !== null) byLevel.set(level, round2(mean));
  }

  const classStats = classes
    .map((klass) => {
      const list = groupedByClass.get(klass.id) ?? [];
      const mean = average(list);
      if (mean === null) return null;
      byClass.set(klass.name, round2(mean));
      return {
        classId: klass.id,
        name: klass.name,
        level: klass.level,
        average: round2(mean),
        successRate: roundOrNull(
          ratio(list.filter((value) => value >= PASS_MARK_20).length, list.length),
          4,
        ),
        standardDeviation: roundOrNull(standardDeviation(list), 2),
        students: list.length,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  // --- Mentions et distributions -------------------------------------------
  const mentions = new Map<string, number>();
  for (const value of values) {
    const mention = getMention(value, 20);
    mentions.set(mention, (mentions.get(mention) ?? 0) + 1);
  }

  const gradeValues: number[] = [];
  for (const row of noteRows) {
    const { value } = normalize(Number(row.note), row.max_note);
    for (let index = 0; index < row._count._all; index += 1) gradeValues.push(value);
  }

  // --- Enseignants ----------------------------------------------------------
  const teacherNames = new Map(
    teachers.map((teacher) => [teacher.id, initialsOf(teacher.first_name, teacher.last_name)]),
  );
  const teacherTotals = new Map<string, { sum: number; weight: number; count: number }>();
  for (const row of teacherRows) {
    const contribution = contributionOf(row.max_note, Number(row._sum.note ?? 0), row._count._all);
    const current = teacherTotals.get(row.teacher_id) ?? { sum: 0, weight: 0, count: 0 };
    teacherTotals.set(row.teacher_id, {
      sum: current.sum + contribution.sum,
      weight: current.weight + contribution.weight,
      count: current.count + row._count._all,
    });
  }

  // --- Trimestres ------------------------------------------------------------
  // Aucune requête supplémentaire ici : les notes de l'année sont déjà en
  // mémoire, le trimestre n'est qu'un filtre sur des lignes déjà lues.
  const semesterAverages = semesters.map((semester) => {
    const list = classGrades
      .flatMap((grades) => studentAveragesOf(grades, semester.id))
      .map((row) => row.average);

    return {
      key: semester.id,
      label: semester.name,
      coefficient: semester.coefficient || 1,
      value: roundOrNull(average(list), 2),
    };
  });

  // `SEC-10` — MGA : chaque trimestre pèse son propre coefficient (T1=1,
  // T2=T3=2 → division par 5). Un trimestre non saisi est ignoré, coefficient
  // compris : le diviser par 5 alors qu'il manque une note écraserait la
  // moyenne annuelle.
  let mgaWeighted = 0;
  let mgaCoefficients = 0;
  for (const semester of semesterAverages) {
    if (semester.value === null) continue;
    mgaWeighted += semester.value * semester.coefficient;
    mgaCoefficients += semester.coefficient;
  }

  // `SEC-08` — l'écart entre la moyenne pondérée et la moyenne brute des
  // matières mesure ce que les coefficients ajoutent ou retirent.
  const weightedGeneral = average(values);
  const rawSubjectMean = average(subjectAverages.map((subject) => subject.value));
  const coefficientEffect =
    weightedGeneral !== null && rawSubjectMean !== null
      ? round2(weightedGeneral - rawSubjectMean)
      : null;

  // `SEC-21` — un bulletin est attendu par (classe, trimestre).
  const expectedReleases =
    classes.length * (filters.semesterId ? 1 : semesters.length || 0);

  const typeLabels = new Map(typeNames.map((type) => [type.id, type.name]));

  // `SEC-09` — poids réel d'une matière : son coefficient rapporté à la somme
  // des coefficients. C'est ce que pèse réellement la matière dans la décision
  // de passage, indépendamment de la moyenne qu'on y obtient.
  const classSubjects = await prisma.class_subjects.findMany({
    where: {
      class_id: { in: classes.map((klass) => klass.id) },
      ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
    },
    select: { subject_id: true, coefficient: true },
  });

  const coefficientBySubject = new Map<string, number>();
  for (const row of classSubjects) {
    coefficientBySubject.set(
      row.subject_id,
      (coefficientBySubject.get(row.subject_id) ?? 0) + (row.coefficient || 1),
    );
  }
  const coefficientTotal = [...coefficientBySubject.values()].reduce((sum, v) => sum + v, 0);

  const subjectWeights = [...coefficientBySubject.entries()]
    .map(([subjectId, coefficient]) => ({
      key: subjectId,
      label: subjectNames.get(subjectId) ?? 'Matière inconnue',
      value: coefficientTotal > 0 ? round(coefficient / coefficientTotal, 4) : 0,
    }))
    .sort((left, right) => right.value - left.value);

  return {
    generalAverage: roundOrNull(weightedGeneral, 2),
    successRate: roundOrNull(
      ratio(values.filter((value) => value >= PASS_MARK_20).length, values.length),
      4,
    ),
    standardDeviation: roundOrNull(standardDeviation(values), 2),
    gradesCount,
    bulletinCoverage: roundOrNull(ratio(releases, expectedReleases), 4),
    coefficientEffect,
    completeAverage: mgaCoefficients > 0 ? round2(mgaWeighted / mgaCoefficients) : null,
    byLevel,
    byClass,
    bySubject: subjectAverages,
    byTeacher: [...teacherTotals.entries()]
      .filter(([, totals]) => totals.weight > 0)
      .map(([teacherId, totals]) => ({
        key: teacherId,
        label: teacherNames.get(teacherId) ?? '—',
        value: round2(totals.sum / totals.weight),
        gradesCount: totals.count,
      }))
      .sort((left, right) => right.gradesCount - left.gradesCount),
    bySemester: semesterAverages.map(({ key, label, value }) => ({ key, label, value })),
    subjectTimeline,
    evaluationTypes: new Map(
      evaluationTypes.map((row) => [
        typeLabels.get(row.evaluation_type_id) ?? 'Type inconnu',
        row._count._all,
      ]),
    ),
    gradeDistribution: bucketize(gradeValues, { min: 0, max: 20, width: 2 }),
    averageDistribution: bucketize(values, { min: 0, max: 20, width: 1 }),
    mentions,
    classStats,
    subjectWeights,
  };
}

function roundOrNull(value: number | null, decimals: number): number | null {
  return value === null ? null : round(value, decimals);
}

// ---------------------------------------------------------------------------
// Composition de la réponse
// ---------------------------------------------------------------------------

/** Trajectoire d'une matière sur les trimestres de l'année. */
export interface SubjectTimeline {
  subjectId: string;
  name: string;
  points: Array<{ key: string; label: string; value: number | null; previous: number | null }>;
  /** Écart entre le premier et le dernier trimestre notés, ou `null`. */
  variation: number | null;
}

export interface SecondaryClassRanking {
  rank: number | null;
  isExAequo: boolean;
  classId: string;
  name: string;
  level: string | null;
  average: number;
  previous: number | null;
  delta: number | null;
  successRate: number | null;
  standardDeviation: number | null;
  students: number;
}

export interface SecondaryResult {
  generalAverage: Metric;
  successRate: Metric;
  standardDeviation: Metric;
  completeAverage: Metric;
  gradeVolume: Metric;
  bulletinCoverage: Metric;
  coefficientEffect: Metric;
  byLevel: Series;
  byClass: Series;
  bySubject: Series;
  best: Array<{ key: string; label: string; value: number }>;
  worst: Array<{ key: string; label: string; value: number }>;
  byTeacher: Array<{ key: string; label: string; value: number; gradesCount: number }>;
  bySemester: Series;
  /** Trajectoire de chaque matière sur les trimestres de l'année observée. */
  subjectTimeline: SubjectTimeline[];
  gradeDistribution: Series;
  averageDistribution: Series;
  mentions: Series;
  classRanking: SecondaryClassRanking[];
  evaluationTypes: Series;
  subjectWeights: Series;
}

/** Nombre d'éléments d'un « top N » (§6.7) — borné côté serveur. */
const TOP_N = 5;

export async function getSecondaryResults(
  resolved: ResolvedYears,
  filters: SecondaryFilters,
): Promise<SecondaryResult> {
  const [current, comparison] = await Promise.all([
    snapshotOf(resolved.year, filters),
    resolved.compare
      ? snapshotOf(resolved.compare, filters)
      : Promise.resolve<SecondarySnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: SecondarySnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  const previousClassAverages = new Map(
    (comparison?.classStats ?? []).map((row) => [row.classId, row.average]),
  );

  const classRanking: SecondaryClassRanking[] = rankWithTies(
    current.classStats,
    (row) => row.average,
  ).map(({ item, rank, isExAequo }) => {
    const previous = comparison ? previousClassAverages.get(item.classId) ?? null : null;
    return {
      rank,
      isExAequo,
      classId: item.classId,
      name: item.name,
      level: item.level,
      average: item.average,
      previous,
      delta: previous === null ? null : round2(item.average - previous),
      successRate: item.successRate,
      standardDeviation: item.standardDeviation,
      students: item.students,
    };
  });

  const subjectSeries = (snapshot: SecondarySnapshot | null) =>
    new Map((snapshot?.bySubject ?? []).map((subject) => [subject.subjectId, subject.value]));

  const subjectLabels = new Map(current.bySubject.map((s) => [s.subjectId, s.name]));
  for (const subject of comparison?.bySubject ?? []) {
    if (!subjectLabels.has(subject.subjectId)) subjectLabels.set(subject.subjectId, subject.name);
  }

  const numeric = (key: string) => Number(key);

  return {
    generalAverage: metric(current.generalAverage, previousOf((s) => s.generalAverage), 'grade'),
    successRate: metric(current.successRate, previousOf((s) => s.successRate), 'percent'),
    standardDeviation: metric(
      current.standardDeviation,
      previousOf((s) => s.standardDeviation),
      'grade',
    ),
    completeAverage: metric(current.completeAverage, previousOf((s) => s.completeAverage), 'grade'),
    gradeVolume: metric(current.gradesCount, previousOf((s) => s.gradesCount)),
    bulletinCoverage: metric(
      current.bulletinCoverage,
      previousOf((s) => s.bulletinCoverage),
      'percent',
    ),
    coefficientEffect: metric(
      current.coefficientEffect,
      previousOf((s) => s.coefficientEffect),
      'grade',
    ),

    byLevel: series(current.byLevel, comparison ? comparison.byLevel : null, (key) => key, 'grade'),
    byClass: series(current.byClass, comparison ? comparison.byClass : null, (key) => key, 'grade'),
    bySubject: series(
      subjectSeries(current),
      comparison ? subjectSeries(comparison) : null,
      (key) => subjectLabels.get(key) ?? key,
      'grade',
    ),
    best: current.bySubject.slice(0, TOP_N).map((subject) => ({
      key: subject.subjectId,
      label: subject.name,
      value: subject.value,
    })),
    worst: current.bySubject
      .slice(-TOP_N)
      .reverse()
      .map((subject) => ({ key: subject.subjectId, label: subject.name, value: subject.value })),
    byTeacher: current.byTeacher.slice(0, 200),
    bySemester: {
      points: current.bySemester.map((semester) => ({
        key: semester.key,
        label: semester.label,
        value: semester.value,
        previous:
          comparison?.bySemester.find((row) => row.label === semester.label)?.value ?? null,
      })),
      unit: 'grade',
    },
    subjectTimeline: current.subjectTimeline,
    gradeDistribution: series(
      current.gradeDistribution,
      comparison ? comparison.gradeDistribution : null,
      (key) => `${key}–${numeric(key) + 2}`,
      'count',
      (a, b) => numeric(a.key) - numeric(b.key),
    ),
    averageDistribution: series(
      current.averageDistribution,
      comparison ? comparison.averageDistribution : null,
      (key) => `${key}`,
      'count',
      (a, b) => numeric(a.key) - numeric(b.key),
    ),
    mentions: series(current.mentions, comparison ? comparison.mentions : null, (key) => key),
    classRanking,
    evaluationTypes: series(
      current.evaluationTypes,
      comparison ? comparison.evaluationTypes : null,
      (key) => key,
    ),
    subjectWeights: {
      points: current.subjectWeights.map((weight) => ({ ...weight, previous: null })),
      unit: 'percent',
    },
  };
}

// ---------------------------------------------------------------------------
// SEC-18 — évolution pluriannuelle
// ---------------------------------------------------------------------------

export async function getSecondaryTimeline(
  resolved: ResolvedYears,
  count: number,
  filters: SecondaryFilters,
): Promise<{ series: Series[] }> {
  const history = historyOf(resolved.years, count);

  const points = await Promise.all(
    history.map(async (year) => {
      const snapshot = await snapshotOf(year, filters);
      return { key: year.id, label: year.name, value: snapshot.generalAverage };
    }),
  );

  return { series: [{ points, unit: 'grade' }] };
}
