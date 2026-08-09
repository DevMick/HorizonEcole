import { prisma } from '@school/database';
import { z } from 'zod';

const lineSchema = z.object({
  lineNumber: z.number().int().positive(),
  label: z.string().min(1).max(100),
  amount: z.number(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date YYYY-MM-DD requis'),
});

export const createPaymentConditionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

export const updatePaymentConditionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  lines: z.array(lineSchema).min(1).optional(),
});

const conditionInclude = {
  lines: { orderBy: { line_number: 'asc' as const } },
  classes: { select: { id: true, name: true, level: true } },
} as const;

export class PaymentConditionService {
  static async getAll() {
    return prisma.payment_conditions.findMany({
      include: conditionInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  static async getById(id: string) {
    return prisma.payment_conditions.findUnique({
      where: { id },
      include: conditionInclude,
    });
  }

  static async create(data: z.infer<typeof createPaymentConditionSchema>) {
    return prisma.payment_conditions.create({
      data: {
        name: data.name,
        description: data.description,
        lines: {
          create: data.lines.map(l => ({
            line_number: l.lineNumber,
            label: l.label,
            amount: l.amount,
            due_date: new Date(l.dueDate),
          })),
        },
      },
      include: conditionInclude,
    });
  }

  static async update(id: string, data: z.infer<typeof updatePaymentConditionSchema>) {
    const existing = await prisma.payment_conditions.findUnique({ where: { id } });
    if (!existing) throw new Error('Condition introuvable');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    if (data.lines) {
      await prisma.payment_condition_lines.deleteMany({ where: { payment_condition_id: id } });
      updateData.lines = {
        create: data.lines.map(l => ({
          line_number: l.lineNumber,
          label: l.label,
          amount: l.amount,
          due_date: new Date(l.dueDate),
        })),
      };
    }

    return prisma.payment_conditions.update({
      where: { id },
      data: updateData,
      include: conditionInclude,
    });
  }

  static async delete(id: string) {
    const existing = await prisma.payment_conditions.findUnique({ where: { id } });
    if (!existing) throw new Error('Condition introuvable');
    return prisma.payment_conditions.delete({ where: { id } });
  }

  /** Affecte cette condition à une liste de classes (remplace l'ancienne affectation). */
  static async assignToClasses(id: string, classIds: string[]) {
    const existing = await prisma.payment_conditions.findUnique({ where: { id } });
    if (!existing) throw new Error('Condition introuvable');

    await prisma.$transaction(async (tx) => {
      await tx.schoolClass.updateMany({
        where: { payment_condition_id: id },
        data: { payment_condition_id: null },
      });
      if (classIds.length > 0) {
        await tx.schoolClass.updateMany({
          where: { id: { in: classIds } },
          data: { payment_condition_id: id },
        });
      }
    });

    return this.getById(id);
  }

  /**
   * Génère les échéances à partir des lignes d'une condition de paiement.
   * Chaque ligne porte déjà son montant et sa date — pas de calcul nécessaire.
   */
  static computeInstallments(
    lines: Array<{ line_number: number; label: string; amount: any; due_date: any }>
  ) {
    return lines.map((line, idx) => ({
      installment_number: idx + 1,
      due_date: line.due_date instanceof Date ? line.due_date : new Date(line.due_date),
      amount: Number(line.amount) || 0,
      notes: line.label,
    }));
  }
}

export { createPaymentConditionSchema as default };
