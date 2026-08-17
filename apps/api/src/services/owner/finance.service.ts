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
import { historyOf, type OwnerAcademicYear, type ResolvedYears } from './academic-year.helper';

/**
 * Finance — indicateurs `FIN-01` à `FIN-38` (§4.f).
 *
 * **Ce qui est facturé, ce qui est dû, ce qui est encaissé** sont trois choses
 * différentes, et la valeur de cet écran tient à ne jamais les confondre. Le
 * taux de recouvrement brut (`FIN-04`) rapporte l'encaissé au facturé de
 * l'année entière : en janvier, il est mécaniquement bas sans que rien n'aille
 * mal. Le taux à échéance (`FIN-06`), lui, rapporte l'encaissé à ce qui était
 * réellement exigible à ce jour — c'est le seul des deux qui se lise en cours
 * d'année.
 *
 * **Rien n'est jamais nominatif.** La créance se lit par classe (`FIN-18`) :
 * associer un nom d'élève à une dette est une donnée personnelle sensible, et
 * le propriétaire pilote une école, il ne relance pas les familles.
 *
 * **Trois tables ne portent pas d'établissement** — `invoice_lines`,
 * `custom_payment_plan_installments`, `school_fee_rate_details` — et échappent
 * donc à l'extension Prisma. Elles ne sont jamais lues à plat : toujours à
 * travers leur parent, qui, lui, est cloisonné (§6.9).
 */

export interface FinanceFilters {
  /** `L1` — niveau. */
  level?: string;
  /** `L2` — classe. */
  classId?: string;
  /** Type de frais, pour la ventilation des recettes. */
  paymentTypeId?: string;
}

// ---------------------------------------------------------------------------
// Règle de statut — reprise telle quelle du service existant
// ---------------------------------------------------------------------------

export type InstallmentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

/**
 * Statut d'une tranche, à l'identique de `studentPayment.service.ts:221-228`.
 *
 * L'ordre des tests compte : `OVERDUE` est appliqué **après** coup et prévaut
 * sur `PENDING` comme sur `PARTIAL`, mais jamais sur `PAID`. Une tranche soldée
 * en retard reste soldée — c'est le solde qui décide, pas le calendrier.
 */
export function installmentStatus(
  totalPaid: number,
  expectedAmount: number,
  dueDate: Date,
  today: Date,
): InstallmentStatus {
  let status: InstallmentStatus = 'PENDING';
  if (totalPaid >= expectedAmount) status = 'PAID';
  else if (totalPaid > 0) status = 'PARTIAL';
  if (status !== 'PAID' && today > dueDate) status = 'OVERDUE';
  return status;
}

/** Tranches d'ancienneté de la créance (`FIN-10`), en jours. */
export const AGEING_BUCKETS = [
  { key: '0-30', label: '0 à 30 jours', max: 30 },
  { key: '31-60', label: '31 à 60 jours', max: 60 },
  { key: '61-90', label: '61 à 90 jours', max: 90 },
  { key: '90+', label: 'plus de 90 jours', max: Infinity },
] as const;

