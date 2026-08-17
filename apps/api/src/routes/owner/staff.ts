import { Router, type Response } from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate';
import {
  buildMeta,
  resolveYears,
  UnknownAcademicYearError,
  type OwnerMeta,
} from '../../services/owner/academic-year.helper';
import {
  getStaff,
  getStaffPayroll,
  getStaffWorkload,
  type StaffFilters,
} from '../../services/owner/staff.service';

/**
 * Enseignants & personnel — `/api/owner/staff/*`.
 *
 * Trois routes de coûts très différents : le corps enseignant se lit d'un
 * souffle, la charge horaire déroule tout l'emploi du temps, et la paie
 * traverse douze mois de bulletins. Les séparer évite de faire payer les trois
 * à qui n'en regarde qu'une.
 */
const router = Router();

const yearsQuery = {
  academicYearId: z.string().min(1, 'Année scolaire requise'),
  compareAcademicYearId: z.string().min(1).optional(),
};

const dateQuery = {
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ').optional(),
};

const staffSchema = z.object({
  query: z.object({
    ...yearsQuery,
    ...dateQuery,
    teacherId: z.string().min(1).optional(),
    level: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
  }),
});

const payrollSchema = z.object({ query: z.object({ ...yearsQuery, ...dateQuery }) });

function cacheHeaders(res: Response) {
  res.set('Cache-Control', 'private, max-age=60');
}

function handle(error: unknown, res: Response, next: (error?: unknown) => void) {
  if (error instanceof UnknownAcademicYearError) {
    res.status(404).json({ success: false, error: error.message });
    return;
  }
  next(error);
}

function filtersOf(query: Record<string, string | undefined>): StaffFilters {
  return {
    teacherId: query.teacherId,
    level: query.level,
    classId: query.classId,
    startDate: query.startDate,
    endDate: query.endDate,
  };
}

function markUnavailable(meta: OwnerMeta, domains: string[]) {
  for (const domain of domains) {
    if (!meta.unavailable.includes(domain)) meta.unavailable.push(domain);
  }
}

/** GET /api/owner/staff — `ENS-01`…`ENS-05`, `ENS-11`…`ENS-15`. */
router.get('/', validate(staffSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getStaff(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    if (!data.hasSource) markUnavailable(meta, ['teachers']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/staff/workload — `ENS-06`…`ENS-10`. */
router.get('/workload', validate(staffSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getStaffWorkload(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    // Sans bande cible déclarée, la surcharge n'est pas mesurable ; sans heures
    // déclarées, l'écart au prévu non plus. Les écrans de saisie de ces deux
    // domaines ne sont pas montés (§2.7).
    if (!data.hasTargets) markUnavailable(meta, ['teacher-remuneration']);
    if (!data.hasDeclaredHours) markUnavailable(meta, ['teacher-hours']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/staff/payroll — `ENS-16`…`ENS-25`. */
router.get('/payroll', validate(payrollSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([getStaffPayroll(resolved), buildMeta(resolved)]);

    if (!data.hasSource) markUnavailable(meta, ['payroll']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

export default router;
