import { Router } from 'express';

import { prisma } from '@school/database';
import { UserRole } from '@school/types';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { getEstablishment } from '../../services/establishment.service';
import enrollmentRoutes from './enrollment';
import resultsRoutes from './results';
import financeRoutes from './finance';
import attendanceRoutes from './attendance';
import staffRoutes from './staff';
import summaryRoutes from './summary';

/**
 * Espace Propriétaire — lecture seule des tableaux de bord analytiques de son
 * établissement.
 *
 * Ce routeur ne porte que le **contrôle d'accès** ; la lecture est déléguée aux
 * services, comme pour les espaces Parent (`parent-space.ts`) et Élève
 * (`student-space.ts`).
 *
 * Aucune route n'accepte de paramètre `establishmentId` : le seul établissement
 * lisible est celui du jeton. C'est la même discipline que l'espace Élève, où
 * aucun identifiant d'élève n'est exprimable.
 */
const router = Router();

// 1) authenticate OUVRE le contexte d'établissement (middleware/auth.ts:96).
//    Sans lui, l'extension Prisma se retire (tenant-extension.ts:233) et les
//    lectures traverseraient les établissements — fuite silencieuse, sans
//    erreur. C'est la barrière la plus importante de ce fichier.
// 2) requireRole verrouille l'espace sur le seul rôle OWNER, comme les espaces
//    Parent (parent-space.ts:26) et Élève (student-space.ts:25).
router.use(authenticate, requireRole(UserRole.OWNER));

/** Méthodes tolérées : celles qui ne changent rien. */
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ALLOW_HEADER = 'GET, HEAD, OPTIONS';

// 3) Lecture seule structurelle : toute méthode autre que GET est refusée avant
//    d'atteindre le moindre handler. Ce n'est pas une redondance avec l'absence
//    de handlers d'écriture — c'est la garantie qu'aucun ajout futur ne pourra
//    introduire une écriture par inadvertance.
router.use((req, res, next) => {
  if (!READ_ONLY_METHODS.has(req.method)) {
    res.set('Allow', ALLOW_HEADER);
    return res.status(405).json({
      success: false,
      error: 'Méthode non autorisée',
      message: "L'espace Propriétaire est en lecture seule",
    });
  }
  next();
});

/**
 * GET /api/owner/context
 *
 * Référentiel du sélecteur d'année : établissement, années scolaires, année
 * courante, modules actifs et type d'école.
 *
 * Les années sont lues par le client `prisma` **cloisonné** : l'extension y
 * injecte `establishment_id` depuis le contexte ouvert par `authenticate`, si
 * bien que la liste ne peut contenir que les années de l'établissement du
 * jeton.
 */
router.get('/context', async (req: AuthRequest, res, next) => {
  try {
    const [establishment, academicYears, classes] = await Promise.all([
      getEstablishment(req.user!.establishmentId),
      prisma.academicYear.findMany({
        select: { id: true, name: true, startYear: true, endYear: true, isCurrent: true },
        orderBy: { startYear: 'desc' },
      }),
      // Les classes appartiennent à l'établissement, pas à une année : elles
      // ont donc leur place dans le référentiel plutôt que dans chaque réponse
      // analytique. Les écrans qui offrent un filtre par classe y puisent une
      // liste stable, qui ne se vide pas quand le filtre courant ne ramène
      // qu'une classe — c'est ce qui permet d'en ressortir.
      prisma.schoolClass.findMany({
        select: { id: true, name: true, level: true },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const currentAcademicYearId =
      academicYears.find((year) => year.isCurrent)?.id ?? academicYears[0]?.id ?? null;

    res.json({
      success: true,
      data: {
        establishment: {
          id: establishment.id,
          name: establishment.name,
          code: establishment.code,
          schoolType: establishment.schoolType,
          logoUrl: establishment.logoUrl,
        },
        academicYears,
        currentAcademicYearId,
        classes,
        modules: establishment.modules,
        schoolType: establishment.schoolType,
      },
    });
  } catch (error: any) {
    if (/non trouvé/i.test(String(error?.message))) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
});

// Sous-routeurs par domaine. Ils sont montés après les barrières ci-dessus et
// n'en redéclarent aucune : l'authentification, le verrou de rôle et le refus
// des écritures leur sont acquis.
router.use('/enrollment', enrollmentRoutes);
router.use('/results', resultsRoutes);
router.use('/finance', financeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/staff', staffRoutes);
router.use('/summary', summaryRoutes);

export default router;