/** Ancienneté d'une créance rangée dans sa tranche. */
export function ageingBucketOf(daysLate: number): string {
  // Une échéance dépassée du jour même appartient à la tranche 0-30 : le
  // vieillissement commence à zéro, il ne saute pas la première tranche.
  return AGEING_BUCKETS.find((bucket) => daysLate <= bucket.max)!.key;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// ---------------------------------------------------------------------------
// Contexte de facturation
// ---------------------------------------------------------------------------

interface InvoiceRow {
  id: string;
  studentId: string;
  classId: string;
  className: string;
  level: string | null;
  total: number;
  status: string;
}

interface InstallmentRow {
  id: string;
  studentId: string | null;
  number: number;
  dueDate: Date;
  amount: number;
  paid: number;
}

interface BillingContext {
  invoices: InvoiceRow[];
  installments: InstallmentRow[];
  /** Élèves retenus par les filtres — la clé de tout le reste. */
  studentIds: Set<string> | null;
  classOf: Map<string, { classId: string; className: string; level: string | null }>;
}

function invoiceWhere(
  academicYearId: string,
  filters: FinanceFilters,
): Prisma.invoicesWhereInput {
  return {
    academic_year_id: academicYearId,
    ...(filters.classId ? { class_id: filters.classId } : {}),
    ...(filters.level ? { class: { level: filters.level } } : {}),
  };
}

/**
 * Factures et tranches de l'année.
 *
 * La facture sert d'ancrage de classe : elle porte `class_id` et n'existe
 * qu'une fois par (élève, année). Les échéanciers, eux, peuvent être rattachés
 * à une classe, à un niveau ou à un élève ; passer par la facture donne un
 * rattachement unique et stable, au lieu de trois chemins qui peuvent diverger.
 */
async function readBilling(
  academicYearId: string,
  filters: FinanceFilters,
): Promise<BillingContext> {
  const invoiceRows = await prisma.invoices.findMany({
    where: invoiceWhere(academicYearId, filters),
    select: {
      id: true,
      student_id: true,
      class_id: true,
      total_amount: true,
      status: true,
      class: { select: { name: true, level: true } },
    },
  });

  const invoices: InvoiceRow[] = invoiceRows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    className: row.class.name,
    level: row.class.level,
    total: Number(row.total_amount),
    status: String(row.status),
  }));

  const filtered = Boolean(filters.classId || filters.level);
  const studentIds = filtered ? new Set(invoices.map((invoice) => invoice.studentId)) : null;

  const classOf = new Map(
    invoices.map((invoice) => [
      invoice.studentId,
      { classId: invoice.classId, className: invoice.className, level: invoice.level },
    ]),
  );

  // `custom_payment_plan_installments` ne porte pas d'établissement : elle est
  // atteinte par son plan, qui est cloisonné (§6.9). Les modèles d'échéancier
  // (`is_template`) ne sont pas des dettes : ce sont des gabarits.
  const installmentRows = await prisma.custom_payment_plan_installments.findMany({
    where: {
      custom_payment_plans: {
        academic_year_id: academicYearId,
        is_template: false,
        ...(studentIds ? { student_id: { in: [...studentIds] } } : {}),
      },
    },
    select: {
      id: true,
      installment_number: true,
      due_date: true,
      amount: true,
      custom_payment_plans: { select: { student_id: true } },
    },
  });

  const paidByInstallment = await prisma.student_payments.groupBy({
    by: ['custom_payment_plan_installment_id'],
    where: {
      academic_year_id: academicYearId,
      ...(studentIds ? { student_id: { in: [...studentIds] } } : {}),
    },
    _sum: { amount: true },
  });

  const paidOf = new Map(
    paidByInstallment.map((row) => [
      row.custom_payment_plan_installment_id,
      Number(row._sum.amount ?? 0),
    ]),
  );

  return {
    invoices,
    studentIds,
    classOf,
    installments: installmentRows.map((row) => ({
      id: row.id,
      studentId: row.custom_payment_plans.student_id,
      number: row.installment_number,
      dueDate: row.due_date,
      amount: Number(row.amount),
      paid: paidOf.get(row.id) ?? 0,
    })),
  };
}

