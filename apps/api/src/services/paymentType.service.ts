import { randomUUID } from 'crypto';
import { prisma } from '@school/database';

export class PaymentTypeService {
  // Get all payment types for a level
  static async getAllPaymentTypes(level: string) {
    return prisma.payment_types.findMany({
      where: { level },
      orderBy: { name: 'asc' },
    });
  }

  // Get payment type by ID
  static async getPaymentTypeById(id: string) {
    return prisma.payment_types.findUnique({
      where: { id },
    });
  }

  // Create payment type for a level
  static async createPaymentType(data: { name: string; level: string }) {
    try {
      return await prisma.payment_types.create({
        data: {
          id: randomUUID(),
          name: data.name,
          level: data.level,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Un type de versement avec ce nom existe déjà pour ce niveau');
      }
      throw error;
    }
  }

  // Update payment type (name only — a type never changes level)
  static async updatePaymentType(id: string, data: { name: string }) {
    try {
      return await prisma.payment_types.update({
        where: { id },
        data: { name: data.name },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('Type de versement non trouvé');
      }
      if (error.code === 'P2002') {
        throw new Error('Un type de versement avec ce nom existe déjà pour ce niveau');
      }
      throw error;
    }
  }

  // Delete payment type
  static async deletePaymentType(id: string) {
    try {
      return await prisma.payment_types.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('Type de versement non trouvé');
      }
      throw error;
    }
  }

  // Check if payment type exists by name within a level
  static async existsByName(name: string, level: string, excludeId?: string): Promise<boolean> {
    const count = await prisma.payment_types.count({
      where: {
        name,
        level,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }
}
