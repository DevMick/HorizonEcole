/**
 * Générateur de la présentation HorizonEcole.
 * Données et mise en page sont réunies ici pour permettre une régénération
 * complète après correction, sans retoucher un fichier .pptx à la main.
 *
 * Lancer avec : NODE_PATH=<scratchpad>/node_modules node build-deck.js
 */
const path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, 'assets', 'cropped');
const LOGO = path.join(__dirname, 'assets', 'logo.png');
const OUT = path.join(__dirname, 'HorizonEcole-Presentation.pptx');

// ---------------------------------------------------------------------------
// Palette & typographie (charte de l'application)
// ---------------------------------------------------------------------------
const INK = '4A5FA8'; // bleu encre — primaire
const DARK = '293770'; // bleu foncé — titres, fonds de section
const AMBER = 'E8A33D'; // accent
const GREEN = '2F9468'; // succès
const TEXT = '1F2733'; // gris texte
const WHITE = 'FFFFFF';
const MUTED = '5B6376'; // gris secondaire sur fond clair
const CARD_BG = 'F4F5FA'; // fond de carte très clair
const CARD_LINE = 'DDE1F0';
const DARK_MUTED = 'C7CDE8'; // texte secondaire sur fond sombre
const DARK_CARD = '32407D'; // carte sur fond sombre

const TITLE_FONT = 'Cambria';
const BODY_FONT = 'Calibri';

const PAGE_W = 13.333;
const PAGE_H = 7.5;
const MARGIN = 0.7;
const CONTENT_W = PAGE_W - 2 * MARGIN;

// Zones fixes du gabarit "capture + puces"
const KICKER_Y = 0.42;
const TITLE_Y = 0.72;
const TITLE_H = 0.62;
const IMG_TOP = 1.5;
const IMG_H = 3.55; // bas de la zone image = 5.05
const BULLETS_Y = 5.28;
const BULLETS_H = 1.7;
const FOOTER_Y = 7.12;

// ---------------------------------------------------------------------------
// Helpers de rendu
// ---------------------------------------------------------------------------

function bg(slide, color) {
  slide.background = { color };
}

function footer(slide, pageNum, dark) {
  slide.addText('HorizonEcole', {
    x: MARGIN, y: FOOTER_Y, w: 4, h: 0.3,
    fontFace: BODY_FONT, fontSize: 9, color: dark ? DARK_MUTED : '9098B0',
    margin: 0,
  });
  slide.addText(String(pageNum), {
    x: PAGE_W - MARGIN - 0.6, y: FOOTER_Y, w: 0.6, h: 0.3,
    fontFace: BODY_FONT, fontSize: 9, color: dark ? DARK_MUTED : '9098B0',
    align: 'right', margin: 0,
  });
}

function kickerTitle(slide, kicker, title, dark, titleSize) {
  slide.addText(kicker.toUpperCase(), {
    x: MARGIN, y: KICKER_Y, w: CONTENT_W, h: 0.28,
    fontFace: BODY_FONT, fontSize: 11, bold: true, charSpacing: 2,
    color: dark ? AMBER : INK, margin: 0,
  });
  slide.addText(title, {
    x: MARGIN, y: TITLE_Y, w: CONTENT_W, h: TITLE_H,
    fontFace: TITLE_FONT, fontSize: titleSize || 25, bold: true,
    color: dark ? WHITE : DARK, margin: 0, valign: 'top',
  });
}

function bulletsBlock(slide, bullets, dark) {
  const paras = bullets.map((b, i) => ({
    text: b,
    options: {
      bullet: { code: '25AA', color: AMBER, indent: 18 },
      color: dark ? 'E8EAF6' : TEXT,
      fontSize: 13,
      fontFace: BODY_FONT,
      breakLine: true,
      paraSpaceAfter: 10,
    },
  }));
  slide.addText(paras, {
    x: MARGIN, y: BULLETS_Y, w: CONTENT_W, h: BULLETS_H,
    valign: 'top', margin: 0, lineSpacingMultiple: 1.08,
  });
}

async function screenshotBox(slide, imgRelPath, dark) {
  const full = path.join(ASSETS, imgRelPath);
  const meta = await sharp(full).metadata();
  const ratio = meta.width / meta.height;
  const maxW = CONTENT_W;
  const maxH = IMG_H;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  const x = (PAGE_W - w) / 2;
  const y = IMG_TOP + (maxH - h) / 2;

  // Carte de fond (visible surtout sur fond sombre, légère sur fond clair)
  const pad = 0.12;
  slide.addShape('roundRect', {
    x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2,
    rectRadius: 0.06,
    fill: { color: WHITE },
    line: { color: dark ? DARK_CARD : CARD_LINE, width: dark ? 0 : 1 },
    shadow: dark
      ? undefined
      : { type: 'outer', color: '1F2733', opacity: 0.18, blur: 10, offset: 3, angle: 90 },
  });
  slide.addImage({ path: full, x, y, w, h });
}

function newSlide(pres, dark) {
  const slide = pres.addSlide();
  bg(slide, dark ? DARK : WHITE);
  return slide;
}

