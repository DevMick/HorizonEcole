import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '../api';
import { useOwnerFilters } from '../stores/owner-filters';

/**
 * Socle de données de l'espace Propriétaire.
 *
 * Toutes les lectures passent par `/api/owner/*`, routeur verrouillé sur le
 * seul rôle `OWNER` et refusant toute méthode autre que `GET`. Aucune requête
 * n'y transporte d'identifiant d'établissement : le périmètre est celui du
 * jeton, et lui seul.
 */

export type OwnerSchoolType = 'PRIMAIRE' | 'COLLEGE' | 'LYCEE';

export interface OwnerAcademicYear {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  isCurrent: boolean;
}

export interface OwnerContext {
  establishment: {
    id: string;
    name: string;
    code: string;
    schoolType: OwnerSchoolType;
    logoUrl: string | null;
  };
  /** Triées par année de début décroissante — l'ordre du sélecteur. */
  academicYears: OwnerAcademicYear[];
  currentAcademicYearId: string | null;
  /**
   * Classes de l'établissement, pour les filtres. Elles viennent du
   * référentiel et non des réponses analytiques : une liste construite à
   * partir des données affichées se réduirait à la classe filtrée, et il
   * deviendrait impossible d'en sortir.
   */
  classes: Array<{ id: string; name: string; level: string | null }>;
  modules: { primary: boolean; secondary: boolean };
  schoolType: OwnerSchoolType;
}

/** Unité d'un indicateur — décide du formatage, jamais du calcul. */
export type OwnerMetricUnit = 'count' | 'percent' | 'currency' | 'grade' | 'hours' | 'days';

/**
 * Contrat de comparaison N vs N-1 (§6.3).
 *
 * `null` n'est pas `0` : une valeur nulle signifie « aucune ligne source »,
 * qu'un écran doit rendre comme un état vide et non comme un zéro — un taux de
 * recouvrement affiché à 0 % faute de données tromperait le propriétaire sur la
 * santé de son école.
 */
export interface OwnerMetric {
  value: number | null;
  previous: number | null;
  delta: number | null;
  deltaPct: number | null;
  unit: OwnerMetricUnit;
}

export interface OwnerSeriesPoint {
  key: string;
  label: string;
  value: number | null;
  previous?: number | null;
}

export interface OwnerSeries {
  points: OwnerSeriesPoint[];
  total?: number | null;
  unit: OwnerMetricUnit;
}

export interface OwnerMeta {
  academicYear: { id: string; name: string };
  compareAcademicYear: { id: string; name: string } | null;
  schoolType: OwnerSchoolType;
  modules: { primary: boolean; secondary: boolean };
  /** Domaines sans donnée, pour piloter les états vides (§5.7). */
  unavailable: string[];
  generatedAt: string;
}

/** Change rarement, conditionne le sélecteur : même fraîcheur que l'établissement. */
const CONTEXT_STALE_TIME = 5 * 60 * 1000;

/**
 * Référentiel de l'espace : établissement, années scolaires, modules actifs.
 * C'est lui qui alimente `AcademicYearPicker` et les conditions d'affichage
 * par module.
 */
export function useOwnerContext() {
  return useQuery<OwnerContext>({
    queryKey: ['owner', 'context'],
    staleTime: CONTEXT_STALE_TIME,
    queryFn: async () => (await api.get('/owner/context')).data.data,
  });
}

/**
 * Requête d'un domaine analytique, filtrée par les années sélectionnées.
 *
 * Les années entrent dans la clé de cache : changer d'année refait la requête
 * sans invalidation manuelle, et revenir à l'année précédente la ressert depuis
 * le cache. La requête reste en attente tant qu'aucune année n'est résolue,
 * plutôt que d'appeler l'API sans `academicYearId` — qui répondrait `400`.
 */
/** Les agrégats se rafraîchissent moins souvent que le référentiel (§6.8). */
const AGGREGATE_STALE_TIME = 2 * 60 * 1000;

export interface OwnerClassRow {
  classId: string;
  name: string;
  level: string | null;
  cycle: string;
  total: number;
  girls: number;
  boys: number;
  averageAge: number | null;
  capacity: number | null;
  /** `null` quand la capacité n'est pas renseignée — ce n'est pas un taux nul. */
  occupancy: number | null;
  status: 'ok' | 'overcrowded' | 'underused' | 'unknown';
  previous: number | null;
  delta: number | null;
}

export interface OwnerLevelPoint extends OwnerSeriesPoint {
  newcomers: number;
  returning: number;
  averageAge: number | null;
}

