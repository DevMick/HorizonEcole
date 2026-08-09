import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { InvoiceService } from '../services/invoice.service';
import { PDFService } from '../services/pdf.service';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Get all invoices (filters: classId, academicYearId, status)
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  async (req, res, next) => {
    try {
      const { classId, academicYearId, status } = req.query;

      const invoices = await InvoiceService.getAll({
        classId: classId as string | undefined,
        academicYearId: academicYearId as string | undefined,
        status: status as 'ISSUED' | 'CANCELLED' | undefined,
      });

      res.json({ success: true, data: invoices });
    } catch (error) {
      next(error);
    }
  }
);

// Get the invoice for a student/academic year
router.get(
  '/student/:studentId/academic-year/:academicYearId',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  async (req, res, next) => {
    try {
      const { studentId, academicYearId } = req.params;
      const invoice = await InvoiceService.getByStudentAndYear(studentId, academicYearId);

      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }
);

// Get a single invoice
router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const invoice = await InvoiceService.getById(id);

      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }
);

// Download the invoice as a PDF
router.get(
  '/:id/pdf',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const pdfUrl = await PDFService.generateInvoicePDF(id);
      const filePath = path.join(process.cwd(), pdfUrl);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'PDF file not found' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="facture-${id}.pdf"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (error: any) {
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }
);

// Cancel an invoice
router.post(
  '/:id/cancel',
  authenticate,
  requireRole('ADMIN', 'ACCOUNTANT'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const invoice = await InvoiceService.cancel(id);

      res.json({ success: true, data: invoice, message: 'Invoice cancelled successfully' });
    } catch (error: any) {
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      next(error);
    }
  }
);

export default router;
