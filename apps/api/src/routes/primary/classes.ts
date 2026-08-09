import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { adminOnly, assertClassAccess, handleError } from './access';
import {
  createPrimaryClass,
  deletePrimaryClass,
  getClassGrid,
  getClassStudents,
  getTeacherClasses,
  listClasses,
  provisionClass,
  setMainTeacher,
  updateClassGrid,
} from '../../services/primary/primary-class.service';
import {
  PRIMARY_LEVELS,
  PRIMARY_PROFILES,
} from '../../services/primary/class-profiles';

const router = Router();

const createClassSchema = z.object({
  body: z.object({
    level: z.enum(['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'], {
      errorMap: () => ({ message: 'Niveau invalide : attendu CP1, CP2, CE1, CE2, CM1 ou CM2' }),
    }),
  }),
});

const updateGridSchema = z.object({
  body: z.object({
    subjects: z
      .array(
        z.object({
          subjectId: z.string().min(1, 'La matière est obligatoire'),
          maxScore: z.number().int().positive('Le barème doit être un entier positif'),
          sortOrder: z.number().int().nonnegative().optional(),
        }),
      )
      .min(1, 'La grille doit comporter au moins une matière'),
    averageScale: z
      .number()
      .refine((value) => value === 10 || value === 20, {
        message: "L'échelle de la moyenne doit être 10 ou 20",
      })
      .optional(),
    moyenneAdmission: z.number().nonnegative().optional(),
    moyenneRedoublement: z.number().nonnegative().optional(),
  }),
});

const mainTeacherSchema = z.object({
  body: z.object({
    academicYearId: z.string().min(1, "L'année académique est obligatoire"),
    teacherId: z.string().min(1).nullable(),
  }),
});

/**
 * GET /api/primary/classes/levels
 * Référentiel des niveaux du primaire — alimente le générateur de classes et
 * les formulaires côté web, qui n'ont ainsi pas à dupliquer les barèmes.
 */
router.get('/levels', authenticate, (_req, res) => {
  res.json({
    success: true,
    data: PRIMARY_LEVELS.map((level) => {
      const profile = PRIMARY_PROFILES[level];
      const totalMaxScore = profile.subjects.reduce((sum, subject) => sum + subject.maxScore, 0);

      return {
        level: profile.level,
        label: profile.label,
        scale: profile.scale,
        divisor: Math.round((totalMaxScore / profile.scale) * 100) / 100,
        totalMaxScore,
        thresholds: profile.thresholds,
        evaluations: profile.evaluations,
        subjects: profile.subjects.map((subject) => ({
          code: subject.code,
          label: subject.label,
          maxScore: subject.maxScore,
          order: subject.order,
        })),
      };
    }),
  });
});

/**
 * GET /api/primary/classes/me
 * Classes du primaire dont l'utilisateur connecté est titulaire.
 */
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { academicYearId } = req.query;
    const data = await getTeacherClasses(req.user!.id, academicYearId as string | undefined);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * POST /api/primary/classes
 * Crée une nouvelle classe du primaire pour le niveau donné.
 * Si une classe sans suffixe existe déjà (« CP1 »), elle est renommée en
 * « CP1 A » et la nouvelle prend « CP1 B » ; les suivantes continuent en C, D…
 */
router.post('/', authenticate, adminOnly, validate(createClassSchema), async (req, res, next) => {
  try {
    const data = await createPrimaryClass(req.body.level);
    res.status(201).json({ success: true, data, message: 'Classe créée' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/classes
 * Toutes les classes du primaire, avec effectif, grille et titulaire.
 *
 * Réservé à l'administration : un enseignant n'a pas à connaître les effectifs
 * ni les titulaires des autres classes. La sienne lui vient de `/me`.
 */
router.get('/', authenticate, adminOnly, async (req, res, next) => {
  try {
    const { academicYearId } = req.query;
    const data = await listClasses({ academicYearId: academicYearId as string | undefined });
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/classes/:id/grid
 * Grille de la classe : matières, barèmes, diviseur et seuils.
 */
router.get('/:id/grid', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await assertClassAccess(req, req.params.id);
    const data = await getClassGrid(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/classes/:id/students
 * Élèves inscrits, dans l'ordre des documents officiels.
 */
router.get('/:id/students', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await assertClassAccess(req, req.params.id);
    const data = await getClassStudents(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * POST /api/primary/classes/:id/provision
 * Installe la grille du niveau sur la classe. Idempotent : ne complète que ce
 * qui manque, sans écraser les barèmes déjà ajustés.
 */
router.post('/:id/provision', authenticate, adminOnly, async (req, res, next) => {
  try {
    const data = await provisionClass(req.params.id);
    res.json({ success: true, data, message: 'Grille de la classe installée' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * PUT /api/primary/classes/:id/grid
 * Remplace la grille et les seuils. Le diviseur est recalculé, jamais saisi.
 */
router.put('/:id/grid', authenticate, adminOnly, validate(updateGridSchema), async (req, res, next) => {
  try {
    const data = await updateClassGrid(req.params.id, req.body);
    res.json({ success: true, data, message: 'Grille mise à jour' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * DELETE /api/primary/classes/:id
 * Supprime une classe supplémentaire (suffixe A, B, C…).
 * Si une seule classe subsiste au même niveau, elle est renommée vers le nom
 * de base (« CP1 A » → « CP1 »). La classe de base sans suffixe est protégée.
 */
router.delete('/:id', authenticate, adminOnly, async (req, res, next) => {
  try {
    const data = await deletePrimaryClass(req.params.id);
    res.json({ success: true, data, message: 'Classe supprimée' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * PUT /api/primary/classes/:id/main-teacher
 * Désigne (ou retire) le titulaire de la classe pour une année.
 */
router.put(
  '/:id/main-teacher',
  authenticate,
  adminOnly,
  validate(mainTeacherSchema),
  async (req, res, next) => {
    try {
      const { academicYearId, teacherId } = req.body;
      await setMainTeacher(req.params.id, academicYearId, teacherId);
      res.json({
        success: true,
        message: teacherId ? 'Titulaire enregistré' : 'Titulaire retiré',
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },
);

export default router;
