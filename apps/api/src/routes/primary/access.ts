import { Response, NextFunction } from 'express';
import { prisma } from '@school/database';
import { AuthRequest } from '../../middleware/auth';
import { canRecordForClass } from '../../services/primary/primary-class.service';

/**
 * Contrôle d'accès du module primaire.
 *
 * L'administration voit et modifie tout. L'enseignant, lui, n'a accès qu'à la
 * classe dont il est titulaire : c'est la règle du cycle, où un seul maître
 * enseigne toutes les matières de sa classe. Le contrôle vit ici, dans les
 * routeurs, et non dans les services — ceux-ci restent purement métier et
 * réutilisables (bulletins, espace parent) sans dupliquer d'autorisation.
 */

/** Erreur d'API portant son propre code HTTP, pour des réponses parlantes. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Traduit une erreur de service en réponse HTTP, sans masquer les imprévus. */
export function handleError(error: any, res: Response, next: NextFunction) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ success: false, error: error.message });
  }

  const message = String(error?.message ?? '');
  if (/non trouvé|introuvable/i.test(message)) {
    return res.status(404).json({ success: false, error: message });
  }
  if (
    /n'appartient pas|doit|déjà|verrouillée|au moins une|pas encore installée|supprimez-les/i.test(
      message,
    )
  ) {
    return res.status(400).json({ success: false, error: message });
  }

  return next(error);
}

/** Vérifie que l'utilisateur peut agir sur cette classe du primaire. */
export async function assertClassAccess(req: AuthRequest, classId: string) {
  if (!req.user) throw new HttpError(401, 'Authentification requise');

  const allowed = await canRecordForClass(req.user, classId);
  if (!allowed) {
    throw new HttpError(403, "Vous n'êtes pas titulaire de cette classe");
  }
}

/**
 * Même contrôle, à partir d'une composition : on remonte à sa classe.
 * Renvoie l'identifiant de classe, souvent utile ensuite.
 */
export async function assertEvaluationAccess(
  req: AuthRequest,
  evaluationId: string,
): Promise<string> {
  const evaluation = await prisma.primary_evaluations.findUnique({
    where: { id: evaluationId },
    select: { class_id: true },
  });

  if (!evaluation) throw new HttpError(404, 'Composition non trouvée');

  await assertClassAccess(req, evaluation.class_id);
  return evaluation.class_id;
}

/** Middleware : réserve une route à l'administration. */
export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Cette action est réservée à l’administration',
    });
  }
  next();
}
