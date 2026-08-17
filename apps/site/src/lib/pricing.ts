/**
 * Source de vérité tarifaire du site HorizonEcole.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PÉRIMÈTRE : LOGICIEL SEUL. L'hébergement est hors tarification publique.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Le site ne chiffre que la solution logicielle : abonnement annuel et mise en
 * service. Le mode de déploiement (notre cloud ou le serveur de l'établissement)
 * et son coût se traitent après l'acquisition, en entretien commercial.
 *
 * Comment ces montants sont extraits de la grille commerciale
 * (`docs/grille_tarifaire_generate.py`) :
 *
 *   • ABONNEMENT — la colonne « Serveur local du client » du PDF est, par
 *     construction, la part logicielle pure : sur les 12 lignes de la grille,
 *     `abonnement Cloud = abonnement local + part hébergement de la formule`.
 *     Retirer l'hébergement revient donc exactement à lire la colonne locale.
 *     Le test de provenance de `pricing.test.ts` le démontre ligne à ligne.
 *
 *   • MISE EN SERVICE — plus facturée. Elle est offerte la première année :
 *     paramétrage, reprise des données, création des comptes et formation. Le
 *     tableau MISE_EN_SERVICE ne conserve donc que le contenu des prestations,
 *     gradué par tranche d'effectif, sans aucun montant.
 *
 *   • ACCOMPAGNEMENT ULTÉRIEUR — plus de forfait d'assistance. L'assistance
 *     courante et les mises à jour restent dans l'abonnement ; au-delà, seule
 *     une intervention demandée est chiffrée, selon sa complexité, et convenue
 *     avant d'être engagée. Aucun barème n'est donc publié.
 *
 *   • REMISES ET SIMULATEUR — retirés. Les remises multi-cycles, le tarif
 *     solidaire et le paiement pluriannuel restent des règles commerciales, mais
 *     elles ne sont plus ni calculées ni publiées ici : elles se traitent au
 *     devis, et leur énoncé relève du contrat signé avec l'établissement. Ce
 *     module ne décrit donc plus qu'un prix affiché, jamais un prix calculé.
 *
 * Conséquence : le budget de première année se confond avec l'abonnement, et
 * les montants affichés ne correspondent plus à aucune colonne du PDF. Ils sont
 * plus bas. Voir docs/prd-site-vitrine-horizonecole.md.
 *
 * Montants en FCFA (XOF) hors taxes. Grille de référence : août 2026.
 */

export type Cycle = 'primaire' | 'college' | 'lycee';
export type TrancheId = 'petit' | 'moyen' | 'grand' | 'tres-grand';

/* ──────────────────────────────── Tranches ───────────────────────────────── */

export interface Tranche {
  id: TrancheId;
  nom: string;
  description: string;
  /** Borne haute EXCLUE. Infinity pour la dernière tranche. */
  effectifMax: number;
  libelleEffectif: string;
  /** Abonnement logiciel annuel, reconduit chaque année scolaire. */
  abonnement: number;
}

export interface ModuleCycle {
  cycle: Cycle;
  nom: string;
  nomCourt: string;
  sousTitre: string;
  niveaux: string;
  tranches: Tranche[];
}