export interface OwnerEnrollment {
  total: OwnerMetric;
  newcomers: OwnerMetric;
  returning: OwnerMetric;
  retentionRate: OwnerMetric;
  departures: OwnerMetric;
  averagePerClass: OwnerMetric;
  stateAssigned: OwnerMetric;
  dropoutRate: OwnerMetric;
  byLevel: { points: OwnerLevelPoint[]; total: number; unit: OwnerMetricUnit };
  byClass: { rows: OwnerClassRow[]; truncated: boolean };
  byGender: OwnerSeries;
  byStatus: OwnerSeries;
  ageDistribution: OwnerSeries;
  occupancy: {
    capacityKnown: boolean;
    average: OwnerMetric;
    overcrowded: OwnerClassRow[];
    underused: OwnerClassRow[];
  };
}

export interface OwnerEnrollmentFilters {
  level?: string;
  classId?: string;
  cycle?: 'PRIMAIRE' | 'SECONDAIRE';
  gender?: string;
}

/** Effectifs & scolarité — `EFF-01` → `EFF-18`. */
export function useOwnerEnrollment(filters: OwnerEnrollmentFilters = {}) {
  return useOwnerQuery<OwnerEnrollment>(
    'enrollment',
    '/owner/enrollment',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/** Évolution pluriannuelle des effectifs — `EFF-14`. */
export function useOwnerEnrollmentTimeline(years = 5) {
  return useOwnerQuery<{ series: OwnerSeries[] }>(
    'enrollment-timeline',
    '/owner/enrollment/timeline',
    { years },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

// ---------------------------------------------------------------------------
// Résultats pédagogiques
// ---------------------------------------------------------------------------

export interface OwnerSecondaryRanking {
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

/** Trajectoire d'une matière sur les trimestres de l'année observée. */
export interface OwnerSubjectTimeline {
  subjectId: string;
  name: string;
  points: OwnerSeriesPoint[];
  /** Écart entre le premier et le dernier trimestre notés. */
  variation: number | null;
}

export interface OwnerSecondaryResults {
  generalAverage: OwnerMetric;
  successRate: OwnerMetric;
  standardDeviation: OwnerMetric;
  completeAverage: OwnerMetric;
  gradeVolume: OwnerMetric;
  bulletinCoverage: OwnerMetric;
  coefficientEffect: OwnerMetric;
  byLevel: OwnerSeries;
  byClass: OwnerSeries;
  bySubject: OwnerSeries;
  best: Array<{ key: string; label: string; value: number }>;
  worst: Array<{ key: string; label: string; value: number }>;
  byTeacher: Array<{ key: string; label: string; value: number; gradesCount: number }>;
  bySemester: OwnerSeries;
  /** Trajectoire de chaque matière, trimestre par trimestre. */
  subjectTimeline: OwnerSubjectTimeline[];
  gradeDistribution: OwnerSeries;
  averageDistribution: OwnerSeries;
  mentions: OwnerSeries;
  classRanking: OwnerSecondaryRanking[];
  evaluationTypes: OwnerSeries;
  subjectWeights: OwnerSeries;
}

export interface OwnerPrimarySettings {
  classId: string;
  className: string;
  level: string | null;
  divisor: number | null;
  averageScale: number | null;
  admission: number | null;
  repeat: number | null;
}

export interface OwnerPrimaryResults {
  evaluationCount: OwnerMetric;
  examCount: OwnerMetric;
  lockedShare: OwnerMetric;
  bulletinCoverage: OwnerMetric;
  generalAverage: OwnerMetric;
  successRate: OwnerMetric;
  repeatRate: OwnerMetric;
  unranked: OwnerMetric;
  gridCoverage: OwnerMetric;
  byEvaluation: OwnerSeries;
  byClass: OwnerSeries;
  byLevel: OwnerSeries;
  bySubject: OwnerSeries;
  calendar: OwnerSeries;
  mentions: OwnerSeries;
  distribution: OwnerSeries;
  /** `null` quand /10 et /20 coexistent : la distribution n'est alors pas traçable. */
  distributionScale: number | null;
  classComparison: Array<{ level: string; classes: Array<{ label: string; value: number }> }>;
  levelSpread: Array<{ level: string; spread: number | null; min: number | null; max: number | null }>;
  settings: OwnerPrimarySettings[];
  truncated: boolean;
}

export interface OwnerSecondaryFilters {
  semesterId?: string;
  level?: string;
  classId?: string;
  subjectId?: string;
}

export interface OwnerPrimaryFilters {
  level?: string;
  classId?: string;
  evaluationId?: string;
}

/** Résultats du secondaire — `SEC-01` → `SEC-21`. */
export function useOwnerSecondaryResults(
  filters: OwnerSecondaryFilters = {},
  enabled = true,
) {
  return useOwnerQuery<OwnerSecondaryResults>(
    'results-secondary',
    '/owner/results/secondary',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME, enabled },
  );
}

/** Résultats du primaire — `PRI-01` → `PRI-20`. */
export function useOwnerPrimaryResults(filters: OwnerPrimaryFilters = {}, enabled = true) {
  return useOwnerQuery<OwnerPrimaryResults>(
    'results-primary',
    '/owner/results/primary',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME, enabled },
  );
}

/** Évolution pluriannuelle des moyennes — `SEC-18` / `PRI-16`. */
export function useOwnerResultsTimeline(
  cycle: 'secondary' | 'primary',
  years = 5,
  enabled = true,
) {
  return useOwnerQuery<{ series: OwnerSeries[] }>(
    `results-${cycle}-timeline`,
    `/owner/results/${cycle}/timeline`,
    { years },
    { staleTime: AGGREGATE_STALE_TIME, enabled },
  );
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export interface OwnerFinanceFilters {
  level?: string;
  classId?: string;
  paymentTypeId?: string;
}

export interface OwnerFinanceOverview {
  invoiced: OwnerMetric;
  collected: OwnerMetric;
  outstanding: OwnerMetric;
  collectionRate: OwnerMetric;
  dueToDate: OwnerMetric;
  onScheduleRate: OwnerMetric;
  invoicingRate: OwnerMetric;
  cancelled: { count: OwnerMetric; amount: OwnerMetric };
  revenuePerStudent: OwnerMetric;
}

export interface OwnerFinanceCollection {
  lateInstallments: OwnerMetric;
  lateAmount: OwnerMetric;
  averageDelay: OwnerMetric;
  studentsUpToDate: OwnerMetric;
  ageing: OwnerSeries;
  byInstallmentNumber: OwnerSeries;
  hasSource: boolean;
}

export interface OwnerRevenueBreakdown {
  byFeeType: OwnerSeries;
  byClass: OwnerSeries;
  byLevel: OwnerSeries;
  byPaymentMethod: OwnerSeries;
  byPaymentCondition: OwnerSeries;
  conditionStructure: Array<{
    key: string;
    label: string;
    lines: number;
    maxDelayDays: number | null;
  }>;
  feeRates: Array<{ level: string; amount: number; stateAssigned: boolean }>;
  rateGap: OwnerSeries;
  stateAssignedGap: OwnerMetric;
}

export interface OwnerFinanceSeasonality {
  monthly: OwnerSeries;
  /** `null` quand aucune dépense n'est saisie — pas une courbe à zéro. */
  expenses: OwnerSeries | null;
}

export interface OwnerFinanceDebtors {
  byClass: OwnerSeries;
  concentration: OwnerMetric;
  hasSource: boolean;
}

export interface OwnerFinanceExpenses {
  total: OwnerMetric;
  byCategory: OwnerSeries;
  pendingApproval: OwnerMetric;
  budgetPlanVsActual: Array<{
    key: string;
    label: string;
    planned: number;
    spent: number;
    remaining: number;
  }>;
  budgetByType: OwnerSeries;
  budgetRealised: OwnerSeries;
  margin: OwnerMetric;
  marginRate: OwnerMetric;
  payrollShare: OwnerMetric;
  unavailable: string[];
}

/** Vue d'ensemble — `FIN-01`…`FIN-06`, `FIN-25`, `FIN-26`, `FIN-37`. */
export function useOwnerFinanceOverview(filters: OwnerFinanceFilters = {}) {
  return useOwnerQuery<OwnerFinanceOverview>(
    'finance-overview',
    '/owner/finance/overview',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/** Recouvrement — `FIN-07`…`FIN-10`, `FIN-17`. */
export function useOwnerFinanceCollection(filters: OwnerFinanceFilters = {}) {
  return useOwnerQuery<OwnerFinanceCollection>(
    'finance-collection',
    '/owner/finance/collection',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/** Ventilation des recettes — `FIN-11`…`FIN-14`, `FIN-20`…`FIN-24`. */
export function useOwnerRevenueBreakdown(filters: OwnerFinanceFilters = {}) {
  return useOwnerQuery<OwnerRevenueBreakdown>(
    'finance-revenue',
    '/owner/finance/revenue-breakdown',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/** Saisonnalité — `FIN-15`, `FIN-30`. */
export function useOwnerFinanceSeasonality() {
  return useOwnerQuery<OwnerFinanceSeasonality>(
    'finance-seasonality',
    '/owner/finance/seasonality',
    {},
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/** Créance par classe — `FIN-18`, `FIN-19`. Jamais nominatif. */
export function useOwnerFinanceDebtors(filters: OwnerFinanceFilters = {}) {
  return useOwnerQuery<OwnerFinanceDebtors>(
    'finance-debtors',
    '/owner/finance/debtors',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/** Dépenses, budgets et marge — `FIN-27`…`FIN-36`. */
export function useOwnerFinanceExpenses() {
  return useOwnerQuery<OwnerFinanceExpenses>(
    'finance-expenses',
    '/owner/finance/expenses',
    {},
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/** Évolution pluriannuelle — `FIN-38`. */
export function useOwnerFinanceTimeline(years = 5) {
  return useOwnerQuery<{ series: OwnerSeries[] }>(
    'finance-timeline',
    '/owner/finance/timeline',
    { years },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

// ---------------------------------------------------------------------------
// Assiduité & vie scolaire
// ---------------------------------------------------------------------------

export interface OwnerAttendanceFilters {
  level?: string;
  classId?: string;
  subjectId?: string;
  semesterId?: string;
  teacherId?: string;
  startDate?: string;
  endDate?: string;
}

export interface OwnerAttendance {
  presenceRate: OwnerMetric;
  absenceRate: OwnerMetric;
  lateRate: OwnerMetric;
  justifiedShare: OwnerMetric;
  absenceHours: OwnerMetric;
  byClass: OwnerSeries;
  bySubject: OwnerSeries;
  absenceHoursBySubject: OwnerSeries;
  halfDayRate: OwnerMetric;
  hasSource: boolean;
}

export interface OwnerAttendanceSessions {
  held: OwnerMetric;
  notHeld: OwnerMetric;
  coverageRate: OwnerMetric;
  makeupBreakdown: OwnerSeries;
  moveRequests: OwnerSeries;
  byTeacher: Array<{
    key: string;
    label: string;
    held: number;
    notHeld: number;
    coverage: number | null;
  }>;
  hasSource: boolean;
}

export interface OwnerAttendanceConduct {
  averageNote: OwnerMetric;
  averagePenalty: OwnerMetric;
  belowThreshold: OwnerMetric;
  distribution: OwnerSeries;
  overrides: { count: OwnerMetric; hours: OwnerMetric };
  incidents: OwnerSeries;
  /** Paramètres du calcul, pour rendre la pénalité explicable à l'écran. */
  settings: { baseNote: number; hoursPerPoint: number } | null;
  hasSource: boolean;
}

export interface OwnerTeacherAbsences {
  absenceHours: OwnerMetric;
  justifiedShare: OwnerMetric;
  byTeacher: Array<{ key: string; label: string; hours: number; justifiedShare: number | null }>;
  hasSource: boolean;
}

/** Assiduité — `ASS-01`…`ASS-06`, `ASS-12`. */
export function useOwnerAttendance(filters: OwnerAttendanceFilters = {}, enabled = true) {
  return useOwnerQuery<OwnerAttendance>(
    'attendance',
    '/owner/attendance',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME, enabled },
  );
}

/** Séances tenues et non tenues — `ASS-07`…`ASS-11`. */
export function useOwnerAttendanceSessions(
  filters: OwnerAttendanceFilters = {},
  enabled = true,
) {
  return useOwnerQuery<OwnerAttendanceSessions>(
    'attendance-sessions',
    '/owner/attendance/sessions',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME, enabled },
  );
}

/** Conduite et vie scolaire — `ASS-15`…`ASS-20`. */
export function useOwnerAttendanceConduct(
  filters: OwnerAttendanceFilters = {},
  enabled = true,
) {
  return useOwnerQuery<OwnerAttendanceConduct>(
    'attendance-conduct',
    '/owner/attendance/conduct',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME, enabled },
  );
}

/** Absences des enseignants — `ASS-13`, `ASS-14`. */
export function useOwnerTeacherAbsences(
  filters: OwnerAttendanceFilters = {},
  enabled = true,
) {
  return useOwnerQuery<OwnerTeacherAbsences>(
    'attendance-teachers',
    '/owner/attendance/teachers',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME, enabled },
  );
}

// ---------------------------------------------------------------------------
// Enseignants & ressources
// ---------------------------------------------------------------------------

export interface OwnerStaffFilters {
  teacherId?: string;
  level?: string;
  classId?: string;
}

export interface OwnerStaff {
  headcount: OwnerMetric;
  byContract: OwnerSeries;
  seniority: OwnerMetric;
  endingContracts: Array<{ key: string; label: string; endDate: string; contract: string }>;
  accountCoverage: OwnerMetric;
  polyvalence: OwnerSeries;
  subjectCoverage: OwnerMetric;
  assignments: OwnerMetric;
  unassignedSlots: OwnerMetric;
  mainTeachers: OwnerMetric;
  hasSource: boolean;
}

export interface OwnerStaffWorkload {
  weeklyHours: Array<{
    key: string;
    label: string;
    hours: number;
    target: number | null;
    gap: number | null;
  }>;
  averageHours: OwnerMetric;
  overUnderLoad: OwnerSeries;
  hoursWorked: OwnerSeries;
  plannedVsActual: Array<{
    key: string;
    label: string;
    planned: number;
    actual: number;
    gap: number;
  }>;
  hasTargets: boolean;
  hasDeclaredHours: boolean;
}

export interface OwnerStaffPayroll {
  grossTotal: OwnerMetric;
  netTotal: OwnerMetric;
  breakdown: OwnerSeries;
  deductions: OwnerMetric;
  socialCharges: OwnerSeries;
  byStatus: OwnerSeries;
  averageSalary: OwnerMetric;
  advances: { total: OwnerMetric; byStatus: OwnerSeries };
  corrections: OwnerSeries;
  costPerStudent: OwnerMetric;
  monthly: OwnerSeries;
  hasSource: boolean;
}

/** Effectif, contrats et couverture des matières — `ENS-01` → `ENS-12`. */
export function useOwnerStaff(filters: OwnerStaffFilters = {}) {
  return useOwnerQuery<OwnerStaff>(
    'staff',
    '/owner/staff',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/** Charge horaire hebdomadaire et heures effectuées — `ENS-13` → `ENS-18`. */
export function useOwnerStaffWorkload(filters: OwnerStaffFilters = {}) {
  return useOwnerQuery<OwnerStaffWorkload>(
    'staff-workload',
    '/owner/staff/workload',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

/**
 * Masse salariale — `ENS-19` → `ENS-28`.
 *
 * Sans filtre de classe : un salaire ne se répartit pas entre les classes où
 * l'enseignant intervient, et le ventiler donnerait un coût par classe faux.
 */
export function useOwnerStaffPayroll() {
  return useOwnerQuery<OwnerStaffPayroll>(
    'staff-payroll',
    '/owner/staff/payroll',
    {},
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

// ---------------------------------------------------------------------------
// Synthèse
// ---------------------------------------------------------------------------

export interface OwnerSummaryKpi {
  key: string;
  label: string;
  metric: OwnerMetric;
  accent: 'role' | 'info' | 'success' | 'warning' | 'danger';
  /** Code de l'indicateur d'origine — trace d'où vient le chiffre. */
  source: string;
}

export interface OwnerSummary {
  kpis: OwnerSummaryKpi[];
}

/** Synthèse de la page d'accueil — les dix KPI de §4.h. */
export function useOwnerSummary(filters: { classId?: string } = {}) {
  return useOwnerQuery<OwnerSummary>(
    'summary',
    '/owner/summary',
    { ...filters },
    { staleTime: AGGREGATE_STALE_TIME },
  );
}

export function useOwnerQuery<T>(
  domain: string,
  path: string,
  params: Record<string, string | number | undefined> = {},
  options?: Omit<UseQueryOptions<{ data: T; meta: OwnerMeta }>, 'queryKey' | 'queryFn'>,
) {
  const academicYearId = useOwnerFilters((s) => s.academicYearId);
  const compareAcademicYearId = useOwnerFilters((s) => s.compareAcademicYearId);

  // Trié pour que deux appels aux mêmes filtres, écrits dans un ordre
  // différent, partagent bien la même entrée de cache.
  const localFilters = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  return useQuery<{ data: T; meta: OwnerMeta }>({
    queryKey: ['owner', domain, academicYearId, compareAcademicYearId, ...localFilters.flat()],
    enabled: Boolean(academicYearId) && options?.enabled !== false,
    queryFn: async () => {
      const response = await api.get(path, {
        params: {
          academicYearId,
          ...(compareAcademicYearId ? { compareAcademicYearId } : {}),
          ...Object.fromEntries(localFilters),
        },
      });
      return { data: response.data.data, meta: response.data.meta };
    },
    ...options,
  });
}
