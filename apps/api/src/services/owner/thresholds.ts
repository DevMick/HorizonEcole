/**
 * Seuils d'alerte de l'espace Propriétaire (§11-Q9).
 *
 * Codés en dur pour ce lot, mais regroupés ici plutôt que dispersés dans les
 * services : ce sont des normes de gestion propres à l'établissement, appelées
 * à devenir paramétrables. Les rassembler rend ce passage mécanique, et évite
 * qu'un même seuil prenne deux valeurs selon l'écran.
 */

/** Au-delà, la classe est en surcharge : plus d'élèves que de places visées. */
export const OVERCROWDED_OCCUPANCY = 1;

/** En deçà, la classe est en sous-effectif — un coût fixe mal amorti. */
export const UNDERUSED_OCCUPANCY = 0.6;

/**
 * En deçà, une salle est sous-utilisée (`RES-02`).
 *
 * Plus bas que le seuil des classes : une salle spécialisée — laboratoire,
 * salle informatique — occupe légitimement moins de créneaux qu'une salle
 * banalisée, sans être pour autant un actif dormant.
 */
export const UNDERUSED_ROOM_OCCUPANCY = 0.25;

/**
 * Moyenne de passage sur 20, au secondaire.
 *
 * Les mentions, elles, ne sont pas redéfinies ici : elles réutilisent
 * `getMention()` du module primaire, dont les bandes (90 %, 80 %, 70 %, 60 %,
 * 50 % de l'échelle) sont déjà la règle de la maison. Poser un second barème
 * pour le secondaire créerait deux vérités pour une même notion.
 */
export const PASS_MARK_20 = 10;

/**
 * Seuils d'alerte de la page d'accueil (§11-Q9).
 *
 * Ils ne décident de rien : ils décident seulement de ce qui **remonte** en
 * « point d'attention ». Un seuil mal réglé fait du bruit ou masque un signal,
 * jamais une erreur de calcul — d'où le choix de les figer ici en attendant que
 * le métier les tranche (décision D7).
 */
export const ALERT = {
  /** En deçà, le recouvrement mérite une relance. */
  collectionRate: 0.6,
  /** Recouvrement encore acceptable, mais à surveiller. */
  collectionWarning: 0.8,
  /** En deçà, le taux de réussite interroge. */
  successRate: 0.7,
  /** En deçà, la note de conduite moyenne signale un climat dégradé. */
  conductNote: 10,
  /** En deçà, la présence décroche. */
  presenceRate: 0.9,
  /** Au-delà, le taux de réinscription est jugé sain. */
  retentionRate: 0.85,
} as const;
