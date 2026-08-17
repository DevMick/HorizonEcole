import { Prisma, prisma } from '@school/database';

import { computeEvaluationResults } from '../primary/primary-results.service';
import {
  average,
  bucketize,
  metric,
  ratio,
  round,
  series,
  type Metric,
  type Series,
} from './compare.helper';
import { historyOf, type OwnerAcademicYear, type ResolvedYears } from './academic-year.helper';

/**
 * Résultats pédagogiques — PRIMAIRE, indicateurs `PRI-01` à `PRI-20` (§4.d).
 *
 * Le primaire ne se calcule pas comme le secondaire : là où celui-ci pondère
 * des notes ramenées sur 20, celui-là additionne des barèmes hétérogènes
 * (MATH /50, DICTEE /20…) et divise par un diviseur propre au niveau — « CM1 :
 * (50 + 50 + 20 + 50) / 8,5 ». Les deux ne peuvent donc pas partager un même
 * tableau, et surtout pas une même formule.
 *
 * **La moyenne est calculée par `computeEvaluationResults`**, la fonction qui
 * produit déjà les bulletins du primaire. Elle porte des règles que rien ne
 * laisserait deviner et qu'une réécriture perdrait : une matière non saisie
 * compte zéro, un élève absent est écarté du classement sans être exclu de la
 * liste, un élève sans aucune note n'est pas classé — ce n'est pas un zéro. Le
 * prix à payer est un appel par composition ; le bénéfice est qu'aucun écart ne
 * peut s'installer entre ce que voit le propriétaire et ce que reçoit la
 * famille.
 *
 * Les noms d'élèves que cette fonction renvoie **s'arrêtent ici** : seuls des
 * agrégats en ressortent.
 */

export interface PrimaryFilters {
  /** `L2` — classe. */
  classId?: string;
  /** `L1` — niveau. */
  level?: string;
  /** Composition précise, pour l'écran de détail. */
  evaluationId?: string;
}

/** Borne de sécurité (§6.7) : au-delà, la réponse est tronquée et le signale. */
const MAX_EVALUATIONS = 200;

interface EvaluationRef {
  id: string;
  name: string;
  date: Date;
  sortOrder: number;
  isExam: boolean;
  isLocked: boolean;
  averageScale: number;
  classId: string;
  className: string;
  level: string | null;
  publishedAt: Date | null;
}

function evaluationWhere(
  academicYearId: string,
  filters: PrimaryFilters,
): Prisma.primary_evaluationsWhereInput {
  return {
    academic_year_id: academicYearId,
    ...(filters.evaluationId ? { id: filters.evaluationId } : {}),
    ...(filters.classId ? { class_id: filters.classId } : {}),
    ...(filters.level ? { class: { level: filters.level } } : {}),
  };
}

async function readEvaluations(
  academicYearId: string,
  filters: PrimaryFilters,
): Promise<EvaluationRef[]> {
  const rows = await prisma.primary_evaluations.findMany({
    where: evaluationWhere(academicYearId, filters),
    select: {
      id: true,
      name: true,
      date: true,
      sort_order: true,
      is_exam: true,
      is_locked: true,
      average_scale: true,
      class_id: true,
      class: { select: { name: true, level: true } },
      // `primary_bulletin_releases` ne porte pas d'établissement : elle n'est
      // atteinte qu'à travers sa composition, jamais lue à plat (§6.9).
      release: { select: { generated_at: true } },
    },
    orderBy: [{ sort_order: 'asc' }, { date: 'asc' }],
    take: MAX_EVALUATIONS + 1,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    sortOrder: row.sort_order,
    isExam: row.is_exam,
    isLocked: row.is_locked,
    averageScale: row.average_scale,
    classId: row.class_id,
    className: row.class.name,
    level: row.class.level,
    publishedAt: row.release?.generated_at ?? null,
  }));
}

interface EvaluationOutcome {
  evaluation: EvaluationRef;
  classAverage: number | null;
  /** Moyennes individuelles, anonymes : elles ne servent qu'aux distributions. */
  averages: number[];
  enrolled: number;
  composed: number;
  admitted: number;
  repeating: number;
  underReview: number;
  unranked: number;
  mentions: Map<string, number>;
}

