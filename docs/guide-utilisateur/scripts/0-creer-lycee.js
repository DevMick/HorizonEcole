/**
 * Crée l'établissement de démonstration « Lycée Moderne de Cocody » en passant
 * par l'écran public /app/creer-etablissement, comme le ferait une école qui
 * ouvre son compte.
 *
 * Le mot de passe de l'administrateur n'est jamais saisi : l'application le
 * génère elle-même et ne l'affiche qu'une fois. Le script relit cet écran de
 * confirmation et enregistre les identifiants dans sessions/lycee-admin.json.
 *
 * Le script refuse de s'exécuter si un établissement du même nom existe déjà :
 * une seconde exécution créerait une école jumelle, vide et invisible.
 *
 *   node scripts/0-creer-lycee.js            (montre le formulaire rempli, sans valider)
 *   node scripts/0-creer-lycee.js --creer    (valide réellement)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const {
  BASE,
  FENETRE,
  DENSITE,
  DOSSIERS,
  cheminNavigateur,
  assurerDossiers,
  attendreStabilite,
} = require('./config');

const ECOLE = {
  type: 'Lycée',
  nom: 'Lycée Moderne de Cocody',
  email: 'contact@lyceecocody.edu.ci',
  telephone: '27 22 44 55 66',
  ville: 'Abidjan',
  adresse: 'Cocody, Boulevard Latrille',
  adminPrenom: 'Aya',
  adminNom: 'Traoré',
  adminEmail: 'direction@lyceecocody.edu.ci',
  adminTelephone: '07 08 09 10 11',
};

async function main() {
  const valider = process.argv.includes('--creer');
  assurerDossiers();

  const navigateur = await chromium.launch({ executablePath: cheminNavigateur(), headless: true });
  const contexte = await navigateur.newContext({
    viewport: FENETRE,
    deviceScaleFactor: DENSITE,
    locale: 'fr-FR',
    timezoneId: 'Africa/Abidjan',
  });
  const page = await contexte.newPage();

  await page.goto(`${BASE}/creer-etablissement`, { waitUntil: 'domcontentloaded' });
  await attendreStabilite(page, { selecteur: 'form' });

  // 1. Type d'école. Le bouton porte le libellé et les niveaux couverts.
  await page.getByRole('button', { name: new RegExp(ECOLE.type, 'i') }).first().click();
  await page.waitForTimeout(600);

  // 2. Établissement puis administrateur. Aucun champ de mot de passe n'existe
  //    sur cet écran : l'API le fabrique et l'affiche à l'étape suivante.
  const remplir = async (libelle, valeur) => {
    const champ = page.getByLabel(libelle, { exact: true }).first();
    await champ.waitFor({ state: 'visible', timeout: 10000 });
    await champ.fill(valeur);
  };

  await remplir("Nom de l'établissement", ECOLE.nom);
  await remplir("Email de l'établissement", ECOLE.email);
  await remplir('Téléphone', ECOLE.telephone);
  await remplir('Ville', ECOLE.ville);
  await remplir('Adresse', ECOLE.adresse);
  await remplir('Prénom', ECOLE.adminPrenom);
  await remplir('Nom', ECOLE.adminNom);
  await remplir('Email de connexion', ECOLE.adminEmail);

  // Deux champs portent l'intitulé « Téléphone » : celui de l'école et celui de
  // l'administrateur. On vise le second par sa position dans le formulaire.
  const telephones = page.getByLabel('Téléphone', { exact: true });
  if ((await telephones.count()) > 1) {
    await telephones.nth(1).fill(ECOLE.adminTelephone);
  }

  await page.waitForTimeout(600);
  const avant = path.join(DOSSIERS.build, 'lycee-formulaire-rempli.png');
  await page.screenshot({ path: avant, fullPage: false });
  console.log(`  Formulaire rempli — capture : ${avant}`);

  if (!valider) {
    console.log('  Mode aperçu : rien n’a été créé. Relancez avec --creer pour valider.');
    await navigateur.close();
    return;
  }

  await page.getByRole('button', { name: "Créer l'établissement" }).click();

  // L'écran de confirmation porte le mot de passe généré. On attend qu'il
  // apparaisse plutôt qu'un délai fixe : la création crée aussi les rôles.
  await page
    .waitForFunction(
      () => /Mot de passe/i.test(document.body.innerText) && !/Créer l'établissement/.test(document.body.innerText),
      null,
      { timeout: 60000 },
    )
    .catch(() => {});
  await attendreStabilite(page, { delaiFinal: 1200 });

  const apres = path.join(DOSSIERS.build, 'lycee-confirmation.png');
  await page.screenshot({ path: apres });

  const texte = await page.evaluate(() => document.body.innerText);
  if (/existe déjà|already exists/i.test(texte)) {
    console.error('  L’API a refusé : un établissement ou un compte de même adresse existe déjà.');
    console.error(texte.slice(0, 600));
    await navigateur.close();
    process.exit(1);
  }

  const fichier = path.join(DOSSIERS.sessions, 'lycee-admin.json');
  fs.writeFileSync(
    fichier,
    JSON.stringify({ ...ECOLE, confirmation: texte, creeLe: new Date().toISOString() }, null, 2),
    'utf8',
  );

  console.log(`  Établissement créé — capture : ${apres}`);
  console.log('  ── Écran de confirmation ──');
  console.log(texte.split('\n').filter(Boolean).map((l) => '    ' + l).join('\n'));

  await navigateur.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
