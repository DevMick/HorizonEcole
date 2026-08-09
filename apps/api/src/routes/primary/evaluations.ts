import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { adminOnly, assertEvaluationAccess, handleError } from './access';
import * as evaluations from '../../services/primary/primary-evaluation.service';

const router = Router();

const dateField = z
  .string()
  .or(z.date())
  .transform((value) => (typeof value === 'string' ? new Date(value) : value))
  .refine((value) => !Number.isNaN(value.getTime()), { message: 'Date invalide' });

const createSchema = z.object({
  body: z.object({
    academicYearId: z.string().min(1, "L'année académique est obligatoire"),
    classId: z.string().min(1, 'La classe est obligatoire'),
    name: z.string().min(1, 'Le nom est obligatoire').max(120),
    date: dateField,
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});

const provisionSchema = z.object({
  body: z.object({
    academicYearId: z.string().min(1, "L'année académique est obligatoire"),
    classId: z.string().min(1, 'La classe est obligatoire'),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    date: dateField.optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    isLocked: z.boolean().optional(),
  }),
});

/**
 * GET /api/primary/evaluations?academicYearId=…&classId=…
 * Compositions d'une classe (ou de tout le primaire) pour une année.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { academicYearId, classId } = req.query;

    if (!academicYearId) {
      return res.status(400).json({
        success: false,
        error: "Le paramètre academicYearId est obligatoire",
      });
    }

    const data = await evaluations.list({
      academicYearId: academicYearId as string,
      classId: classId as string | undefined,
    });
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/evaluations/:id
 * Composition détaillée, avec la grille figée à sa création.
 */
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await assertEvaluationAccess(req, req.params.id);
    const data = await evaluations.getById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * POST /api/primary/evaluations
 * Crée une composition et fige sa grille.
 */
router.post('/', authenticate, adminOnly, validate(createSchema), async (req, res, next) => {
  try {
    const data = await evaluations.create(req.body);
    res.status(201).json({ success: true, data, message: 'Composition créée' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * POST /api/primary/evaluations/provision
 * Crée d'un coup les compositions prévues par le niveau (compositions 1 à 3 et
 * composition de passage, ou les deux examens blancs au CM2).
 */
router.post(
  '/provision',
  authenticate,
  adminOnly,
  validate(provisionSchema),
  async (req, res, next) => {
    try {
      const { classId, academicYearId } = req.body;
      const data = await evaluations.provisionDefaults(classId, academicYearId);
      res.json({ success: true, data, message: 'Compositions de l’année créées' });
    } catch (error) {
      handleError(error, res, next);
    }
  },
);

/**
 * PATCH /api/primary/evaluations/:id
 * Intitulé, date, ordre ou verrouillage de la saisie.
 */
router.patch('/:id', authenticate, adminOnly, validate(updateSchema), async (req, res, next) => {
  try {
    const data = await evaluations.update(req.params.id, req.body);
    res.json({ success: true, data, message: 'Composition mise à jour' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * POST /api/primary/evaluations/:id/resync
 * Réaligne la grille de la composition sur celle de la classe — refusé dès
 * qu'une note existe, pour ne pas changer le sens des notes déjà saisies.
 */
router.post('/:id/resync', authenticate, adminOnly, async (req, res, next) => {
  try {
    const data = await evaluations.resyncGrid(req.params.id);
    res.json({ success: true, data, message: 'Grille réalignée sur celle de la classe' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * POST /api/primary/evaluations/:id/publish
 * Publie les résultats : c'est ce geste qui les rend visibles aux familles.
 */
router.post('/:id/publish', authenticate, adminOnly, async (req: AuthRequest, res, next) => {
  try {
    const data = await evaluations.publish(req.params.id, req.user?.id);
    res.json({ success: true, data, message: 'Résultats publiés' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * DELETE /api/primary/evaluations/:id/publish
 * Retire la publication.
 */
router.delete('/:id/publish', authenticate, adminOnly, async (req, res, next) => {
  try {
    const data = await evaluations.unpublish(req.params.id);
    res.json({ success: true, data, message: 'Publication retirée' });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * DELETE /api/primary/evaluations/:id
 * Supprime la composition et, en cascade, ses notes.
 */
router.delete('/:id', authenticate, adminOnly, async (req, res, next) => {
  try {
    const data = await evaluations.remove(req.params.id);
    res.json({ success: true, data, message: 'Composition supprimée' });
  } catch (error) {
    handleError(error, res, next);
  }
});

export default router;
