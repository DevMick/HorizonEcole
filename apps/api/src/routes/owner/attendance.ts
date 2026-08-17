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
  getAttendance,
  getAttendanceConduct,
  getAttendanceSessions,
  getTeacherAbsences,
  type AttendanceFilters,
} from '../../services/owner/attendance.service';

/**
 * Assiduité & vie scolaire — `/api/owner/attendance/*`.
 *
 * Ce domaine n'existe que si le module secondaire est actif : l'appel par
 * séance est un mécanisme du secondaire, et une école primaire pure n'a ni
 * séances ni notes de conduite. Les routes répondent alors avec des agrégats
 * vides et signalent `secondary` dans `meta.unavailable`, plutôt que de
 * prétendre à une assiduité de 0 %.
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

const attendanceSchema = z.object({
  query: z.object({
    ...yearsQuery,
    ...dateQuery,
    level: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    subjectId: z.string().min(1).optional(),
    semesterId: z.string().min(1).optional(),
  }),
});

const sessionsSchema = z.object({
  query: z.object({
    ...yearsQuery,
    ...dateQuery,
    level: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    subjectId: z.string().min(1).optional(),
    semesterId: z.string().min(1).optional(),
    teacherId: z.string().min(1).optional(),
  }),
});

const conductSchema = z.object({
  query: z.object({
    ...yearsQuery,
    ...dateQuery,
    level: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    semesterId: z.string().min(1).optional(),
  }),
});

const teachersSchema = z.object({
  query: z.object({
    ...yearsQuery,
    ...dateQuery,
    teacherId: z.string().min(1).optional(),
  }),
});

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

function filtersOf(query: Record<string, string | undefined>): AttendanceFilters {
  return {
    level: query.level,
    classId: query.classId,
    subjectId: query.subjectId,
    semesterId: query.semesterId,
    teacherId: query.teacherId,
    startDate: query.startDate,
    endDate: query.endDate,
  };
}

function markUnavailable(meta: OwnerMeta, domains: string[]) {
  for (const domain of domains) {
    if (!meta.unavailable.includes(domain)) meta.unavailable.push(domain);
  }
}

/** GET /api/owner/attendance — `ASS-01`…`ASS-06`, `ASS-12`. */
router.get('/', validate(attendanceSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getAttendance(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    if (!meta.modules.secondary) markUnavailable(meta, ['secondary']);
    else if (!data.hasSource) markUnavailable(meta, ['attendance']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/attendance/sessions — `ASS-07`…`ASS-11`. */
router.get('/sessions', validate(sessionsSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getAttendanceSessions(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    if (!meta.modules.secondary) markUnavailable(meta, ['secondary']);
    else if (!data.hasSource) markUnavailable(meta, ['sessions']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/attendance/conduct — `ASS-15`…`ASS-20`. */
router.get('/conduct', validate(conductSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getAttendanceConduct(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    if (!meta.modules.secondary) markUnavailable(meta, ['secondary']);
    else if (!data.hasSource) markUnavailable(meta, ['conduct']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/attendance/teachers — `ASS-13`, `ASS-14`. */
router.get('/teachers', validate(teachersSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getTeacherAbsences(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    // L'écran de saisie des absences enseignants n'est pas monté (§2.7) : la
    // table peut rester vide en production, ce que l'état vide doit dire.
    if (!data.hasSource) markUnavailable(meta, ['teacher-absences']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

export default router;
