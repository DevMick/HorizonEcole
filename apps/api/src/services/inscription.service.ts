import { randomUUID } from 'crypto';
import { prisma } from '@school/database';
import { InvoiceService } from './invoice.service';

const inscriptionInclude = {
  academicYear: {
    select: {
      id: true,
      name: true,
      startYear: true,
      endYear: true,
      isCurrent: true,
    },
  },
  class: {
    select: {
      id: true,
      name: true,
    },
  },
  student: {
    select: {
      id: true,
      studentNumber: true,
      firstName: true,
      lastName: true,
      gender: true,
      isStateAssigned: true,
    },
  },
} as const;

function transform(inscription: any) {
  return {
    id: inscription.id,
    academicYearId: inscription.academic_year_id,
    classId: inscription.class_id,
    studentId: inscription.student_id,
    academicYear: inscription.academicYear,
    class: inscription.class,
    student: inscription.student,
    createdAt: inscription.created_at,
    updatedAt: inscription.updated_at,
  };
}

export class InscriptionService {
  /**
   * Get all inscriptions with filters
   */
  static async getAll(filters?: { academicYearId?: string; classId?: string }) {
    const where: any = {};

    if (filters?.academicYearId) {
      where.academic_year_id = filters.academicYearId;
    }

    if (filters?.classId) {
      where.class_id = filters.classId;
    }

    const inscriptions = await prisma.inscriptions.findMany({
      where,
      include: inscriptionInclude,
      orderBy: { created_at: 'desc' },
    });

    return inscriptions.map(transform);
  }

  /**
   * Get inscription by ID
   */
  static async getById(id: string) {
    const inscription = await prisma.inscriptions.findUnique({
      where: { id },
      include: inscriptionInclude,
    });

    if (!inscription) return null;

    return transform(inscription);
  }

  /**
   * Create inscription linking an existing student to a class for an academic year
   */
  static async create(data: { academicYearId: string; classId: string; studentId: string; createdBy?: string }) {
    const [student, schoolClass, academicYear] = await Promise.all([
      prisma.student.findUnique({ where: { id: data.studentId } }),
      prisma.schoolClass.findUnique({ where: { id: data.classId } }),
      prisma.academicYear.findUnique({ where: { id: data.academicYearId } }),
    ]);

    if (!student) throw new Error('Élève introuvable');
    if (!schoolClass) throw new Error('Classe introuvable');
    if (!academicYear) throw new Error('Année scolaire introuvable');

    const existing = await prisma.inscriptions.findUnique({
      where: {
        student_id_academic_year_id: {
          student_id: data.studentId,
          academic_year_id: data.academicYearId,
        },
      },
    });

    if (existing) {
      throw new Error('Cet élève est déjà inscrit pour cette année scolaire');
    }

    const inscription = await prisma.$transaction(async (tx) => {
      const created = await tx.inscriptions.create({
        data: {
          id: randomUUID(),
          academic_year_id: data.academicYearId,
          class_id: data.classId,
          student_id: data.studentId,
        },
        include: inscriptionInclude,
      });

      // Keep the student's current class in sync with the latest inscription
      await tx.student.update({
        where: { id: data.studentId },
        data: { classId: data.classId },
      });

      // Facturation native : configuration de frais + échéancier de la classe
      // (voir InvoiceService). Best-effort — un tarif manquant pour la classe
      // ne doit jamais empêcher l'inscription elle-même ; aucune échéance
      // n'est marquée payée automatiquement, l'encaissement reste manuel.
      try {
        await InvoiceService.generateForInscription(
          {
            studentId: data.studentId,
            classId: data.classId,
            academicYearId: data.academicYearId,
            isStateAssigned: student.isStateAssigned,
            createdBy: data.createdBy,
          },
          tx
        );
      } catch (err) {
        console.warn(`Facturation native de l'inscription ${created.id} échouée :`, (err as Error).message);
      }

      return created;
    });

    return transform(inscription);
  }

  /**
   * Update inscription (change class and/or academic year)
   */
  static async update(id: string, data: { academicYearId?: string; classId?: string; studentId?: string }) {
    const updateData: any = { updated_at: new Date() };

    if (data.academicYearId !== undefined) updateData.academic_year_id = data.academicYearId;
    if (data.classId !== undefined) updateData.class_id = data.classId;
    if (data.studentId !== undefined) updateData.student_id = data.studentId;

    const inscription = await prisma.inscriptions.update({
      where: { id },
      data: updateData,
      include: inscriptionInclude,
    });

    if (updateData.class_id) {
      await prisma.student.update({
        where: { id: inscription.student_id },
        data: { classId: updateData.class_id },
      });
    }

    return transform(inscription);
  }

  /**
   * Delete inscription
   */
  static async delete(id: string) {
    return prisma.inscriptions.delete({ where: { id } });
  }

  /**
   * Get inscriptions statistics
   */
  static async getStatistics(academicYearId?: string) {
    const where = academicYearId ? { academic_year_id: academicYearId } : {};
    const total = await prisma.inscriptions.count({ where });
    return { total };
  }
}
