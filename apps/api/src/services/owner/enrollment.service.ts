import { Prisma, prisma } from '@school/database';

import {
  average,
  metric,
  ratio,
  round,
  series,
  type Metric,
  type Series,
  type SeriesPoint,
} from './compare.helper';
import {
  historyOf,
  previousYearOf,
  type OwnerAcademicYear,
  type ResolvedYears,
} from './academic-year.helper';
import { OVERCROWDED_OCCUPANCY, UNDERUSED_OCCUPANCY } from './thresholds';

/**
 * Effectifs & scolarité — indicateurs `EFF-01` à `EFF-18` (§4.a).
 *
 * **Point de modélisation structurant** : l'appartenance d'un élève à une année
 * scolaire passe par `inscriptions`, contrainte unique `(student_id,
 * academic_year_id)`. `students.class_id` ne porte que la classe *courante* et
 * ne permet aucune lecture historique — lire les effectifs par là donnerait,
 * pour toute année passée, la photographie d'aujourd'hui. Tout se lit donc par
 * `inscriptions`, sans exception.
 *
 * L'extraction (Prisma) et le calcul (TypeScript) sont séparés : `computeSnapshot`
 * est une fonction pure, testable sans base, et c'est elle qui porte les
 * formules. Le regroupement se fait en mémoire parce que `groupBy` de Prisma ne
 * sait pas grouper sur une colonne de relation (`classes.level` depuis
 * `inscriptions`) — cf. §6.6.
 *
 * **Confidentialité** : les `select` ne descendent jamais jusqu'au nom. Les
 * seules identités qui sortent d'ici sont celles des classes et des niveaux.
 */

export interface EnrollmentFilters {
  /** `L1` — niveau de classe. */
  level?: string;
  /** `L2` — classe. */
  classId?: string;
  /** `L3` — cycle. */
  cycle?: 'PRIMAIRE' | 'SECONDAIRE';
  /** `L8` — sexe de l'élève. */
  gender?: string;
}

/** Ligne d'inscription réduite à ce que les indicateurs exigent, et rien de plus. */
export interface InscriptionRow {
  studentId: string;
  classId: string;
  className: string;
  level: string | null;
  cycle: string;
  capacity: number | null;
  gender: string;
  /** Année de naissance seule : la date complète ne sort jamais du service. */
  birthYear: number;
  status: string;
  isStateAssigned: boolean;
}

export interface ClassAggregate {
  classId: string;
  name: string;
  level: string | null;
  cycle: string;
  total: number;
  girls: number;
  boys: number;
  averageAge: number | null;
  capacity: number | null;
  /** `null` si la capacité n'est pas renseignée — surtout pas `0`. */
  occupancy: number | null;
  status: 'ok' | 'overcrowded' | 'underused' | 'unknown';
}

export interface EnrollmentSnapshot {
  total: number;
  newcomers: number;
  returning: number;
  /** `null` pour la première année : les départs ne sont pas mesurables. */
  departures: number | null;
  retentionRate: number | null;
  averagePerClass: number | null;
  stateAssignedShare: number | null;
  dropoutRate: number | null;
  byLevel: Map<string, number>;
  newcomersByLevel: Map<string, number>;
  returningByLevel: Map<string, number>;
  ageByLevel: Map<string, number | null>;
  byGender: Map<string, number>;
  byStatus: Map<string, number>;
  ageDistribution: Map<string, number>;
  classes: ClassAggregate[];
}

const LEVEL_UNKNOWN = 'SANS_NIVEAU';

/** Statuts traduisant une sortie non diplômante — base du taux d'abandon `EFF-13`. */
const DROPOUT_STATUSES = new Set(['INACTIVE', 'TRANSFERRED', 'EXPELLED']);

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

function whereFor(
  academicYearId: string,
  filters: EnrollmentFilters,
): Prisma.inscriptionsWhereInput {
  const classFilter = {
    ...(filters.level ? { level: filters.level } : {}),
    ...(filters.cycle ? { cycle: filters.cycle } : {}),
  };

  return {
    academic_year_id: academicYearId,
    ...(filters.classId ? { class_id: filters.classId } : {}),
    ...(Object.keys(classFilter).length > 0 ? { class: classFilter } : {}),
    ...(filters.gender ? { student: { gender: filters.gender } } : {}),
  };
}

