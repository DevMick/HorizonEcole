import { Prisma, prisma } from '@school/database';

import { AttendanceMakeupService } from '../attendance-makeup.service';
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
import { type OwnerAcademicYear, type ResolvedYears } from './academic-year.helper';

/**
 * Assiduité & vie scolaire — indicateurs `ASS-01` à `ASS-20` (§4.b).
 *
 * **Deux mécanismes d'appel coexistent** dans le schéma et ne doivent jamais
 * être mélangés : l'appel par séance (`attendance_sessions` +
 * `attendance_records`), qui est celui de l'enseignant aujourd'hui, et l'appel
 * demi-journée historique (`attendances`), conservé comme repli. Les taux
 * principaux se lisent sur le premier ; le second n'alimente que `ASS-12`, et
 * il est présenté comme tel.
 *
 * **`attendance_records` ne porte pas d'établissement** (§6.9). Son isolation
 * est *transitive*, par `session_id → attendance_sessions.establishment_id` :
 * toute lecture passe donc par un filtre `session: { … }`, jamais par la table
 * à plat. Un `findMany` direct traverserait les établissements sans lever la
 * moindre erreur — c'est le risque d'isolation numéro un du profil.
 *
 * **Aucun nom d'élève.** Les enseignants n'apparaissent qu'en initiales.
 */

export interface AttendanceFilters {
  /** `L1` — niveau. */
  level?: string;
  /** `L2` — classe. */
  classId?: string;
  /** `L4` — matière. */
  subjectId?: string;
  /** `L5` — trimestre. */
  semesterId?: string;
  /** `L6` — enseignant. */
  teacherId?: string;
  /** `L7` — période calendaire. */
  startDate?: string;
  endDate?: string;
}

interface ClassRef {
  id: string;
  name: string;
  level: string | null;
}

interface Tally {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

const EMPTY_TALLY: Tally = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };

/**
 * Filtre de session — **le seul chemin d'accès aux relevés de présence**.
 *
 * Toute requête sur `attendance_records` le porte dans `where.session`, ce qui
 * garantit à la fois le cloisonnement (transitif) et l'application uniforme des
 * filtres locaux.
 */