export const MODULES: Record<Cycle, ModuleCycle> = {
  primaire: {
    cycle: 'primaire',
    nom: 'École primaire',
    nomCourt: 'Primaire',
    niveaux: 'CP1 à CM2',
    sousTitre:
      'Compositions · Moyennes et rangs · Bilan annuel · Passage en classe supérieure',
    tranches: [
      { id: 'petit', nom: 'Petite école', description: 'Quartier, communautaire', effectifMax: 150, libelleEffectif: 'moins de 150 élèves', abonnement: 180_000 },
      { id: 'moyen', nom: 'École moyenne', description: 'Établissement établi', effectifMax: 400, libelleEffectif: '150 à 400 élèves', abonnement: 320_000 },
      { id: 'grand', nom: 'Grande école', description: 'Groupe scolaire', effectifMax: 800, libelleEffectif: '400 à 800 élèves', abonnement: 560_000 },
      { id: 'tres-grand', nom: 'Très grande école', description: 'Multi-sites, direction centrale', effectifMax: Infinity, libelleEffectif: 'plus de 800 élèves', abonnement: 880_000 },
    ],
  },
  college: {
    cycle: 'college',
    nom: 'Collège',
    nomCourt: 'Collège',
    niveaux: '6e à 3e',
    sousTitre:
      'Notes trimestrielles · Coefficients par matière · Conseil de classe · Préparation BEPC',
    tranches: [
      { id: 'petit', nom: 'Petit collège', description: 'Quartier, communautaire', effectifMax: 200, libelleEffectif: 'moins de 200 élèves', abonnement: 250_000 },
      { id: 'moyen', nom: 'Collège moyen', description: 'Établissement établi', effectifMax: 500, libelleEffectif: '200 à 500 élèves', abonnement: 420_000 },
      { id: 'grand', nom: 'Grand collège', description: 'Établissement important', effectifMax: 1000, libelleEffectif: '500 à 1 000 élèves', abonnement: 680_000 },
      { id: 'tres-grand', nom: 'Très grand collège', description: 'Multi-sites, direction centrale', effectifMax: Infinity, libelleEffectif: 'plus de 1 000 élèves', abonnement: 1_100_000 },
    ],
  },
  lycee: {
    cycle: 'lycee',
    nom: 'Lycée',
    nomCourt: 'Lycée',
    // Les lycées ivoiriens accueillent couramment le premier cycle : le module
    // Lycée couvre donc la 6e à la Terminale, et non la seule seconde.
    niveaux: '6e à Terminale',
    sousTitre:
      'Séries A, C et D · Coefficients par série · Orientation · Préparation BAC',
    tranches: [
      { id: 'petit', nom: 'Petit lycée', description: 'Établissement de proximité', effectifMax: 200, libelleEffectif: 'moins de 200 élèves', abonnement: 300_000 },
      { id: 'moyen', nom: 'Lycée moyen', description: 'Établissement établi', effectifMax: 500, libelleEffectif: '200 à 500 élèves', abonnement: 500_000 },
      { id: 'grand', nom: 'Grand lycée', description: "Lycée d'envergure", effectifMax: 1000, libelleEffectif: '500 à 1 000 élèves', abonnement: 800_000 },
      { id: 'tres-grand', nom: 'Très grand lycée', description: 'Multi-séries, BAC et prépa', effectifMax: Infinity, libelleEffectif: 'plus de 1 000 élèves', abonnement: 1_300_000 },
    ],
  },
};

export const CYCLES: Cycle[] = ['primaire', 'college', 'lycee'];

/* ───────────────────────────── Mise en service ───────────────────────────── */

export interface MiseEnService {
  tranche: TrancheId;
  nom: string;
  effectifs: string;
  prestations: string;
}

/**
 * Mise en service : offerte la première année, sans condition.
 *
 * Ce tableau ne porte donc plus de montant — seulement ce qui est livré. Le
 * budget de première année se confond avec l'abonnement, et c'est le message :
 * l'établissement paie son abonnement, l'installation ne s'y ajoute pas.
 */
export const MISE_EN_SERVICE: Record<TrancheId, MiseEnService> = {
  petit: { tranche: 'petit', nom: 'Petit établissement', effectifs: 'primaire moins de 150 · collège et lycée moins de 200', prestations: 'Paramétrage, import des élèves, 1 journée de formation' },
  moyen: { tranche: 'moyen', nom: 'Établissement moyen', effectifs: 'primaire 150–400 · collège et lycée 200–500', prestations: 'Paramétrage, reprise des données, 2 journées de formation' },
  grand: { tranche: 'grand', nom: 'Grand établissement', effectifs: 'primaire 400–800 · collège et lycée 500–1 000', prestations: 'Reprise complète, 3 journées de formation, accompagnement dédié' },
  'tres-grand': { tranche: 'tres-grand', nom: 'Très grand établissement', effectifs: 'primaire plus de 800 · collège et lycée plus de 1 000', prestations: 'Reprise multi-sites, 5 journées de formation, chef de projet dédié' },
};

