/** URL de connexion à l'application. L'app vit sous /app/ (cf. nginx/horizonecole.conf). */
export const URL_CONNEXION = '/app/login';

export const CONTACT = {
  telephones: [
    { affichage: '+225 05 95 03 18 43', lien: 'tel:+2250595031843' },
    { affichage: '+225 07 98 80 22 64', lien: 'tel:+2250798802264' },
  ],
  // WhatsApp pointé sur la première ligne. À corriger si c'est la seconde qui
  // porte le compte.
  whatsapp: 'https://wa.me/2250595031843',
  email: 'info@horizonecole.com',
  ville: 'Abidjan, Côte d’Ivoire',
  horaires: 'Du lundi au vendredi, 8 h – 18 h',
};

export interface Lien {
  libelle: string;
  href: string;
  description?: string;
  badge?: string;
}

/** Ancres de la page /cycles, unique depuis la suppression des sous-pages. */
export const MENU_CYCLES: Lien[] = [
  { libelle: 'École primaire', href: '/cycles#primaire', description: 'CP1 à CM2' },
  { libelle: 'Collège', href: '/cycles#college', description: '6e à 3e, BEPC' },
  { libelle: 'Lycée', href: '/cycles#lycee', description: '6e à Terminale, BAC' },
];

export const MENU_PRINCIPAL: Lien[] = [
  // Lien direct : le périmètre fonctionnel tient sur une seule page, un menu
  // déroulant obligerait à choisir avant d'avoir lu.
  { libelle: 'Fonctionnalités', href: '/fonctionnalites' },
  { libelle: 'Cycles', href: '/cycles' },
  { libelle: 'Tarifs', href: '/tarifs' },
  { libelle: 'Accompagnement', href: '/accompagnement' },
  { libelle: 'Sécurité', href: '/securite' },
];

export const PIED_DE_PAGE: { titre: string; liens: Lien[] }[] = [
  {
    titre: 'Produit',
    liens: [
      { libelle: 'Fonctionnalités', href: '/fonctionnalites' },
      { libelle: 'Tarifs', href: '/tarifs' },
      { libelle: 'Sécurité & données', href: '/securite' },
      { libelle: 'Accompagnement', href: '/accompagnement' },
    ],
  },
  {
    titre: 'Cycles',
    liens: MENU_CYCLES.map(({ libelle, href }) => ({ libelle, href })),
  },
  {
    titre: 'Entreprise',
    liens: [
      { libelle: 'À propos', href: '/a-propos' },
      { libelle: 'Contact', href: '/contact' },
      { libelle: 'Demander une démonstration', href: '/demonstration' },
    ],
  },
];
