import { prisma } from '@school/database';

import { toMinutes } from '../attendance-policy';
import {
  average,
  metric,
  ratio,
  round,
  series,
  type Metric,
  type Series,
} from './compare.helper';
import { type OwnerAcademicYear, type ResolvedYears } from './academic-year.helper';

/**
 * Enseignants & personnel — indicateurs `ENS-01` à `ENS-25` (§4.e).
 *
 * **Limite structurelle assumée** : il n'existe aucun modèle `staff` au schéma.
 * Le seul personnel modélisé est `teachers`. Le domaine « personnel » se lit
 * donc comme « corps enseignant », et l'écran le dit — plutôt que de laisser
 * croire à une vue exhaustive de la masse humaine de l'école.
 *
 * **Trois tables ne portent pas d'établissement** — `teacher_subjects`,
 * `teacher_remuneration`, `payroll_correction_requests`. Elles ne sont
 * interrogées que sur des identifiants d'enseignants ou de paies issus d'une
 * lecture cloisonnée (§6.9).
 *
 * **Les enseignants n'apparaissent qu'en initiales** (§11-Q2(b)).
 */

export interface StaffFilters {
  /** `L6` — enseignant. */
  teacherId?: string;
  /** `L1` — niveau. */
  level?: string;
  /** `L2` — classe. */
  classId?: string;
  /** `L7` — période calendaire. */
  startDate?: string;
  endDate?: string;
}

