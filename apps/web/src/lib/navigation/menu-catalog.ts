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
