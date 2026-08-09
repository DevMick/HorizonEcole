import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { prisma, unscopedPrisma, runWithEstablishment } from '@school/database';
import { menuKeysForSchoolType } from '@school/types';
import { PRIMARY_LEVELS } from './primary/class-profiles';
import { provisionClass } from './primary/primary-class.service';

/**
 * Nom du rôle protégé créé avec chaque établissement. Le caractère protégé —
 * et non le nom — est ce qui lui vaut tous les menus et le rôle système ADMIN ;
 * ce libellé n'est donc qu'un affichage.
 */
const ADMIN_ROLE_NAME = 'Administrateur';

/**
 * Établissements : création, réglages, et catalogue des niveaux ouverts.
 *
 * Créer une école n'est pas une opération métier comme les autres : elle
 * s'exécute *avant* qu'un établissement existe, donc hors cloisonnement. C'est
 * la seule raison pour laquelle ce service utilise le client non cloisonné —
 * tout ce qui suit la création repasse par le contexte normal.
 */

export type SchoolTypeValue = 'PRIMAIRE' | 'COLLEGE' | 'LYCEE';

export interface LevelDefinition {
  key: string;
  label: string;
  cycle: 'PRIMAIRE' | 'SECONDAIRE';
}

const PRIMAIRE_LEVELS: LevelDefinition[] = [
  { key: 'CP1', label: 'CP1 — Cours Préparatoire 1', cycle: 'PRIMAIRE' },
  { key: 'CP2', label: 'CP2 — Cours Préparatoire 2', cycle: 'PRIMAIRE' },
  { key: 'CE1', label: 'CE1 — Cours Élémentaire 1', cycle: 'PRIMAIRE' },
  { key: 'CE2', label: 'CE2 — Cours Élémentaire 2', cycle: 'PRIMAIRE' },
  { key: 'CM1', label: 'CM1 — Cours Moyen 1', cycle: 'PRIMAIRE' },
  { key: 'CM2', label: 'CM2 — Cours Moyen 2 (CEPE)', cycle: 'PRIMAIRE' },
];

const COLLEGE_LEVELS: LevelDefinition[] = [
  { key: '6ème', label: '6ème — Sixième', cycle: 'SECONDAIRE' },
  { key: '5ème', label: '5ème — Cinquième', cycle: 'SECONDAIRE' },
  { key: '4ème', label: '4ème — Quatrième', cycle: 'SECONDAIRE' },
  { key: '3ème', label: '3ème — Troisième (BEPC)', cycle: 'SECONDAIRE' },
];

const LYCEE_LEVELS: LevelDefinition[] = [
  { key: '2nde A', label: '2nde A — Littéraire', cycle: 'SECONDAIRE' },
  { key: '2nde C', label: '2nde C — Scientifique', cycle: 'SECONDAIRE' },
  { key: '1ère A', label: '1ère A — Littéraire', cycle: 'SECONDAIRE' },
  { key: '1ère C', label: '1ère C — Sciences exactes', cycle: 'SECONDAIRE' },
  { key: '1ère D', label: '1ère D — Sciences de la nature', cycle: 'SECONDAIRE' },
  { key: 'Tle A', label: 'Tle A — Baccalauréat', cycle: 'SECONDAIRE' },
  { key: 'Tle C', label: 'Tle C — Baccalauréat', cycle: 'SECONDAIRE' },
  { key: 'Tle D', label: 'Tle D — Baccalauréat', cycle: 'SECONDAIRE' },
];

/**
 * Niveaux ouverts selon le type d'établissement.
 *
 * Un lycée scolarise aussi les classes de collège : le choix « Lycée » ouvre
 * donc la 6e à la Terminale, et non les seules classes de second cycle. C'est
 * la raison pour laquelle le type n'est pas un simple libellé — il détermine
 * quelles classes l'administration pourra créer.
 */
export function levelsForSchoolType(schoolType: SchoolTypeValue): LevelDefinition[] {
  switch (schoolType) {
    case 'PRIMAIRE':
      return PRIMAIRE_LEVELS;
    case 'COLLEGE':
      return COLLEGE_LEVELS;
    case 'LYCEE':
      return [...COLLEGE_LEVELS, ...LYCEE_LEVELS];
    default:
      return [];
  }
}

/** Groupes de niveaux, tels qu'affichés dans le générateur de classes. */
export function levelGroupsForSchoolType(schoolType: SchoolTypeValue) {
  switch (schoolType) {
    case 'PRIMAIRE':
      return [{ label: 'École primaire — CP1 à CM2', levels: PRIMAIRE_LEVELS }];
    case 'COLLEGE':
      return [{ label: 'Collège — 6ème à 3ème', levels: COLLEGE_LEVELS }];
    case 'LYCEE':
      return [
        { label: 'Premier cycle — Collège', levels: COLLEGE_LEVELS },
        { label: 'Second cycle — Lycée', levels: LYCEE_LEVELS },
      ];
    default:
      return [];
  }
}

