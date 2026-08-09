import { randomUUID } from 'crypto';
import { prisma } from '@school/database';

export class SchoolFeeRateService {
  private async validatePaymentTypesBelongToLevel(paymentTypeIds: string[], level: string) {
    const count = await prisma.payment_types.count({
      where: { id: { in: paymentTypeIds }, level },
    });
    if (count !== new Set(paymentTypeIds).size) {
      throw new Error('One or more payment types do not belong to this level');
    }
  }

  async getAll(filters?: { level?: string }) {
    const where: any = {};

    if (filters?.level) {
      where.level = filters.level;
    }

    const rates = await prisma.school_fee_rates.findMany({
      where,
      include: {
        school_fee_rate_details: {
          include: {
            payment_types: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
      orderBy: {
        level: 'asc',
      },
    });

    // Transform data to match frontend expectations
    return rates.map(rate => ({
      id: rate.id,
      level: rate.level,
      details: rate.school_fee_rate_details?.map((detail: any) => ({
        id: detail.id,
        paymentTypeId: detail.payment_type_id,
        amount: detail.amount,
        paymentType: detail.payment_types,
        createdAt: detail.created_at,
        updatedAt: detail.updated_at,
      })) || [],
      totalAmount: rate.total_amount,
      isForStateAssigned: rate.is_for_state_assigned,
      createdAt: rate.created_at,
      updatedAt: rate.updated_at,
    }));
  }

  async getById(id: string) {
    const rate = await prisma.school_fee_rates.findUnique({
      where: { id },
      include: {
        school_fee_rate_details: {
          include: {
            payment_types: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    if (!rate) return null;

    // Transform data to match frontend expectations
    return {
      id: rate.id,
      level: rate.level,
      details: rate.school_fee_rate_details?.map((detail: any) => ({
        id: detail.id,
        paymentTypeId: detail.payment_type_id,
        amount: detail.amount,
        paymentType: detail.payment_types,
        createdAt: detail.created_at,
        updatedAt: detail.updated_at,
      })) || [],
      totalAmount: rate.total_amount,
      isForStateAssigned: rate.is_for_state_assigned,
      createdAt: rate.created_at,
      updatedAt: rate.updated_at,
    };
  }

  async create(data: {
    level: string;
    isForStateAssigned?: boolean;
    details: Array<{
      paymentTypeId: string;
      amount: number;
    }>;
  }) {
    await this.validatePaymentTypesBelongToLevel(data.details.map(d => d.paymentTypeId), data.level);

    // Calculate total
    const totalAmount = data.details.reduce((sum, detail) => sum + detail.amount, 0);

    const rate = await prisma.school_fee_rates.create({
      data: {
        id: randomUUID(),
        level: data.level,
        total_amount: totalAmount,
        is_for_state_assigned: data.isForStateAssigned || false,
        school_fee_rate_details: {
          create: data.details.map(detail => ({
            id: randomUUID(),
            payment_type_id: detail.paymentTypeId,
            amount: detail.amount,
          })),
        },
      },
      include: {
        school_fee_rate_details: {
          include: {
            payment_types: true,
          },
        },
      },
    });

    // Transform data to match frontend expectations
    return {
      id: rate.id,
      level: rate.level,
      details: rate.school_fee_rate_details?.map((detail: any) => ({
        id: detail.id,
        paymentTypeId: detail.payment_type_id,
        amount: detail.amount,
        paymentType: detail.payment_types,
        createdAt: detail.created_at,
        updatedAt: detail.updated_at,
      })) || [],
      totalAmount: rate.total_amount,
      isForStateAssigned: rate.is_for_state_assigned,
      createdAt: rate.created_at,
      updatedAt: rate.updated_at,
    };
  }

  async update(
    id: string,
    data: {
      level?: string;
      isForStateAssigned?: boolean;
      details?: Array<{
        paymentTypeId: string;
        amount: number;
      }>;
    }
  ) {
    // If details are being updated, calculate new total
    let totalAmount;
    if (data.details) {
      const existingRate = await prisma.school_fee_rates.findUnique({ where: { id } });
      const level = data.level ?? existingRate?.level;
      if (level) {
        await this.validatePaymentTypesBelongToLevel(data.details.map(d => d.paymentTypeId), level);
      }
      totalAmount = data.details.reduce((sum, detail) => sum + detail.amount, 0);
    }

    // Delete existing details if new ones are provided
    if (data.details) {
      await prisma.school_fee_rate_details.deleteMany({
        where: { school_fee_rate_id: id },
      });
    }

    const rate = await prisma.school_fee_rates.update({
      where: { id },
      data: {
        ...(data.level && { level: data.level }),
        ...(data.isForStateAssigned !== undefined && { is_for_state_assigned: data.isForStateAssigned }),
        ...(totalAmount !== undefined && { total_amount: totalAmount }),
        ...(data.details && {
          school_fee_rate_details: {
            create: data.details.map(detail => ({
              id: randomUUID(),
              payment_type_id: detail.paymentTypeId,
              amount: detail.amount,
            })),
          },
        }),
      },
      include: {
        school_fee_rate_details: {
          include: {
            payment_types: true,
          },
        },
      },
    });

    // Transform data to match frontend expectations
    return {
      id: rate.id,
      level: rate.level,
      details: rate.school_fee_rate_details?.map((detail: any) => ({
        id: detail.id,
        paymentTypeId: detail.payment_type_id,
        amount: detail.amount,
        paymentType: detail.payment_types,
        createdAt: detail.created_at,
        updatedAt: detail.updated_at,
      })) || [],
      totalAmount: rate.total_amount,
      isForStateAssigned: rate.is_for_state_assigned,
      createdAt: rate.created_at,
      updatedAt: rate.updated_at,
    };
  }

  async delete(id: string) {
    // Delete details first (cascade should handle this, but being explicit)
    await prisma.school_fee_rate_details.deleteMany({
      where: { school_fee_rate_id: id },
    });

    return prisma.school_fee_rates.delete({
      where: { id },
    });
  }

  async getByLevel(level: string) {
    const rates = await prisma.school_fee_rates.findMany({
      where: { level },
      include: {
        school_fee_rate_details: {
          include: {
            payment_types: true,
          },
        },
      },
    });

    // Transform data to match frontend expectations
    return rates.map(rate => ({
      id: rate.id,
      level: rate.level,
      details: rate.school_fee_rate_details?.map((detail: any) => ({
        id: detail.id,
        paymentTypeId: detail.payment_type_id,
        amount: detail.amount,
        paymentType: detail.payment_types,
        createdAt: detail.created_at,
        updatedAt: detail.updated_at,
      })) || [],
      totalAmount: rate.total_amount,
      isForStateAssigned: rate.is_for_state_assigned,
      createdAt: rate.created_at,
      updatedAt: rate.updated_at,
    }));
  }

  async getCurrentAcademicYear() {
    return prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });
  }
}

export default new SchoolFeeRateService();