/* ─────────────────────────────── Accompagnement ──────────────────────────── */

/**
 * L'accompagnement n'a plus de grille : il n'y a ni forfait ni durée à choisir.
 * La première année est entièrement couverte ; ensuite, seule une intervention
 * réellement demandée donne lieu à un chiffrage, établi sur sa complexité.
 *
 * Aucun montant ici, volontairement : afficher un prix reviendrait à recréer
 * le forfait que ce modèle remplace.
 */
export const ACCOMPAGNEMENT = {
  premiereAnnee: {
    titre: 'La première année est entièrement accompagnée',
    contenu:
      'Installation, paramétrage de l’année scolaire, reprise de vos données, création des comptes, formation des équipes et suivi jusqu’aux premiers bulletins. Rien de tout cela ne s’ajoute à votre abonnement.',
  },
  suivantes: {
    titre: 'Les années suivantes, à la demande',
    contenu:
      'L’assistance courante, les correctifs et les mises à jour restent compris dans l’abonnement. Seule une intervention que vous demandez — un développement particulier, une reprise de données exceptionnelle — fait l’objet d’un chiffrage, établi selon sa complexité et convenu avant d’être engagé.',
  },
  compris: [
    'Assistance par e-mail et WhatsApp',
    'Correctifs et mises à jour fonctionnelles',
    'Réponse sous 48 heures ouvrées',
  ],
} as const;

/**
 * Développements spécifiques.
 *
 * Message volontairement sans mention de prix ni de gratuité : on affirme que
 * le besoin propre à l'établissement est pris en charge, la question du
 * chiffrage se traitant en entretien, au cas par cas.
 */
export const SUR_MESURE = {
  titre: 'Un besoin que le logiciel ne couvre pas ? Nous le développons',
  chapo:
    'Chaque établissement a ses règles : un calcul de moyenne qui lui est propre, un modèle de bulletin hérité de son histoire, un état à produire pour sa tutelle.',
  contenu:
    'HorizonEcole n’est pas un logiciel figé. Les besoins qui sortent des fonctionnalités proposées sont pris en compte et développés pour votre établissement, puis intégrés à votre installation — vous les retrouvez à chaque mise à jour, sans manipulation de votre côté.',
  exemples: [
    'Un mode de calcul ou un barème propre à votre établissement',
    'Un modèle de bulletin ou de document conforme à vos usages',
    'Un état ou un export attendu par votre tutelle',
    'Une articulation avec un outil que vous utilisez déjà',
  ],
} as const;

/* ───────────────────────────────── Format ────────────────────────────────── */

const ESPACE_FINE = ' ';

/** « 1 200 000 » — séparateur d'espace fine insécable, conforme au PRD §11.2. */
export function formaterMontant(valeur: number): string {
  const signe = valeur < 0 ? '−' : '';
  return (
    signe +
    Math.abs(Math.round(valeur)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE)
  );
}

export function formaterFcfa(valeur: number): string {
  return `${formaterMontant(valeur)}${ESPACE_FINE}FCFA`;
}

export const MENTION_DEVISE =
  "Prix en FCFA (XOF) hors taxes. TVA de 18 % en sus si l'établissement y est assujetti.";
export const MENTION_HEBERGEMENT =
  "Ces tarifs couvrent la solution logicielle : abonnement, mises à jour, support et mise en service. L'hébergement — notre cloud ou votre propre serveur — se définit après, selon votre infrastructure, et fait l'objet d'un chiffrage séparé.";
