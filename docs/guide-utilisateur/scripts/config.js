/**
 * Réglages communs à toute la chaîne de production des guides.
 *
 * Un seul endroit décide de l'adresse de l'application, du navigateur utilisé et
 * de la géométrie des captures : changer la fenêtre de référence ici régénère
 * l'ensemble des images sans toucher aux scripts.
 */
const path = require('path');
const fs = require('fs');

/** Racine du dossier de travail (docs/guide-utilisateur). */
const RACINE = path.resolve(__dirname, '..');

/**
 * Adresse de travail : le site vitrine (port 5173) sert l'application sous /app
 * et relaie /api vers l'API. Ouvrir directement le port 5174 de Vite donnerait
 * une application sans API.
 */
const BASE = process.env.GUIDE_BASE_URL || 'http://localhost:5173/app';

/**
 * Chrome déjà installé sur la machine, plutôt que les navigateurs téléchargés
 * par Playwright (500 Mo pour un rendu identique).
 */
const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

function cheminNavigateur() {
  const trouve = CHROMES.filter(Boolean).find((p) => fs.existsSync(p));
  if (!trouve) {
    throw new Error(
      "Aucun Chrome/Edge trouvé. Renseignez GUIDE_CHROME_PATH avec le chemin de l'exécutable.",
    );
  }
  return process.env.GUIDE_CHROME_PATH || trouve;
}

/**
 * Fenêtre de référence. La densité x2 donne un texte net une fois l'image
 * réduite à la largeur d'une page Word.
 */
const FENETRE = { width: 1500, height: 950 };
const DENSITE = 2;

const DOSSIERS = {
  racine: RACINE,
  sessions: path.join(RACINE, 'sessions'),
  recon: path.join(RACINE, 'recon'),
  brutes: path.join(RACINE, 'captures-brutes'),
  annotees: path.join(RACINE, 'captures-annotees'),
  contenu: path.join(RACINE, 'contenu'),
  build: path.join(RACINE, 'build'),
};

function assurerDossiers() {
  for (const d of Object.values(DOSSIERS)) fs.mkdirSync(d, { recursive: true });
}

/**
 * Nom de fichier lisible à partir d'un libellé.
 *
 * On retire les accents plutôt que de les remplacer par un tiret : sans cela,
 * « Lycée Moderne » donnait « Lyc-e-Moderne », illisible dans une liste de
 * fichiers.
 */
function versNomFichier(libelle) {
  return libelle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Chemin du fichier de session d'un profil (admin, enseignant, parent). */
function fichierSession(profil) {
  return path.join(DOSSIERS.sessions, `${profil}.json`);
}

/**
 * Masque les éléments qui polluent une capture : notifications d'Ant Design,
 * infobulles, et le bandeau de Vite en cas d'erreur de compilation.
 */
const CSS_MASQUAGE = `
  .ant-message, .ant-notification, .ant-tooltip, .ant-popover,
  vite-error-overlay, #vite-error-overlay { display: none !important; }
  /* Les animations d'entrée laissent des éléments à demi transparents si la
     capture part trop tôt : on les neutralise plutôt que d'attendre au hasard. */
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  /* Le curseur clignotant d'un champ actif apparaît une fois sur deux. */
  input, textarea { caret-color: transparent !important; }
`;

/**
 * Attend que la page soit réellement prête : plus de squelette de chargement,
 * plus de spinner, et le réseau calme. Un délai fixe capturerait des écrans à
 * moitié peints selon la charge de la machine.
 */
async function attendreStabilite(page, { selecteur, delaiFinal = 600 } = {}) {
  await page.waitForLoadState('domcontentloaded');
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    /* Une application qui interroge l'API en continu n'atteint jamais
       networkidle : les autres garde-fous suffisent. */
  }
  if (selecteur) {
    await page.waitForSelector(selecteur, { timeout: 20000 }).catch(() => {});
  }
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll('.ant-skeleton, .ant-spin-spinning').length === 0,
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.waitForTimeout(delaiFinal);
}

module.exports = {
  BASE,
  FENETRE,
  DENSITE,
  DOSSIERS,
  CSS_MASQUAGE,
  cheminNavigateur,
  assurerDossiers,
  fichierSession,
  versNomFichier,
  attendreStabilite,
};
