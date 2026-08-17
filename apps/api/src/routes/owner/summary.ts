import { Router } from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate';
import {
  buildMeta,
  resolveYears,
  UnknownAcademicYearError,
} from '../../services/owner/academic-year.helper';
import { getSummary } from '../../services/owner/summary.service';

/**
 * Synthèse — `GET /api/owner/summary`.
 *
 * Les dix KPI de la page d'accueil et les points d'attention. La composition
 * dépend des modules actifs, que `buildMeta` a déjà résolus : la route les lui
 * demande avant de composer, plutôt que de relire l'établissement une seconde
 * fois.
 */
const router = Router();

const summarySchema = z.object({
  query: z.object({
    academicYearId: z.string().min(1, 'Année scolaire requise'),
    compareAcademicYearId: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
  }),
});

router.get('/', validate(summarySchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const meta = await buildMeta(resolved);
    const data = await getSummary(resolved, meta.modules, { classId: query.classId });

    res.set('Cache-Control', 'private, max-age=60');
    res.json({ success: true, data, meta });
  } catch (error) {
    if (error instanceof UnknownAcademicYearError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
});

export default router;