function sessionWhere(
  academicYearId: string,
  filters: AttendanceFilters,
  classId?: string,
  subjectId?: string,
): Prisma.attendance_sessionsWhereInput {
  const from = filters.startDate ? new Date(`${filters.startDate}T00:00:00Z`) : undefined;
  const to = filters.endDate ? new Date(`${filters.endDate}T23:59:59Z`) : undefined;

  return {
    academic_year_id: academicYearId,
    ...(classId ? { class_id: classId } : filters.classId ? { class_id: filters.classId } : {}),
    ...(subjectId
      ? { subject_id: subjectId }
      : filters.subjectId
        ? { subject_id: filters.subjectId }
        : {}),
    ...(filters.teacherId ? { teacher_id: filters.teacherId } : {}),
    ...(filters.level && !classId ? { class: { level: filters.level } } : {}),
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
}

/** Relevés agrégés par statut, pour un périmètre de séances donné. */
async function tallyOf(
  academicYearId: string,
  filters: AttendanceFilters,
  classId?: string,
  subjectId?: string,
): Promise<Tally> {
  const rows = await prisma.attendance_records.groupBy({
    by: ['status'],
    // Le filtre passe par la session : `attendance_records` n'est pas cloisonnée.
    where: { session: sessionWhere(academicYearId, filters, classId, subjectId) },
    _count: { _all: true },
  });

  const tally: Tally = { ...EMPTY_TALLY };
  for (const row of rows) {
    const count = row._count._all;
    tally.total += count;
    switch (String(row.status)) {
      case 'PRESENT':
        tally.present += count;
        break;
      case 'LATE':
        tally.late += count;
        break;
      case 'EXCUSED':
        tally.excused += count;
        break;
      default:
        tally.absent += count;
    }
  }
  return tally;
}

/** Initiales — le nom complet d'un enseignant reste hors périmètre (§11-Q2). */
function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0).toUpperCase()}. ${lastName.trim().charAt(0).toUpperCase()}.`;
}

function roundOrNull(value: number | null, decimals = 4): number | null {
  return value === null ? null : round(value, decimals);
}

async function readClasses(filters: AttendanceFilters): Promise<ClassRef[]> {
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

// ---------------------------------------------------------------------------
// ASS-01…ASS-06, ASS-12 — assiduité
// ---------------------------------------------------------------------------

interface AttendanceSnapshot {
  tally: Tally;
  justifiedShare: number | null;
  absenceHours: number | null;
  byClass: Map<string, number>;
  bySubject: Map<string, number>;
  absenceHoursBySubject: Map<string, number>;
  halfDayRate: number | null;
  hasSource: boolean;
}

async function attendanceSnapshotOf(
  year: OwnerAcademicYear,
  filters: AttendanceFilters,
): Promise<AttendanceSnapshot> {
  const classes = await readClasses(filters);

  const [tally, justified, absences, subjects, halfDays] = await Promise.all([
    tallyOf(year.id, filters),
    // `ASS-03` — part des absences couvertes par un justificatif.
    prisma.attendance_records.groupBy({
      by: ['is_justified'],
      where: { session: sessionWhere(year.id, filters), status: 'ABSENT' },
      _count: { _all: true },
    }),
    // `ASS-05` — heures d'absence, base du calcul de conduite.
    prisma.student_absences.aggregate({
      where: {
        academic_year_id: year.id,
        ...(filters.classId ? { class_id: filters.classId } : {}),
        ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
        ...(filters.semesterId ? { semester_id: filters.semesterId } : {}),
        ...(filters.level ? { class: { level: filters.level } } : {}),
      },
      _sum: { hours_absent: true },
    }),
    prisma.subjects.findMany({ select: { id: true, name: true } }),
    // `ASS-12` — repli demi-journée, sur la table historique.
    prisma.attendances.groupBy({
      by: ['status'],
      where: {
        ...(filters.classId ? { class_id: filters.classId } : {}),
        ...(filters.level ? { class: { level: filters.level } } : {}),
      },
      _count: { _all: true },
    }),
  ]);

  // Ventilations par classe et par matière : une requête bornée par entité
  // plutôt qu'un chargement à plat des relevés. `groupBy` ne sait pas grouper
  // sur une colonne de la session, et ramener les centaines de milliers de
  // lignes de `attendance_records` pour les regrouper en mémoire coûterait bien
  // plus cher que ces quelques agrégats.
  const subjectIds = filters.subjectId
    ? [filters.subjectId]
    : [...new Set(
        (
          await prisma.attendance_sessions.groupBy({
            by: ['subject_id'],
            where: sessionWhere(year.id, filters),
          })
        ).map((row) => row.subject_id),
      )];

  const [classTallies, subjectTallies, absenceBySubject] = await Promise.all([
    Promise.all(
      classes.map(async (klass) => ({
        klass,
        tally: await tallyOf(year.id, filters, klass.id),
      })),
    ),
    Promise.all(
      subjectIds.map(async (subjectId) => ({
        subjectId,
        tally: await tallyOf(year.id, filters, undefined, subjectId),
      })),
    ),
    prisma.student_absences.groupBy({
      by: ['subject_id'],
      where: {
        academic_year_id: year.id,
        ...(filters.classId ? { class_id: filters.classId } : {}),
        ...(filters.semesterId ? { semester_id: filters.semesterId } : {}),
        ...(filters.level ? { class: { level: filters.level } } : {}),
      },
      _sum: { hours_absent: true },
    }),
  ]);

  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));

  const absenceRateOf = (row: Tally) =>
    row.total > 0 ? (row.absent + row.excused) / row.total : null;

  const byClass = new Map<string, number>();
  for (const row of classTallies) {
    const rate = absenceRateOf(row.tally);
    if (rate !== null) byClass.set(row.klass.name, round(rate, 4));
  }

  const bySubject = new Map<string, number>();
  for (const row of subjectTallies) {
    const rate = absenceRateOf(row.tally);
    if (rate !== null) {
      bySubject.set(subjectNames.get(row.subjectId) ?? 'Matière inconnue', round(rate, 4));
    }
  }

  const absenceHoursBySubject = new Map<string, number>();
  for (const row of absenceBySubject) {
    const hours = Number(row._sum.hours_absent ?? 0);
    if (hours > 0) {
      absenceHoursBySubject.set(subjectNames.get(row.subject_id) ?? 'Matière inconnue', round(hours, 1));
    }
  }

  const justifiedCount = justified.find((row) => row.is_justified)?._count._all ?? 0;
  const absentCount = justified.reduce((sum, row) => sum + row._count._all, 0);

  const halfDayTotal = halfDays.reduce((sum, row) => sum + row._count._all, 0);
  const halfDayPresent =
    halfDays.find((row) => String(row.status) === 'PRESENT')?._count._all ?? 0;

  const totalHours = Number(absences._sum.hours_absent ?? 0);

  return {
    tally,
    justifiedShare: roundOrNull(ratio(justifiedCount, absentCount)),
    absenceHours: totalHours > 0 ? round(totalHours, 1) : null,
    byClass,
    bySubject,
    absenceHoursBySubject,
    halfDayRate: roundOrNull(ratio(halfDayPresent, halfDayTotal)),
    hasSource: tally.total > 0,
  };
}

export interface AttendanceResult {
  presenceRate: Metric;
  absenceRate: Metric;
  lateRate: Metric;
  justifiedShare: Metric;
  absenceHours: Metric;
  byClass: Series;
  bySubject: Series;
  absenceHoursBySubject: Series;
  halfDayRate: Metric;
  hasSource: boolean;
}

export async function getAttendance(
  resolved: ResolvedYears,
  filters: AttendanceFilters,
): Promise<AttendanceResult> {
  const [current, comparison] = await Promise.all([
    attendanceSnapshotOf(resolved.year, filters),
    resolved.compare
      ? attendanceSnapshotOf(resolved.compare, filters)
      : Promise.resolve<AttendanceSnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: AttendanceSnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  // `ASS-01`, `ASS-02` et `ASS-04` partitionnent les quatre statuts : présent,
  // absent (justifié ou non), et en retard. Leur somme fait donc exactement
  // 100 %, ce qui rend l'écran vérifiable d'un coup d'œil (critère 6.1).
  const rateOf = (snapshot: AttendanceSnapshot, pick: (tally: Tally) => number) =>
    snapshot.tally.total > 0 ? round(pick(snapshot.tally) / snapshot.tally.total, 4) : null;

  const presence = (tally: Tally) => tally.present;
  const absence = (tally: Tally) => tally.absent + tally.excused;
  const lateness = (tally: Tally) => tally.late;

  return {
    presenceRate: metric(
      rateOf(current, presence),
      comparison ? rateOf(comparison, presence) : null,
      'percent',
    ),
    absenceRate: metric(
      rateOf(current, absence),
      comparison ? rateOf(comparison, absence) : null,
      'percent',
    ),
    lateRate: metric(
      rateOf(current, lateness),
      comparison ? rateOf(comparison, lateness) : null,
      'percent',
    ),
    justifiedShare: metric(
      current.justifiedShare,
      previousOf((s) => s.justifiedShare),
      'percent',
    ),
    absenceHours: metric(current.absenceHours, previousOf((s) => s.absenceHours), 'hours'),
    byClass: series(current.byClass, comparison ? comparison.byClass : null, (key) => key, 'percent'),
    bySubject: series(
      current.bySubject,
      comparison ? comparison.bySubject : null,
      (key) => key,
      'percent',
    ),
    absenceHoursBySubject: series(
      current.absenceHoursBySubject,
      comparison ? comparison.absenceHoursBySubject : null,
      (key) => key,
      'hours',
    ),
    halfDayRate: metric(current.halfDayRate, previousOf((s) => s.halfDayRate), 'percent'),
    hasSource: current.hasSource,
  };
}

// ---------------------------------------------------------------------------
// ASS-07…ASS-11 — séances
// ---------------------------------------------------------------------------

export interface AttendanceSessions {
  held: Metric;
  notHeld: Metric;
  coverageRate: Metric;
  makeupBreakdown: Series;
  moveRequests: Series;
  byTeacher: Array<{ key: string; label: string; held: number; notHeld: number; coverage: number | null }>;
  hasSource: boolean;
}

/**
 * Séances tenues, non tenues et suites données.
 *
 * `ASS-08` **n'est pas recalculé ici** : il appelle
 * `AttendanceMakeupService.getUncalledSessions`, qui est déjà la définition de
 * référence de la page « Séances non tenues » de l'administration. C'est la
 * seule façon de garantir que les deux écrans annoncent le même nombre — un
 * propriétaire et son administrateur qui se contredisent sur le nombre de cours
 * manqués, c'est le tableau de bord entier qui perd sa crédibilité.
 */
async function sessionsSnapshotOf(
  year: OwnerAcademicYear,
  filters: AttendanceFilters,
): Promise<{
  held: number;
  notHeld: number;
  coverage: number | null;
  makeup: Map<string, number>;
  moves: Map<string, number>;
  byTeacher: AttendanceSessions['byTeacher'];
}> {
  const [held, uncalled, timetables, teachers] = await Promise.all([
    prisma.attendance_sessions.count({ where: sessionWhere(year.id, filters) }),
    AttendanceMakeupService.getUncalledSessions({
      academicYearId: year.id,
      semesterId: filters.semesterId,
      classId: filters.classId,
      subjectId: filters.subjectId,
      teacherId: filters.teacherId,
    }),
    // `class_timetables` est cloisonnée : ses identifiants servent ensuite de
    // clé d'accès aux tables de rattrapage et de déplacement, qui ne le sont
    // pas (§6.9).
    prisma.class_timetables.findMany({
      where: {
        academic_year_id: year.id,
        ...(filters.classId ? { class_id: filters.classId } : {}),
        ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
        ...(filters.teacherId ? { teacher_id: filters.teacherId } : {}),
      },
      select: { id: true },
    }),
    prisma.teachers.findMany({ select: { id: true, first_name: true, last_name: true } }),
  ]);

  const timetableIds = timetables.map((row) => row.id);

  const [makeupRows, moveRows, heldByTeacher] = await Promise.all([
    timetableIds.length > 0
      ? prisma.attendance_makeup_sessions.groupBy({
          by: ['status'],
          where: { timetable_id: { in: timetableIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    timetableIds.length > 0
      ? prisma.attendance_move_requests.groupBy({
          by: ['status'],
          where: { timetable_id: { in: timetableIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.attendance_sessions.groupBy({
      by: ['teacher_id'],
      where: sessionWhere(year.id, filters),
      _count: { _all: true },
    }),
  ]);

  const teacherNames = new Map(
    teachers.map((teacher) => [teacher.id, initialsOf(teacher.first_name, teacher.last_name)]),
  );

  const notHeldByTeacher = new Map<string, number>();
  for (const session of uncalled.sessions as Array<{ teacher?: { id: string } | null }>) {
    const teacherId = session.teacher?.id;
    if (!teacherId) continue;
    notHeldByTeacher.set(teacherId, (notHeldByTeacher.get(teacherId) ?? 0) + 1);
  }

  const teacherIds = new Set([
    ...heldByTeacher.map((row) => row.teacher_id),
    ...notHeldByTeacher.keys(),
  ]);

  const byTeacher = [...teacherIds]
    .map((teacherId) => {
      const heldCount = heldByTeacher.find((row) => row.teacher_id === teacherId)?._count._all ?? 0;
      const notHeldCount = notHeldByTeacher.get(teacherId) ?? 0;
      return {
        key: teacherId,
        label: teacherNames.get(teacherId) ?? '—',
        held: heldCount,
        notHeld: notHeldCount,
        coverage: roundOrNull(ratio(heldCount, heldCount + notHeldCount)),
      };
    })
    .sort((left, right) => (left.coverage ?? 1) - (right.coverage ?? 1));

  const notHeld = uncalled.sessions.length;

  return {
    held,
    notHeld,
    coverage: roundOrNull(ratio(held, held + notHeld)),
    makeup: new Map(makeupRows.map((row) => [String(row.status), row._count._all])),
    moves: new Map(moveRows.map((row) => [String(row.status), row._count._all])),
    byTeacher,
  };
}

export async function getAttendanceSessions(
  resolved: ResolvedYears,
  filters: AttendanceFilters,
): Promise<AttendanceSessions> {
  const [current, comparison] = await Promise.all([
    sessionsSnapshotOf(resolved.year, filters),
    resolved.compare
      ? sessionsSnapshotOf(resolved.compare, filters)
      : Promise.resolve<Awaited<ReturnType<typeof sessionsSnapshotOf>> | null>(null),
  ]);

  return {
    held: metric(current.held, comparison ? comparison.held : null),
    notHeld: metric(current.notHeld, comparison ? comparison.notHeld : null),
    coverageRate: metric(current.coverage, comparison ? comparison.coverage : null, 'percent'),
    makeupBreakdown: series(current.makeup, comparison ? comparison.makeup : null, (key) => key),
    moveRequests: series(current.moves, comparison ? comparison.moves : null, (key) => key),
    byTeacher: current.byTeacher.slice(0, 200),
    hasSource: current.held + current.notHeld > 0,
  };
}

// ---------------------------------------------------------------------------
// ASS-15…ASS-20 — conduite et vie scolaire
// ---------------------------------------------------------------------------

/** En deçà, l'élève est signalé — même seuil de passage que le secondaire. */
const CONDUCT_THRESHOLD = 10;

export interface AttendanceConduct {
  averageNote: Metric;
  averagePenalty: Metric;
  belowThreshold: Metric;
  distribution: Series;
  overrides: { count: Metric; hours: Metric };
  incidents: Series;
  /** Paramètres du calcul, pour que la pénalité affichée soit explicable (critère 6.5). */
  settings: { baseNote: number; hoursPerPoint: number } | null;
  hasSource: boolean;
}

interface ConductSnapshot {
  notes: number[];
  penalties: number[];
  belowThreshold: number | null;
  overrideCount: number;
  overrideHours: number | null;
  incidents: Map<string, number>;
  settings: { baseNote: number; hoursPerPoint: number } | null;
}

async function conductSnapshotOf(
  year: OwnerAcademicYear,
  filters: AttendanceFilters,
): Promise<ConductSnapshot> {
  const classes = await readClasses(filters);
  const classIds = classes.map((klass) => klass.id);

  const [grades, settings, overrides, incidents] = await Promise.all([
    prisma.conduct_grades.findMany({
      where: {
        academic_year_id: year.id,
        ...(filters.semesterId ? { semester_id: filters.semesterId } : {}),
        ...(classIds.length > 0 ? { class_id: { in: classIds } } : {}),
      },
      select: { final_note: true, penalty: true },
    }),
    prisma.conduct_settings.findUnique({
      where: { academic_year_id: year.id },
      select: { base_note: true, hours_per_point: true },
    }),
    // `conduct_absence_overrides` n'est pas cloisonnée : atteinte par les
    // classes de l'établissement, dont la liste vient d'une requête cloisonnée.
    classIds.length > 0
      ? prisma.conduct_absence_overrides.aggregate({
          where: {
            academic_year_id: year.id,
            class_id: { in: classIds },
            ...(filters.semesterId ? { semester_id: filters.semesterId } : {}),
          },
          _count: { _all: true },
          _sum: { hours: true },
        })
      : Promise.resolve(null),
    prisma.disciplinary_incidents.groupBy({
      by: ['severity'],
      where: {
        ...(filters.startDate ? { date: { gte: new Date(`${filters.startDate}T00:00:00Z`) } } : {}),
      },
      _count: { _all: true },
    }),
  ]);

  const notes = grades.map((row) => Number(row.final_note));
  const penalties = grades.map((row) => Number(row.penalty));

  return {
    notes,
    penalties,
    belowThreshold: roundOrNull(
      ratio(notes.filter((note) => note < CONDUCT_THRESHOLD).length, notes.length),
    ),
    overrideCount: overrides?._count._all ?? 0,
    overrideHours: overrides?._sum.hours ? round(Number(overrides._sum.hours), 1) : null,
    incidents: new Map(incidents.map((row) => [String(row.severity), row._count._all])),
    settings: settings
      ? {
          baseNote: Number(settings.base_note),
          hoursPerPoint: Number(settings.hours_per_point),
        }
      : null,
  };
}

export async function getAttendanceConduct(
  resolved: ResolvedYears,
  filters: AttendanceFilters,
): Promise<AttendanceConduct> {
  const [current, comparison] = await Promise.all([
    conductSnapshotOf(resolved.year, filters),
    resolved.compare
      ? conductSnapshotOf(resolved.compare, filters)
      : Promise.resolve<ConductSnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: ConductSnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  const numeric = (key: string) => Number(key);

  return {
    averageNote: metric(
      roundOrNull(average(current.notes), 2),
      comparison ? roundOrNull(average(comparison.notes), 2) : null,
      'grade',
    ),
    averagePenalty: metric(
      roundOrNull(average(current.penalties), 2),
      comparison ? roundOrNull(average(comparison.penalties), 2) : null,
      'grade',
    ),
    belowThreshold: metric(
      current.belowThreshold,
      previousOf((s) => s.belowThreshold),
      'percent',
    ),
    distribution: series(
      bucketize(current.notes, { min: 0, max: 20, width: 2 }),
      comparison ? bucketize(comparison.notes, { min: 0, max: 20, width: 2 }) : null,
      (key) => `${key}–${numeric(key) + 2}`,
      'count',
      (a, b) => numeric(a.key) - numeric(b.key),
    ),
    overrides: {
      count: metric(current.overrideCount, previousOf((s) => s.overrideCount)),
      hours: metric(current.overrideHours, previousOf((s) => s.overrideHours), 'hours'),
    },
    incidents: series(current.incidents, comparison ? comparison.incidents : null, (key) => key),
    settings: current.settings,
    hasSource: current.notes.length > 0,
  };
}

// ---------------------------------------------------------------------------
// ASS-13, ASS-14 — absences des enseignants
// ---------------------------------------------------------------------------

export interface TeacherAbsences {
  absenceHours: Metric;
  justifiedShare: Metric;
  byTeacher: Array<{ key: string; label: string; hours: number; justifiedShare: number | null }>;
  hasSource: boolean;
}

async function teacherAbsencesSnapshotOf(year: OwnerAcademicYear, filters: AttendanceFilters) {
  // `teacher_absences` est datée au jour, sans rattachement à l'année scolaire :
  // la fenêtre septembre → août tient lieu de périmètre, comme pour les dépenses.
  const from = filters.startDate
    ? new Date(`${filters.startDate}T00:00:00Z`)
    : new Date(Date.UTC(year.startYear, 8, 1));
  const to = filters.endDate
    ? new Date(`${filters.endDate}T23:59:59Z`)
    : new Date(Date.UTC(year.endYear, 7, 31, 23, 59, 59));

  const rows = await prisma.teacher_absences.findMany({
    where: {
      date: { gte: from, lte: to },
      ...(filters.teacherId ? { teacher_id: filters.teacherId } : {}),
    },
    select: {
      teacher_id: true,
      hours_absent: true,
      is_justified: true,
      teacher: { select: { first_name: true, last_name: true } },
    },
  });

  const byTeacher = new Map<
    string,
    { label: string; hours: number; justified: number; count: number }
  >();

  let totalHours = 0;
  let justifiedCount = 0;

  for (const row of rows) {
    const hours = Number(row.hours_absent);
    totalHours += hours;
    if (row.is_justified) justifiedCount += 1;

    const current = byTeacher.get(row.teacher_id) ?? {
      label: initialsOf(row.teacher.first_name, row.teacher.last_name),
      hours: 0,
      justified: 0,
      count: 0,
    };
    current.hours += hours;
    current.count += 1;
    if (row.is_justified) current.justified += 1;
    byTeacher.set(row.teacher_id, current);
  }

  return {
    hours: rows.length > 0 ? round(totalHours, 1) : null,
    justifiedShare: roundOrNull(ratio(justifiedCount, rows.length)),
    byTeacher: [...byTeacher.entries()]
      .map(([teacherId, row]) => ({
        key: teacherId,
        label: row.label,
        hours: round(row.hours, 1),
        justifiedShare: roundOrNull(ratio(row.justified, row.count)),
      }))
      .sort((left, right) => right.hours - left.hours),
    hasSource: rows.length > 0,
  };
}

export async function getTeacherAbsences(
  resolved: ResolvedYears,
  filters: AttendanceFilters,
): Promise<TeacherAbsences> {
  const [current, comparison] = await Promise.all([
    teacherAbsencesSnapshotOf(resolved.year, filters),
    resolved.compare
      ? teacherAbsencesSnapshotOf(resolved.compare, filters)
      : Promise.resolve<Awaited<ReturnType<typeof teacherAbsencesSnapshotOf>> | null>(null),
  ]);

  return {
    absenceHours: metric(current.hours, comparison ? comparison.hours : null, 'hours'),
    justifiedShare: metric(
      current.justifiedShare,
      comparison ? comparison.justifiedShare : null,
      'percent',
    ),
    byTeacher: current.byTeacher.slice(0, 200),
    hasSource: current.hasSource,
  };
}