async function collectedOf(academicYearId: string, studentIds: Set<string> | null) {
  const result = await prisma.student_payments.aggregate({
    where: {
      academic_year_id: academicYearId,
      ...(studentIds ? { student_id: { in: [...studentIds] } } : {}),
    },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

function roundOrNull(value: number | null, decimals = 2): number | null {
  return value === null ? null : round(value, decimals);
}

/** `0 FCFA` sur une source vide induit en erreur : une absence vaut `null`. */
function moneyOrNull(value: number, hasSource: boolean): number | null {
  return hasSource ? round(value, 2) : null;
}

// ---------------------------------------------------------------------------
// FIN-01…FIN-06, FIN-25, FIN-26, FIN-37 — vue d'ensemble
// ---------------------------------------------------------------------------

interface OverviewSnapshot {
  invoiced: number | null;
  collected: number | null;
  outstanding: number | null;
  collectionRate: number | null;
  dueToDate: number | null;
  onScheduleRate: number | null;
  invoicingRate: number | null;
  cancelledCount: number;
  cancelledAmount: number | null;
  revenuePerStudent: number | null;
}

async function overviewSnapshotOf(
  year: OwnerAcademicYear,
  filters: FinanceFilters,
  today: Date,
): Promise<OverviewSnapshot> {
  const billing = await readBilling(year.id, filters);

  const issued = billing.invoices.filter((invoice) => invoice.status !== 'CANCELLED');
  const cancelled = billing.invoices.filter((invoice) => invoice.status === 'CANCELLED');

  // `FIN-01` — une facture annulée n'est pas un chiffre d'affaires.
  const invoiced = issued.reduce((sum, invoice) => sum + invoice.total, 0);
  const collected = await collectedOf(year.id, billing.studentIds);

  // `FIN-05` — ce qui était exigible à ce jour, échéancier en main.
  const dueToDate = billing.installments
    .filter((installment) => installment.dueDate <= today)
    .reduce((sum, installment) => sum + installment.amount, 0);

  const enrolled = await prisma.inscriptions.count({
    where: {
      academic_year_id: year.id,
      ...(filters.classId ? { class_id: filters.classId } : {}),
      ...(filters.level ? { class: { level: filters.level } } : {}),
    },
  });

  const hasInvoices = billing.invoices.length > 0;

  return {
    invoiced: moneyOrNull(invoiced, hasInvoices),
    collected: moneyOrNull(collected, hasInvoices || collected > 0),
    outstanding: hasInvoices ? round(invoiced - collected, 2) : null,
    // `FIN-04` — `null` et non `0` quand rien n'a été facturé : un taux de
    // recouvrement de 0 % annoncerait une catastrophe là où il n'y a rien.
    collectionRate: roundOrNull(ratio(collected, invoiced), 4),
    dueToDate: moneyOrNull(dueToDate, billing.installments.length > 0),
    onScheduleRate: roundOrNull(ratio(collected, dueToDate), 4),
    invoicingRate: roundOrNull(ratio(issued.length, enrolled), 4),
    cancelledCount: cancelled.length,
    cancelledAmount: moneyOrNull(
      cancelled.reduce((sum, invoice) => sum + invoice.total, 0),
      cancelled.length > 0,
    ),
    revenuePerStudent: roundOrNull(ratio(invoiced, enrolled), 2),
  };
}

export interface FinanceOverview {
  invoiced: Metric;
  collected: Metric;
  outstanding: Metric;
  collectionRate: Metric;
  dueToDate: Metric;
  onScheduleRate: Metric;
  invoicingRate: Metric;
  cancelled: { count: Metric; amount: Metric };
  revenuePerStudent: Metric;
}

export async function getFinanceOverview(
  resolved: ResolvedYears,
  filters: FinanceFilters,
  today = new Date(),
): Promise<FinanceOverview> {
  const [current, comparison] = await Promise.all([
    overviewSnapshotOf(resolved.year, filters, today),
    resolved.compare
      ? overviewSnapshotOf(resolved.compare, filters, today)
      : Promise.resolve<OverviewSnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: OverviewSnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  return {
    invoiced: metric(current.invoiced, previousOf((s) => s.invoiced), 'currency'),
    collected: metric(current.collected, previousOf((s) => s.collected), 'currency'),
    outstanding: metric(current.outstanding, previousOf((s) => s.outstanding), 'currency'),
    collectionRate: metric(current.collectionRate, previousOf((s) => s.collectionRate), 'percent'),
    dueToDate: metric(current.dueToDate, previousOf((s) => s.dueToDate), 'currency'),
    onScheduleRate: metric(current.onScheduleRate, previousOf((s) => s.onScheduleRate), 'percent'),
    invoicingRate: metric(current.invoicingRate, previousOf((s) => s.invoicingRate), 'percent'),
    cancelled: {
      count: metric(current.cancelledCount, previousOf((s) => s.cancelledCount)),
      amount: metric(current.cancelledAmount, previousOf((s) => s.cancelledAmount), 'currency'),
    },
    revenuePerStudent: metric(
      current.revenuePerStudent,
      previousOf((s) => s.revenuePerStudent),
      'currency',
    ),
  };
}

// ---------------------------------------------------------------------------
// FIN-07…FIN-10, FIN-17 — recouvrement
// ---------------------------------------------------------------------------

interface CollectionSnapshot {
  lateCount: number;
  lateAmount: number | null;
  averageDelay: number | null;
  studentsUpToDate: number | null;
  ageing: Map<string, number>;
  byInstallmentNumber: Map<string, number>;
  hasSource: boolean;
}

async function collectionSnapshotOf(
  year: OwnerAcademicYear,
  filters: FinanceFilters,
  today: Date,
): Promise<CollectionSnapshot> {
  const billing = await readBilling(year.id, filters);

  const ageing = new Map<string, number>(AGEING_BUCKETS.map((bucket) => [bucket.key, 0]));
  const byInstallmentNumber = new Map<string, number>();
  const delays: number[] = [];
  const lateStudents = new Set<string>();

  let lateCount = 0;
  let lateAmount = 0;

  for (const installment of billing.installments) {
    const status = installmentStatus(installment.paid, installment.amount, installment.dueDate, today);
    if (status !== 'OVERDUE') continue;

    const remaining = Math.max(0, installment.amount - installment.paid);
    lateCount += 1;
    lateAmount += remaining;
    delays.push(daysBetween(installment.dueDate, today));
    if (installment.studentId) lateStudents.add(installment.studentId);

    const bucket = ageingBucketOf(daysBetween(installment.dueDate, today));
    ageing.set(bucket, (ageing.get(bucket) ?? 0) + remaining);

    const numberKey = String(installment.number);
    byInstallmentNumber.set(numberKey, (byInstallmentNumber.get(numberKey) ?? 0) + remaining);
  }

  const billedStudents = new Set(billing.invoices.map((invoice) => invoice.studentId));

  return {
    lateCount,
    lateAmount: moneyOrNull(lateAmount, billing.installments.length > 0),
    averageDelay: roundOrNull(average(delays), 1),
    // `FIN-17` — part d'élèves sans aucune tranche échue impayée.
    studentsUpToDate: roundOrNull(
      ratio(billedStudents.size - lateStudents.size, billedStudents.size),
      4,
    ),
    ageing,
    byInstallmentNumber,
    hasSource: billing.installments.length > 0,
  };
}

export interface FinanceCollection {
  lateInstallments: Metric;
  lateAmount: Metric;
  averageDelay: Metric;
  studentsUpToDate: Metric;
  ageing: Series;
  byInstallmentNumber: Series;
  hasSource: boolean;
}

export async function getFinanceCollection(
  resolved: ResolvedYears,
  filters: FinanceFilters,
  today = new Date(),
): Promise<FinanceCollection> {
  const [current, comparison] = await Promise.all([
    collectionSnapshotOf(resolved.year, filters, today),
    resolved.compare
      ? collectionSnapshotOf(resolved.compare, filters, today)
      : Promise.resolve<CollectionSnapshot | null>(null),
  ]);

  const previousOf = <T>(pick: (snapshot: CollectionSnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  const labelOfBucket = (key: string) =>
    AGEING_BUCKETS.find((bucket) => bucket.key === key)?.label ?? key;

  return {
    lateInstallments: metric(current.lateCount, previousOf((s) => s.lateCount)),
    lateAmount: metric(current.lateAmount, previousOf((s) => s.lateAmount), 'currency'),
    averageDelay: metric(current.averageDelay, previousOf((s) => s.averageDelay), 'days'),
    studentsUpToDate: metric(
      current.studentsUpToDate,
      previousOf((s) => s.studentsUpToDate),
      'percent',
    ),
    ageing: series(
      current.ageing,
      comparison ? comparison.ageing : null,
      labelOfBucket,
      'currency',
      // L'ancienneté se lit du plus récent au plus ancien, jamais par montant.
      (a, b) =>
        AGEING_BUCKETS.findIndex((bucket) => bucket.key === a.key) -
        AGEING_BUCKETS.findIndex((bucket) => bucket.key === b.key),
    ),
    byInstallmentNumber: series(
      current.byInstallmentNumber,
      comparison ? comparison.byInstallmentNumber : null,
      (key) => `Tranche ${key}`,
      'currency',
      (a, b) => Number(a.key) - Number(b.key),
    ),
    hasSource: current.hasSource,
  };
}

// ---------------------------------------------------------------------------
// FIN-11…FIN-14, FIN-20…FIN-24 — ventilation des recettes
// ---------------------------------------------------------------------------

export interface RevenueBreakdown {
  byFeeType: Series;
  byClass: Series;
  byLevel: Series;
  byPaymentMethod: Series;
  byPaymentCondition: Series;
  conditionStructure: Array<{
    key: string;
    label: string;
    lines: number;
    maxDelayDays: number | null;
  }>;
  feeRates: Array<{ level: string; amount: number; stateAssigned: boolean }>;
  rateGap: Series;
  stateAssignedGap: Metric;
}

export async function getRevenueBreakdown(
  resolved: ResolvedYears,
  filters: FinanceFilters,
): Promise<RevenueBreakdown> {
  const year = resolved.year;
  const billing = await readBilling(year.id, filters);
  const issued = billing.invoices.filter((invoice) => invoice.status !== 'CANCELLED');
  const invoiceIds = issued.map((invoice) => invoice.id);

  const [lines, methods, conditions, rates] = await Promise.all([
    // `invoice_lines` n'est pas cloisonnée : lue par ses factures (§6.9).
    invoiceIds.length > 0
      ? prisma.invoice_lines.findMany({
          where: {
            invoice_id: { in: invoiceIds },
            ...(filters.paymentTypeId ? { payment_type_id: filters.paymentTypeId } : {}),
          },
          select: {
            amount: true,
            payment_type_id: true,
            payment_types: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    prisma.student_payments.groupBy({
      by: ['payment_method'],
      where: {
        academic_year_id: year.id,
        ...(billing.studentIds ? { student_id: { in: [...billing.studentIds] } } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.payment_conditions.findMany({
      select: {
        id: true,
        name: true,
        classes: { select: { id: true } },
        // `payment_condition_lines` n'est pas cloisonnée : lue par sa condition.
        lines: { select: { delay_days: true } },
      },
    }),
    prisma.school_fee_rates.findMany({
      select: { level: true, total_amount: true, is_for_state_assigned: true },
      orderBy: { level: 'asc' },
    }),
  ]);

  const byFeeType = new Map<string, number>();
  for (const line of lines) {
    const name = line.payment_types.name;
    byFeeType.set(name, (byFeeType.get(name) ?? 0) + Number(line.amount));
  }

  const byClass = new Map<string, number>();
  const byLevel = new Map<string, number>();
  for (const invoice of issued) {
    byClass.set(invoice.className, (byClass.get(invoice.className) ?? 0) + invoice.total);
    const level = invoice.level ?? 'Sans niveau';
    byLevel.set(level, (byLevel.get(level) ?? 0) + invoice.total);
  }

  // Les modes de paiement sont une énumération technique : les afficher tels
  // quels donnait « MOBILE_MONEY » et « CASH » dans la légende d'un graphique
  // lu par le propriétaire de l'école.
  const LIBELLE_MODE: Record<string, string> = {
    CASH: 'Espèces',
    CHEQUE: 'Chèque',
    VIREMENT: 'Virement',
    MOBILE_MONEY: 'Mobile Money',
    CARTE: 'Carte bancaire',
  };

  const byPaymentMethod = new Map<string, number>(
    methods.map((row) => [
      LIBELLE_MODE[String(row.payment_method)] ?? String(row.payment_method),
      Number(row._sum.amount ?? 0),
    ]),
  );

  // `FIN-20` — les élèves sont rattachés à un échéancier par leur classe.
  const classToCondition = new Map<string, string>();
  for (const condition of conditions) {
    for (const klass of condition.classes) classToCondition.set(klass.id, condition.name);
  }

  const byPaymentCondition = new Map<string, number>();
  for (const invoice of issued) {
    const name = classToCondition.get(invoice.classId) ?? 'Sans échéancier';
    byPaymentCondition.set(name, (byPaymentCondition.get(name) ?? 0) + 1);
  }

  // `FIN-23` — écart entre le tarif de référence du niveau et le facturé moyen.
  const standardRate = new Map<string, number>();
  for (const rate of rates) {
    if (rate.is_for_state_assigned) continue;
    standardRate.set(rate.level, Number(rate.total_amount));
  }

  const invoicedByLevel = new Map<string, number[]>();
  for (const invoice of issued) {
    const level = invoice.level ?? 'Sans niveau';
    if (!invoicedByLevel.has(level)) invoicedByLevel.set(level, []);
    invoicedByLevel.get(level)!.push(invoice.total);
  }

  const rateGapPoints: SeriesPoint[] = [...invoicedByLevel.entries()]
    .map(([level, values]) => {
      const billed = average(values);
      const reference = standardRate.get(level);
      return {
        key: level,
        label: level,
        // Sans tarif de référence, l'écart n'est pas mesurable : il n'est pas nul.
        value: billed !== null && reference !== undefined ? round(billed - reference, 2) : null,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  // `FIN-24` — manque à gagner des élèves affectés par l'État : l'écart de
  // tarif, multiplié par le nombre d'élèves concernés.
  const assignedGaps: number[] = [];
  for (const rate of rates) {
    if (!rate.is_for_state_assigned) continue;
    const reference = standardRate.get(rate.level);
    if (reference === undefined) continue;
    assignedGaps.push(reference - Number(rate.total_amount));
  }

  const stateAssignedCount = await prisma.student.count({
    where: {
      isStateAssigned: true,
      ...(billing.studentIds ? { id: { in: [...billing.studentIds] } } : {}),
    },
  });

  const averageGap = average(assignedGaps);

  return {
    byFeeType: series(byFeeType, null, (key) => key, 'currency'),
    byClass: series(byClass, null, (key) => key, 'currency'),
    byLevel: series(byLevel, null, (key) => key, 'currency'),
    byPaymentMethod: series(byPaymentMethod, null, (key) => key, 'currency'),
    byPaymentCondition: series(byPaymentCondition, null, (key) => key, 'count'),
    conditionStructure: conditions.map((condition) => ({
      key: condition.id,
      label: condition.name,
      lines: condition.lines.length,
      maxDelayDays: condition.lines.length
        ? Math.max(...condition.lines.map((line) => line.delay_days ?? 0))
        : null,
    })),
    feeRates: rates.map((rate) => ({
      level: rate.level,
      amount: Number(rate.total_amount),
      stateAssigned: rate.is_for_state_assigned,
    })),
    rateGap: { points: rateGapPoints, unit: 'currency' },
    stateAssignedGap: metric(
      averageGap === null ? null : round(averageGap * stateAssignedCount, 2),
      null,
      'currency',
    ),
  };
}

// ---------------------------------------------------------------------------
// FIN-15, FIN-30 — saisonnalité
// ---------------------------------------------------------------------------

/** Mois de l'année scolaire, de septembre à août (critère 5.6). */
const SCHOOL_MONTHS = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];
const MONTH_LABELS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Bornes calendaires d'une année scolaire : 1er septembre → 31 août (§11-Q3). */
export function schoolYearWindow(year: OwnerAcademicYear): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year.startYear, 8, 1)),
    end: new Date(Date.UTC(year.endYear, 7, 31, 23, 59, 59)),
  };
}

async function monthlyCollected(year: OwnerAcademicYear): Promise<Map<number, number>> {
  const payments = await prisma.student_payments.findMany({
    where: { academic_year_id: year.id },
    select: { payment_date: true, amount: true },
  });

  const byMonth = new Map<number, number>();
  for (const payment of payments) {
    const month = payment.payment_date.getMonth();
    byMonth.set(month, (byMonth.get(month) ?? 0) + Number(payment.amount));
  }
  return byMonth;
}

async function monthlyExpenses(year: OwnerAcademicYear): Promise<Map<number, number> | null> {
  const { start, end } = schoolYearWindow(year);
  const rows = await prisma.expenses.findMany({
    where: { date: { gte: start, lte: end }, status: { in: ['APPROVED', 'PAID'] } },
    select: { date: true, amount: true },
  });

  if (rows.length === 0) return null;

  const byMonth = new Map<number, number>();
  for (const row of rows) {
    const month = row.date.getMonth();
    byMonth.set(month, (byMonth.get(month) ?? 0) + Number(row.amount));
  }
  return byMonth;
}

export interface FinanceSeasonality {
  monthly: Series;
  expenses: Series | null;
}

export async function getFinanceSeasonality(resolved: ResolvedYears): Promise<FinanceSeasonality> {
  const [collected, previousCollected, expenses] = await Promise.all([
    monthlyCollected(resolved.year),
    resolved.compare
      ? monthlyCollected(resolved.compare)
      : Promise.resolve<Map<number, number> | null>(null),
    monthlyExpenses(resolved.year),
  ]);

  const points: SeriesPoint[] = SCHOOL_MONTHS.map((month) => ({
    key: String(month),
    label: MONTH_LABELS[month],
    value: round(collected.get(month) ?? 0, 2),
    previous: previousCollected ? round(previousCollected.get(month) ?? 0, 2) : null,
  }));

  return {
    monthly: { points, unit: 'currency' },
    expenses: expenses
      ? {
          points: SCHOOL_MONTHS.map((month) => ({
            key: String(month),
            label: MONTH_LABELS[month],
            value: round(expenses.get(month) ?? 0, 2),
          })),
          unit: 'currency',
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// FIN-18, FIN-19 — créance par classe
// ---------------------------------------------------------------------------

/** Bornes du « top N » (§6.7), non paramétrables par le client. */
const TOP_DEBTOR_CLASSES = 10;
const CONCENTRATION_CLASSES = 3;

export interface FinanceDebtors {
  byClass: Series;
  concentration: Metric;
  hasSource: boolean;
}

export async function getFinanceDebtors(
  resolved: ResolvedYears,
  filters: FinanceFilters,
): Promise<FinanceDebtors> {
  const billing = await readBilling(resolved.year.id, filters);
  const issued = billing.invoices.filter((invoice) => invoice.status !== 'CANCELLED');

  const paidByStudent = await prisma.student_payments.groupBy({
    by: ['student_id'],
    where: {
      academic_year_id: resolved.year.id,
      ...(billing.studentIds ? { student_id: { in: [...billing.studentIds] } } : {}),
    },
    _sum: { amount: true },
  });

  const paidOf = new Map(
    paidByStudent.map((row) => [row.student_id, Number(row._sum.amount ?? 0)]),
  );

  // Le grain est la classe, jamais l'élève : aucun identifiant d'élève ne
  // franchit cette fonction (§4.f, précision de conception ; critère 5.7).
  const byClass = new Map<string, number>();
  for (const invoice of issued) {
    const outstanding = Math.max(0, invoice.total - (paidOf.get(invoice.studentId) ?? 0));
    if (outstanding <= 0) continue;
    byClass.set(invoice.className, (byClass.get(invoice.className) ?? 0) + outstanding);
  }

  const sorted = [...byClass.entries()].sort(([, left], [, right]) => right - left);
  const totalOutstanding = sorted.reduce((sum, [, value]) => sum + value, 0);
  const topThree = sorted
    .slice(0, CONCENTRATION_CLASSES)
    .reduce((sum, [, value]) => sum + value, 0);

  return {
    byClass: {
      points: sorted.slice(0, TOP_DEBTOR_CLASSES).map(([className, value]) => ({
        key: className,
        label: className,
        value: round(value, 2),
      })),
      total: round(totalOutstanding, 2),
      unit: 'currency',
    },
    concentration: metric(roundOrNull(ratio(topThree, totalOutstanding), 4), null, 'percent'),
    hasSource: issued.length > 0,
  };
}

// ---------------------------------------------------------------------------
// FIN-27…FIN-36 — dépenses, budgets, marge
// ---------------------------------------------------------------------------

export interface FinanceExpenses {
  total: Metric;
  byCategory: Series;
  pendingApproval: Metric;
  budgetPlanVsActual: Array<{
    key: string;
    label: string;
    planned: number;
    spent: number;
    remaining: number;
  }>;
  budgetByType: Series;
  budgetRealised: Series;
  margin: Metric;
  marginRate: Metric;
  payrollShare: Metric;
  /** Domaines sans aucune ligne source, pour `meta.unavailable` (critère 5.8). */
  unavailable: string[];
}

interface ExpensesSnapshot {
  total: number | null;
  pending: number | null;
  byCategory: Map<string, number>;
  payroll: number | null;
  collected: number;
  hasExpenses: boolean;
  hasPayroll: boolean;
}

/**
 * Masse salariale de l'année scolaire.
 *
 * `monthly_payrolls` est datée en (mois, année) civils, pas en année scolaire :
 * la fenêtre septembre → août se traduit donc en couples explicites plutôt
 * qu'en intervalle de dates.
 */
async function payrollOf(year: OwnerAcademicYear): Promise<{ brut: number; net: number } | null> {
  const rows = await prisma.monthly_payrolls.findMany({
    where: {
      OR: [
        { year: year.startYear, month: { gte: 9 } },
        { year: year.endYear, month: { lte: 8 } },
      ],
    },
    select: { total_brut: true, net_payable: true },
  });

  if (rows.length === 0) return null;

  return {
    brut: rows.reduce((sum, row) => sum + Number(row.total_brut), 0),
    net: rows.reduce((sum, row) => sum + Number(row.net_payable), 0),
  };
}

async function expensesSnapshotOf(year: OwnerAcademicYear): Promise<ExpensesSnapshot> {
  const { start, end } = schoolYearWindow(year);

  const [rows, payroll, collected] = await Promise.all([
    prisma.expenses.findMany({
      where: { date: { gte: start, lte: end } },
      select: { amount: true, category: true, status: true },
    }),
    payrollOf(year),
    collectedOf(year.id, null),
  ]);

  const byCategory = new Map<string, number>();
  let total = 0;
  let pending = 0;

  for (const row of rows) {
    const amount = Number(row.amount);
    const status = String(row.status);
    if (status === 'APPROVED' || status === 'PAID') {
      total += amount;
      const category = String(row.category);
      byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
    } else if (status === 'DRAFT' || status === 'PENDING_APPROVAL') {
      pending += amount;
    }
  }

  return {
    total: rows.length > 0 ? round(total, 2) : null,
    pending: rows.length > 0 ? round(pending, 2) : null,
    byCategory,
    payroll: payroll ? round(payroll.net, 2) : null,
    collected,
    hasExpenses: rows.length > 0,
    hasPayroll: payroll !== null,
  };
}

export async function getFinanceExpenses(resolved: ResolvedYears): Promise<FinanceExpenses> {
  const [current, comparison, budgets, budgetLines] = await Promise.all([
    expensesSnapshotOf(resolved.year),
    resolved.compare
      ? expensesSnapshotOf(resolved.compare)
      : Promise.resolve<ExpensesSnapshot | null>(null),
    prisma.budgets.findMany({
      where: { academic_year_id: resolved.year.id },
      select: { category: true, planned_amount: true, spent_amount: true, remaining_amount: true },
    }),
    prisma.budget_lines.findMany({
      where: { academic_year_id: resolved.year.id },
      select: {
        id: true,
        title: true,
        type: true,
        amount: true,
        // `budget_transactions` n'est pas cloisonnée : lue par sa ligne (§6.9).
        transactions: { select: { amount: true } },
      },
    }),
  ]);

  const previousOf = <T>(pick: (snapshot: ExpensesSnapshot) => T): T | null =>
    comparison ? pick(comparison) : null;

  const marginOf = (snapshot: ExpensesSnapshot | null): number | null => {
    // Critère 5.11 : la marge ne s'affiche que si dépenses **et** paie sont
    // alimentées. Une marge calculée sur une paie absente serait flatteuse et
    // fausse — exactement le genre de chiffre qui fait prendre une mauvaise
    // décision.
    if (!snapshot || !snapshot.hasExpenses || !snapshot.hasPayroll) return null;

    // ⚠ Risque de double compte, assumé faute de décision métier : la formule
    // de §4.f additionne les dépenses et le net payé, or `ExpenseCategory`
    // comporte une catégorie SALAIRES. Une école qui saisit ses salaires à la
    // fois en dépenses et en paie les compterait deux fois, et sa marge
    // paraîtrait plus faible qu'elle n'est. À trancher avec le métier — voir le
    // récapitulatif de livraison.
    return round(snapshot.collected - ((snapshot.total ?? 0) + (snapshot.payroll ?? 0)), 2);
  };

  const currentMargin = marginOf(current);
  const unavailable: string[] = [];
  if (!current.hasExpenses) unavailable.push('expenses');
  if (!current.hasPayroll) unavailable.push('payroll');
  if (budgets.length === 0 && budgetLines.length === 0) unavailable.push('budgets');

  const budgetByType = new Map<string, number>();
  const budgetRealised = new Map<string, number>();
  for (const line of budgetLines) {
    const type = String(line.type);
    budgetByType.set(type, (budgetByType.get(type) ?? 0) + Number(line.amount));
    const realised = line.transactions.reduce((sum, row) => sum + Number(row.amount), 0);
    budgetRealised.set(line.title, (budgetRealised.get(line.title) ?? 0) + realised);
  }

  return {
    total: metric(current.total, previousOf((s) => s.total), 'currency'),
    byCategory: series(
      current.byCategory,
      comparison ? comparison.byCategory : null,
      (key) => key,
      'currency',
    ),
    pendingApproval: metric(current.pending, previousOf((s) => s.pending), 'currency'),
    budgetPlanVsActual: budgets.map((budget) => ({
      key: String(budget.category),
      label: String(budget.category),
      planned: Number(budget.planned_amount),
      spent: Number(budget.spent_amount),
      remaining: Number(budget.remaining_amount),
    })),
    budgetByType: series(budgetByType, null, (key) => key, 'currency'),
    budgetRealised: series(budgetRealised, null, (key) => key, 'currency'),
    margin: metric(currentMargin, marginOf(comparison), 'currency'),
    marginRate: metric(
      currentMargin === null ? null : roundOrNull(ratio(currentMargin, current.collected), 4),
      null,
      'percent',
    ),
    payrollShare: metric(
      current.hasPayroll ? roundOrNull(ratio(current.payroll, current.collected), 4) : null,
      null,
      'percent',
    ),
    unavailable,
  };
}

// ---------------------------------------------------------------------------
// FIN-38 — évolution pluriannuelle
// ---------------------------------------------------------------------------

export async function getFinanceTimeline(
  resolved: ResolvedYears,
  count: number,
): Promise<{ series: Series[] }> {
  const history = historyOf(resolved.years, count);

  const snapshots = await Promise.all(
    history.map(async (year) => ({
      year,
      snapshot: await overviewSnapshotOf(year, {}, new Date()),
    })),
  );

  const pointsOf = (pick: (snapshot: OverviewSnapshot) => number | null): SeriesPoint[] =>
    snapshots.map(({ year, snapshot }) => ({
      key: year.id,
      label: year.name,
      value: pick(snapshot),
    }));

  return {
    series: [
      { points: pointsOf((s) => s.invoiced), unit: 'currency' },
      { points: pointsOf((s) => s.collected), unit: 'currency' },
      { points: pointsOf((s) => s.collectionRate), unit: 'percent' },
    ],
  };
}