export interface PrimarySnapshot {
  evaluationCount: number;
  examCount: number;
  lockedShare: number | null;
  publishedShare: number | null;
  generalAverage: number | null;
  successRate: number | null;
  repeatRate: number | null;
  unrankedShare: number | null;
  gridCoverage: number | null;
  byEvaluation: Array<{ key: string; label: string; value: number | null; className: string }>;
  byClass: Map<string, number>;
  byLevel: Map<string, number>;
  bySubject: Map<string, number>;
  calendar: Map<string, number>;
  mentions: Map<string, number>;
  distribution: Map<string, number>;
  /** Échelle de la distribution ; `null` = échelles mêlées, graphique omis. */
  distributionScale: number | null;
  levelSpread: Array<{ level: string; spread: number | null; min: number | null; max: number | null }>;
  settings: Array<{
    classId: string;
    className: string;
    level: string | null;
    divisor: number | null;
    averageScale: number | null;
    admission: number | null;
    repeat: number | null;
  }>;
  truncated: boolean;
}

const EMPTY_SNAPSHOT: PrimarySnapshot = {
  evaluationCount: 0,
  examCount: 0,
  lockedShare: null,
  publishedShare: null,
  generalAverage: null,
  successRate: null,
  repeatRate: null,
  unrankedShare: null,
  gridCoverage: null,
  byEvaluation: [],
  byClass: new Map(),
  byLevel: new Map(),
  bySubject: new Map(),
  calendar: new Map(),
  mentions: new Map(),
  distribution: new Map(),
  distributionScale: null,
  levelSpread: [],
  settings: [],
  truncated: false,
};

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function roundOrNull(value: number | null, decimals: number): number | null {
  return value === null ? null : round(value, decimals);
}

/**
 * Moyenne par matière (`PRI-08`), ramenée sur 20.
 *
 * Le barème d'une matière est porté par la composition, pas par la matière :
 * la même dictée peut valoir /20 ici et /10 ailleurs. La normalisation se fait
 * donc composition par composition, jamais sur une moyenne globale des notes
 * brutes — qui additionnerait des points de barèmes différents.
 */
async function subjectAveragesOf(evaluationIds: string[]): Promise<Map<string, number>> {
  if (evaluationIds.length === 0) return new Map();

  const [maxScores, grades, subjects] = await Promise.all([
    // Table non cloisonnée : atteinte par la composition (§6.9).
    prisma.primary_evaluation_subjects.findMany({
      where: { evaluation_id: { in: evaluationIds } },
      select: { evaluation_id: true, subject_id: true, max_score: true },
    }),
    prisma.primary_grades.groupBy({
      by: ['evaluation_id', 'subject_id'],
      where: { evaluation_id: { in: evaluationIds }, is_absent: false, note: { not: null } },
      _avg: { note: true },
    }),
    prisma.subjects.findMany({ select: { id: true, name: true } }),
  ]);

  const scaleOf = new Map(
    maxScores.map((row) => [`${row.evaluation_id}:${row.subject_id}`, row.max_score]),
  );
  const names = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const perSubject = new Map<string, number[]>();

  for (const row of grades) {
    const maxScore = scaleOf.get(`${row.evaluation_id}:${row.subject_id}`);
    const value = row._avg.note === null ? null : Number(row._avg.note);
    if (!maxScore || maxScore <= 0 || value === null) continue;
    const name = names.get(row.subject_id) ?? 'Matière inconnue';
    if (!perSubject.has(name)) perSubject.set(name, []);
    perSubject.get(name)!.push((value / maxScore) * 20);
  }

  const result = new Map<string, number>();
  for (const [name, values] of perSubject) {
    const mean = average(values);
    if (mean !== null) result.set(name, round(mean, 2));
  }
  return result;
}