/** Catalogue complet : tous les niveaux connus, toutes catégories confondues. */
const ALL_CATALOG_LEVELS: LevelDefinition[] = [
  ...PRIMAIRE_LEVELS,
  ...COLLEGE_LEVELS,
  ...LYCEE_LEVELS,
];

/** Vrai si ce niveau est autorisé pour ce type d'établissement. */
export function isLevelAllowed(schoolType: SchoolTypeValue, level: string): boolean {
  const normalized = String(level ?? '').trim().toLowerCase();
  return levelsForSchoolType(schoolType).some((entry) => entry.key.toLowerCase() === normalized);
}

/**
 * Vrai si ce niveau existe dans le catalogue global, indépendamment du type
 * d'établissement. Utilisé pour valider la saisie sans bloquer les écoles
 * multi-cycles (« Groupe Scolaire »).
 */
export function isLevelKnown(level: string): boolean {
  const normalized = String(level ?? '').trim().toLowerCase();
  return ALL_CATALOG_LEVELS.some((entry) => entry.key.toLowerCase() === normalized);
}

/**
 * Cycle d'un niveau déduit du catalogue global. Contrairement à `cycleForLevel`,
 * cette fonction n'a pas besoin du type d'école : le cycle est une propriété
 * intrinsèque du niveau (CP1 → PRIMAIRE, 6ème → SECONDAIRE).
 */
export function inferCycleFromLevel(level: string): 'PRIMAIRE' | 'SECONDAIRE' {
  const normalized = String(level ?? '').trim().toLowerCase();
  const found = ALL_CATALOG_LEVELS.find((entry) => entry.key.toLowerCase() === normalized);
  return found?.cycle ?? 'SECONDAIRE';
}

/** Cycle d'une classe déduit de son niveau, pour un type d'établissement donné. */
export function cycleForLevel(
  schoolType: SchoolTypeValue,
  level: string,
): 'PRIMAIRE' | 'SECONDAIRE' {
  const normalized = String(level ?? '').trim().toLowerCase();
  // Cherche d'abord dans le catalogue global pour gérer les écoles multi-cycles
  const found = ALL_CATALOG_LEVELS.find((entry) => entry.key.toLowerCase() === normalized);
  if (found) return found.cycle;
  return schoolType === 'PRIMAIRE' ? 'PRIMAIRE' : 'SECONDAIRE';
}

/**
 * Identifiant court dérivé du nom, unique sur la plateforme.
 * Sert de repère lisible dans les URL et les exports.
 */
