import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { logoUpload, handleUploadError, getFileUrl } from '../middleware/upload';
import {
  createEstablishment,
  getEstablishment,
  updateEstablishment,
  LEVEL_CATALOG,
  levelGroupsForSchoolType,
  levelsForSchoolType,
  SCHOOL_TYPE_LABELS,
  type SchoolTypeValue,
} from '../services/establishment.service';

const router = Router();

const SCHOOL_TYPES = ['PRIMAIRE', 'COLLEGE', 'LYCEE'] as const;

const SCHOOL_TYPE_DESCRIPTIONS: Record<(typeof SCHOOL_TYPES)[number], string> = {
  PRIMAIRE: 'Du CP1 au CM2. Compositions et moyenne calculée par diviseur de niveau.',
  COLLEGE: 'De la 6ème à la 3ème. Moyennes trimestrielles pondérées par coefficient.',
  LYCEE: 'De la 6ème à la Terminale — un lycée scolarise aussi les classes de collège.',
};

const createSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Le nom de l'établissement est obligatoire").max(200),
    schoolType: z.enum(SCHOOL_TYPES, {
      errorMap: () => ({ message: 'Choisissez : Primaire, Collège ou Lycée' }),
    }),
    email: z.string().email("L'email de l'établissement est invalide"),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(120).optional(),
    motto: z.string().max(200).optional(),
    // Rattachement administratif du primaire. Facultatifs : une école peut se
    // créer avant de connaître son secteur, et les remplira dans sa fiche.
    directionRegionale: z.string().max(150).optional(),
    secteurPedagogique: z.string().max(150).optional(),
    adminFirstName: z.string().min(2, "Le prénom de l'administrateur est obligatoire").max(100),
    adminLastName: z.string().min(2, "Le nom de l'administrateur est obligatoire").max(100),
    adminEmail: z.string().email("L'email de l'administrateur est invalide"),
    adminPhone: z.string().max(30).optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(120).optional(),
    motto: z.string().max(200).optional(),
    directionRegionale: z.string().max(150).optional(),
    secteurPedagogique: z.string().max(150).optional(),
  }),
});

/**
 * La création d'établissement est ouverte : c'est par elle qu'une école entre
 * dans l'application, avant tout compte. Elle crée un administrateur, donc un
 * accès — d'où une limite de débit stricte par adresse IP. Elle ne remplace pas
 * une validation par email, qui reste à ajouter si l'inscription doit être
 * publique sur Internet.
 */
const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Trop de créations d'établissement depuis cette adresse. Réessayez plus tard.",
  },
});

/**
 * GET /api/establishments/school-types
 * Types d'établissement et niveaux correspondants — alimente le formulaire de
 * création, qui n'a ainsi pas à dupliquer le référentiel.
 */
router.get('/school-types', (_req, res) => {
  res.json({
    success: true,
    data: SCHOOL_TYPES.map((schoolType) => ({
      value: schoolType,
      label: SCHOOL_TYPE_LABELS[schoolType],
      description: SCHOOL_TYPE_DESCRIPTIONS[schoolType],
      levels: levelsForSchoolType(schoolType),
      levelGroups: levelGroupsForSchoolType(schoolType),
    })),
    catalog: LEVEL_CATALOG,
  });
});

/**
 * POST /api/establishments
 * Crée un établissement et son compte administrateur. Le mot de passe généré
 * n'est renvoyé qu'ici, une seule fois.
 */
router.post(
  '/',
  onboardingLimiter,
  // Le logo est facultatif : envoyé en multipart quand il est présent, absent
  // sinon. Multer laisse passer les requêtes JSON sans y toucher.
  logoUpload.single('logo'),
  handleUploadError,
  validate(createSchema),
  async (req, res, next) => {
  try {
    const logoUrl = req.file ? getFileUrl(req.file.filename, 'logo') : undefined;
    const result = await createEstablishment({ ...req.body, logoUrl });
    res.status(201).json({
      success: true,
      data: result,
      message: 'Établissement créé. Notez le mot de passe : il ne sera plus affiché.',
    });
  } catch (error: any) {
    if (/déjà utilisée/i.test(String(error?.message))) {
      return res.status(409).json({ success: false, error: error.message });
    }
    next(error);
  }
  },
);

/**
 * GET /api/establishments/me
 * Établissement du compte connecté, avec les niveaux et modules que son type
 * autorise. C'est cette réponse qui pilote l'affichage du menu côté web.
 */
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await getEstablishment(req.user!.establishmentId);
    res.json({ success: true, data });
  } catch (error: any) {
    if (/non trouvé/i.test(String(error?.message))) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
});

/**
 * PATCH /api/establishments/me
 * Met à jour la fiche de l'établissement. Le type d'école n'y figure pas : le
 * changer rendrait orphelines les classes déjà créées sous l'ancien type.
 */
router.patch(
  '/me',
  authenticate,
  requireRole('ADMIN'),
  validate(updateSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const data = await updateEstablishment(req.user!.establishmentId, req.body);
      res.json({ success: true, data, message: 'Établissement mis à jour' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/establishments/me/logo
 * Téléverse (ou remplace) le logo de l'établissement. Image seule, 2 Mo max.
 */
router.post(
  '/me/logo',
  authenticate,
  requireRole('ADMIN'),
  logoUpload.single('logo'),
  handleUploadError,
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier reçu. Sélectionnez une image de logo.',
        });
      }
      const logoUrl = getFileUrl(req.file.filename, 'logo');
      const data = await updateEstablishment(req.user!.establishmentId, { logoUrl });
      res.json({ success: true, data, message: 'Logo mis à jour' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/establishments/me/logo
 * Retire le logo de l'établissement (le fichier reste sur le disque).
 */
router.delete(
  '/me/logo',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res, next) => {
    try {
      const data = await updateEstablishment(req.user!.establishmentId, { logoUrl: null });
      res.json({ success: true, data, message: 'Logo retiré' });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
