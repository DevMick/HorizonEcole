import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { assertEvaluationAccess, handleError } from './access';
import {
  getEntryGrid,
  saveGrades,
  setStudentAbsence,
} from '../../services/primary/primary-grade.service';

const router = Router();

const saveSchema = z.object({
  body: z.object({
    entries: z
      .array(
        z.object({
          studentId: z.string().min(1),
          subjectId: z.string().min(1),
          note: z.number().nonnegative().nullable().optional(),
          isAbsent: z.boolean().optional(),
        }),
      )
      .max(2000, 'Trop de notes envoyées en une fois'),
  }),
});

const absenceSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, "L'élève est obligatoire"),
    isAbsent: z.boolean(),
  }),
});

/**
 * GET /api/primary/grades/:evaluationId
 * Tableau de saisie : la grille figée, les élèves et les notes déjà entrées.
 */
router.get('/:evaluationId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await assertEvaluationAccess(req, req.params.evaluationId);
    const data = await getEntryGrid(req.params.evaluationId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * PUT /api/primary/grades/:evaluationId
 * Enregistre le tableau en une transaction : soit tout passe, soit rien.
 */
router.put(
  '/:evaluationId',
  authenticate,
  validate(saveSchema),
  async (req: AuthRequest, res, next) => {
    try {
      await assertEvaluationAccess(req, req.params.evaluationId);
      const data = await saveGrades(req.params.evaluationId, req.body.entries, req.user?.id);
      res.json({
        success: true,
        data,
        message: `${data.saved} note(s) enregistrée(s)`,
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },
);

/**
 * PUT /api/primary/grades/:evaluationId/absence
 * Marque un élève absent (ou de nouveau présent) sur toute la composition.
 */
router.put(
  '/:evaluationId/absence',
  authenticate,
  validate(absenceSchema),
  async (req: AuthRequest, res, next) => {
    try {
      await assertEvaluationAccess(req, req.params.evaluationId);
      const data = await setStudentAbsence(
        req.params.evaluationId,
        req.body.studentId,
        req.body.isAbsent,
        req.user?.id,
      );
      res.json({
        success: true,
        data,
        message: data.isAbsent ? 'Élève marqué absent' : 'Absence levée',
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },
);

export default router;
