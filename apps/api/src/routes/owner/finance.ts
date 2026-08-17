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
  getFinanceCollection,
  getFinanceDebtors,
  getFinanceExpenses,
  getFinanceOverview,
  getFinanceSeasonality,
  getFinanceTimeline,
  getRevenueBreakdown,
  type FinanceFilters,
} from '../../services/owner/finance.service';

/**
 * Finance — `/api/owner/finance/*`.
 *
 * Sept routes plutôt qu'une seule : les écrans financiers ne se consultent pas
 * d'un bloc, et une route unique ferait payer le calcul des dépenses à qui ne
 * regarde que le recouvrement. Chacune porte son propre coût, son propre cache
 * et son propre état vide.
 *
 * Monté sous `routes/owner/index.ts` : authentification, verrou de rôle et
 * refus des écritures sont hérités.
 */
const router = Router();

const yearsQuery = {
  academicYearId: z.string().min(1, 'Année scolaire requise'),
  compareAcademicYearId: z.string().min(1).optional(),
};

const scopedSchema = z.object({
  query: z.object({
    ...yearsQuery,
    level: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    paymentTypeId: z.string().min(1).optional(),
  }),
});

const yearOnlySchema = z.object({ query: z.object(yearsQuery) });

const timelineSchema = z.object({
  query: z.object({
    ...yearsQuery,
    years: z.coerce.number().int().min(1).max(10).default(5),
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

function filtersOf(query: Record<string, string | undefined>): FinanceFilters {
  return { level: query.level, classId: query.classId, paymentTypeId: query.paymentTypeId };
}

/** Signale les domaines sans donnée, pour que l'écran montre un état vide (critère 5.8). */
function markUnavailable(meta: OwnerMeta, domains: string[]) {
  for (const domain of domains) {
    if (!meta.unavailable.includes(domain)) meta.unavailable.push(domain);
  }
}

/** GET /api/owner/finance/overview — `FIN-01`…`FIN-06`, `FIN-25`, `FIN-26`, `FIN-37`. */
router.get('/overview', validate(scopedSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getFinanceOverview(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    if (data.invoiced.value === null) markUnavailable(meta, ['invoices']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/finance/collection — `FIN-07`…`FIN-10`, `FIN-17`. */
router.get('/collection', validate(scopedSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getFinanceCollection(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    if (!data.hasSource) markUnavailable(meta, ['installments']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/finance/revenue-breakdown — `FIN-11`…`FIN-14`, `FIN-20`…`FIN-24`. */
router.get('/revenue-breakdown', validate(scopedSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getRevenueBreakdown(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    if (data.feeRates.length === 0) markUnavailable(meta, ['fee-rates']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/finance/seasonality — `FIN-15`, `FIN-30`. */
router.get('/seasonality', validate(yearOnlySchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getFinanceSeasonality(resolved),
      buildMeta(resolved),
    ]);

    if (data.expenses === null) markUnavailable(meta, ['expenses']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/finance/debtors — `FIN-18`, `FIN-19`. Jamais nominatif. */
router.get('/debtors', validate(scopedSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getFinanceDebtors(resolved, filtersOf(query)),
      buildMeta(resolved),
    ]);

    if (!data.hasSource) markUnavailable(meta, ['invoices']);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/finance/expenses — `FIN-27`…`FIN-29`, `FIN-31`…`FIN-36`. */
router.get('/expenses', validate(yearOnlySchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);

    const [data, meta] = await Promise.all([
      getFinanceExpenses(resolved),
      buildMeta(resolved),
    ]);

    markUnavailable(meta, data.unavailable);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

/** GET /api/owner/finance/timeline — `FIN-38`. */
router.get('/timeline', validate(timelineSchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const resolved = await resolveYears(query.academicYearId!, query.compareAcademicYearId);
    const years = Number(req.query.years ?? 5);

    const [data, meta] = await Promise.all([
      getFinanceTimeline(resolved, years),
      buildMeta(resolved),
    ]);

    cacheHeaders(res);
    res.json({ success: true, data, meta });
  } catch (error) {
    handle(error, res, next);
  }
});

export default router;