// Carte générique (utilisée par les diagrammes de concept)
function addCard(slide, x, y, w, h, title, desc, dark, opts = {}) {
  slide.addShape('roundRect', {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: dark ? DARK_CARD : CARD_BG },
    line: { color: dark ? '3D4C8C' : CARD_LINE, width: 1 },
  });
  const pad = 0.22;
  if (title) {
    slide.addText(title, {
      x: x + pad, y: y + 0.16, w: w - pad * 2, h: 0.45,
      fontFace: TITLE_FONT, bold: true, fontSize: opts.titleSize || 15,
      color: opts.titleColor || (dark ? WHITE : DARK), margin: 0,
    });
  }
  if (desc) {
    const items = Array.isArray(desc) ? desc : [desc];
    slide.addText(
      items.map((t) => ({
        text: t,
        options: {
          bullet: items.length > 1 ? { code: '25AA', color: AMBER, indent: 14 } : false,
          breakLine: true,
          paraSpaceAfter: 6,
        },
      })),
      {
        x: x + pad, y: y + (title ? 0.62 : 0.18), w: w - pad * 2, h: h - (title ? 0.8 : 0.34),
        fontFace: BODY_FONT, fontSize: opts.descSize || 11.5,
        color: dark ? DARK_MUTED : MUTED, margin: 0, valign: 'top', lineSpacingMultiple: 1.05,
      },
    );
  }
}

function addBadge(slide, x, y, d, letter, color) {
  slide.addShape('ellipse', {
    x, y, w: d, h: d, fill: { color }, line: { type: 'none' },
  });
  slide.addText(letter, {
    x, y, w: d, h: d, align: 'center', valign: 'middle',
    fontFace: TITLE_FONT, bold: true, fontSize: d * 34, color: WHITE, margin: 0,
  });
}

// ---------------------------------------------------------------------------
// Contenu — sections et slides
// ---------------------------------------------------------------------------

// Chaque entrée "screenshot" : { kicker, title, image, bullets, dark? }
// Les slides de concept ont un champ `render(slide, pageNum)` dédié.

const primaireStats = 'Groupe Scolaire les Palmiers — 36 élèves, 6 classes CP1 à CM2, 5 enseignants, 20 parents.';
const secondaireStats = 'Lycée Moderne de Cocody — 43 élèves, 2 classes, 8 enseignants, 41 parents.';

