import { Router, type Response } from 'express';
import { z } from 'zod';

import { AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  buildMeta,
  resolveYears,
  UnknownAcademicYearError,
} from '../../services/owner/academic-year.helper';
import {
  getEnrollment,
  getEnrollmentTimeline,
  listActiveClasses,
  type EnrollmentFilters,
} from '../../services/owner/enrollment.service';

/**
 * Effectifs & scolarité — `GET /api/owner/enrollment` et `/enrollment/timeline`.
 *
 * Ce routeur est monté **sous** `routes/owner/index.ts` : il hérite donc de
 * `authenticate`, de `requireRole(OWNER)` et du refus des méthodes d'écriture,
 * et ne redéclare aucun middleware. Un seul point d'entrée ouvre le contexte
 * d'établissement, c'est ce qui rend l'oubli impossible.
 */
const router = Router();

/** Filtres globaux communs à toutes les routes d'agrégat (§4.0). */
const yearsQuery = {
  academicYearId: z.string().min(1, 'Année scolaire requise'),
  compareAcademicYearId: z.string().min(1).optional(),
};

const enrollmentSchema = z.object({
  query: z.object({
    ...yearsQuery,
    level: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    cycle: z.enum(['PRIMAIRE', 'SECONDAIRE']).optional(),
    gender: z.string().min(1).optional(),
  }),
});

const timelineSchema = z.object({
  query: z.object({
    ...yearsQuery,
    years: z.coerce.number().int().min(1).max(10).default(5),
  }),
});

/**
 * Le référentiel des classes ne dépend que de l'année observée : y admettre
 * `compareAcademicYearId` laisserait croire que la liste couvre les deux, alors
 * qu'une classe fermée entre-temps n'a pas à être proposée.
 */
const classesSchema = z.object({
  query: z.object({
    academicYearId: z.string().min(1, 'Année scolaire requise'),
  }),
});

/** L'agrégat est propre à un établissement : `private` n'est pas négociable. */
function cacheHeaders(res: Response) {
  res.set('Cache-Control', 'private, max-age=60');
}

/**
 * GET /api/owner/enrollment
 * `EFF-01` → `EFF-13`, `EFF-15` → `EFF-18`.
 */
router.get('/', validate(enrollmentSchema), async (req: AuthRequest, res, next) => {
  try {
    const { academicYearId, compareAcademicYearId, level, classId, cycle, gender } =
      req.query as Record<string, string | undefined>;

    const resolved = await resolveYears(academicYearId!, compareAcademicYearId);
    const filters: EnrollmentFilters = {
      level,
      classId,
      cycle: cycle as EnrollmentFilters['cycle'],
      gender,
    };

    const [data, meta] = await Promise.all([
      getEnrollment(resolved, filters),
      buildMeta(resolved),
    ]);

    // La capacité n'est pas une donnée manquante par accident : tant qu'aucune
    // classe ne la porte, l'écran doit le dire, pas afficher un taux de 0 %.
    if (!data.occupancy.capacityKnown) meta.unavailable.push('capacity');

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    if (error instanceof UnknownAcademicYearError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/owner/enrollment/classes
 *
 * Classes actives de l'année — alimente le sélecteur de classe du topbar.
 */
router.get('/classes', validate(classesSchema), async (req: AuthRequest, res, next) => {
  try {
    const { academicYearId } = req.query as Record<string, string | undefined>;

    // `resolveYears` valide que l'année appartient bien à l'établissement : sans
    // lui, un identifiant inconnu renverrait une liste vide, indiscernable d'une
    // année sans aucune inscription.
    const resolved = await resolveYears(academicYearId!);

    const [data, meta] = await Promise.all([
      listActiveClasses(resolved.year.id),
      buildMeta(resolved),
    ]);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    if (error instanceof UnknownAcademicYearError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/owner/enrollment/timeline
 * `EFF-14` — série pluriannuelle des effectifs et des nouveaux élèves.
 */
router.get('/timeline', validate(timelineSchema), async (req: AuthRequest, res, next) => {
  try {
    const { academicYearId, compareAcademicYearId } = req.query as Record<string, string | undefined>;
    const years = Number(req.query.years ?? 5);

    const resolved = await resolveYears(academicYearId!, compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getEnrollmentTimeline(resolved, years),
      buildMeta(resolved),
    ]);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    if (error instanceof UnknownAcademicYearError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
});

export default router;