async function readInscriptions(
  academicYearId: string,
  filters: EnrollmentFilters,
): Promise<InscriptionRow[]> {
  const rows = await prisma.inscriptions.findMany({
    where: whereFor(academicYearId, filters),
    select: {
      student_id: true,
      class: { select: { id: true, name: true, level: true, cycle: true, capacity: true } },
      // Aucun nom, aucun contact : seules les colonnes dont un agrégat a besoin.
      student: {
        select: { gender: true, dateOfBirth: true, status: true, isStateAssigned: true },
      },
    },
  });

  return rows.map((row) => ({
    studentId: row.student_id,
    classId: row.class.id,
    className: row.class.name,
    level: row.class.level,
    cycle: String(row.class.cycle),
    capacity: row.class.capacity ?? null,
    gender: row.student.gender,
    birthYear: row.student.dateOfBirth.getFullYear(),
    status: String(row.student.status),
    isStateAssigned: row.student.isStateAssigned,
  }));
}

// ---------------------------------------------------------------------------
// Calcul — fonctions pures
// ---------------------------------------------------------------------------

/**
 * Âge de l'élève à l'année scolaire considérée.
 *
 * Calculé sur `academic_years.start_year`, **jamais sur la date du jour** :
 * consulter 2019-2020 en 2026 doit donner l'âge qu'avaient les élèves à
 * l'époque, sinon la pyramide des âges d'une année passée vieillit toute seule
 * à chaque consultation.
 */
export function ageAt(startYear: number, birthYear: number): number {
  return startYear - birthYear;
}