async function buildUniqueCode(name: string): Promise<string> {
  const base =
    String(name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'ecole';

  let candidate = base;
  let suffix = 1;

  // Boucle bornée : au-delà, on bascule sur un suffixe aléatoire plutôt que de
  // tourner indéfiniment sur un nom très répandu.
  while (suffix < 50) {
    const taken = await unscopedPrisma.establishment.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return `${base}-${randomUUID().slice(0, 6)}`;
}

/**
 * Mot de passe initial de l'administrateur.
 *
 * Tiré d'une source cryptographique, sur un alphabet dont sont retirés les
 * caractères qu'on confond à la lecture (O/0, l/1/I) — ce mot de passe est
 * recopié à la main depuis un écran, puis changé.
 *
 * Le rejet des octets hors du plus grand multiple de la taille de l'alphabet
 * évite le biais qu'introduirait un simple modulo.
 */
function generatePassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const limit = 256 - (256 % alphabet.length);
  let password = '';

  while (password.length < length) {
    for (const byte of randomBytes(length)) {
      if (byte >= limit) continue;
      password += alphabet[byte % alphabet.length];
      if (password.length === length) break;
    }
  }

  return password;
}

export interface CreateEstablishmentInput {
  name: string;
  schoolType: SchoolTypeValue;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  motto?: string;
  /**
   * Rattachement administratif — propre à l'enseignement primaire : l'en-tête
   * des fiches de classement officielles porte la direction régionale et le
   * secteur pédagogique. Ignorés pour un collège ou un lycée.
   */
  directionRegionale?: string;
  secteurPedagogique?: string;
  /** Optionnel : logo de l'école, ajouté au moment de la création. */
  logoUrl?: string | null;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone?: string;
}

/**
 * Crée les six classes du primaire (CP1 → CM2) d'un établissement, chacune
 * provisionnée depuis le profil de son niveau (grille, barèmes, diviseur,
 * seuils). Idempotente : une classe déjà présente pour un niveau est laissée
 * telle quelle. L'exécution est cloisonnée sur l'établissement visé pour que le
 * client Prisma injecte le bon `establishment_id`, y compris hors requête HTTP.
 */
export async function generateDefaultPrimaryClasses(establishmentId: string): Promise<void> {
  await runWithEstablishment(establishmentId, async () => {
    for (const level of PRIMARY_LEVELS) {
      const existing = await prisma.schoolClass.findFirst({
        where: { name: level },
        select: { id: true },
      });
      if (existing) continue;

      const created = await prisma.schoolClass.create({
        data: { id: randomUUID(), name: level, level, cycle: 'PRIMAIRE' },
      });

      try {
        await provisionClass(created.id);
      } catch (err) {
        console.warn(
          `Provisionnement primaire de la classe ${created.id} échoué :`,
          (err as Error).message,
        );
      }
    }
  });
}

/**
 * Crée un établissement et son compte administrateur.
 *
 * L'administrateur est créé dans la même transaction que l'école : une école
 * sans compte pour y entrer serait inexploitable, et il n'existe pas d'autre
 * moyen d'en créer un. Le mot de passe est renvoyé **une seule fois**, à
 * l'écran — il n'est stocké qu'en empreinte.
 */
export async function createEstablishment(input: CreateEstablishmentInput) {
  const adminEmail = input.adminEmail.trim().toLowerCase();

  // L'email identifie le compte à la connexion sans avoir à désigner l'école :
  // il doit donc rester unique sur toute la plateforme.
  const existingUser = await unscopedPrisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error('Cette adresse email est déjà utilisée par un autre compte');
  }

  const code = await buildUniqueCode(input.name);
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const establishmentId = randomUUID();

  await unscopedPrisma.$transaction(async (tx) => {
    await tx.establishment.create({
      data: {
        id: establishmentId,
        name: input.name.trim(),
        code,
        schoolType: input.schoolType,
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        motto: input.motto?.trim() || null,
        // Rattachement administratif : n'a de sens qu'au primaire, on n'écrit
        // donc rien pour un collège ou un lycée même si le client l'envoyait.
        directionRegionale:
          input.schoolType === 'PRIMAIRE' ? input.directionRegionale?.trim() || null : null,
        secteurPedagogique:
          input.schoolType === 'PRIMAIRE' ? input.secteurPedagogique?.trim() || null : null,
        logoUrl: input.logoUrl || null,
      },
    });

    // Rôle « Administrateur » de l'école, protégé : il reçoit automatiquement
    // les menus de son type d'établissement (cf. syncProtectedRoleMenus) et
    // c'est lui qui, côté API, fait dériver le rôle système ADMIN (cf.
    // routes/users.ts). Sans lui, le compte créé ici n'apparaîtrait rattaché à
    // aucun rôle dans l'écran des utilisateurs, et l'écran des rôles serait
    // vide à l'ouverture de l'école.
    //
    // Les menus sont ceux du type choisi, pas la totalité du catalogue :
    // l'administrateur d'une école primaire ouvre son école sur le module
    // CP1 → CM2, celui d'un collège sur la pédagogie du secondaire.
    const adminRole = await tx.role.create({
      data: {
        id: randomUUID(),
        establishment_id: establishmentId,
        name: ADMIN_ROLE_NAME,
        description: `Accès complet aux menus d'un établissement de type ${input.schoolType.toLowerCase()}.`,
        isProtected: true,
        menus: {
          create: menuKeysForSchoolType(input.schoolType).map((menuKey) => ({
            id: randomUUID(),
            menuKey,
          })),
        },
      },
    });

    await tx.user.create({
      data: {
        id: randomUUID(),
        establishment_id: establishmentId,
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        roleId: adminRole.id,
        firstName: input.adminFirstName.trim(),
        lastName: input.adminLastName.trim(),
        phone: input.adminPhone?.trim() || null,
        isProtected: true,
      },
    });
  });

  // École primaire : les six classes CP1 → CM2 sont créées d'office, chacune
  // avec sa grille de matières, ses barèmes, son diviseur et ses seuils. Une
  // école primaire est ainsi opérationnelle dès sa création — l'administration
  // n'a aucune classe à générer à la main. L'échec de cette étape ne doit pas
  // faire échouer la création de l'école : les classes restent regénérables.
  if (input.schoolType === 'PRIMAIRE') {
    try {
      await generateDefaultPrimaryClasses(establishmentId);
    } catch (err) {
      console.warn(
        `Génération des classes du primaire échouée pour ${establishmentId} :`,
        (err as Error).message,
      );
    }
  }

  const establishment = await unscopedPrisma.establishment.findUniqueOrThrow({
    where: { id: establishmentId },
  });

  return {
    establishment: {
      id: establishment.id,
      name: establishment.name,
      code: establishment.code,
      schoolType: establishment.schoolType,
      email: establishment.email,
    },
    admin: {
      email: adminEmail,
      firstName: input.adminFirstName.trim(),
      lastName: input.adminLastName.trim(),
      /** Affiché une seule fois : il n'est conservé qu'en empreinte. */
      password,
    },
  };
}