/** Initiales — le nom complet reste hors périmètre. */
function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0).toUpperCase()}. ${lastName.trim().charAt(0).toUpperCase()}.`;
}

function roundOrNull(value: number | null, decimals = 4): number | null {
  return value === null ? null : round(value, decimals);
}

/**
 * Durée d'un créneau, en heures.
 *
 * Les heures sont stockées en `VarChar`, pas en `Time` : la soustraction se
 * fait donc sur des minutes depuis minuit, **jamais** en construisant des
 * `Date`. Passer par une date obligerait à choisir un fuseau, et un créneau
 * 08:00–09:00 pourrait durer zéro ou deux heures selon l'heure d'été du serveur
 * (critère 7.1).
 */
export function slotHours(startTime: string, endTime: string): number {
  const minutes = toMinutes(endTime) - toMinutes(startTime);
  return minutes > 0 ? round(minutes / 60, 2) : 0;
}

// ---------------------------------------------------------------------------
// ENS-01…ENS-05, ENS-11…ENS-15 — corps enseignant
// ---------------------------------------------------------------------------

export interface StaffResult {
  headcount: Metric;
  byContract: Series;
  seniority: Metric;
  endingContracts: Array<{ key: string; label: string; endDate: string; contract: string }>;
  accountCoverage: Metric;
  polyvalence: Series;
  subjectCoverage: Metric;
  assignments: Metric;
  unassignedSlots: Metric;
  mainTeachers: Metric;
  hasSource: boolean;
}

interface StaffSnapshot {
  headcount: number;
  byContract: Map<string, number>;
  seniority: number | null;
  accountCoverage: number | null;
  subjectCoverage: number | null;
  assignments: number;
  unassignedSlots: number;
  mainTeachers: number | null;
  polyvalence: Map<string, number>;
  endingContracts: StaffResult['endingContracts'];
}

async function staffSnapshotOf(
  year: OwnerAcademicYear,
  filters: StaffFilters,
): Promise<StaffSnapshot> {
  const teachers = await prisma.teachers.findMany({
    where: filters.teacherId ? { id: filters.teacherId } : {},
    select: {
      id: true,
      first_name: true,
      last_name: true,
      contract_type: true,
      hire_date: true,
      end_date: true,
      user_id: true,
    },
  });

  const teacherIds = teachers.map((teacher) => teacher.id);

  const [subjectsPerTeacher, classSubjects, assignments, unassignedSlots, mainTeachers, classes] =
    await Promise.all([
      // `teacher_subjects` n'est pas cloisonnée : atteinte par des identifiants
      // d'enseignants issus d'une lecture cloisonnée (§6.9).
      teacherIds.length > 0
        ? prisma.teacher_subjects.groupBy({
            by: ['teacher_id'],
            where: { teacher_id: { in: teacherIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      prisma.class_subjects.findMany({
        where: {
          ...(filters.classId ? { class_id: filters.classId } : {}),
          ...(filters.level ? { class: { level: filters.level } } : {}),
        },
        select: { teacher_id: true },
      }),
      prisma.teacher_class_assignments.count({
        where: {
          academic_year_id: year.id,
          ...(filters.teacherId ? { teacher_id: filters.teacherId } : {}),
          ...(filters.classId ? { class_id: filters.classId } : {}),
        },
      }),
      prisma.class_timetables.count({
        where: {
          academic_year_id: year.id,
          teacher_id: null,
          ...(filters.classId ? { class_id: filters.classId } : {}),
          ...(filters.level ? { class: { level: filters.level } } : {}),
        },
      }),
      prisma.class_main_teachers.count({ where: { academic_year_id: year.id } }),
      prisma.schoolClass.count({
        where: {
          ...(filters.classId ? { id: filters.classId } : {}),
          ...(filters.level ? { level: filters.level } : {}),
        },
      }),
    ]);

  // `ENS-03` — ancienneté rapportée au 1er septembre de l'année observée, et
  // non à la date du jour : consulter 2019-2020 ne doit pas vieillir l'équipe.
  const reference = new Date(Date.UTC(year.startYear, 8, 1));
  const seniorities = teachers.map(
    (teacher) =>
      (reference.getTime() - teacher.hire_date.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );

  // CDI et CDD sont des sigles français ; VACATAIRE est une valeur
  // d'énumération, et s'affichait tel quel en capitales dans la légende.
  const LIBELLE_CONTRAT: Record<string, string> = {
    CDI: 'CDI',
    CDD: 'CDD',
    VACATAIRE: 'Vacataire',
  };

  const byContract = new Map<string, number>();
  for (const teacher of teachers) {
    const brut = String(teacher.contract_type);
    const contract = LIBELLE_CONTRAT[brut] ?? brut;
    byContract.set(contract, (byContract.get(contract) ?? 0) + 1);
  }

  // `ENS-04` — CDD dont le terme tombe dans l'année scolaire observée.
  const windowStart = reference;
  const windowEnd = new Date(Date.UTC(year.endYear, 7, 31, 23, 59, 59));
  const endingContracts = teachers
    .filter(
      (teacher) =>
        teacher.end_date !== null &&
        teacher.end_date >= windowStart &&
        teacher.end_date <= windowEnd,
    )
    .map((teacher) => ({
      key: teacher.id,
      label: initialsOf(teacher.first_name, teacher.last_name),
      endDate: teacher.end_date!.toISOString().slice(0, 10),
      contract: String(teacher.contract_type),
    }))
    .sort((left, right) => left.endDate.localeCompare(right.endDate));

  // `ENS-15` — polyvalence : combien de matières par enseignant.
  const polyvalence = new Map<string, number>();
  for (const row of subjectsPerTeacher) {
    const key = String(row._count._all);
    polyvalence.set(key, (polyvalence.get(key) ?? 0) + 1);
  }
  const withoutSubject = teachers.length - subjectsPerTeacher.length;
  if (withoutSubject > 0) polyvalence.set('0', (polyvalence.get('0') ?? 0) + withoutSubject);

  const assignedSubjects = classSubjects.filter((row) => row.teacher_id !== null).length;

  return {
    headcount: teachers.length,
    byContract,
    seniority: roundOrNull(average(seniorities), 1),
    accountCoverage: roundOrNull(
      ratio(teachers.filter((teacher) => teacher.user_id !== null).length, teachers.length),
    ),
    subjectCoverage: roundOrNull(ratio(assignedSubjects, classSubjects.length)),
    assignments,
    unassignedSlots,
    mainTeachers: roundOrNull(ratio(mainTeachers, classes)),
    polyvalence,
    endingContracts,
  };
}

export async function getStaff(
  resolved: ResolvedYears,
  filters: StaffFilters,
): Promise<StaffResult> {
  const [current, comparison] = await Promise.all([
    staffSnapshotOf(resolved.year, filters),
    resolved.compare
      ? staffSnapshotOf(resolved.compare, filters)
      : Promise.resolve<StaffSnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: StaffSnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  return {
    headcount: metric(current.headcount, previousOf((s) => s.headcount)),
    byContract: series(current.byContract, comparison ? comparison.byContract : null, (key) => key),
    // L'ancienneté s'exprime en **années**, unité que le contrat de §6.3 ne
    // prévoit pas. Plutôt que de la travestir en jours — « 6 j » pour six ans —
    // elle sort en nombre nu, et c'est le libellé de la carte qui porte l'unité.
    seniority: metric(current.seniority, previousOf((s) => s.seniority)),
    endingContracts: current.endingContracts,
    accountCoverage: metric(
      current.accountCoverage,
      previousOf((s) => s.accountCoverage),
      'percent',
    ),
    polyvalence: series(
      current.polyvalence,
      comparison ? comparison.polyvalence : null,
      (key) => `${key} matière${Number(key) > 1 ? 's' : ''}`,
      'count',
      (a, b) => Number(a.key) - Number(b.key),
    ),
    subjectCoverage: metric(
      current.subjectCoverage,
      previousOf((s) => s.subjectCoverage),
      'percent',
    ),
    assignments: metric(current.assignments, previousOf((s) => s.assignments)),
    unassignedSlots: metric(current.unassignedSlots, previousOf((s) => s.unassignedSlots)),
    mainTeachers: metric(current.mainTeachers, previousOf((s) => s.mainTeachers), 'percent'),
    hasSource: current.headcount > 0,
  };
}

// ---------------------------------------------------------------------------
// ENS-06…ENS-10 — charge horaire
// ---------------------------------------------------------------------------

export interface StaffWorkload {
  weeklyHours: Array<{
    key: string;
    label: string;
    hours: number;
    target: number | null;
    gap: number | null;
  }>;
  averageHours: Metric;
  overUnderLoad: Series;
  hoursWorked: Series;
  plannedVsActual: Array<{ key: string; label: string; planned: number; actual: number; gap: number }>;
  /** `null` quand aucune bande cible n'est déclarée — l'écart n'est pas mesurable. */
  hasTargets: boolean;
  hasDeclaredHours: boolean;
}

/** Semaines par mois, à défaut de réglage de paie (`payroll_settings`). */
const DEFAULT_WEEKS_PER_MONTH = 4.33;

export async function getStaffWorkload(
  resolved: ResolvedYears,
  filters: StaffFilters,
): Promise<StaffWorkload> {
  const year = resolved.year;

  const [slots, teachers, settings] = await Promise.all([
    prisma.class_timetables.findMany({
      where: {
        academic_year_id: year.id,
        ...(filters.teacherId ? { teacher_id: filters.teacherId } : {}),
        ...(filters.classId ? { class_id: filters.classId } : {}),
        ...(filters.level ? { class: { level: filters.level } } : {}),
      },
      select: { teacher_id: true, start_time: true, end_time: true },
    }),
    prisma.teachers.findMany({
      where: filters.teacherId ? { id: filters.teacherId } : {},
      select: { id: true, first_name: true, last_name: true },
    }),
    prisma.payroll_settings.findFirst({ select: { nombre_semaines_par_mois: true } }),
  ]);

  const teacherIds = teachers.map((teacher) => teacher.id);

  const [targets, declared] = await Promise.all([
    // `teacher_remuneration` n'est pas cloisonnée : lue par identifiants.
    teacherIds.length > 0
      ? prisma.teacher_remuneration.findMany({
          where: { teacher_id: { in: teacherIds } },
          select: { teacher_id: true, heures_hebdo: true },
        })
      : Promise.resolve([]),
    teacherIds.length > 0
      ? prisma.teacher_hours.findMany({
          where: {
            teacher_id: { in: teacherIds },
            OR: [
              { year: year.startYear, month: { gte: 9 } },
              { year: year.endYear, month: { lte: 8 } },
            ],
          },
          select: { teacher_id: true, month: true, year: true, hours_worked: true },
        })
      : Promise.resolve([]),
  ]);

  const names = new Map(
    teachers.map((teacher) => [teacher.id, initialsOf(teacher.first_name, teacher.last_name)]),
  );

  // `ENS-06` — heures hebdomadaires d'emploi du temps, par enseignant.
  const hoursByTeacher = new Map<string, number>();
  for (const slot of slots) {
    if (!slot.teacher_id) continue;
    hoursByTeacher.set(
      slot.teacher_id,
      (hoursByTeacher.get(slot.teacher_id) ?? 0) + slotHours(slot.start_time, slot.end_time),
    );
  }

  const targetOf = new Map(
    targets
      .filter((row) => row.heures_hebdo !== null)
      .map((row) => [row.teacher_id, Number(row.heures_hebdo)]),
  );

  const weeklyHours = [...hoursByTeacher.entries()]
    .map(([teacherId, hours]) => {
      const target = targetOf.get(teacherId) ?? null;
      return {
        key: teacherId,
        label: names.get(teacherId) ?? '—',
        hours: round(hours, 2),
        target,
        // `ENS-08` — l'écart n'existe que si une bande cible est déclarée.
        gap: target === null ? null : round(hours - target, 2),
      };
    })
    .sort((left, right) => right.hours - left.hours);

  const overUnderLoad = new Map<string, number>();
  for (const row of weeklyHours) {
    if (row.gap === null) continue;
    overUnderLoad.set(row.label, row.gap);
  }

  // `ENS-09` — heures déclarées, mois par mois.
  const monthlyDeclared = new Map<string, number>();
  for (const row of declared) {
    const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
    monthlyDeclared.set(key, (monthlyDeclared.get(key) ?? 0) + Number(row.hours_worked));
  }

  const weeksPerMonth = settings
    ? Number(settings.nombre_semaines_par_mois)
    : DEFAULT_WEEKS_PER_MONTH;

  // `ENS-10` — déclaré vs prévu : l'emploi du temps hebdomadaire ramené au mois.
  const declaredByTeacher = new Map<string, number>();
  for (const row of declared) {
    declaredByTeacher.set(
      row.teacher_id,
      (declaredByTeacher.get(row.teacher_id) ?? 0) + Number(row.hours_worked),
    );
  }

  const monthsDeclared = new Set(declared.map((row) => `${row.year}-${row.month}`)).size || 1;

  const plannedVsActual = [...declaredByTeacher.entries()]
    .map(([teacherId, actual]) => {
      const planned = (hoursByTeacher.get(teacherId) ?? 0) * weeksPerMonth * monthsDeclared;
      return {
        key: teacherId,
        label: names.get(teacherId) ?? '—',
        planned: round(planned, 1),
        actual: round(actual, 1),
        gap: round(actual - planned, 1),
      };
    })
    .sort((left, right) => left.gap - right.gap);

  return {
    weeklyHours: weeklyHours.slice(0, 200),
    averageHours: metric(
      roundOrNull(average([...hoursByTeacher.values()]), 2),
      null,
      'hours',
    ),
    overUnderLoad: series(overUnderLoad, null, (key) => key, 'hours', (a, b) =>
      (a.value ?? 0) - (b.value ?? 0),
    ),
    hoursWorked: series(
      monthlyDeclared,
      null,
      (key) => key,
      'hours',
      (a, b) => a.key.localeCompare(b.key),
    ),
    plannedVsActual: plannedVsActual.slice(0, 200),
    hasTargets: targetOf.size > 0,
    hasDeclaredHours: declared.length > 0,
  };
}

// ---------------------------------------------------------------------------
// ENS-16…ENS-25 — paie
// ---------------------------------------------------------------------------

export interface StaffPayroll {
  grossTotal: Metric;
  netTotal: Metric;
  breakdown: Series;
  deductions: Metric;
  socialCharges: Series;
  byStatus: Series;
  averageSalary: Metric;
  advances: { total: Metric; byStatus: Series };
  corrections: Series;
  costPerStudent: Metric;
  monthly: Series;
  /** Faux tant qu'aucune paie n'existe — l'écran affiche alors un état vide (critère 7.6). */
  hasSource: boolean;
}

interface PayrollSnapshot {
  gross: number | null;
  net: number | null;
  deductions: number | null;
  breakdown: Map<string, number>;
  socialCharges: Map<string, number>;
  byStatus: Map<string, number>;
  averageSalary: number | null;
  advancesTotal: number | null;
  advancesByStatus: Map<string, number>;
  corrections: Map<string, number>;
  costPerStudent: number | null;
  monthly: Map<string, number>;
  hasSource: boolean;
}

async function payrollSnapshotOf(year: OwnerAcademicYear): Promise<PayrollSnapshot> {
  const monthWindow = {
    OR: [
      { year: year.startYear, month: { gte: 9 } },
      { year: year.endYear, month: { lte: 8 } },
    ],
  };

  const [payrolls, advances, enrolled] = await Promise.all([
    prisma.monthly_payrolls.findMany({
      where: monthWindow,
      select: {
        id: true,
        teacher_id: true,
        month: true,
        year: true,
        status: true,
        base_salary: true,
        total_allowances: true,
        seniority_bonus: true,
        total_brut: true,
        deductions: true,
        net_payable: true,
        absences_deduction: true,
        advances_deduction: true,
        cnps_salarie: true,
        cnps_employeur: true,
        igr: true,
      },
    }),
    prisma.advance_payments.findMany({
      where: {
        payment_date: {
          gte: new Date(Date.UTC(year.startYear, 8, 1)),
          lte: new Date(Date.UTC(year.endYear, 7, 31, 23, 59, 59)),
        },
      },
      select: { amount: true, status: true },
    }),
    prisma.inscriptions.count({ where: { academic_year_id: year.id } }),
  ]);

  if (payrolls.length === 0) {
    return {
      gross: null,
      net: null,
      deductions: null,
      breakdown: new Map(),
      socialCharges: new Map(),
      byStatus: new Map(),
      averageSalary: null,
      advancesTotal: advances.length > 0 ? round(advances.reduce((s, a) => s + Number(a.amount), 0), 2) : null,
      advancesByStatus: new Map(advances.map((a) => [String(a.status), 0])),
      corrections: new Map(),
      costPerStudent: null,
      monthly: new Map(),
      hasSource: false,
    };
  }

  const sum = (pick: (row: (typeof payrolls)[number]) => unknown) =>
    payrolls.reduce((total, row) => total + Number(pick(row) ?? 0), 0);

  const gross = sum((row) => row.total_brut);
  const net = sum((row) => row.net_payable);

  const breakdown = new Map<string, number>([
    ['Salaire de base', round(sum((row) => row.base_salary), 2)],
    ['Indemnités', round(sum((row) => row.total_allowances), 2)],
    ['Ancienneté', round(sum((row) => row.seniority_bonus), 2)],
    ['Retenues', round(sum((row) => row.deductions), 2)],
  ]);

  const socialCharges = new Map<string, number>([
    ['CNPS salarié', round(sum((row) => row.cnps_salarie), 2)],
    ['CNPS employeur', round(sum((row) => row.cnps_employeur), 2)],
    ['IGR', round(sum((row) => row.igr), 2)],
  ]);

  const byStatus = new Map<string, number>();
  const monthly = new Map<string, number>();
  for (const row of payrolls) {
    const status = String(row.status);
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
    monthly.set(key, (monthly.get(key) ?? 0) + Number(row.total_brut));
  }

  const payrollIds = payrolls.map((row) => row.id);
  // `payroll_correction_requests` n'est pas cloisonnée : lue par ses paies.
  const corrections = await prisma.payroll_correction_requests.groupBy({
    by: ['status'],
    where: { payroll_id: { in: payrollIds } },
    _count: { _all: true },
  });

  const distinctTeachers = new Set(payrolls.map((row) => row.teacher_id)).size;
  const months = new Set(payrolls.map((row) => `${row.year}-${row.month}`)).size || 1;

  const advancesByStatus = new Map<string, number>();
  for (const advance of advances) {
    const status = String(advance.status);
    advancesByStatus.set(status, (advancesByStatus.get(status) ?? 0) + Number(advance.amount));
  }

  return {
    gross: round(gross, 2),
    net: round(net, 2),
    deductions: roundOrNull(
      ratio(sum((row) => row.absences_deduction) + sum((row) => row.advances_deduction), gross),
    ),
    breakdown,
    socialCharges,
    byStatus,
    // `ENS-22` — net moyen par enseignant et par mois.
    averageSalary: roundOrNull(ratio(net, distinctTeachers * months), 2),
    advancesTotal:
      advances.length > 0 ? round(advances.reduce((s, a) => s + Number(a.amount), 0), 2) : null,
    advancesByStatus,
    corrections: new Map(corrections.map((row) => [String(row.status), row._count._all])),
    costPerStudent: roundOrNull(ratio(gross, enrolled), 2),
    monthly,
    hasSource: true,
  };
}

export async function getStaffPayroll(resolved: ResolvedYears): Promise<StaffPayroll> {
  const [current, comparison] = await Promise.all([
    payrollSnapshotOf(resolved.year),
    resolved.compare
      ? payrollSnapshotOf(resolved.compare)
      : Promise.resolve<PayrollSnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: PayrollSnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  return {
    grossTotal: metric(current.gross, previousOf((s) => s.gross), 'currency'),
    netTotal: metric(current.net, previousOf((s) => s.net), 'currency'),
    breakdown: series(current.breakdown, null, (key) => key, 'currency'),
    deductions: metric(current.deductions, previousOf((s) => s.deductions), 'percent'),
    socialCharges: series(current.socialCharges, null, (key) => key, 'currency'),
    byStatus: series(current.byStatus, comparison ? comparison.byStatus : null, (key) => key),
    averageSalary: metric(current.averageSalary, previousOf((s) => s.averageSalary), 'currency'),
    advances: {
      total: metric(current.advancesTotal, previousOf((s) => s.advancesTotal), 'currency'),
      byStatus: series(current.advancesByStatus, null, (key) => key, 'currency'),
    },
    corrections: series(current.corrections, null, (key) => key),
    costPerStudent: metric(current.costPerStudent, previousOf((s) => s.costPerStudent), 'currency'),
    monthly: series(
      current.monthly,
      null,
      (key) => key,
      'currency',
      (a, b) => a.key.localeCompare(b.key),
    ),
    hasSource: current.hasSource,
  };
}