function increment(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function levelKey(row: InscriptionRow): string {
  return row.level ?? LEVEL_UNKNOWN;
}

function occupancyStatus(occupancy: number | null): ClassAggregate['status'] {
  if (occupancy === null) return 'unknown';
  if (occupancy > OVERCROWDED_OCCUPANCY) return 'overcrowded';
  if (occupancy < UNDERUSED_OCCUPANCY) return 'underused';
  return 'ok';
}

/**
 * Agrège une année à partir de ses inscriptions.
 *
 * `previousStudentIds` est l'ensemble des élèves inscrits l'année **précédente**
 * (au sens chronologique). Passer `null` — première année de l'établissement —
 * n'est pas la même chose que passer un ensemble vide : dans le premier cas,
 * « nouveaux » et « taux de réinscription » n'ont pas de sens et valent `null` ;
 * dans le second, tous les élèves sont effectivement nouveaux.
 */
export function computeSnapshot(
  rows: InscriptionRow[],
  startYear: number,
  previous: { studentIds: Set<string>; total: number } | null,
): EnrollmentSnapshot {
  const byLevel = new Map<string, number>();
  const newcomersByLevel = new Map<string, number>();
  const returningByLevel = new Map<string, number>();
  const byGender = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const ageDistribution = new Map<string, number>();
  const agesByLevel = new Map<string, number[]>();
  const classMap = new Map<string, ClassAggregate & { ages: number[] }>();

  const currentIds = new Set<string>();
  let newcomers = 0;
  let stateAssigned = 0;
  let dropouts = 0;

  for (const row of rows) {
    currentIds.add(row.studentId);

    const level = levelKey(row);
    increment(byLevel, level);
    increment(byGender, row.gender);
    increment(byStatus, row.status);

    const age = ageAt(startYear, row.birthYear);
    increment(ageDistribution, String(age));
    if (!agesByLevel.has(level)) agesByLevel.set(level, []);
    agesByLevel.get(level)!.push(age);

    // Sans année précédente, tout élève inscrit est nécessairement un nouveau :
    // c'est la première promotion de l'établissement.
    const isNew = previous ? !previous.studentIds.has(row.studentId) : true;
    if (isNew) newcomers += 1;
    increment(isNew ? newcomersByLevel : returningByLevel, level);

    if (row.isStateAssigned) stateAssigned += 1;
    if (DROPOUT_STATUSES.has(row.status)) dropouts += 1;

    let aggregate = classMap.get(row.classId);
    if (!aggregate) {
      aggregate = {
        classId: row.classId,
        name: row.className,
        level: row.level,
        cycle: row.cycle,
        total: 0,
        girls: 0,
        boys: 0,
        averageAge: null,
        capacity: row.capacity,
        occupancy: null,
        status: 'unknown',
        ages: [],
      };
      classMap.set(row.classId, aggregate);
    }
    aggregate.total += 1;
    aggregate.ages.push(age);
    if (isFemale(row.gender)) aggregate.girls += 1;
    else if (isMale(row.gender)) aggregate.boys += 1;
  }

  const total = rows.length;

  const classes: ClassAggregate[] = [...classMap.values()]
    .map(({ ages, ...aggregate }) => {
      const occupancy =
        aggregate.capacity && aggregate.capacity > 0 ? aggregate.total / aggregate.capacity : null;
      return {
        ...aggregate,
        averageAge: roundOrNull(average(ages), 1),
        occupancy: occupancy === null ? null : round(occupancy, 4),
        status: occupancyStatus(occupancy),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Sans année précédente, les départs ne valent pas zéro : ils ne sont pas
  // mesurables. Annoncer « 0 départ » pour la première année de l'école serait
  // une bonne nouvelle inventée.
  const departures = previous
    ? [...previous.studentIds].filter((id) => !currentIds.has(id)).length
    : null;

  const returning = total - newcomers;

  return {
    total,
    newcomers,
    returning,
    departures,
    // EFF-10 : les réinscrits rapportés à l'effectif de l'année précédente.
    // `null` — et non `0` — pour la première année : rien n'a pu fidéliser.
    retentionRate: previous ? roundOrNull(ratio(returning, previous.total), 4) : null,
    averagePerClass: roundOrNull(ratio(total, classes.length), 2),
    stateAssignedShare: roundOrNull(ratio(stateAssigned, total), 4),
    dropoutRate: roundOrNull(ratio(dropouts, total), 4),
    byLevel,
    newcomersByLevel,
    returningByLevel,
    ageByLevel: new Map(
      [...agesByLevel.entries()].map(([level, ages]) => [level, roundOrNull(average(ages), 1)]),
    ),
    byGender,
    byStatus,
    ageDistribution,
    classes,
  };
}

/**
 * Les libellés de sexe ne sont pas normalisés en base (`students.gender` est un
 * `VarChar`) : le comptage tolère donc les variantes rencontrées plutôt que de
 * ranger silencieusement une élève dans « autre ».
 */
function isFemale(gender: string): boolean {
  return /^(f|femme|feminin|féminin|female|fille)$/i.test(gender.trim());
}

function isMale(gender: string): boolean {
  return /^(m|h|homme|masculin|male|garcon|garçon)$/i.test(gender.trim());
}

function roundOrNull(value: number | null, decimals: number): number | null {
  return value === null ? null : round(value, decimals);
}

// ---------------------------------------------------------------------------
// Composition de la réponse
// ---------------------------------------------------------------------------

export interface EnrollmentClassRow extends ClassAggregate {
  previous: number | null;
  delta: number | null;
}

export interface EnrollmentLevelPoint extends SeriesPoint {
  newcomers: number;
  returning: number;
  averageAge: number | null;
}

export interface EnrollmentResult {
  total: Metric;
  newcomers: Metric;
  returning: Metric;
  retentionRate: Metric;
  departures: Metric;
  averagePerClass: Metric;
  stateAssigned: Metric;
  dropoutRate: Metric;
  byLevel: { points: EnrollmentLevelPoint[]; total: number; unit: 'count' };
  byClass: { rows: EnrollmentClassRow[]; truncated: boolean };
  byGender: Series;
  byStatus: Series;
  ageDistribution: Series;
  occupancy: {
    /** Faux tant qu'aucune classe ne porte de capacité : l'écran affiche alors un état vide. */
    capacityKnown: boolean;
    average: Metric;
    overcrowded: EnrollmentClassRow[];
    underused: EnrollmentClassRow[];
  };
}

/** Au-delà, la réponse est tronquée et le signale (§6.7). */
const MAX_CLASS_ROWS = 200;

/** Snapshot d'une année, précédée de ce qu'il faut pour situer les nouveaux venus. */
async function snapshotOf(
  years: OwnerAcademicYear[],
  year: OwnerAcademicYear,
  filters: EnrollmentFilters,
): Promise<EnrollmentSnapshot> {
  const previousYear = previousYearOf(years, year.id);

  const [rows, previousRows] = await Promise.all([
    readInscriptions(year.id, filters),
    previousYear
      ? readInscriptions(previousYear.id, filters)
      : Promise.resolve<InscriptionRow[] | null>(null),
  ]);

  const previous = previousRows
    ? { studentIds: new Set(previousRows.map((row) => row.studentId)), total: previousRows.length }
    : null;

  return computeSnapshot(rows, year.startYear, previous);
}

export async function getEnrollment(
  resolved: ResolvedYears,
  filters: EnrollmentFilters,
): Promise<EnrollmentResult> {
  const [current, comparison] = await Promise.all([
    snapshotOf(resolved.years, resolved.year, filters),
    resolved.compare
      ? snapshotOf(resolved.years, resolved.compare, filters)
      : Promise.resolve<EnrollmentSnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: EnrollmentSnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  const levelLabel = (key: string) => (key === LEVEL_UNKNOWN ? 'Sans niveau' : key);

  const levelPoints: EnrollmentLevelPoint[] = series(
    current.byLevel,
    comparison ? comparison.byLevel : null,
    levelLabel,
  ).points.map((point) => ({
    ...point,
    newcomers: current.newcomersByLevel.get(point.key) ?? 0,
    returning: current.returningByLevel.get(point.key) ?? 0,
    averageAge: current.ageByLevel.get(point.key) ?? null,
  }));

  const previousByClass = new Map(
    (comparison?.classes ?? []).map((aggregate) => [aggregate.classId, aggregate.total]),
  );

  const classRows: EnrollmentClassRow[] = current.classes.map((aggregate) => {
    const previous = comparison ? previousByClass.get(aggregate.classId) ?? 0 : null;
    return {
      ...aggregate,
      previous,
      delta: previous === null ? null : aggregate.total - previous,
    };
  });

  const withCapacity = current.classes.filter((aggregate) => aggregate.occupancy !== null);
  const comparisonWithCapacity = (comparison?.classes ?? []).filter(
    (aggregate) => aggregate.occupancy !== null,
  );

  return {
    total: metric(current.total, previousOf((s) => s.total)),
    newcomers: metric(current.newcomers, previousOf((s) => s.newcomers)),
    returning: metric(current.returning, previousOf((s) => s.returning)),
    retentionRate: metric(current.retentionRate, previousOf((s) => s.retentionRate), 'percent'),
    departures: metric(current.departures, previousOf((s) => s.departures)),
    averagePerClass: metric(current.averagePerClass, previousOf((s) => s.averagePerClass)),
    stateAssigned: metric(
      current.stateAssignedShare,
      previousOf((s) => s.stateAssignedShare),
      'percent',
    ),
    dropoutRate: metric(current.dropoutRate, previousOf((s) => s.dropoutRate), 'percent'),

    byLevel: { points: levelPoints, total: current.total, unit: 'count' },
    byClass: {
      rows: classRows.slice(0, MAX_CLASS_ROWS),
      truncated: classRows.length > MAX_CLASS_ROWS,
    },
    byGender: series(current.byGender, comparison ? comparison.byGender : null, (key) => key),
    byStatus: series(current.byStatus, comparison ? comparison.byStatus : null, (key) => key),
    ageDistribution: series(
      current.ageDistribution,
      comparison ? comparison.ageDistribution : null,
      (key) => `${key} ans`,
      'count',
      // Un histogramme d'âges se lit dans l'ordre des âges, pas des effectifs.
      (a, b) => Number(a.key) - Number(b.key),
    ),

    occupancy: {
      capacityKnown: withCapacity.length > 0,
      average: metric(
        roundOrNull(average(withCapacity.map((aggregate) => aggregate.occupancy!)), 4),
        comparisonWithCapacity.length > 0
          ? roundOrNull(average(comparisonWithCapacity.map((a) => a.occupancy!)), 4)
          : null,
        'percent',
      ),
      overcrowded: classRows.filter((row) => row.status === 'overcrowded'),
      underused: classRows.filter((row) => row.status === 'underused'),
    },
  };
}

// ---------------------------------------------------------------------------
// EFF-14 — évolution pluriannuelle
// ---------------------------------------------------------------------------

export interface EnrollmentTimeline {
  series: Series[];
}

/**
 * Effectifs et nouveaux élèves sur les `count` dernières années.
 *
 * Une seule requête pour toutes les années : le volume est celui d'un
 * établissement sur dix ans, et la découper par année multiplierait les
 * allers-retours sans rien gagner. L'année qui précède la plus ancienne est
 * incluse dans la lecture — sans elle, les « nouveaux » du premier point
 * seraient surestimés, faute de savoir qui était déjà là.
 */
export interface ActiveClass {
  id: string;
  name: string;
  level: string | null;
  cycle: string;
  /** Inscrits de l'année — ce qui rend la classe « active ». */
  total: number;
}

/**
 * Classes actives d'une année scolaire — référentiel du sélecteur de classe.
 *
 * « Active » se lit dans les inscriptions, pas dans la table des classes :
 * `SchoolClass` ne porte aucune année, une classe créée en 2019 et jamais
 * rouverte y figure toujours. La proposer dans le sélecteur mènerait à un
 * tableau de bord vide sans que rien n'explique pourquoi. Une classe est donc
 * active l'année où au moins un élève y est inscrit.
 *
 * Tri par niveau puis par nom : c'est l'ordre dans lequel une direction lit ses
 * classes, celui des listes de l'établissement.
 */
export async function listActiveClasses(academicYearId: string): Promise<ActiveClass[]> {
  const rows = await prisma.inscriptions.findMany({
    where: { academic_year_id: academicYearId },
    select: {
      student_id: true,
      class: { select: { id: true, name: true, level: true, cycle: true } },
    },
  });

  const byClass = new Map<string, ActiveClass & { students: Set<string> }>();
  for (const row of rows) {
    let entry = byClass.get(row.class.id);
    if (!entry) {
      entry = {
        id: row.class.id,
        name: row.class.name,
        level: row.class.level,
        cycle: String(row.class.cycle),
        total: 0,
        students: new Set<string>(),
      };
      byClass.set(row.class.id, entry);
    }
    // Compté par élève distinct : une réinscription en cours d'année ne doit
    // pas gonfler l'effectif de la classe.
    entry.students.add(row.student_id);
  }

  return [...byClass.values()]
    .map(({ students, ...entry }) => ({ ...entry, total: students.size }))
    .sort(
      (a, b) =>
        (a.level ?? '').localeCompare(b.level ?? '', 'fr') ||
        a.name.localeCompare(b.name, 'fr', { numeric: true }),
    );
}

export async function getEnrollmentTimeline(
  resolved: ResolvedYears,
  count: number,
): Promise<EnrollmentTimeline> {
  const history = historyOf(resolved.years, count);
  if (history.length === 0) {
    return { series: [] };
  }

  const oldest = history[0];
  const beforeOldest = previousYearOf(resolved.years, oldest.id);
  const readIds = [...history.map((year) => year.id), ...(beforeOldest ? [beforeOldest.id] : [])];

  const rows = await prisma.inscriptions.findMany({
    where: { academic_year_id: { in: readIds } },
    select: { academic_year_id: true, student_id: true },
  });

  const byYear = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!byYear.has(row.academic_year_id)) byYear.set(row.academic_year_id, new Set());
    byYear.get(row.academic_year_id)!.add(row.student_id);
  }

  const totals: SeriesPoint[] = [];
  const newcomers: SeriesPoint[] = [];

  history.forEach((year, index) => {
    const students = byYear.get(year.id) ?? new Set<string>();
    const previousYear = index === 0 ? beforeOldest : history[index - 1];
    const previousStudents = previousYear ? byYear.get(previousYear.id) ?? null : null;

    totals.push({ key: year.id, label: year.name, value: students.size });
    newcomers.push({
      key: year.id,
      label: year.name,
      // Sans année précédente connue, « nouveaux » n'est pas mesurable : `null`
      // laisse un trou dans la courbe, ce qui est honnête, là où `0` mentirait.
      value: previousStudents
        ? [...students].filter((id) => !previousStudents.has(id)).length
        : null,
    });
  });

  return {
    series: [
      { points: totals, unit: 'count' },
      { points: newcomers, unit: 'count' },
    ],
  };
}
