import { prisma } from '@school/database';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Validation schemas
const createStudentPaymentSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  customPaymentPlanInstallmentId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string().transform(str => new Date(str)),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'VIREMENT', 'MOBILE_MONEY', 'CARTE']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const recordAdvancePaymentSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string(),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'VIREMENT', 'MOBILE_MONEY', 'CARTE']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const updateStudentPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  paymentDate: z.string().transform(str => new Date(str)).optional(),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'VIREMENT', 'MOBILE_MONEY', 'CARTE']).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
});

const paymentDetailInclude = {
  student: {
    include: {
      class: { select: { id: true, name: true } },
    },
  },
  academicYear: { select: { id: true, name: true, isCurrent: true } },
  custom_payment_plan_installments: {
    include: {
      custom_payment_plans: { select: { id: true, name: true } },
    },
  },
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

function parsePaymentDate(paymentDate: string | Date): Date {
  if (paymentDate instanceof Date) return paymentDate;
  const dateStr = paymentDate.includes('T') ? paymentDate : `${paymentDate}T00:00:00.000Z`;
  return new Date(dateStr);
}

export class StudentPaymentService {
  /**
   * Get all student payments with filters
   */
  static async getAll(filters: {
    studentId?: string;
    academicYearId?: string;
    classId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const {
      studentId,
      academicYearId,
      classId,
      status,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (studentId) where.student_id = studentId;
    if (academicYearId) where.academic_year_id = academicYearId;
    if (classId) where.student = { classId };
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.student_payments.findMany({
        where,
        include: paymentDetailInclude,
        orderBy: [
          { payment_date: 'desc' },
          { created_at: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.student_payments.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by ID
   */
  static async getById(id: string) {
    return prisma.student_payments.findUnique({
      where: { id },
      include: paymentDetailInclude,
    });
  }

  /**
   * Get a student's payment status for an academic year: the échéancier
   * (always present — a plan is guaranteed for every invoiced student, see
   * InvoiceService.generateForInscription) with, per tranche, what's expected,
   * what's been paid, and what remains.
   */
  static async getStudentPaymentStatus(studentId: string, academicYearId: string, createdBy?: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: { select: { id: true, name: true } } },
    });

    if (!student || !student.classId) {
      throw new Error('Student not found or not assigned to a class');
    }

    let customPaymentPlan = await prisma.custom_payment_plans.findUnique({
      where: {
        student_id_academic_year_id: {
          student_id: studentId,
          academic_year_id: academicYearId,
        },
      },
      include: {
        custom_payment_plan_installments: {
          orderBy: { installment_number: 'asc' },
        },
      },
    });

    // No active plan → try to auto-create from the class's payment condition
    if (!customPaymentPlan || !customPaymentPlan.is_active) {
      const schoolClass = await prisma.schoolClass.findUnique({
        where: { id: student.classId },
        include: {
          payment_condition: {
            include: {
              lines: { orderBy: { line_number: 'asc' } },
            },
          },
        },
      });

      if (schoolClass?.payment_condition && schoolClass.payment_condition.lines.length > 0) {
        const condition = schoolClass.payment_condition;
        const totalAmount = condition.lines.reduce((s, l) => s + Number(l.amount ?? 0), 0);

        customPaymentPlan = await prisma.custom_payment_plans.create({
          data: {
            id: randomUUID(),
            student_id: studentId,
            class_id: student.classId,
            academic_year_id: academicYearId,
            name: condition.name,
            description: condition.description ?? undefined,
            total_amount: totalAmount,
            is_active: true,
            created_by: createdBy ?? null,
            custom_payment_plan_installments: {
              create: condition.lines.map((line) => ({
                id: randomUUID(),
                installment_number: line.line_number,
                due_date: line.due_date ? new Date(line.due_date) : new Date(),
                amount: Number(line.amount ?? 0),
                notes: line.label,
              })),
            },
          },
          include: {
            custom_payment_plan_installments: {
              orderBy: { installment_number: 'asc' },
            },
          },
        });
      } else {
        throw new Error('No payment plan found for this student and academic year');
      }
    }

    if (!customPaymentPlan) {
      throw new Error('No payment plan found for this student and academic year');
    }

    const payments = await prisma.student_payments.findMany({
      where: { student_id: studentId, academic_year_id: academicYearId },
    });

    const paymentsByInstallment = new Map<string, typeof payments>();
    payments.forEach((payment) => {
      const arr = paymentsByInstallment.get(payment.custom_payment_plan_installment_id) || [];
      arr.push(payment);
      paymentsByInstallment.set(payment.custom_payment_plan_installment_id, arr);
    });

    const today = new Date();
    const expectedPayments = customPaymentPlan.custom_payment_plan_installments.map((installment) => {
      const installmentPayments = paymentsByInstallment.get(installment.id) || [];
      const totalPaid = installmentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const expectedAmount = Number(installment.amount);
      const remaining = expectedAmount - totalPaid;

      let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = 'PENDING';
      if (totalPaid >= expectedAmount) {
        status = 'PAID';
      } else if (totalPaid > 0) {
        status = 'PARTIAL';
      }
      if (status !== 'PAID' && today > new Date(installment.due_date)) {
        status = 'OVERDUE';
      }

      return {
        label: `Versement ${installment.installment_number}`,
        expectedAmount,
        totalPaid,
        remaining,
        status,
        payments: installmentPayments,
        installmentId: installment.id,
        installmentNumber: installment.installment_number,
        dueDate: installment.due_date,
        notes: installment.notes,
      };
    });

    const totalExpected = expectedPayments.reduce((sum, p) => sum + p.expectedAmount, 0);
    const totalPaid = expectedPayments.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalRemaining = totalExpected - totalPaid;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentNumber: student.studentNumber,
        class: student.class,
      },
      academicYear: { id: academicYearId },
      customPaymentPlan: {
        id: customPaymentPlan.id,
        name: customPaymentPlan.name,
        totalAmount: customPaymentPlan.total_amount,
      },
      expectedPayments,
      summary: {
        totalExpected,
        totalPaid,
        totalRemaining,
        completionRate: totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0,
      },
    };
  }

  /**
   * Create a new student payment against a specific échéancier tranche
   */
  static async create(data: z.infer<typeof createStudentPaymentSchema>, recordedBy: string) {
    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) {
      throw new Error('Student not found');
    }

    const academicYear = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
    if (!academicYear) {
      throw new Error('Academic year not found');
    }

    const installment = await prisma.custom_payment_plan_installments.findUnique({
      where: { id: data.customPaymentPlanInstallmentId },
      include: { custom_payment_plans: true },
    });
    if (!installment) {
      throw new Error('Installment not found');
    }
    if (
      installment.custom_payment_plans.student_id !== data.studentId ||
      installment.custom_payment_plans.academic_year_id !== data.academicYearId
    ) {
      throw new Error('This installment does not belong to the student\'s payment plan for this academic year');
    }

    const existingPayment = await prisma.student_payments.findFirst({
      where: {
        student_id: data.studentId,
        academic_year_id: data.academicYearId,
        custom_payment_plan_installment_id: data.customPaymentPlanInstallmentId,
      },
      orderBy: { created_at: 'desc' },
    });

    const expectedAmount = Number(installment.amount);
    const paidAmount = data.amount;
    let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = 'PENDING';
    if (paidAmount >= expectedAmount) {
      status = 'PAID';
    } else if (paidAmount > 0) {
      status = 'PARTIAL';
    }

    const paymentDate = parsePaymentDate(data.paymentDate);

    if (existingPayment) {
      const receiptNumber = existingPayment.receipt_number || await this.generateReceiptNumber();
      return prisma.student_payments.update({
        where: { id: existingPayment.id },
        data: {
          amount: data.amount,
          expected_amount: expectedAmount,
          payment_date: paymentDate,
          payment_method: data.paymentMethod,
          receipt_number: receiptNumber,
          reference: data.reference,
          notes: data.notes,
          status,
          recorded_by: recordedBy,
        },
        include: paymentDetailInclude,
      });
    }

    return prisma.student_payments.create({
      data: {
        id: randomUUID(),
        student_id: data.studentId,
        academic_year_id: data.academicYearId,
        custom_payment_plan_installment_id: data.customPaymentPlanInstallmentId,
        amount: data.amount,
        expected_amount: expectedAmount,
        payment_date: paymentDate,
        payment_method: data.paymentMethod,
        receipt_number: await this.generateReceiptNumber(),
        reference: data.reference,
        notes: data.notes,
        status,
        recorded_by: recordedBy,
      },
      include: paymentDetailInclude,
    });
  }

  /**
   * Record a free-form advance payment (mirrors Odoo's "Encaisser une avance au
   * guichet") — the amount isn't tied to one specific échéance. It's allocated
   * across the student's unpaid tranches in due-date order (oldest first); any
   * leftover surplus is recorded against a new synthetic "Avance / Trop-perçu"
   * tranche appended to the plan, so it stays visible on the summary (négative
   * "reste à payer") instead of being silently discarded.
   */
  static async recordAdvancePayment(data: z.infer<typeof recordAdvancePaymentSchema>, recordedBy: string) {
    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) {
      throw new Error('Student not found');
    }

    const academicYear = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
    if (!academicYear) {
      throw new Error('Academic year not found');
    }

    const status = await this.getStudentPaymentStatus(data.studentId, data.academicYearId);

    const dueLines = status.expectedPayments
      .filter((line) => line.remaining > 0.01)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const paymentDate = parsePaymentDate(data.paymentDate);

    let remainingToAllocate = data.amount;
    const created: any[] = [];

    for (const line of dueLines) {
      if (remainingToAllocate <= 0.01) break;
      const allocate = Math.min(remainingToAllocate, line.remaining);

      const newTotalPaid = line.totalPaid + allocate;
      const lineStatus: 'PENDING' | 'PARTIAL' | 'PAID' =
        newTotalPaid >= line.expectedAmount ? 'PAID' : newTotalPaid > 0 ? 'PARTIAL' : 'PENDING';

      const payment = await prisma.student_payments.create({
        data: {
          id: randomUUID(),
          student_id: data.studentId,
          academic_year_id: data.academicYearId,
          custom_payment_plan_installment_id: line.installmentId,
          amount: allocate,
          expected_amount: line.expectedAmount,
          payment_date: paymentDate,
          payment_method: data.paymentMethod,
          receipt_number: await this.generateReceiptNumber(),
          reference: data.reference,
          notes: data.notes,
          status: lineStatus,
          recorded_by: recordedBy,
        },
        include: paymentDetailInclude,
      });
      created.push(payment);
      remainingToAllocate -= allocate;
    }

    if (remainingToAllocate > 0.01) {
      const maxInstallmentNumber = Math.max(0, ...status.expectedPayments.map((l) => l.installmentNumber));
      const advanceInstallment = await prisma.custom_payment_plan_installments.create({
        data: {
          id: randomUUID(),
          custom_payment_plan_id: status.customPaymentPlan.id,
          installment_number: maxInstallmentNumber + 1,
          due_date: paymentDate,
          amount: 0,
          notes: 'Avance / Trop-perçu',
        },
      });

      const payment = await prisma.student_payments.create({
        data: {
          id: randomUUID(),
          student_id: data.studentId,
          academic_year_id: data.academicYearId,
          custom_payment_plan_installment_id: advanceInstallment.id,
          amount: remainingToAllocate,
          expected_amount: 0,
          payment_date: paymentDate,
          payment_method: data.paymentMethod,
          receipt_number: await this.generateReceiptNumber(),
          reference: data.reference,
          notes: data.notes,
          status: 'PAID',
          recorded_by: recordedBy,
        },
        include: paymentDetailInclude,
      });
      created.push(payment);
    }

    return created;
  }

  /**
   * Update a student payment
   */
  static async update(
    id: string,
    data: Partial<z.infer<typeof updateStudentPaymentSchema>>,
    _updatedBy: string
  ) {
    const payment = await prisma.student_payments.findUnique({ where: { id } });
    if (!payment) {
      throw new Error('Payment not found');
    }

    let status = data.status;
    if (data.amount !== undefined) {
      const expectedAmount = Number(payment.expected_amount);
      const paidAmount = data.amount;
      if (paidAmount >= expectedAmount) {
        status = 'PAID';
      } else if (paidAmount > 0) {
        status = 'PARTIAL';
      } else {
        status = 'PENDING';
      }
    }

    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.paymentDate !== undefined) updateData.payment_date = parsePaymentDate(data.paymentDate);
    if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (status !== undefined) updateData.status = status;

    return prisma.student_payments.update({
      where: { id },
      data: updateData,
      include: paymentDetailInclude,
    });
  }

  /**
   * Delete a student payment
   */
  static async delete(id: string) {
    const payment = await prisma.student_payments.findUnique({ where: { id } });
    if (!payment) {
      throw new Error('Payment not found');
    }

    await prisma.student_payments.delete({ where: { id } });

    return { message: 'Payment deleted successfully' };
  }

  /**
   * Generate unique receipt number
   */
  static async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    const lastPayment = await prisma.student_payments.findFirst({
      where: {
        receipt_number: { startsWith: prefix },
      },
      orderBy: { receipt_number: 'desc' },
    });

    let sequence = 1;
    if (lastPayment && lastPayment.receipt_number) {
      const lastSequence = parseInt(lastPayment.receipt_number.replace(prefix, ''));
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}

export { createStudentPaymentSchema, recordAdvancePaymentSchema, updateStudentPaymentSchema };
export default StudentPaymentService;