async function snapshotOf(
  year: OwnerAcademicYear,
  filters: PrimaryFilters,
): Promise<PrimarySnapshot> {
  const all = await readEvaluations(year.id, filters);
  if (all.length === 0) return EMPTY_SNAPSHOT;

  const truncated = all.length > MAX_EVALUATIONS;
  const evaluations = all.slice(0, MAX_EVALUATIONS);

  const outcomes: EvaluationOutcome[] = [];
  for (const evaluation of evaluations) {
    const computed = await computeEvaluationResults(evaluation.id);
    const mentions = new Map<string, number>();
    const averages: number[] = [];

    for (const result of computed.results) {
      if (result.average === null) continue;
      averages.push(result.average);
      const mention = result.mention ?? 'Sans mention';
      mentions.set(mention, (mentions.get(mention) ?? 0) + 1);
    }

    outcomes.push({
      evaluation,
      classAverage: computed.stats.classAverage,
      averages,
      enrolled: computed.stats.enrolled,
      composed: computed.stats.composed,
      admitted: computed.results.filter((row) => row.status === 'ADMIS').length,
      repeating: computed.results.filter((row) => row.status === 'REDOUBLE').length,
      underReview: computed.results.filter((row) => row.status === 'EXAMEN').length,
      unranked: computed.results.filter((row) => row.average === null).length,
      mentions,
    });
  }

  // --- Ventilations ---------------------------------------------------------
  const byClassAverages = new Map<string, number[]>();
  const byLevelAverages = new Map<string, number[]>();
  const calendar = new Map<string, number>();
  const mentions = new Map<string, number>();
  const allAverages: number[] = [];

  let admitted = 0;
  let repeating = 0;
  let composed = 0;
  let unranked = 0;
  let enrolled = 0;

  for (const outcome of outcomes) {
    const { evaluation } = outcome;

    if (outcome.classAverage !== null) {
      if (!byClassAverages.has(evaluation.className)) byClassAverages.set(evaluation.className, []);
      byClassAverages.get(evaluation.className)!.push(outcome.classAverage);

      const level = evaluation.level ?? 'Sans niveau';
      if (!byLevelAverages.has(level)) byLevelAverages.set(level, []);
      byLevelAverages.get(level)!.push(outcome.classAverage);
    }

    const month = MONTHS[evaluation.date.getMonth()];
    calendar.set(month, (calendar.get(month) ?? 0) + 1);

    for (const [mention, count] of outcome.mentions) {
      mentions.set(mention, (mentions.get(mention) ?? 0) + count);
    }

    allAverages.push(...outcome.averages);
    admitted += outcome.admitted;
    repeating += outcome.repeating;
    composed += outcome.composed;
    unranked += outcome.unranked;
    enrolled += outcome.enrolled;
  }

  const byClass = new Map<string, number>();
  for (const [className, values] of byClassAverages) {
    const mean = average(values);
    if (mean !== null) byClass.set(className, round(mean, 2));
  }

  const byLevel = new Map<string, number>();
  for (const [level, values] of byLevelAverages) {
    const mean = average(values);
    if (mean !== null) byLevel.set(level, round(mean, 2));
  }

  // `PRI-17` — l'amplitude entre classes d'un même niveau : deux CM1 qui
  // s'écartent de trois points ne posent pas le même problème qu'un niveau
  // homogène et faible.
  const classesByLevel = new Map<string, number[]>();
  for (const outcome of outcomes) {
    if (outcome.classAverage === null) continue;
    const level = outcome.evaluation.level ?? 'Sans niveau';
    if (!classesByLevel.has(level)) classesByLevel.set(level, []);
    classesByLevel.get(level)!.push(byClass.get(outcome.evaluation.className) ?? 0);
  }

  const levelSpread = [...classesByLevel.entries()].map(([level, values]) => {
    const unique = [...new Set(values)];
    const min = unique.length ? Math.min(...unique) : null;
    const max = unique.length ? Math.max(...unique) : null;
    return {
      level,
      min,
      max,
      spread: min !== null && max !== null ? round(max - min, 2) : null,
    };
  });

  // --- Paramètres de calcul et couverture de grille -------------------------
  const classIds = [...new Set(evaluations.map((evaluation) => evaluation.classId))];

  const [settingsRows, gridSubjects, gradedSubjects, subjectAverages] = await Promise.all([
    prisma.primary_class_settings.findMany({
      where: { class_id: { in: classIds } },
      select: {
        class_id: true,
        divisor: true,
        average_scale: true,
        moyenne_admission: true,
        moyenne_redoublement: true,
      },
    }),
    prisma.primary_class_subjects.groupBy({
      by: ['class_id'],
      where: { class_id: { in: classIds } },
      _count: { _all: true },
    }),
    prisma.primary_grades.findMany({
      where: { evaluation_id: { in: evaluations.map((evaluation) => evaluation.id) } },
      select: { subject_id: true, evaluation: { select: { class_id: true } } },
      distinct: ['subject_id', 'evaluation_id'],
    }),
    subjectAveragesOf(evaluations.map((evaluation) => evaluation.id)),
  ]);

  const gridCountByClass = new Map(gridSubjects.map((row) => [row.class_id, row._count._all]));
  const gradedByClass = new Map<string, Set<string>>();
  for (const row of gradedSubjects) {
    const classId = row.evaluation.class_id;
    if (!gradedByClass.has(classId)) gradedByClass.set(classId, new Set());
    gradedByClass.get(classId)!.add(row.subject_id);
  }

  const coverageValues: number[] = [];
  for (const classId of classIds) {
    const expected = gridCountByClass.get(classId) ?? 0;
    if (expected === 0) continue;
    coverageValues.push(Math.min(1, (gradedByClass.get(classId)?.size ?? 0) / expected));
  }

  const classNameById = new Map(
    evaluations.map((evaluation) => [
      evaluation.classId,
      { name: evaluation.className, level: evaluation.level },
    ]),
  );

  const settings = classIds.map((classId) => {
    const row = settingsRows.find((candidate) => candidate.class_id === classId);
    const info = classNameById.get(classId);
    return {
      classId,
      className: info?.name ?? '—',
      level: info?.level ?? null,
      divisor: row ? Number(row.divisor) : null,
      averageScale: row ? row.average_scale : null,
      admission: row ? Number(row.moyenne_admission) : null,
      repeat: row ? Number(row.moyenne_redoublement) : null,
    };
  });

  // `PRI-13` — /10 et /20 ne se mélangent **jamais** dans un même histogramme.
  // Un 9 vaut « excellent » sur 10 et « insuffisant » sur 20 : superposer les
  // deux échelles produirait une courbe dont chaque barre voudrait dire deux
  // choses. Quand l'établissement mélange les deux — CP sur 10, CM sur 20 —
  // la distribution est laissée vide, et l'écran invite à filtrer par niveau.
  const scales = new Set(evaluations.map((evaluation) => evaluation.averageScale));
  const scale = scales.size === 1 ? [...scales][0] : null;

  return {
    evaluationCount: evaluations.length,
    examCount: evaluations.filter((evaluation) => evaluation.isExam).length,
    lockedShare: roundOrNull(
      ratio(evaluations.filter((evaluation) => evaluation.isLocked).length, evaluations.length),
      4,
    ),
    publishedShare: roundOrNull(
      ratio(
        evaluations.filter((evaluation) => evaluation.publishedAt !== null).length,
        evaluations.length,
      ),
      4,
    ),
    generalAverage: roundOrNull(average([...byLevel.values()]), 2),
    successRate: roundOrNull(ratio(admitted, composed), 4),
    repeatRate: roundOrNull(ratio(repeating, composed), 4),
    unrankedShare: roundOrNull(ratio(unranked, enrolled), 4),
    gridCoverage: roundOrNull(average(coverageValues), 4),
    byEvaluation: outcomes.map((outcome) => ({
      key: outcome.evaluation.id,
      label: outcome.evaluation.name,
      className: outcome.evaluation.className,
      value: outcome.classAverage,
    })),
    byClass,
    byLevel,
    bySubject: subjectAverages,
    calendar,
    mentions,
    distributionScale: scale,
    distribution:
      scale === null
        ? new Map<string, number>()
        : bucketize(allAverages, { min: 0, max: scale, width: scale / 10 }),
    levelSpread,
    settings,
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Composition de la réponse
// ---------------------------------------------------------------------------

export interface PrimaryResult {
  evaluationCount: Metric;
  examCount: Metric;
  lockedShare: Metric;
  bulletinCoverage: Metric;
  generalAverage: Metric;
  successRate: Metric;
  repeatRate: Metric;
  unranked: Metric;
  gridCoverage: Metric;
  byEvaluation: Series;
  byClass: Series;
  byLevel: Series;
  bySubject: Series;
  calendar: Series;
  mentions: Series;
  distribution: Series;
  /** `null` quand plusieurs échelles coexistent : la distribution est alors vide. */
  distributionScale: number | null;
  classComparison: Array<{ level: string; classes: Array<{ label: string; value: number }> }>;
  levelSpread: PrimarySnapshot['levelSpread'];
  settings: PrimarySnapshot['settings'];
  truncated: boolean;
}

export async function getPrimaryResults(
  resolved: ResolvedYears,
  filters: PrimaryFilters,
): Promise<PrimaryResult> {
  const [current, comparison] = await Promise.all([
    snapshotOf(resolved.year, filters),
    resolved.compare
      ? snapshotOf(resolved.compare, filters)
      : Promise.resolve<PrimarySnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: PrimarySnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  // `PRI-14` — les classes d'un même niveau côte à côte : c'est la comparaison
  // qu'un directeur fait spontanément, et la seule qui soit légitime.
  const classComparison = [...current.byLevel.keys()].map((level) => ({
    level,
    classes: current.settings
      .filter((row) => (row.level ?? 'Sans niveau') === level)
      .map((row) => ({ label: row.className, value: current.byClass.get(row.className) ?? 0 }))
      .filter((row) => row.value > 0)
      .sort((left, right) => right.value - left.value),
  }));

  const numeric = (key: string) => Number(key);

  return {
    evaluationCount: metric(current.evaluationCount, previousOf((s) => s.evaluationCount)),
    examCount: metric(current.examCount, previousOf((s) => s.examCount)),
    lockedShare: metric(current.lockedShare, previousOf((s) => s.lockedShare), 'percent'),
    bulletinCoverage: metric(current.publishedShare, previousOf((s) => s.publishedShare), 'percent'),
    generalAverage: metric(current.generalAverage, previousOf((s) => s.generalAverage), 'grade'),
    successRate: metric(current.successRate, previousOf((s) => s.successRate), 'percent'),
    repeatRate: metric(current.repeatRate, previousOf((s) => s.repeatRate), 'percent'),
    unranked: metric(current.unrankedShare, previousOf((s) => s.unrankedShare), 'percent'),
    gridCoverage: metric(current.gridCoverage, previousOf((s) => s.gridCoverage), 'percent'),

    byEvaluation: {
      points: current.byEvaluation.map((row) => ({
        key: row.key,
        label: `${row.className} — ${row.label}`,
        value: row.value,
      })),
      unit: 'grade',
    },
    byClass: series(current.byClass, comparison ? comparison.byClass : null, (key) => key, 'grade'),
    byLevel: series(current.byLevel, comparison ? comparison.byLevel : null, (key) => key, 'grade'),
    bySubject: series(
      current.bySubject,
      comparison ? comparison.bySubject : null,
      (key) => key,
      'grade',
    ),
    calendar: series(
      current.calendar,
      comparison ? comparison.calendar : null,
      (key) => key,
      'count',
      (a, b) => MONTHS.indexOf(a.key) - MONTHS.indexOf(b.key),
    ),
    mentions: series(current.mentions, comparison ? comparison.mentions : null, (key) => key),
    distribution: series(
      current.distribution,
      comparison ? comparison.distribution : null,
      (key) => key,
      'count',
      (a, b) => numeric(a.key) - numeric(b.key),
    ),
    distributionScale: current.distributionScale,
    classComparison,
    levelSpread: current.levelSpread,
    settings: current.settings,
    truncated: current.truncated,
  };
}

// ---------------------------------------------------------------------------
// PRI-16 — évolution pluriannuelle
// ---------------------------------------------------------------------------

export async function getPrimaryTimeline(
  resolved: ResolvedYears,
  count: number,
  filters: PrimaryFilters,
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
