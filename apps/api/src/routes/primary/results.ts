import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '@school/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { assertEvaluationAccess, HttpError, handleError } from './access';
import { canRecordForClass } from '../../services/primary/primary-class.service';
import {
  computeEvaluationResults,
  getClassAnnualReport,
  getStudentYearResults,
} from '../../services/primary/primary-results.service';
import {
  generateClassBulletinsPDF,
  generateRankingSheetPDF,
  generateStudentBulletinPDF,
} from '../../services/primary/primary-pdf.service';
import { generateRankingSheetDOCX } from '../../services/primary/primary-docx.service';
import {
  generateAnnualReportDOCX,
  generateAnnualReportPDF,
} from '../../services/primary/primary-annual-pdf.service';

const router = Router();

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Sert un document fraîchement produit.
 *
 * Un PDF s'ouvre dans le navigateur (`inline`) ; un .docx n'a rien à y faire et
 * part en téléchargement (`attachment`), sinon Chrome le télécharge quand même
 * mais après un aller-retour inutile.
 */
function streamDocument(
  res: any,
  relativePath: string,
  fileName: string,
  mime = 'application/pdf',
) {
  const filePath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Document introuvable après génération' });
  }

  const disposition = mime === 'application/pdf' ? 'inline' : 'attachment';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  fs.createReadStream(filePath).pipe(res);
}

/** Conservé pour les appels existants : un PDF, affiché dans le navigateur. */
const streamPdf = (res: any, relativePath: string, fileName: string) =>
  streamDocument(res, relativePath, fileName);

const slug = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '-');

/**
 * GET /api/primary/results/students/:studentId?academicYearId=…
 * Parcours annuel d'un élève : ses résultats à chaque composition de l'année.
 *
 * Déclarée avant `/:evaluationId` par précaution de lecture : les deux motifs
 * n'ont pas le même nombre de segments et ne se recouvrent donc pas, mais
 * l'ordre rend l'intention évidente.
 */
router.get('/students/:studentId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { academicYearId } = req.query;
    if (!academicYearId) {
      throw new HttpError(400, 'Le paramètre academicYearId est obligatoire');
    }

    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      select: { classId: true },
    });
    if (!student?.classId) throw new HttpError(404, 'Élève non trouvé');

    const allowed = await canRecordForClass(req.user!, student.classId);
    if (!allowed) throw new HttpError(403, "Vous n'avez pas accès à cet élève");

    const data = await getStudentYearResults(req.params.studentId, academicYearId as string);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/results/class/:classId/annual?academicYearId=…
 * Bilan annuel d'une classe : moyenne de chaque élève à chaque composition,
 * moyenne annuelle, rang et décision de fin d'année.
 *
 * Déclarée avant `/:evaluationId` : « class » serait sinon lu comme un
 * identifiant de composition.
 */
router.get('/class/:classId/annual', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { academicYearId } = req.query;
    if (!academicYearId) {
      throw new HttpError(400, 'Le paramètre academicYearId est obligatoire');
    }

    const allowed = await canRecordForClass(req.user!, req.params.classId);
    if (!allowed) throw new HttpError(403, "Vous n'êtes pas titulaire de cette classe");

    const data = await getClassAnnualReport(req.params.classId, academicYearId as string);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * Année scolaire d'une requête d'export, et contrôle d'accès à la classe.
 *
 * Les deux exports du bilan partagent exactement les mêmes préalables ; les
 * séparer laisserait la porte ouverte à un garde oublié sur l'un des deux.
 */
async function assertAnnualExportAccess(req: AuthRequest): Promise<string> {
  const { academicYearId } = req.query;
  if (!academicYearId) {
    throw new HttpError(400, 'Le paramètre academicYearId est obligatoire');
  }

  const allowed = await canRecordForClass(req.user!, req.params.classId);
  if (!allowed) throw new HttpError(403, "Vous n'êtes pas titulaire de cette classe");

  return academicYearId as string;
}

/**
 * GET /api/primary/results/class/:classId/annual-report.pdf?academicYearId=…
 * Bilan annuel de la classe (A4 portrait, prêt à afficher et à signer).
 *
 * Déclarée avant `/:evaluationId`, comme les autres routes `/class/…`.
 */
router.get(
  '/class/:classId/annual-report.pdf',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const academicYearId = await assertAnnualExportAccess(req);
      const pdfPath = await generateAnnualReportPDF(req.params.classId, academicYearId);
      streamPdf(res, pdfPath, `bilan-annuel-${slug(req.params.classId)}.pdf`);
    } catch (error) {
      handleError(error, res, next);
    }
  },
);

/**
 * GET /api/primary/results/class/:classId/annual-report.docx?academicYearId=…
 * Même bilan au format Word : le conseil des maîtres y ajoute ses observations
 * et tranche les cas « à examiner » avant de l'afficher, ce qu'un PDF interdit.
 */
router.get(
  '/class/:classId/annual-report.docx',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const academicYearId = await assertAnnualExportAccess(req);
      const { path: docPath, fileName } = await generateAnnualReportDOCX(
        req.params.classId,
        academicYearId,
      );
      streamDocument(res, docPath, fileName, DOCX_MIME);
    } catch (error) {
      handleError(error, res, next);
    }
  },
);

/**
 * GET /api/primary/results/:evaluationId
 * Moyennes, rangs et statistiques d'une composition.
 */
router.get('/:evaluationId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await assertEvaluationAccess(req, req.params.evaluationId);
    const data = await computeEvaluationResults(req.params.evaluationId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/results/:evaluationId/ranking.pdf
 * Fiche de classement de la composition (A4 portrait, prête à afficher).
 */
router.get('/:evaluationId/ranking.pdf', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await assertEvaluationAccess(req, req.params.evaluationId);
    const pdfPath = await generateRankingSheetPDF(req.params.evaluationId);
    streamPdf(res, pdfPath, `classement-${slug(req.params.evaluationId)}.pdf`);
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/results/:evaluationId/ranking.docx
 * Même fiche de classement, au format Word : les écoles y ajoutent une
 * observation ou corrigent un nom avant de l'afficher, ce qu'un PDF interdit.
 */
router.get('/:evaluationId/ranking.docx', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await assertEvaluationAccess(req, req.params.evaluationId);
    const { path: docPath, fileName } = await generateRankingSheetDOCX(req.params.evaluationId);
    streamDocument(res, docPath, fileName, DOCX_MIME);
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/results/:evaluationId/bulletins.pdf
 * Bulletins de toute la classe, un par page, dans un seul document.
 */
router.get('/:evaluationId/bulletins.pdf', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await assertEvaluationAccess(req, req.params.evaluationId);
    const { path: pdfPath } = await generateClassBulletinsPDF(req.params.evaluationId);
    streamPdf(res, pdfPath, `bulletins-${slug(req.params.evaluationId)}.pdf`);
  } catch (error) {
    handleError(error, res, next);
  }
});

/**
 * GET /api/primary/results/:evaluationId/bulletins/:studentId.pdf
 * Bulletin d'un seul élève.
 */
router.get(
  '/:evaluationId/bulletins/:studentId',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      await assertEvaluationAccess(req, req.params.evaluationId);
      const pdfPath = await generateStudentBulletinPDF(
        req.params.evaluationId,
        req.params.studentId,
      );
      streamPdf(res, pdfPath, `bulletin-${slug(req.params.studentId)}.pdf`);
    } catch (error) {
      handleError(error, res, next);
    }
  },
);

export default router;
