import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@school/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { randomUUID } from 'crypto';
import { syncClassToOdoo } from '../services/odoo.service';
import { provisionClass } from '../services/primary/primary-class.service';
import {
  inferCycleFromLevel,
  isLevelKnown,
} from '../services/establishment.service';

/**
 * Synchronise (best-effort) une classe vers Odoo (Facturation > Classes &
 * Produits). N'importe quelle erreur (Odoo éteint, non configuré...) est
 * avalée : ça ne doit jamais faire échouer la création/mise à jour de la classe.
 */
async function syncClassToOdooSafe(id: string, name: string) {
  try {
    await syncClassToOdoo({ id, name });
  } catch (err) {
    console.warn(`Synchronisation Odoo de la classe ${id} échouée :`, (err as Error).message);
  }
}

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    level: z.string().min(1).optional(),
  }),
});

const updateClassSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
  }),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/school-classes
 * Get all classes with optional filters
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // `?cycle=PRIMAIRE|SECONDAIRE` restreint la liste à un cycle. Sans filtre,
    // toutes les classes remontent — c'est le comportement historique.
    const cycle = req.query.cycle as string | undefined;

    const classes = await prisma.schoolClass.findMany({
      where: cycle === 'PRIMAIRE' || cycle === 'SECONDAIRE' ? { cycle } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            students: true,
            classSubjects: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch classes',
    });
  }
});

/**
 * GET /api/school-classes/:id
 * Get class by ID with full details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const schoolClass = await prisma.schoolClass.findUnique({
      where: { id },
      include: {
        classSubjects: {
          include: {
            subjects: true,
          },
        },
        students: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
          orderBy: { lastName: 'asc' },
        },
        _count: {
          select: {
            students: true,
            classSubjects: true,
            schedules: true,
            attendances: true,
            inscriptions: true,
          },
        },
      },
    });

    if (!schoolClass) {
      return res.status(404).json({
        success: false,
        error: 'Classe non trouvée',
      });
    }

    res.json({
      success: true,
      data: schoolClass,
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class',
    });
  }
});

/**
 * POST /api/school-classes
 * Create new class (ADMIN only)
 */
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createClassSchema),
  async (req, res) => {
    try {
      const { name, level } = req.body;

      // Le niveau est validé contre le catalogue global (pas le type d'école) :
      // un « Groupe Scolaire » converti en LYCEE doit pouvoir créer des classes
      // CP1→CM2 pour son module primaire, et un PRIMAIRE des 6ème pour son module
      // secondaire. Le cycle est déduit du niveau lui-même, jamais de l'appelant.
      if (level && !isLevelKnown(level)) {
        return res.status(400).json({
          success: false,
          error: `Le niveau « ${level} » n'est pas reconnu dans le référentiel.`,
        });
      }

      const cycle = level ? inferCycleFromLevel(level) : undefined;

      // Check if class with same name exists
      // Le nom d'une classe n'est unique qu'au sein d'un établissement : deux
      // écoles peuvent chacune avoir leur « 6ème 1 ».
      const existing = await prisma.schoolClass.findFirst({
        where: { name },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Une classe avec ce nom existe déjà',
        });
      }

      const schoolClass = await prisma.schoolClass.create({
        data: {
          id: randomUUID(),
          name,
          level,
          cycle: cycle ?? 'SECONDAIRE',
        },
      });

      void syncClassToOdooSafe(schoolClass.id, schoolClass.name);

      // Une classe du primaire est utilisable dès sa création : son niveau
      // détermine la grille de matières, les barèmes, le diviseur et les seuils.
      // L'échec du provisionnement (niveau non reconnu, par exemple) ne doit pas
      // faire échouer la création — l'administration pourra le relancer.
      let provisioned = false;
      if (schoolClass.cycle === 'PRIMAIRE') {
        try {
          await provisionClass(schoolClass.id);
          provisioned = true;
        } catch (err) {
          console.warn(
            `Provisionnement primaire de la classe ${schoolClass.id} échoué :`,
            (err as Error).message,
          );
        }
      }

      res.status(201).json({
        success: true,
        data: { ...schoolClass, provisioned },
        message: 'Classe créée avec succès',
      });
    } catch (error: any) {
      console.error('Error creating class:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to create class',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * PATCH /api/school-classes/:id
 * Update class (ADMIN only)
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(updateClassSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const schoolClass = await prisma.schoolClass.update({
        where: { id },
        data: { name },
      });

      void syncClassToOdooSafe(schoolClass.id, schoolClass.name);

      res.json({
        success: true,
        data: schoolClass,
        message: 'Classe mise à jour avec succès',
      });
    } catch (error) {
      console.error('Error updating class:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update class',
      });
    }
  }
);

/**
 * DELETE /api/school-classes/:id
 * Delete class (ADMIN only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check dependencies
      const schoolClass = await prisma.schoolClass.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              students: true,
              classSubjects: true,
              schedules: true,
              attendances: true,
              inscriptions: true,
            },
          },
        },
      });

      if (!schoolClass) {
        return res.status(404).json({
          success: false,
          error: 'Classe non trouvée',
        });
      }

      const totalDeps =
        schoolClass._count.students +
        schoolClass._count.classSubjects +
        schoolClass._count.schedules +
        schoolClass._count.attendances +
        schoolClass._count.inscriptions;

      if (totalDeps > 0) {
        const depsDetails = [];
        if (schoolClass._count.students > 0) depsDetails.push(`${schoolClass._count.students} élève(s)`);
        if (schoolClass._count.classSubjects > 0) depsDetails.push(`${schoolClass._count.classSubjects} matière(s) affectée(s)`);
        if (schoolClass._count.schedules > 0) depsDetails.push(`${schoolClass._count.schedules} emploi(s) du temps`);
        if (schoolClass._count.attendances > 0) depsDetails.push(`${schoolClass._count.attendances} présence(s)`);
        if (schoolClass._count.inscriptions > 0) depsDetails.push(`${schoolClass._count.inscriptions} inscription(s)`);

        return res.status(400).json({
          success: false,
          error: `Impossible de supprimer la classe : ${depsDetails.join(', ')}`,
        });
      }

      await prisma.schoolClass.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Classe supprimée avec succès',
      });
    } catch (error: any) {
      console.error('Error deleting class:', error);
      
      // Handle Prisma foreign key constraint errors
      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: 'Impossible de supprimer la classe : elle est utilisée dans d\'autres enregistrements',
        });
      }
      
      // Handle record not found
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Classe non trouvée',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete class',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

export default router;