/** Établissement du compte connecté, avec les niveaux que son type autorise. */
export async function getEstablishment(establishmentId: string) {
  const [establishment, classCycles] = await Promise.all([
    unscopedPrisma.establishment.findUnique({ where: { id: establishmentId } }),
    // Détection des cycles réellement utilisés — permet aux écoles multi-cycles
    // (ex. « Groupe Scolaire » converti en LYCEE) d'activer les deux modules.
    unscopedPrisma.schoolClass.groupBy({
      by: ['cycle'],
      where: { establishment_id: establishmentId },
    }),
  ]);

  if (!establishment) throw new Error('Établissement non trouvé');

  const schoolType = establishment.schoolType as SchoolTypeValue;

  const hasPrimaryClasses = classCycles.some((c) => c.cycle === 'PRIMAIRE');
  const hasSecondaryClasses = classCycles.some((c) => c.cycle === 'SECONDAIRE');

  // Le type d'école donne le module de base ; les classes réelles l'étendent.
  // Un établissement converti de GROUPE_SCOLAIRE vers LYCEE conserve ainsi ses
  // deux modules si ses classes primaires (cycle PRIMAIRE) sont encore présentes.
  const modules = {
    primary: schoolType === 'PRIMAIRE' || hasPrimaryClasses,
    secondary: schoolType === 'COLLEGE' || schoolType === 'LYCEE' || hasSecondaryClasses,
  };

  // Niveaux et groupes combinés quand les deux modules sont actifs.
  const levels = modules.primary && modules.secondary
    ? [...PRIMAIRE_LEVELS, ...levelsForSchoolType(schoolType)]
    : levelsForSchoolType(schoolType);

  const levelGroups = modules.primary && modules.secondary
    ? [{ label: 'École primaire — CP1 à CM2', levels: PRIMAIRE_LEVELS }, ...levelGroupsForSchoolType(schoolType)]
    : levelGroupsForSchoolType(schoolType);

  return {
    id: establishment.id,
    name: establishment.name,
    code: establishment.code,
    schoolType,
    email: establishment.email,
    phone: establishment.phone,
    address: establishment.address,
    city: establishment.city,
    country: establishment.country,
    motto: establishment.motto,
    directionRegionale: establishment.directionRegionale,
    secteurPedagogique: establishment.secteurPedagogique,
    logoUrl: establishment.logoUrl,
    isActive: establishment.isActive,
    createdAt: establishment.createdAt,
    levels,
    levelGroups,
    /** Modules actifs — déduits du type et des classes réellement créées. */
    modules,
  };
}

/** Met à jour la fiche de l'établissement (réservé à son administration). */
export async function updateEstablishment(
  establishmentId: string,
  data: Partial<Omit<CreateEstablishmentInput, 'adminEmail' | 'adminFirstName' | 'adminLastName'>> & {
    logoUrl?: string | null;
  },
) {
  // Le type d'école n'est pas modifiable ici : le changer après coup rendrait
  // orphelines les classes déjà créées sous l'ancien type. Il faudrait une
  // reprise de données explicite, hors du champ d'un simple formulaire.
  const { schoolType: _ignored, ...editable } = data;

  await unscopedPrisma.establishment.update({
    where: { id: establishmentId },
    data: {
      ...(editable.name !== undefined ? { name: editable.name.trim() } : {}),
      ...(editable.email !== undefined ? { email: editable.email.trim().toLowerCase() } : {}),
      ...(editable.phone !== undefined ? { phone: editable.phone?.trim() || null } : {}),
      ...(editable.address !== undefined ? { address: editable.address?.trim() || null } : {}),
      ...(editable.city !== undefined ? { city: editable.city?.trim() || null } : {}),
      ...(editable.motto !== undefined ? { motto: editable.motto?.trim() || null } : {}),
      ...(editable.directionRegionale !== undefined
        ? { directionRegionale: editable.directionRegionale?.trim() || null }
        : {}),
      ...(editable.secteurPedagogique !== undefined
        ? { secteurPedagogique: editable.secteurPedagogique?.trim() || null }
        : {}),
      ...(editable.logoUrl !== undefined ? { logoUrl: editable.logoUrl || null } : {}),
    },
  });

  return getEstablishment(establishmentId);
}

/** Exposé pour le générateur de classes et les écrans de configuration. */
export const LEVEL_CATALOG = {
  PRIMAIRE: PRIMAIRE_LEVELS,
  COLLEGE: COLLEGE_LEVELS,
  LYCEE: LYCEE_LEVELS,
};
