import { Router, type Response } from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate';
import {
  buildMeta,
  resolveYears,
  UnknownAcademicYearError,
} from '../../services/owner/academic-year.helper';
import {
  getSecondaryResults,
  getSecondaryTimeline,
  type SecondaryFilters,
} from '../../services/owner/results-secondary.service';
import {
  getPrimaryResults,
  getPrimaryTimeline,
  type PrimaryFilters,
} from '../../services/owner/results-primary.service';

/**
 * Résultats pédagogiques — `/api/owner/results/*`.
 *
 * Deux cycles, deux routes, deux services : le primaire et le secondaire ne
 * partagent ni leur modèle de notes ni leur calcul de moyenne. Les fusionner
 * derrière une route unique obligerait à un aiguillage interne, et ferait
 * cohabiter dans une même réponse des grandeurs qui ne se comparent pas.
 *
 * Monté sous `routes/owner/index.ts` : authentification, verrou de rôle et
 * refus des écritures sont hérités, jamais redéclarés.
 */
const router = Router();

const yearsQuery = {
  academicYearId: z.string().min(1, 'Année scolaire requise'),
  compareAcademicYearId: z.string().min(1).optional(),
};

const secondarySchema = z.object({
  query: z.object({
    ...yearsQuery,
    semesterId: z.string().min(1).optional(),
    level: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    subjectId: z.string().min(1).optional(),
  }),
});

const primarySchema = z.object({
  query: z.object({
    ...yearsQuery,
    level: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    evaluationId: z.string().min(1).optional(),
  }),
});

const timelineSchema = z.object({
  query: z.object({
    ...yearsQuery,
    level: z.string().min(1).optional(),
    years: z.coerce.number().int().min(1).max(10).default(5),
  }),
});

function cacheHeaders(res: Response) {
  res.set('Cache-Control', 'private, max-age=60');
}

/** Une année inconnue — y compris celle d'une autre école — vaut `404`. */
function handle(error: unknown, res: Response, next: (error?: unknown) => void) {
  if (error instanceof UnknownAcademicYearError) {
    res.status(404).json({ success: false, error: error.message });
    return;
  }
  next(error);
}

/**
 * GET /api/owner/results/secondary
 * `SEC-01` → `SEC-17`, `SEC-19` → `SEC-21`.
 */
router.get('/secondary', validate(secondarySchema), async (req, res, next) => {
  try {
    const { academicYearId, compareAcademicYearId, semesterId, level, classId, subjectId } =
      req.query as Record<string, string | undefined>;

    const resolved = await resolveYears(academicYearId!, compareAcademicYearId);
    const filters: SecondaryFilters = { semesterId, level, classId, subjectId };

    const [data, meta] = await Promise.all([
      getSecondaryResults(resolved, filters),
      buildMeta(resolved),
    ]);

    // Un module inactif n'est pas un module vide : l'écran doit pouvoir le dire.
    if (!meta.modules.secondary) meta.unavailable.push('secondary');

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/results/secondary/timeline — `SEC-18`. */
router.get('/secondary/timeline', validate(timelineSchema), async (req, res, next) => {
  try {
    const { academicYearId, compareAcademicYearId, level } = req.query as Record<
      string,
      string | undefined
    >;
    const years = Number(req.query.years ?? 5);

    const resolved = await resolveYears(academicYearId!, compareAcademicYearId);
    const [data, meta] = await Promise.all([
      getSecondaryTimeline(resolved, years, { level }),
      buildMeta(resolved),
    ]);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/**
 * GET /api/owner/results/primary
 * `PRI-01` → `PRI-15`, `PRI-17` → `PRI-20`.
 */
router.get('/primary', validate(primarySchema), async (req, res, next) => {
  try {
    const { academicYearId, compareAcademicYearId, level, classId, evaluationId } =
      req.query as Record<string, string | undefined>;

    const resolved = await resolveYears(academicYearId!, compareAcademicYearId);
    const filters: PrimaryFilters = { level, classId, evaluationId };

    const [data, meta] = await Promise.all([
      getPrimaryResults(resolved, filters),
      buildMeta(resolved),
    ]);

    if (!meta.modules.primary) meta.unavailable.push('primary');

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/results/primary/timeline — `PRI-16`. */
router.get('/primary/timeline', validate(timelineSchema), async (req, res, next) => {
  try {
    const { academicYearId, compareAcademicYearId, level } = req.query as Record<
      string,
      string | undefined
    >;
    const years = Number(req.query.years ?? 5);

    const resolved = await resolveYears(academicYearId!, compareAcademicYearId);
    const [data, meta] = await Promise.all([
      getPrimaryTimeline(resolved, years, { level }),
      buildMeta(resolved),
    ]);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

export default router;
