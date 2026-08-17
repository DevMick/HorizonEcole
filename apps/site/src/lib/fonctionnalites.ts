/**
 * Contenu des pages Fonctionnalités.
 *
 * Le périmètre décrit ici correspond à ce qui est réellement implémenté dans
 * l'application — voir docs/inventaire-fonctionnalites.md et les routeurs de
 * apps/api/src/routes. Ne rien ajouter qui n'existe pas dans le code.
 */

export interface Bloc {
  titre: string;
  texte: string;
}

export interface PageFonctionnalite {
  slug: string;
  titre: string;
  h1: string;
  chapo: string;
  description: string;
  accent: 'ink' | 'craie' | 'ambre';
  option?: boolean;
  blocs: Bloc[];
}

export const PAGES_FONCTIONNALITES: PageFonctionnalite[] = [
  {
    slug: 'proprietaire',
    titre: 'Espace Propriétaire',
    h1: 'Votre établissement en un écran, chaque matin',
    chapo:
      'Effectifs, assiduité, résultats, corps enseignant, recouvrement, occupation des salles : les indicateurs de votre établissement, comparés à l’année précédente, sans avoir à les demander à quiconque.',
    description:
      'Tableau de bord de direction : indicateurs par domaine, comparaison avec l’année précédente, points d’attention. Consultation seule.',
    accent: 'ink',
    blocs: [
      {
        titre: 'Une vue d’ensemble, dix indicateurs',
        texte:
          'La page d’accueil réunit les chiffres qui décident : effectif du jour, taux de présence, moyenne générale, montant restant à encaisser. Chacun est repris tel quel de l’écran qui en a la charge — jamais recalculé au passage, pour qu’un même chiffre ne prenne pas deux valeurs selon l’endroit où on le lit.',
      },
      {
        titre: 'Comparé à l’année précédente',
        texte:
          'Chaque indicateur est présenté avec son écart sur la même période de l’année dernière. Un effectif de 812 élèves ne dit rien ; « 812, soit 6 % de moins qu’à la même date l’an passé » dit quelque chose.',
      },
      {
        titre: 'Des points d’attention, pas seulement des chiffres',
        texte:
          'Des seuils de gestion signalent ce qui sort de l’ordinaire : une classe dont l’assiduité décroche, un recouvrement en retard sur le calendrier, des séances non appelées. Vous n’avez pas à chercher le problème, il remonte.',
      },
      {
        titre: 'Six domaines couverts',
        texte:
          'Effectifs et inscriptions · Assiduité et vie scolaire · Résultats, moyennes et classements, du primaire au secondaire · Corps enseignant · Finance, de ce qui est facturé à ce qui est encaissé · Emploi du temps et occupation des salles.',
      },
      {
        titre: 'Consultation seule, par construction',
        texte:
          'L’espace Propriétaire ne comporte aucune fonction d’écriture : il lit, il n’édite pas. Vous suivez la marche de l’établissement sans risquer de modifier une note, un paiement ou un dossier — et sans priver votre direction de ses prérogatives.',
      },
      {
        titre: 'Vous choisissez ce qui vous est ouvert',
        texte:
          'Chaque domaine peut être ouvert ou fermé indépendamment. Un propriétaire de groupe scolaire peut ne suivre que la finance et les effectifs, un autre demander l’ensemble.',
      },
    ],
  },
  {
    slug: 'administration',
    titre: 'Espace Administration',
    h1: 'Le dossier de l’école, tenu en un seul endroit',
    chapo:
      'Inscriptions, dossiers d’élèves, structure de l’année scolaire, droits d’accès : tout ce que le secrétariat et la direction tiennent au quotidien.',
    description:
      'Gestion des élèves, parents, inscriptions, classes, matières, rôles et droits, journal d’audit.',
    accent: 'ink',
    blocs: [
      { titre: 'Élèves, parents et inscriptions', texte: 'Le dossier suit l’élève d’une année sur l’autre. La réinscription ne demande pas de ressaisie, et le lien élève–parent ouvre l’accès de la famille à son espace.' },
      { titre: 'Année scolaire et périodes', texte: 'Trimestres ou semestres, dates de saisie, périodes de composition : la structure de l’année se paramètre une fois et gouverne tout le reste.' },
      { titre: 'Classes, matières et coefficients', texte: 'Chaque classe reçoit ses matières, ses coefficients et son professeur principal. Les affectations d’enseignants se font par matière et par classe.' },
      { titre: 'Rôles, droits et journal d’audit', texte: 'Chaque profil ne voit que ce qui le concerne. Les actions sensibles — suppression, modification de note, encaissement — sont tracées.' },
      { titre: 'Tableau de bord', texte: 'Effectifs, absences du jour, sessions non appelées, situation des encaissements : l’essentiel en une page.' },
    ],
  },
  {
    slug: 'enseignants',
    titre: 'Espace Enseignant',
    h1: 'Saisir ses notes et faire l’appel sans y passer la soirée',
    chapo:
      'L’enseignant retrouve ses classes, son emploi du temps et ses saisies en cours dès la page d’accueil.',
    description:
      'Saisie des notes, coefficients, moyennes, appel, conduite, bilan de période, emploi du temps.',
    accent: 'craie',
    blocs: [
      { titre: 'Saisie des notes par évaluation', texte: 'La saisie se fait en rafale, au clavier ou au doigt, classe entière à l’écran. Les moyennes se recalculent au fur et à mesure.' },
      { titre: 'Coefficients et moyennes pondérées', texte: 'Les coefficients par matière, par classe et par série sont appliqués automatiquement. Aucun calcul manuel, aucun tableur parallèle.' },
      { titre: 'Appel et feuille de présence', texte: 'L’appel se fait en quelques secondes par séance. Les sessions non appelées remontent à la direction.' },
      { titre: 'Notes de conduite et discipline', texte: 'Conduite par période, incidents et sanctions consignés dans le dossier de l’élève.' },
      { titre: 'Bilan de période', texte: 'Le professeur principal dispose d’une vue consolidée de sa classe pour préparer le conseil.' },
    ],
  },
  {
    slug: 'eleves-parents',
    titre: 'Espace Élève & Parent',
    h1: 'Les notes et les absences de votre enfant, dans votre poche',
    chapo:
      'Chaque famille dispose d’un compte sécurisé et consulte, depuis un téléphone, ce qui concerne son enfant — et rien d’autre.',
    description:
      'Consultation des notes, bulletins en ligne, absences, emploi du temps, situation des paiements.',
    accent: 'ambre',
    blocs: [
      { titre: 'Notes et moyennes en temps réel', texte: 'Dès qu’un enseignant valide une évaluation, la famille la voit. Plus d’attente jusqu’au bulletin.' },
      { titre: 'Bulletins en ligne', texte: 'Les bulletins de chaque période restent consultables et téléchargeables en PDF.' },
      { titre: 'Absences et retards', texte: 'Chaque absence est visible le jour même, avec son motif lorsqu’il est renseigné.' },
      { titre: 'Situation des paiements', texte: 'Le parent voit ce qui a été réglé, ce qui reste dû et les échéances à venir. Les relances cessent d’être une surprise.' },
      { titre: 'Comptes sécurisés individuels', texte: 'Un parent de plusieurs enfants les retrouve tous sous le même compte, sans accéder aux dossiers des autres familles.' },
    ],
  },
  {
    slug: 'scolarite-finances',
    titre: 'Scolarité & finances',
    h1: 'La scolarité et la caisse au même endroit',
    chapo:
      'Grille de frais, échéanciers, encaissements et reçus : le suivi du recouvrement cesse de vivre dans un cahier parallèle.',
    description:
      'Frais de scolarité, échéanciers, encaissements, reçus, factures, revenus et dépenses.',
    accent: 'ink',
    blocs: [
      { titre: 'Grille de frais et conditions de paiement', texte: 'Les frais se définissent par classe et par type. Les conditions de paiement s’appliquent ensuite automatiquement à chaque inscription.' },
      { titre: 'Échéanciers standards et personnalisés', texte: 'Un échéancier propre à une famille se met en place sans sortir du système, et reste suivi comme les autres.' },
      { titre: 'Encaissements et reçus', texte: 'Chaque versement est enregistré et donne lieu à un reçu imprimable. L’historique reste attaché à l’élève.' },
      { titre: 'Suivi du recouvrement', texte: 'À tout moment, le montant encaissé et le reste à recouvrer, par classe et pour l’établissement.' },
      { titre: 'Revenus, dépenses et justificatifs', texte: 'Les mouvements de caisse sont consignés avec leurs pièces, ce qui prépare le bilan de fin d’année.' },
    ],
  },
  {
    slug: 'bulletins-notes',
    titre: 'Bulletins & notes',
    h1: 'Les bulletins du trimestre en une après-midi',
    chapo:
      'Types d’évaluation, coefficients, moyennes pondérées, rangs, bilans : la chaîne complète, de la première note au bulletin imprimé.',
    description:
      'Types d’évaluation, coefficients par matière et par série, moyennes, rangs, bulletins PDF.',
    accent: 'ink',
    blocs: [
      { titre: 'Types d’évaluation paramétrables', texte: 'Interrogations, devoirs, compositions : chaque type porte son propre poids dans la moyenne de la matière.' },
      { titre: 'Coefficients par matière et par série', texte: 'Les séries A, C et D du lycée ont chacune leur grille. Un changement de série ne fausse pas l’historique.' },
      { titre: 'Moyennes et rangs', texte: 'Moyennes par matière, par période et générale ; rangs par matière et par classe, calculés sans intervention.' },
      { titre: 'Bulletins PDF', texte: 'Le bulletin est généré au format PDF, prêt à imprimer ou à publier dans l’espace des familles.' },
      { titre: 'Bilan de période et bilan annuel', texte: 'Le bilan consolide les périodes et prépare la décision de passage en classe supérieure.' },
    ],
  },
  {
    slug: 'presences-vie-scolaire',
    titre: 'Présences & vie scolaire',
    h1: 'Savoir qui est là, et le savoir le jour même',
    chapo:
      'Appel par séance, absences, retards, rattrapages, discipline et emploi du temps.',
    description:
      'Sessions d’appel, absences, retards, discipline, emploi du temps et exceptions.',
    accent: 'craie',
    blocs: [
      { titre: 'Sessions d’appel', texte: 'L’appel se fait par séance, à partir de l’emploi du temps. Les séances non appelées sont signalées à la direction.' },
      { titre: 'Absences et retards', texte: 'Chaque absence est datée, motivable et visible immédiatement par la famille.' },
      { titre: 'Absences d’enseignants et rattrapages', texte: 'Une séance non assurée peut être suivie et reprogrammée en rattrapage.' },
      { titre: 'Discipline et sanctions', texte: 'Les incidents et les sanctions sont consignés dans le dossier de l’élève, avec leur suite.' },
      { titre: 'Emploi du temps et exceptions', texte: 'Créneaux, salles et enseignants ; les exceptions ponctuelles se saisissent sans casser la grille de référence.' },
    ],
  },
  {
    slug: 'paie-personnel',
    titre: 'Paie & personnel',
    h1: 'La paie du personnel, dans le même système',
    chapo:
      'Contrats, barème d’ancienneté, heures effectuées, acomptes et bulletins de paie.',
    description:
      'Module optionnel : contrats, heures des enseignants, acomptes, bulletins de paie.',
    accent: 'ambre',
    option: true,
    blocs: [
      { titre: 'Personnel et contrats', texte: 'Le dossier de chaque agent, son contrat, son statut et son historique.' },
      { titre: 'Barème d’ancienneté', texte: 'Le salaire suit le barème et l’ancienneté, sans recalcul manuel chaque année.' },
      { titre: 'Heures effectuées des enseignants', texte: 'Les heures assurées alimentent la rémunération des vacataires, à partir de l’emploi du temps réel.' },
      { titre: 'Acomptes et prorata', texte: 'Les avances et les entrées en cours de mois sont gérées au prorata.' },
      { titre: 'Bulletins de paie', texte: 'Le bulletin est généré et archivé, mois après mois.' },
    ],
  },
];

export function pageParSlug(slug: string) {
  return PAGES_FONCTIONNALITES.find((p) => p.slug === slug);
}
