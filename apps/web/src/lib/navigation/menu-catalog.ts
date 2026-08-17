/**
 * Catalogue statique des menus affectables à un rôle personnalisé (page
 * Rôles). Reflète exactement les entrées de la branche « admin » de
 * `use-app-navigation.tsx` — la seule branche que voient les comptes
 * ADMIN/ACCOUNTANT créés via le module Personnel/Utilisateurs.
 */
export interface MenuCatalogItem {
  key: string;
  label: string;
}

export interface MenuCatalogGroup {
  key: string;
  label: string;
  items: MenuCatalogItem[];
}

/** Groupes qui n'existent que pour un cycle donné (cf. use-app-navigation). */
const SECONDARY_ONLY_GROUPS = new Set(['pedagogy']);
const PRIMARY_ONLY_GROUPS = new Set(['primary']);
/** Items individuels réservés au secondaire au sein d'un groupe commun. */
const SECONDARY_ONLY_ITEMS = new Set(['/people/classrooms']);

export const MENU_CATALOG: MenuCatalogGroup[] = [
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    items: [{ key: '/dashboard', label: 'Tableau de bord' }],
  },
  {
    key: 'people',
    label: 'Gestion des Personnes',
    items: [
      { key: '/people/students', label: 'Élèves' },
      { key: '/people/parents', label: 'Parents' },
      { key: '/people/teachers', label: 'Enseignants' },
      { key: '/people/roles', label: 'Rôles' },
      { key: '/people/users', label: 'Utilisateurs' },
    ],
  },
  {
    key: 'academic',
    label: 'Année Académique',
    items: [
      { key: '/academic/years', label: 'Années Scolaires' },
      { key: '/academic/inscriptions', label: 'Inscriptions' },
      { key: '/people/classrooms', label: 'Salles de Classes' },
      { key: '/academic/timetable', label: 'Emploi du Temps' },
      { key: '/academic/attendance', label: 'Liste de Présence' },
      { key: '/academic/uncalled-sessions', label: 'Séances non tenues' },
    ],
  },
  {
    key: 'pedagogy',
    label: 'Pédagogie',
    items: [
      { key: '/academic/classes', label: 'Classes' },
      { key: '/academic/subjects', label: 'Matières' },
      { key: '/academic/assignments', label: 'Affectations' },
      { key: '/academic/coefficients', label: 'Coefficients' },
      { key: '/academic/class-grades', label: 'Notes par Matière' },
      { key: '/academic/conduct', label: 'Conduite' },
      { key: '/academic/complete-averages', label: 'Moyennes Complètes' },
    ],
  },
  {
    key: 'primary',
    label: 'École Primaire',
    items: [
      { key: '/primary/classes', label: 'Classes' },
      { key: '/primary/evaluations', label: 'Compositions' },
      { key: '/primary/grades', label: 'Résultats & Bulletins' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [
      { key: '/finance/payment-conditions', label: 'Échéanciers' },
      { key: '/finance/payments', label: 'Paiements' },
    ],
  },
];

/**
 * Catalogue de l'espace Propriétaire, tenu **séparé** du précédent.
 *
 * Les deux jeux ne se mélangent jamais : proposer « Pilotage » à un comptable
 * afficherait des cases sans effet — la navigation d'un compte ADMIN ou
 * ACCOUNTANT ne comporte aucune entrée `/owner/*` — et verser les écrans de
 * gestion dans le rôle Propriétaire contredirait sa raison d'être.
 */
export const OWNER_MENU_CATALOG: MenuCatalogGroup[] = [
  {
    key: 'owner',
    label: 'Pilotage',
    items: [
      { key: '/owner', label: "Vue d'ensemble" },
      { key: '/owner/effectifs', label: 'Effectifs' },
      { key: '/owner/assiduite', label: 'Assiduité' },
      { key: '/owner/resultats', label: 'Résultats' },
      { key: '/owner/enseignants', label: 'Enseignants' },
      { key: '/owner/finance', label: 'Finance' },
    ],
  },
];

/** Menu de l'espace Propriétaire qui ne se décoche pas : la page d'atterrissage. */
export const OWNER_LOCKED_MENU_KEY = '/owner';

/**
 * Nom du rôle protégé qui porte ces menus.
 *
 * Recopié de `packages/types` plutôt qu'importé : le front tient déjà son
 * propre catalogue de menus, par la même convention — le paquet `@school/types`
 * sert le backend, et son bundle CommonJS ne se laisse pas analyser
 * statiquement par le bundler du front. L'API reste l'autorité : elle refuse le
 * renommage de ce rôle et filtre les clés reçues.
 */
export const OWNER_ROLE_NAME = 'Propriétaire';

/** Nom du rôle protégé d'administration. Même convention de recopie. */
export const ADMIN_ROLE_NAME = 'Administrateur';

/**
 * Menu que le rôle « Administrateur » ne peut pas perdre : c'est depuis l'écran
 * des rôles qu'on répare une coche malheureuse. L'en priver enfermerait
 * l'établissement dehors, sans retour possible par l'interface.
 */
export const ADMIN_LOCKED_MENU_KEY = '/people/roles';

/**
 * Clés que l'écran des rôles sait cocher/décocher.
 *
 * Le sidebar en comporte quelques autres — « Établissement » par exemple — qui
 * ne figurent dans aucun catalogue : elles ne sont donc jamais *décochées*, et
 * les retirer parce qu'elles sont absentes de la liste d'un rôle serait un
 * contresens. Ce jeu sert à distinguer « non coché » de « non affectable ».
 */
export const ASSIGNABLE_MENU_KEYS = new Set(
  MENU_CATALOG.flatMap((group) => group.items.map((item) => item.key)),
);

/**
 * Catalogue Propriétaire restreint aux modules ouverts.
 *
 * L'assiduité suit la même règle qu'ailleurs : sans module secondaire, il n'y a
 * ni séance ni note de conduite, et la proposer mènerait à un écran qui se
 * referme sur lui-même.
 */
export function ownerMenuCatalogForModules(
  modules?: { primary: boolean; secondary: boolean },
): MenuCatalogGroup[] {
  if (!modules || modules.secondary) return OWNER_MENU_CATALOG;

  return OWNER_MENU_CATALOG.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.key !== '/owner/assiduite'),
  }));
}

/**
 * Catalogue restreint aux modules ouverts par le type d'établissement.
 *
 * L'écran des rôles ne doit proposer que des menus qui mènent quelque part :
 * dans une école primaire, « Coefficients » ou « Conduite » n'ont pas d'objet,
 * et dans un collège, les compositions CP1 → CM2 non plus. Tant que
 * l'établissement n'est pas chargé, on renvoie le catalogue complet plutôt
 * qu'une liste vide qui clignoterait.
 */
export function menuCatalogForModules(
  modules?: { primary: boolean; secondary: boolean },
): MenuCatalogGroup[] {
  if (!modules) return MENU_CATALOG;

  return MENU_CATALOG.filter((group) => {
    if (SECONDARY_ONLY_GROUPS.has(group.key)) return modules.secondary;
    if (PRIMARY_ONLY_GROUPS.has(group.key)) return modules.primary;
    return true;
  }).map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (SECONDARY_ONLY_ITEMS.has(item.key)) return modules.secondary;
      return true;
    }),
  }));
}
