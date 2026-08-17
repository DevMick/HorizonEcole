/**
 * Ouvre un Chrome visible sur la page de connexion et attend que **vous** vous
 * connectiez. Aucun mot de passe n'est saisi par le script.
 *
 * Une fois la connexion faite, la session (jeton et préférences) est
 * enregistrée dans sessions/<profil>.json ; tous les scripts suivants la
 * rejouent et n'ont plus jamais besoin de la page de connexion.
 *
 *   node scripts/1-session.js admin
 *   node scripts/1-session.js enseignant
 *   node scripts/1-session.js parent
 */
const fs = require('fs');
const { chromium } = require('playwright-core');
const {
  BASE,
  FENETRE,
  cheminNavigateur,
  assurerDossiers,
  fichierSession,
} = require('./config');

const PROFILS = {
  admin: 'ADMINISTRATEUR',
  enseignant: 'ENSEIGNANT',
  parent: 'PARENT',
};

async function main() {
  const profil = (process.argv[2] || '').toLowerCase();
  if (!PROFILS[profil]) {
    console.error(`Profil attendu : ${Object.keys(PROFILS).join(' | ')}`);
    process.exit(1);
  }
  assurerDossiers();

  const navigateur = await chromium.launch({
    executablePath: cheminNavigateur(),
    headless: false,
    args: [`--window-size=${FENETRE.width},${FENETRE.height + 120}`],
  });
  const contexte = await navigateur.newContext({
    viewport: FENETRE,
    locale: 'fr-FR',
    timezoneId: 'Africa/Abidjan',
  });
  const page = await contexte.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

  console.log('');
  console.log('  ┌──────────────────────────────────────────────────────────┐');
  console.log(`  │  Connectez-vous en tant que ${PROFILS[profil].padEnd(29)}│`);
  console.log('  │  dans la fenêtre Chrome qui vient de s\'ouvrir.           │');
  console.log('  │  Le script détecte la connexion et enregistre la session.│');
  console.log('  └──────────────────────────────────────────────────────────┘');
  console.log('');

  // On attend la preuve de la connexion, pas un changement d'adresse : le jeton
  // en localStorage est ce que rejoueront les scripts suivants.
  // Le deuxième argument est celui passé à la fonction évaluée : les options
  // viennent en troisième position, sans quoi le délai par défaut de 30 s
  // s'applique et la fenêtre se referme avant même que vous ayez tapé.
  await page.waitForFunction(
    () => !!window.localStorage.getItem('token'),
    null,
    { timeout: 15 * 60 * 1000 },
  );
  await page.waitForTimeout(2500); // laisse le profil se charger et se persister

  const infos = await page.evaluate(() => {
    try {
      const brut = window.localStorage.getItem('auth-storage');
      const etat = brut ? JSON.parse(brut).state : null;
      const u = etat && etat.user;
      return u
        ? { email: u.email, role: u.role, nom: `${u.firstName || ''} ${u.lastName || ''}`.trim() }
        : null;
    } catch {
      return null;
    }
  });

  const etat = await contexte.storageState();
  fs.writeFileSync(fichierSession(profil), JSON.stringify(etat, null, 2), 'utf8');

  console.log(`  Session enregistrée : sessions/${profil}.json`);
  if (infos) console.log(`  Compte : ${infos.nom} <${infos.email}> — rôle ${infos.role}`);
  console.log('  Vous pouvez fermer la fenêtre.');

  await navigateur.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
