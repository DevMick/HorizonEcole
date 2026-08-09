import { prisma, Prisma } from '@school/database';
import { z } from 'zod';
import { PaymentConditionService } from './paymentCondition.service';

type DbClient = typeof prisma | Prisma.TransactionClient;

const installmentInclude = {
  custom_payment_plan_installments: {
    orderBy: { installment_number: 'asc' as const },
  },
};

const planInclude = {
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentNumber: true,
      class: { select: { id: true, name: true } },
    },
  },
  class: { select: { id: true, name: true } },
  academicYear: { select: { id: true, name: true, isCurrent: true } },
  creator: { select: { id: true, firstName: true, lastName: true } },
  ...installmentInclude,
};

const templateInstallmentSchema = z.object({
  installmentNumber: z.number().int().positive(),
  dueDate: z.string().transform(str => new Date(str)),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

const upsertLevelTemplateSchema = z.object({
  level: z.string().min(1),
  academicYearId: z.string().uuid(),
  isForStateAssigned: z.boolean().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  totalAmount: z.number().positive(),
  installments: z.array(templateInstallmentSchema).min(1, 'At least one installment is required'),
});

// Validation schemas
const createCustomPaymentPlanSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  totalAmount: z.number().positive(),
  installments: z.array(templateInstallmentSchema).min(1, 'At least one installment is required'),
});

const updateCustomPaymentPlanSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  totalAmount: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  installments: z.array(templateInstallmentSchema).optional(),
});

function toInstallmentRows(installments: z.infer<typeof templateInstallmentSchema>[]) {
  return installments.map(inst => ({
    installment_number: inst.installmentNumber,
    due_date: inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate),
    amount: inst.amount,
    notes: inst.notes,
  }));
}

function validateInstallmentsSum(installments: z.infer<typeof templateInstallmentSchema>[], totalAmount: number) {
  const sum = installments.reduce((s, inst) => s + inst.amount, 0);
  if (Math.abs(sum - totalAmount) > 0.01) {
    throw new Error('Total amount must match the sum of all installments');
  }
}

