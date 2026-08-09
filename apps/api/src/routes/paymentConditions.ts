import { Router } from 'express';
import { z } from 'zod';
import { PaymentConditionService, createPaymentConditionSchema, updatePaymentConditionSchema } from '../services/paymentCondition.service';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';

const router = Router();

// Liste toutes les conditions
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  async (req, res, next) => {
    try {
      const conditions = await PaymentConditionService.getAll();
      res.json({ success: true, data: conditions });
    } catch (error) {
      next(error);
    }
  }
);

// Récupère une condition par ID
router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  async (req, res, next) => {
    try {
      const condition = await PaymentConditionService.getById(req.params.id);
      if (!condition) return res.status(404).json({ success: false, error: 'Condition introuvable' });
      res.json({ success: true, data: condition });
    } catch (error) {
      next(error);
    }
  }
);

// Crée une nouvelle condition
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  validate(z.object({ body: createPaymentConditionSchema })),
  async (req, res, next) => {
    try {
      const condition = await PaymentConditionService.create(req.body);
      res.status(201).json({ success: true, data: condition });
    } catch (error) {
      next(error);
    }
  }
);

// Met à jour une condition
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  validate(z.object({ body: updatePaymentConditionSchema })),
  async (req, res, next) => {
    try {
      const condition = await PaymentConditionService.update(req.params.id, req.body);
      res.json({ success: true, data: condition });
    } catch (error) {
      next(error);
    }
  }
);

// Affecte la condition à une liste de classes
router.put(
  '/:id/classes',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  validate(z.object({ body: z.object({ classIds: z.array(z.string()) }) })),
  async (req, res, next) => {
    try {
      const condition = await PaymentConditionService.assignToClasses(req.params.id, req.body.classIds);
      res.json({ success: true, data: condition });
    } catch (error) {
      next(error);
    }
  }
);

// Supprime une condition
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  async (req, res, next) => {
    try {
      await PaymentConditionService.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