const screenshotSlides = [
  // ---- ÉCOLE PRIMAIRE — ADMINISTRATION -------------------------------
  {
    part: 'primaire', dark: true,
    kicker: 'École primaire — Administration',
    title: 'Se connecter et prendre la mesure de l’école',
    image: 'admin/tableau-de-bord.png',
    bullets: [
      'La connexion se fait par e-mail et mot de passe, sans jamais choisir son établissement.',
      'Le tableau de bord ouvre sur cinq groupes de menu, du plus quotidien au plus rare.',
      primaireStats,
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Administration',
    title: 'Élèves et parents : une identité avant une classe',
    image: 'admin/eleves-liste.png',
    bullets: [
      'Une fiche élève enregistre une identité — nom, naissance, matricule — sans indiquer de classe.',
      'C’est l’inscription, plus loin, qui rattache l’enfant à une classe pour l’année.',
      'Un parent rattaché à un élève peut recevoir un accès à l’Espace Famille.',
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Administration',
    title: 'L’année scolaire porte les inscriptions',
    image: 'admin/inscriptions.png',
    bullets: [
      'Une seule année est « en cours » à la fois ; elle sert de référence par défaut à tous les écrans.',
      'L’inscription fait entrer un élève dans une classe — une classe entière en une seule opération.',
      'Sans elle, rien ne suit en aval : ni composition, ni bulletin.',
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Administration',
    title: 'CP1 à CM2 : une grille de matières, un diviseur déduit',
    image: 'admin/primaire-classe-config.png',
    bullets: [
      'Six niveaux, chacun avec sa propre grille de matières et ses seuils de passage.',
      'Chaque matière porte un barème ; l’application additionne les barèmes et en déduit le diviseur.',
      'Ce diviseur de la moyenne n’est jamais saisi à la main.',
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Administration',
    title: 'Des notes saisies aux bulletins imprimables',
    image: 'admin/primaire-resultats.png',
    bullets: [
      'Une composition est un devoir commun à toute une classe, à une date donnée.',
      'Une fois les notes saisies, l’écran calcule moyennes, classement et mentions.',
      'Quatre boutons produisent directement les bulletins en PDF.',
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Administration',
    title: 'La finance : échéanciers et paiements',
    image: 'admin/finance-paiements-classe.png',
    bullets: [
      'Un échéancier définit les tranches de versement, puis s’affecte à des classes.',
      'Choisi classe par classe, l’écran affiche pour chaque élève ce qu’il doit et ce qu’il a réglé.',
      'C’est là que le secrétariat enregistre un versement reçu.',
    ],
  },
  // ---- ÉCOLE PRIMAIRE — ENSEIGNANT -----------------------------------
  {
    part: 'primaire',
    kicker: 'École primaire — Enseignant',
    title: 'Un espace cadré par une seule classe',
    image: 'enseignant/tableau-de-bord.png',
    bullets: [
      'L’enseignant du primaire est titulaire d’une classe et y enseigne toutes les matières.',
      'Le menu tient en sept destinations, pensé pour une consultation au téléphone.',
      'Rien à configurer : barèmes, seuils et calendrier des compositions sont déjà fixés.',
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Enseignant',
    title: 'Ma classe : barèmes, seuils, effectif',
    image: 'enseignant/ma-classe.png',
    bullets: [
      'L’écran à consulter avant la première composition de l’année.',
      'Il indique sur quoi on note, et à partir de quelle moyenne un élève est admis.',
      'La liste des élèves reprend l’effectif enregistré par l’administration.',
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Enseignant',
    title: 'Saisir les notes, composition par composition',
    image: 'enseignant/saisie-notes-grille.png',
    bullets: [
      'Les élèves en lignes, les matières en colonnes — le seul écran où l’enseignant écrit.',
      'Une case laissée vide n’est pas neutre : elle compte pour zéro dans le calcul.',
      'Le bouton d’enregistrement se trouve tout en bas de la grille.',
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Enseignant',
    title: 'Résultats et bilan annuel',
    image: 'enseignant/resultats.png',
    bullets: [
      'Chaque composition produit moyennes, rangs, mentions et bulletins PDF.',
      'Le bilan annuel réunit les compositions de l’année avec la décision de passage.',
      'C’est le document du conseil des maîtres.',
    ],
  },
  // ---- ÉCOLE PRIMAIRE — PARENT ---------------------------------------
  {
    part: 'primaire',
    kicker: 'École primaire — Parent',
    title: 'L’Espace Famille, en lecture seule',
    image: 'parent/espace-famille.png',
    bullets: [
      'Un parent consulte, il ne modifie rien — toute correction passe par le secrétariat.',
      'Une barre d’onglets bascule d’un enfant à l’autre lorsqu’il y en a plusieurs.',
      'La page d’accueil résume les cours du jour, les dernières compositions et l’assiduité.',
    ],
  },
  {
    part: 'primaire',
    kicker: 'École primaire — Parent',
    title: 'Résultats et bulletins de l’enfant',
    image: 'parent/resultats.png',
    bullets: [
      'Trois indicateurs situent l’enfant dans sa classe : notes, rang, moyenne annuelle.',
      'Le détail matière par matière précède la moyenne de l’année.',
      'Les bulletins édités par l’école sont accessibles directement depuis cet écran.',
    ],
  },

  // ---- SECONDAIRE — ADMINISTRATION -----------------------------------
  {
    part: 'secondaire', dark: true,
    kicker: 'Secondaire — Administration',
    title: 'Un même menu, de la 6ème à la Terminale',
    image: 'lycee-admin/tableau-de-bord.png',
    bullets: [
      'Un lycée reprend les classes du collège : nul besoin de deux applications pour deux cycles.',
      'Six groupes de menu, un de plus qu’au primaire — la Pédagogie remplace l’École Primaire.',
      secondaireStats,
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Administration',
    title: 'Élèves, parents, enseignants',
    image: 'lycee-admin/eleves-liste.png',
    bullets: [
      'Même principe qu’au primaire : une fiche d’abord, un rattachement ensuite.',
      'Le matricule est ici saisissable — il vient souvent du dossier d’origine de l’élève.',
      'Un enseignant du secondaire assure une matière dans plusieurs classes, l’inverse du primaire.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Administration',
    title: 'L’année académique et l’emploi du temps',
    image: 'lycee-admin/emploi-du-temps-classe.png',
    bullets: [
      'Les salles de classe apparaissent : chaque créneau peut en désigner une.',
      'L’emploi du temps est le document le plus structurant : l’appel en découle, et donc la conduite.',
      'Il se construit classe par classe, sur toute la semaine.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Administration',
    title: 'La pédagogie : classes, matières, affectations',
    image: 'lycee-admin/affectations.png',
    bullets: [
      'Les matières forment un catalogue unique, affecté ensuite aux classes qui les enseignent.',
      'Sans affectation, une classe n’a aucun programme et aucune note n’est possible.',
      'Un compteur (« 8 / 8 sélectionnées ») indique l’avancement de l’affectation.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Administration',
    title: 'Les coefficients, moteur du classement',
    image: 'lycee-admin/coefficients.png',
    bullets: [
      'Chaque matière reçoit un coefficient propre à sa classe.',
      'Le français ne pèse pas le même poids en 6ème et en Terminale littéraire.',
      'C’est ce réglage qui distingue le calcul de moyenne du secondaire de celui du primaire.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Administration',
    title: 'La conduite, calculée sans être saisie',
    image: 'lycee-admin/conduite.png',
    bullets: [
      'La note de départ est de 20 points.',
      'Chaque tranche de deux heures d’absence non justifiée retire un point.',
      'La conduite entre ensuite dans la moyenne générale comme une matière à part entière.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Administration',
    title: 'Moyennes complètes et bulletins',
    image: 'lycee-admin/moyennes-completes.png',
    bullets: [
      'L’aboutissement de la chaîne : une moyenne et un rang par matière, une moyenne générale.',
      'La moyenne générale (MG) classe l’élève dans sa classe.',
      'C’est ici que l’administration décide de la publication des bulletins aux familles.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Administration',
    title: 'L’assiduité, séance par séance',
    image: 'lycee-admin/liste-presence.png',
    bullets: [
      'L’appel est fait par chaque enseignant, à chaque séance, depuis son propre espace.',
      'Cet écran cumule les appels d’une classe sur l’année, matière par matière.',
      'L’écran des séances non tenues signale, lui, les appels qui manquent encore.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Administration',
    title: 'La finance au secondaire',
    image: 'lycee-admin/paiements-classe.png',
    bullets: [
      'Même logique qu’au primaire : un échéancier défini une fois, affecté à des classes.',
      'L’écran de paiements affiche, classe par classe, le montant versé et le pourcentage réglé.',
      'Exemple observé : 8 750 000 FCFA facturés sur l’année, pour 79 % de recouvrement.',
    ],
  },
  // ---- SECONDAIRE — ENSEIGNANT ----------------------------------------
  {
    part: 'secondaire',
    kicker: 'Secondaire — Enseignant',
    title: 'Un espace cadré par les affectations',
    image: 'lycee-enseignant/tableau-de-bord.png',
    bullets: [
      'L’enseignant du secondaire ne voit que ses classes et sa matière.',
      'Deux gestes structurent son travail : faire l’appel, saisir ses notes.',
      'Quatre raccourcis en haut du tableau de bord mènent directement à ces écrans.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Enseignant',
    title: 'Faire l’appel, séance par séance',
    image: 'lycee-enseignant/liste-presence.png',
    bullets: [
      'L’appel est adossé à l’emploi du temps : l’application propose les séances du jour.',
      'Les flèches « jour précédent / jour suivant » permettent de rattraper un appel oublié.',
      'Chaque présence enregistrée met à jour, en coulisse, la conduite de l’élève.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Enseignant',
    title: 'Types d’évaluation et saisie des notes',
    image: 'lycee-enseignant/notes-classements.png',
    bullets: [
      'Un type d’évaluation — « Devoir 1 », « Composition » — est une colonne du carnet de notes.',
      'Les types sont propres au couple classe + matière, chacun avec son coefficient.',
      'La moyenne se recalcule à mesure que l’enseignant saisit, cellule par cellule.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Enseignant',
    title: 'Moyennes et classement de la matière',
    image: 'lycee-enseignant/moyennes-trimestre.png',
    bullets: [
      'Le résultat de la saisie : les élèves classés par moyenne décroissante.',
      'Le classement porte sur la matière et le trimestre choisis.',
      'Chaque ligne rappelle le détail des évaluations qui composent la moyenne.',
    ],
  },
  // ---- SECONDAIRE — PARENT --------------------------------------------
  {
    part: 'secondaire',
    kicker: 'Secondaire — Parent',
    title: 'L’Espace Famille, avec l’assiduité en plus',
    image: 'lycee-parent/espace-famille.png',
    bullets: [
      'Même principe qu’au primaire : lecture seule, un onglet par enfant.',
      'La page d’accueil ajoute ce qui n’existe pas en primaire : l’assiduité, les derniers appels.',
      'Toute correction reste du ressort du secrétariat ou de l’enseignant concerné.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Parent',
    title: 'Présences et résultats',
    image: 'lycee-parent/resultats.png',
    bullets: [
      'Les notes de l’enfant, matière par matière, avec le coefficient qui en dit le poids.',
      'L’écran des présences détaille chaque séance et explique la note de conduite.',
      'Les bulletins de chaque trimestre sont accessibles depuis le même espace.',
    ],
  },
  // ---- SECONDAIRE — ÉLÈVE ---------------------------------------------
  {
    part: 'secondaire',
    kicker: 'Secondaire — Élève',
    title: 'Ma Scolarité, à la première personne',
    image: 'lycee-eleve/ma-scolarite.png',
    bullets: [
      'Un espace propre à l’élève, en lecture seule, pensé pour un usage au téléphone.',
      'Deux chiffres résument l’année et se retrouvent partout : moyenne générale, taux de présence.',
      'Quatre raccourcis mènent aux écrans les plus consultés.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Élève',
    title: 'Mes présences',
    image: 'lycee-eleve/mes-presences.png',
    bullets: [
      'L’historique complet des appels, de la séance la plus récente à la plus ancienne.',
      'C’est l’écran où l’élève vérifie une absence qu’il estime injustifiée.',
      'Les filtres ciblent un trimestre ou une matière.',
    ],
  },
  {
    part: 'secondaire',
    kicker: 'Secondaire — Élève',
    title: 'Mes notes et mes bulletins',
    image: 'lycee-eleve/mes-notes.png',
    bullets: [
      'Chaque matière indique son coefficient, son nombre de notes et la moyenne qui en résulte.',
      'Déplier une matière donne le détail de chaque note et son type d’évaluation.',
      'Les bulletins n’apparaissent qu’une fois édités par l’administration, trimestre par trimestre.',
    ],
  },

  // ---- ESPACE PROPRIÉTAIRE --------------------------------------------
  {
    part: 'owner', dark: true,
    kicker: 'Espace propriétaire',
    title: 'Neuf chiffres, deux courbes, une vue d’ensemble',
    image: 'lycee-owner/vue-ensemble.png',
    bullets: [
      'Un compte Propriétaire conduit directement au pilotage — aucun écran de gestion.',
      'Les cartes du haut sont calculées comme les écrans de détail : un chiffre ne peut pas y diverger.',
      'Une année de comparaison, facultative, fait apparaître les écarts d’une année sur l’autre.',
    ],
  },
  {
    part: 'owner',
    kicker: 'Espace propriétaire',
    title: 'Les effectifs',
    image: 'lycee-owner/effectifs.png',
    bullets: [
      'Répartition par classe, par niveau, par sexe, et fidélisation d’une année sur l’autre.',
      'Le tableau de remplissage classe par classe permet de repérer une classe à rééquilibrer.',
      'Trois filtres — niveau, classe, sexe — s’appliquent à tout l’écran.',
    ],
  },
  {
    part: 'owner',
    kicker: 'Espace propriétaire',
    title: 'L’assiduité',
    image: 'lycee-owner/assiduite.png',
    bullets: [
      'N’existe pas dans une école primaire pure — l’appel par séance est un mécanisme du secondaire.',
      'Le bloc « couverture de l’appel » dit si les autres chiffres sont dignes de foi.',
      'Les absences par matière signalent la classe ou la discipline à surveiller.',
    ],
  },
  {
    part: 'owner',
    kicker: 'Espace propriétaire',
    title: 'Les résultats',
    image: 'lycee-owner/resultats.png',
    bullets: [
      'Moyennes, taux de réussite et classements, matière par matière et classe par classe.',
      'Le bloc « évolution par matière » répond à la question qui compte : qui décroche, depuis quand.',
      'Quatre filtres — trimestre, niveau, classe, matière — recadrent la lecture.',
    ],
  },
  {
    part: 'owner',
    kicker: 'Espace propriétaire',
    title: 'Les enseignants',
    image: 'lycee-owner/enseignants.png',
    bullets: [
      'Effectif, contrats, charge horaire et couverture des matières.',
      'Un avertissement le rappelle : seuls les enseignants sont modélisés, pas le personnel administratif.',
      'Sert à repérer une matière mal couverte avant qu’elle ne pèse sur les résultats.',
    ],
  },
  {
    part: 'owner',
    kicker: 'Espace propriétaire',
    title: 'La finance',
    image: 'lycee-owner/finance.png',
    bullets: [
      'Ce qui est facturé, ce qui est encaissé, ce qui manque — et depuis quand.',
      'En cours d’année, c’est le recouvrement à échéance qu’il faut lire, pas le taux brut.',
      'Sert à cibler la relance d’une famille en retard plutôt qu’une relance générale.',
    ],
  },

  // ---- TRANSVERSES ------------------------------------------------------
  {
    part: 'transverses',
    kicker: 'Transverses',
    title: 'Rôles et droits : un seul mécanisme',
    image: 'admin/roles.png',
    bullets: [
      'Un rôle décide des menus visibles pour les comptes qui le portent.',
      'Deux rôles existent d’office : Administrateur, qui voit tout, et Propriétaire, réservé au pilotage.',
      'Créer un rôle revient à cocher, groupe par groupe, les entrées de la barre latérale.',
    ],
  },
  {
    part: 'transverses',
    kicker: 'Transverses',
    title: 'Chaque compte, un rôle, un périmètre précis',
    image: 'admin/roles-nouveau.png',
    bullets: [
      'Chaque case cochée correspond exactement à une entrée du menu — rien de plus.',
      'Un compte utilisateur est distinct de la fiche personne : la fiche seule ne suffit pas.',
      'Le compte administrateur principal porte la mention « Protégé ».',
    ],
  },
  {
    part: 'transverses',
    kicker: 'Transverses',
    title: 'Les documents produits',
    image: 'lycee-admin/notes-par-matiere.png',
    bullets: [
      'Bulletins, fiches de classement et emplois du temps s’exportent en PDF depuis l’écran qui les calcule.',
      'Le document reprend toujours les mêmes chiffres que l’écran qui l’a produit.',
      'Ce sont ces documents que les familles reçoivent, sans ressaisie.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

async function build() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'HorizonEcole';
  pres.title = 'HorizonEcole — Présentation';

  let pageNum = 1;
  const nextPage = () => pageNum++;

  // ===== 1. OUVERTURE ======================================================
  {
    const slide = newSlide(pres, true);
    slide.addImage({ path: LOGO, x: PAGE_W / 2 - 0.7, y: 1.55, w: 1.4, h: 1.4 });
    slide.addText('HorizonEcole', {
      x: 0, y: 3.15, w: PAGE_W, h: 0.9, align: 'center',
      fontFace: TITLE_FONT, bold: true, fontSize: 44, color: WHITE, margin: 0,
    });
    slide.addText('Gestion scolaire, du primaire à la Terminale', {
      x: 0, y: 4.0, w: PAGE_W, h: 0.5, align: 'center',
      fontFace: BODY_FONT, fontSize: 18, color: AMBER, margin: 0,
    });
    slide.addText('Présentation produit — direction d’établissement, investisseurs, salons professionnels', {
      x: PAGE_W / 2 - 4.5, y: 4.65, w: 9, h: 0.4, align: 'center',
      fontFace: BODY_FONT, fontSize: 12, color: DARK_MUTED, margin: 0,
    });
    footer(slide, nextPage(), true);
  }

  {
    const slide = newSlide(pres, false);
    kickerTitle(slide, 'Ouverture', 'Un établissement scolaire, trois outils qui ne se parlent pas', false);
    const cards = [
      ['Cahier de notes', 'Sur papier ou dans un tableur, propre à chaque enseignant.'],
      ['Registre de présence', 'Tenu séparément, rarement recoupé avec les résultats.'],
      ['Suivi financier', 'Un tableur de comptabilité, à jour selon la disponibilité de qui le tient.'],
    ];
    const cw = (CONTENT_W - 0.6) / 3;
    cards.forEach(([t, d], i) => {
      addCard(slide, MARGIN + i * (cw + 0.3), 2.0, cw, 2.3, t, d, false, { titleSize: 15, descSize: 12 });
    });
    slide.addText('Trois sources distinctes, trois versions possibles d’un même chiffre.', {
      x: MARGIN, y: 4.65, w: CONTENT_W, h: 0.5, align: 'center',
      fontFace: BODY_FONT, italic: true, fontSize: 14, color: MUTED, margin: 0,
    });
    footer(slide, nextPage(), false);
  }

  {
    const slide = newSlide(pres, true);
    kickerTitle(slide, 'Ouverture', 'Une application, un établissement, cinq façons d’y accéder', true);
    const roles = [
      ['A', 'Administration', INK],
      ['E', 'Enseignant', GREEN],
      ['P', 'Parent', AMBER],
      ['É', 'Élève', '7C8FD6'],
      ['O', 'Propriétaire', 'C97A2B'],
    ];
    const cw = (CONTENT_W - 4 * 0.25) / 5;
    roles.forEach(([letter, label, color], i) => {
      const x = MARGIN + i * (cw + 0.25);
      addBadge(slide, x + cw / 2 - 0.35, 2.0, 0.7, letter, color);
      slide.addText(label, {
        x, y: 2.85, w: cw, h: 0.5, align: 'center',
        fontFace: BODY_FONT, bold: true, fontSize: 12.5, color: WHITE, margin: 0,
      });
    });
    addCard(
      slide, MARGIN, 3.85, CONTENT_W, 1.9,
      null,
      [
        'Deux modèles pédagogiques — primaire, et secondaire de la 6ème à la Terminale — dans une seule base.',
        'Chaque profil ouvre sur un espace cadré à ce qu’il doit voir, ni plus, ni moins.',
        'Toutes les données convergent vers les mêmes bulletins et les mêmes tableaux de pilotage.',
      ],
      true,
      { descSize: 13.5 },
    );
    footer(slide, nextPage(), true);
  }

  // ===== 2. VUE D'ENSEMBLE DU PRODUIT ======================================
  {
    const slide = newSlide(pres, false);
    kickerTitle(slide, 'Vue d’ensemble', 'Deux modèles d’établissement', false);
    const cw = (CONTENT_W - 0.4) / 2;
    addCard(slide, MARGIN, 1.7, cw, 4.3, 'École primaire', [
      'Six niveaux : CP1, CP2, CE1, CE2, CM1, CM2.',
      'Compositions communes à toute la classe.',
      'Moyenne = total des notes ÷ diviseur déduit des barèmes.',
      'Bulletins et fiches de classement par composition.',
    ], false, { titleSize: 18, descSize: 13, titleColor: INK });
    addCard(slide, MARGIN + cw + 0.4, 1.7, cw, 4.3, 'Secondaire — 6ème à Terminale', [
      'Un lycée scolarise aussi les classes de collège.',
      'Matières affectées par classe, chacune avec un coefficient.',
      'Moyennes trimestrielles pondérées par les coefficients.',
      'Conduite et assiduité par séance, propres au secondaire.',
    ], false, { titleSize: 18, descSize: 13, titleColor: INK });
    footer(slide, nextPage(), false);
  }

  {
    const slide = newSlide(pres, false);
    kickerTitle(slide, 'Vue d’ensemble', 'Cinq profils, cinq espaces', false);
    const roles = [
      ['Administration', 'Gère les personnes, l’année, la pédagogie, la finance et les droits.', INK],
      ['Enseignant', 'Primaire : titulaire d’une classe, toutes matières. Secondaire : une matière, plusieurs classes.', GREEN],
      ['Parent', 'Espace Famille, lecture seule, bascule entre ses enfants.', AMBER],
      ['Élève', '« Ma Scolarité », lecture seule, à la première personne.', '5A6BB5'],
      ['Propriétaire', 'Six écrans de pilotage analytique, en lecture seule.', 'B5792A'],
    ];
    const cw = (CONTENT_W - 4 * 0.25) / 5;
    roles.forEach(([t, d, c], i) => {
      addCard(slide, MARGIN + i * (cw + 0.25), 1.75, cw, 4.2, t, d, false, { titleSize: 13.5, descSize: 11, titleColor: c });
    });
    footer(slide, nextPage(), false);
  }

  screenshotSlides.unshift(); // no-op placeholder to keep array reference stable
  {
    const slide = newSlide(pres, false);
    kickerTitle(slide, 'Vue d’ensemble', 'Le type d’établissement décide de ce que vous voyez', false);
    await screenshotBox(slide, 'admin/etablissement.png', false);
    bulletsBlock(slide, [
      'Le champ « Type d’école » de la fiche établissement commande tout le menu affiché.',
      'En primaire, ni coefficients, ni conduite, ni présence par séance.',
      'Un lycée reprend aussi les classes de collège : un seul menu, cohérent de la 6ème à la Terminale.',
    ], false);
    footer(slide, nextPage(), false);
  }

  {
    const slide = newSlide(pres, false);
    kickerTitle(slide, 'Vue d’ensemble', 'Une chaîne unique, du premier jour au bulletin', false);
    const steps = ['Année scolaire', 'Inscriptions', 'Notes (ou appel)', 'Bulletins'];
    const cw = (CONTENT_W - 3 * 0.5) / 4;
    steps.forEach((s, i) => {
      const x = MARGIN + i * (cw + 0.5);
      slide.addShape('roundRect', {
        x, y: 2.6, w: cw, h: 1.3, rectRadius: 0.08,
        fill: { color: i === steps.length - 1 ? INK : CARD_BG },
        line: { color: CARD_LINE, width: 1 },
      });
      slide.addText(String(i + 1), {
        x: x + 0.15, y: 2.72, w: 0.5, h: 0.4,
        fontFace: TITLE_FONT, bold: true, fontSize: 16,
        color: i === steps.length - 1 ? AMBER : INK, margin: 0,
      });
      slide.addText(s, {
        x: x + 0.15, y: 3.1, w: cw - 0.3, h: 0.7, valign: 'top',
        fontFace: BODY_FONT, bold: true, fontSize: 13,
        color: i === steps.length - 1 ? WHITE : TEXT, margin: 0,
      });
      if (i < steps.length - 1) {
        slide.addText('›', {
          x: x + cw, y: 2.6, w: 0.5, h: 1.3, align: 'center', valign: 'middle',
          fontFace: BODY_FONT, bold: true, fontSize: 26, color: AMBER, margin: 0,
        });
      }
    });
    slide.addText('Une année mal ouverte, et rien ne fonctionne en aval — la chaîne est stricte, pas facultative.', {
      x: MARGIN, y: 4.4, w: CONTENT_W, h: 0.5, align: 'center',
      fontFace: BODY_FONT, italic: true, fontSize: 13.5, color: MUTED, margin: 0,
    });
    footer(slide, nextPage(), false);
  }

  // ===== 3, 4, 5, 6. Slides à capture, dans l'ordre du plan ================
  const renderScreenshotSlide = async (s) => {
    const slide = newSlide(pres, !!s.dark);
    kickerTitle(slide, s.kicker, s.title, !!s.dark);
    await screenshotBox(slide, s.image, !!s.dark);
    bulletsBlock(slide, s.bullets, !!s.dark);
    footer(slide, nextPage(), !!s.dark);
  };
  const byPart = (p) => screenshotSlides.filter((s) => s.part === p);

  for (const s of byPart('primaire')) await renderScreenshotSlide(s);
  for (const s of byPart('secondaire')) await renderScreenshotSlide(s);
  for (const s of byPart('owner')) await renderScreenshotSlide(s);

  // Slide de synthèse propriétaire (sans capture)
  {
    const slide = newSlide(pres, false);
    kickerTitle(slide, 'Espace propriétaire', 'Un espace pour décider, pas pour saisir', false);
    const cw = (CONTENT_W - 0.6) / 3;
    const decisions = [
      ['Rééquilibrer deux classes', 'Le tableau de remplissage des effectifs signale une classe trop chargée, une autre sous-remplie.'],
      ['Relancer une famille', 'Le recouvrement à échéance cible la famille en retard plutôt qu’une relance générale.'],
      ['Identifier une matière qui décroche', 'L’évolution par matière repère la discipline en baisse, et depuis quand.'],
    ];
    decisions.forEach(([t, d], i) => {
      addCard(slide, MARGIN + i * (cw + 0.3), 1.9, cw, 3.0, t, d, false, { titleSize: 14, descSize: 12, titleColor: INK });
    });
    addCard(
      slide, MARGIN, 5.15, CONTENT_W, 1.35, null,
      [
        'Aucun bouton n’y modifie une donnée : pas d’élève à inscrire, pas de note à corriger, pas de paiement à saisir.',
        'Le menu est identique quel que soit le modèle d’établissement, à une exception : l’assiduité disparaît en primaire pur.',
      ],
      false, { descSize: 12.5 },
    );
    footer(slide, nextPage(), false);
  }

  for (const s of byPart('transverses')) await renderScreenshotSlide(s);

  // ===== 6. TRANSVERSES (suite, hors captures) =============================
  {
    const slide = newSlide(pres, false);
    kickerTitle(slide, 'Transverses', 'Multi-établissement et cloisonnement', false);
    const cw = (CONTENT_W - 1.0) / 2;
    addCard(slide, MARGIN, 1.9, cw, 3.4, 'Établissement A', [
      'Ses élèves, ses classes, ses notes, ses paiements.',
    ], false, { titleSize: 15, descSize: 12.5, titleColor: INK });
    slide.addText('✕', {
      x: MARGIN + cw, y: 1.9, w: 1.0, h: 3.4, align: 'center', valign: 'middle',
      fontFace: BODY_FONT, bold: true, fontSize: 30, color: AMBER, margin: 0,
    });
    addCard(slide, MARGIN + cw + 1.0, 1.9, cw, 3.4, 'Établissement B', [
      'Ses élèves, ses classes, ses notes, ses paiements — sans recouvrement possible avec A.',
    ], false, { titleSize: 15, descSize: 12.5, titleColor: INK });
    slide.addText('L’adresse e-mail identifie à elle seule l’établissement d’un compte — personne n’a jamais à le choisir.', {
      x: MARGIN, y: 5.55, w: CONTENT_W, h: 0.6, align: 'center',
      fontFace: BODY_FONT, italic: true, fontSize: 13.5, color: MUTED, margin: 0,
    });
    footer(slide, nextPage(), false);
  }

  // ===== 7. CLÔTURE ========================================================
  {
    const slide = newSlide(pres, true);
    kickerTitle(slide, 'Clôture', 'Ce qu’il faut retenir', true);
    const cw = (CONTENT_W - 0.6) / 3;
    const summary = [
      ['2 modèles', 'Primaire, et secondaire de la 6ème à la Terminale, dans une seule application.'],
      ['5 profils', 'Chacun avec un espace cadré à ce qu’il doit voir.'],
      ['3 mécanismes', 'Le calcul des moyennes, l’assiduité par séance, la conduite calculée automatiquement.'],
    ];
    summary.forEach(([t, d], i) => {
      addCard(slide, MARGIN + i * (cw + 0.3), 2.0, cw, 3.2, t, d, true, { titleSize: 18, descSize: 12.5, titleColor: AMBER });
    });
    footer(slide, nextPage(), true);
  }

  {
    const slide = newSlide(pres, false);
    kickerTitle(slide, 'Clôture', 'Huit guides utilisateur livrés', false);
    const guides = [
      'Guide Administrateur — École primaire',
      'Guide Administrateur — Collège et Lycée',
      'Guide Enseignant — École primaire',
      'Guide Enseignant — Collège et Lycée',
      'Guide Parent — École primaire',
      'Guide Parent — Collège et Lycée',
      'Guide Élève — Collège et Lycée',
      'Guide Propriétaire — Espace de pilotage',
    ];
    const colW = (CONTENT_W - 0.4) / 2;
    const rowH = 0.85;
    guides.forEach((g, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MARGIN + col * (colW + 0.4);
      const y = 1.85 + row * (rowH + 0.15);
      slide.addShape('roundRect', {
        x, y, w: colW, h: rowH, rectRadius: 0.06,
        fill: { color: CARD_BG }, line: { color: CARD_LINE, width: 1 },
      });
      slide.addText(g, {
        x: x + 0.25, y, w: colW - 0.5, h: rowH, valign: 'middle',
        fontFace: BODY_FONT, fontSize: 13.5, color: TEXT, margin: 0, bold: true,
      });
    });
    slide.addText('Chaque guide décrit, écran par écran, ce que voit le profil concerné — cohérent avec cette présentation.', {
      x: MARGIN, y: 6.35, w: CONTENT_W, h: 0.5, align: 'center',
      fontFace: BODY_FONT, italic: true, fontSize: 12.5, color: MUTED, margin: 0,
    });
    footer(slide, nextPage(), false);
  }

  {
    const slide = newSlide(pres, true);
    slide.addImage({ path: LOGO, x: PAGE_W / 2 - 0.6, y: 2.0, w: 1.2, h: 1.2 });
    slide.addText('Merci', {
      x: 0, y: 3.35, w: PAGE_W, h: 0.9, align: 'center',
      fontFace: TITLE_FONT, bold: true, fontSize: 40, color: WHITE, margin: 0,
    });
    slide.addText('HorizonEcole — Gestion scolaire, du primaire à la Terminale', {
      x: 0, y: 4.2, w: PAGE_W, h: 0.5, align: 'center',
      fontFace: BODY_FONT, fontSize: 14, color: AMBER, margin: 0,
    });
    slide.addText('Établissements de démonstration : Groupe Scolaire les Palmiers · Lycée Moderne de Cocody', {
      x: PAGE_W / 2 - 5, y: 4.85, w: 10, h: 0.4, align: 'center',
      fontFace: BODY_FONT, fontSize: 11, color: DARK_MUTED, margin: 0,
    });
    footer(slide, nextPage(), true);
  }

  await pres.writeFile({ fileName: OUT });
  console.log('Slides générées :', pageNum - 1);
  console.log('Fichier :', OUT);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