export class CustomPaymentPlanService {
  /**
   * Get all custom payment plans with filters
   */
  static async getAll(filters: {
    studentId?: string;
    academicYearId?: string;
    isActive?: boolean;
    isTemplate?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const {
      studentId,
      academicYearId,
      isActive,
      isTemplate = false,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = { is_template: isTemplate };

    if (studentId) {
      where.student_id = studentId;
    }

    if (academicYearId) {
      where.academic_year_id = academicYearId;
    }

    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    const [plans, total] = await Promise.all([
      prisma.custom_payment_plans.findMany({
        where,
        include: planInclude,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.custom_payment_plans.count({ where }),
    ]);

    return {
      plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get custom payment plan by ID
   */
  static async getById(id: string) {
    return prisma.custom_payment_plans.findUnique({
      where: { id },
      include: planInclude,
    });
  }

  /**
   * Get custom payment plan for a student and academic year
   */
  static async getByStudentAndAcademicYear(studentId: string, academicYearId: string) {
    return prisma.custom_payment_plans.findUnique({
      where: {
        student_id_academic_year_id: {
          student_id: studentId,
          academic_year_id: academicYearId,
        },
      },
      include: planInclude,
    });
  }

  /**
   * Create a new custom payment plan for a student — installments are pure
   * time-based tranches (amount + due date), independent of payment types.
   */
  static async create(data: z.infer<typeof createCustomPaymentPlanSchema>, createdBy: string) {
    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) {
      throw new Error('Student not found');
    }

    const schoolClass = await prisma.schoolClass.findUnique({ where: { id: data.classId } });
    if (!schoolClass) {
      throw new Error('Class not found');
    }

    if (student.classId !== data.classId) {
      throw new Error('Student does not belong to the selected class');
    }

    const academicYear = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
    if (!academicYear) {
      throw new Error('Academic year not found');
    }

    const existingPlan = await prisma.custom_payment_plans.findUnique({
      where: {
        student_id_academic_year_id: {
          student_id: data.studentId,
          academic_year_id: data.academicYearId,
        },
      },
    });
    if (existingPlan) {
      throw new Error('A custom payment plan already exists for this student and academic year');
    }

    validateInstallmentsSum(data.installments, data.totalAmount);

    return prisma.custom_payment_plans.create({
      data: {
        student_id: data.studentId,
        class_id: data.classId,
        academic_year_id: data.academicYearId,
        name: data.name,
        description: data.description,
        total_amount: data.totalAmount,
        created_by: createdBy,
        custom_payment_plan_installments: { create: toInstallmentRows(data.installments) },
      },
      include: planInclude,
    });
  }

  /**
   * Update a custom payment plan
   */
  static async update(
    id: string,
    data: Partial<z.infer<typeof updateCustomPaymentPlanSchema>>,
    _updatedBy: string
  ) {
    const plan = await prisma.custom_payment_plans.findUnique({ where: { id } });
    if (!plan) {
      throw new Error('Custom payment plan not found');
    }

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    if (data.installments) {
      if (data.totalAmount !== undefined) {
        validateInstallmentsSum(data.installments, data.totalAmount);
        updateData.total_amount = data.totalAmount;
      }

      await prisma.custom_payment_plan_installments.deleteMany({
        where: { custom_payment_plan_id: id },
      });

      updateData.custom_payment_plan_installments = { create: toInstallmentRows(data.installments) };
    } else if (data.totalAmount !== undefined) {
      updateData.total_amount = data.totalAmount;
    }

    return prisma.custom_payment_plans.update({
      where: { id },
      data: updateData,
      include: planInclude,
    });
  }

  /**
   * Get the reusable payment-schedule template for a level/academic year/variant, if one exists
   */
  static async getLevelTemplate(level: string, academicYearId: string, isForStateAssigned = false) {
    return prisma.custom_payment_plans.findFirst({
      where: {
        level,
        academic_year_id: academicYearId,
        is_template: true,
        is_for_state_assigned: isForStateAssigned,
      },
      include: installmentInclude,
    });
  }

  /**
   * Create or replace the payment-schedule template for a level/academic year.
   * Tranches are pure time splits of the level's total fee, not tied to any
   * particular payment type — mirrors Odoo's account.payment.term. Shared by
   * every class of that level (see [[level-scoped billing config]]).
   */
  static async upsertLevelTemplate(
    data: z.infer<typeof upsertLevelTemplateSchema>,
    createdBy: string
  ) {
    const academicYear = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
    if (!academicYear) {
      throw new Error('Academic year not found');
    }

    validateInstallmentsSum(data.installments, data.totalAmount);

    const installmentRows = toInstallmentRows(data.installments);
    const isForStateAssigned = data.isForStateAssigned || false;
    const existing = await this.getLevelTemplate(data.level, data.academicYearId, isForStateAssigned);

    if (existing) {
      await prisma.custom_payment_plan_installments.deleteMany({
        where: { custom_payment_plan_id: existing.id },
      });

      return prisma.custom_payment_plans.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          description: data.description,
          total_amount: data.totalAmount,
          custom_payment_plan_installments: { create: installmentRows },
        },
        include: installmentInclude,
      });
    }

    return prisma.custom_payment_plans.create({
      data: {
        student_id: null,
        class_id: null,
        level: data.level,
        academic_year_id: data.academicYearId,
        is_template: true,
        is_for_state_assigned: isForStateAssigned,
        name: data.name,
        description: data.description,
        total_amount: data.totalAmount,
        created_by: createdBy,
        custom_payment_plan_installments: { create: installmentRows },
      },
      include: installmentInclude,
    });
  }

  /**
   * Clone the payment schedule for a student at enrollment time.
   *
   * Priority order (mirrors Odoo's payment-term resolution):
   *   1. Condition de paiement affectée à la classe (new system) — dates calculées
   *      dynamiquement à partir de `options.referenceDate` (date d'inscription).
   *   2. Échéancier modèle par niveau + année scolaire (legacy) — dates fixes.
   *   3. null → le caller crée un plan "paiement unique" (fallback).
   */
  static async cloneTemplateForStudent(
    studentId: string,
    classId: string,
    level: string,
    academicYearId: string,
    isForStateAssigned: boolean,
    createdBy: string | undefined,
    db: DbClient = prisma,
    options?: { totalAmount?: number; referenceDate?: Date }
  ) {
    // 1. Condition de paiement affectée à la classe
    const classRecord = await db.schoolClass.findUnique({
      where: { id: classId },
      include: {
        payment_condition: {
          include: { lines: { orderBy: { line_number: 'asc' } } },
        },
      },
    });

    const condition = classRecord?.payment_condition;
    if (condition?.is_active && condition.lines.length > 0) {
      const installments = PaymentConditionService.computeInstallments(condition.lines as any);
      const totalAmount = installments.reduce((s, inst) => s + inst.amount, 0);

      return db.custom_payment_plans.create({
        data: {
          student_id: studentId,
          class_id: classId,
          academic_year_id: academicYearId,
          is_for_state_assigned: isForStateAssigned,
          name: condition.name,
          description: condition.description,
          total_amount: totalAmount,
          created_by: createdBy,
          custom_payment_plan_installments: { create: installments },
        },
        include: installmentInclude,
      });
    }

    // 2. Échéancier modèle par niveau (comportement historique)
    const template = await db.custom_payment_plans.findFirst({
      where: {
        level,
        academic_year_id: academicYearId,
        is_template: true,
        is_for_state_assigned: isForStateAssigned,
      },
      include: { custom_payment_plan_installments: true },
    });

    if (!template || template.custom_payment_plan_installments.length === 0) {
      return null;
    }

    return db.custom_payment_plans.create({
      data: {
        student_id: studentId,
        class_id: classId,
        academic_year_id: academicYearId,
        is_for_state_assigned: isForStateAssigned,
        name: template.name,
        description: template.description,
        total_amount: template.total_amount,
        created_by: createdBy,
        custom_payment_plan_installments: {
          create: template.custom_payment_plan_installments.map(inst => ({
            installment_number: inst.installment_number,
            due_date: inst.due_date,
            amount: inst.amount,
            notes: inst.notes,
          })),
        },
      },
      include: installmentInclude,
    });
  }

  /**
   * Fallback plan for a class with no échéancier template: a single "pay in
   * full today" tranche — the native equivalent of Odoo's "Immediate Payment"
   * default payment term.
   */
  static async createFallbackPlan(
    studentId: string,
    classId: string,
    academicYearId: string,
    isForStateAssigned: boolean,
    totalAmount: number,
    createdBy: string | undefined,
    db: DbClient = prisma
  ) {
    return db.custom_payment_plans.create({
      data: {
        student_id: studentId,
        class_id: classId,
        academic_year_id: academicYearId,
        is_for_state_assigned: isForStateAssigned,
        name: 'Paiement unique',
        total_amount: totalAmount,
        created_by: createdBy,
        custom_payment_plan_installments: {
          create: [{ installment_number: 1, due_date: new Date(), amount: totalAmount }],
        },
      },
      include: installmentInclude,
    });
  }

  /**
   * Delete a custom payment plan
   */
  static async delete(id: string) {
    const plan = await prisma.custom_payment_plans.findUnique({ where: { id } });
    if (!plan) {
      throw new Error('Custom payment plan not found');
    }

    return prisma.custom_payment_plans.delete({ where: { id } });
  }
}

export { createCustomPaymentPlanSchema, updateCustomPaymentPlanSchema, upsertLevelTemplateSchema };
