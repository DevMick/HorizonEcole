import { prisma, Prisma } from '@school/database';
import { CustomPaymentPlanService } from './customPaymentPlan.service';

type DbClient = typeof prisma | Prisma.TransactionClient;

const invoiceListInclude = {
  student: {
    select: { id: true, firstName: true, lastName: true, studentNumber: true },
  },
  class: {
    select: { id: true, name: true },
  },
  academicYear: {
    select: { id: true, name: true },
  },
} as const;

const invoiceDetailInclude = {
  ...invoiceListInclude,
  lines: {
    include: { payment_types: true },
  },
  customPaymentPlan: {
    include: {
      custom_payment_plan_installments: {
        orderBy: { installment_number: 'asc' as const },
      },
    },
  },
} as const;

export class InvoiceService {
  static async generateInvoiceNumber(
    academicYear: { startYear: number; endYear: number },
    db: DbClient = prisma
  ) {
    const prefix = `FAC-${academicYear.startYear}${academicYear.endYear}-`;
    const count = await db.invoices.count({
      where: { invoice_number: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Generates the invoice + payment schedule for a freshly created inscription.
   * Mirrors the old Odoo flow (fee lookup + payment-term échéancier) but natively,
   * without collecting any payment automatically. Returns null (and logs a warning)
   * if the class has no fee configured — same silent-skip behavior as before.
   */
  static async generateForInscription(
    params: {
      studentId: string;
      classId: string;
      academicYearId: string;
      isStateAssigned: boolean;
      createdBy?: string;
    },
    db: DbClient = prisma
  ) {
    const { studentId, classId, academicYearId, isStateAssigned, createdBy } = params;

    const academicYear = await db.academicYear.findUnique({ where: { id: academicYearId } });
    if (!academicYear) {
      return null;
    }

    // Idempotency: don't double-invoice a student for the same academic year.
    const existingInvoice = await db.invoices.findUnique({
      where: { student_id_academic_year_id: { student_id: studentId, academic_year_id: academicYearId } },
      include: invoiceDetailInclude,
    });
    if (existingInvoice) {
      return existingInvoice;
    }

    const schoolClass = await db.schoolClass.findUnique({ where: { id: classId } });
    if (!schoolClass?.level) {
      console.warn(`[InvoiceService] Aucun niveau résolu pour la classe ${classId} — facture non générée.`);
      return null;
    }
    const level = schoolClass.level;

    let effectiveVariant = isStateAssigned;
    // `findFirst` : le couple (niveau, variante) n'est unique qu'au sein d'un
    // etablissement, dont le filtre est pose par le client Prisma.
    let feeRate = await db.school_fee_rates.findFirst({
      where: { level, is_for_state_assigned: effectiveVariant },
      include: { school_fee_rate_details: { include: { payment_types: true } } },
    });

    // Fall back to the standard rate if no state-assigned variant is configured.
    if ((!feeRate || feeRate.school_fee_rate_details.length === 0) && isStateAssigned) {
      effectiveVariant = false;
      feeRate = await db.school_fee_rates.findFirst({
        where: { level, is_for_state_assigned: false },
        include: { school_fee_rate_details: { include: { payment_types: true } } },
      });
    }

    if (!feeRate || feeRate.school_fee_rate_details.length === 0) {
      console.warn(`[InvoiceService] Aucun tarif configuré pour le niveau ${level} — facture non générée.`);
      return null;
    }

    // Only clone a template that matches the variant actually billed (effectiveVariant) —
    // otherwise its installment amounts could sum to a different total than feeRate.total_amount.
    const plan =
      (await CustomPaymentPlanService.cloneTemplateForStudent(
        studentId,
        classId,
        level,
        academicYearId,
        effectiveVariant,
        createdBy,
        db,
        { totalAmount: Number(feeRate.total_amount) }
      )) ??
      // No échéancier configured for this level/variant — fall back to a single
      // "pay in full today" tranche, mirroring Odoo's "Immediate Payment" default.
      (await CustomPaymentPlanService.createFallbackPlan(
        studentId,
        classId,
        academicYearId,
        effectiveVariant,
        Number(feeRate.total_amount),
        createdBy,
        db
      ));

    const invoiceNumber = await this.generateInvoiceNumber(academicYear, db);

    // Invoice lines are always the fee breakdown (what's owed) — independent of
    // the payment schedule (when it's due), which lives entirely on the plan.
    const lines = feeRate.school_fee_rate_details.map(detail => ({
      payment_type_id: detail.payment_type_id,
      description: detail.payment_types.name,
      amount: detail.amount,
    }));

    return db.invoices.create({
      data: {
        invoice_number: invoiceNumber,
        student_id: studentId,
        class_id: classId,
        academic_year_id: academicYearId,
        custom_payment_plan_id: plan.id,
        total_amount: feeRate.total_amount,
        created_by: createdBy,
        lines: { create: lines },
      },
      include: invoiceDetailInclude,
    });
  }

  static async getAll(filters: { classId?: string; academicYearId?: string; status?: 'ISSUED' | 'CANCELLED' }) {
    const where: any = {};
    if (filters.classId) where.class_id = filters.classId;
    if (filters.academicYearId) where.academic_year_id = filters.academicYearId;
    if (filters.status) where.status = filters.status;

    return prisma.invoices.findMany({
      where,
      include: invoiceListInclude,
      orderBy: { issued_at: 'desc' },
    });
  }

  static async getById(id: string) {
    return prisma.invoices.findUnique({
      where: { id },
      include: invoiceDetailInclude,
    });
  }

  static async getByStudentAndYear(studentId: string, academicYearId: string) {
    return prisma.invoices.findUnique({
      where: { student_id_academic_year_id: { student_id: studentId, academic_year_id: academicYearId } },
      include: invoiceDetailInclude,
    });
  }

  static async cancel(id: string) {
    const invoice = await prisma.invoices.findUnique({ where: { id } });
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    if (invoice.status === 'CANCELLED') {
      return invoice;
    }

    return prisma.invoices.update({
      where: { id },
      data: { status: 'CANCELLED', cancelled_at: new Date() },
      include: invoiceDetailInclude,
    });
  }
}

export default InvoiceService;
