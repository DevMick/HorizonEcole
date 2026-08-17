/**
 * Contrôle des infobulles de l'espace Propriétaire.
 *
 * On ne se contente pas de vérifier que le code est en place : on survole
 * réellement chaque type de graphique et on lit ce qui s'affiche. Une infobulle
 * qui ne se déclenche pas est exactement le défaut qu'on vient de corriger — il
 * doit être détecté automatiquement, pas de mémoire.
 *
 *   node scripts/verifier-infobulles.js
 */
const { chromium } = require('playwright-core');
const {
  BASE,
  FENETRE,
  cheminNavigateur,
  fichierSession,
  attendreStabilite,
} = require('./config');

/** Un graphique par famille, avec la zone à survoler. */
const CIBLES = [
  {
    ecran: '/owner/resultats',
    nom: 'Courbe (évolution par matière)',
    survol: '.ds-linechart rect[fill="transparent"]',
  },
  {
    ecran: '/owner/resultats',
    nom: 'Histogramme (distribution des moyennes)',
    survol: '.ds-histogram rect[fill="transparent"]',
  },
  {
    ecran: '/owner/finance',
    nom: 'Donut (recettes par type de frais)',
    survol: '.ds-donut svg circle[stroke-dasharray]',
    // Un arc de donut est un cercle sans remplissage : seul le trait répond au
    // pointeur. Viser le centre de la boîte englobante tomberait dans le trou.
    surLAnneau: true,
  },
  {
    ecran: '/owner/finance',
    nom: 'Barre empilée (vieillissement de la créance)',
    survol: '.ds-stacked-segment',
  },
  {
    ecran: '/owner/ressources',
    nom: 'Carte de chaleur (occupation des salles)',
    survol: '.ds-heatmap-cell',
  },
];

async function main() {
  const navigateur = await chromium.launch({ executablePath: cheminNavigateur(), headless: true });
  const contexte = await navigateur.newContext({
    storageState: fichierSession('lycee-owner'),
    viewport: FENETRE,
    locale: 'fr-FR',
  });
  const page = await contexte.newPage();

  let echecs = 0;
  let ecranCourant = null;

  for (const cible of CIBLES) {
    if (ecranCourant !== cible.ecran) {
      await page.goto(`${BASE}${cible.ecran}`, { waitUntil: 'domcontentloaded' });
      await attendreStabilite(page, { delaiFinal: 1200 });
      ecranCourant = cible.ecran;
    }

    const element = page.locator(cible.survol).first();
    if ((await element.count()) === 0) {
      console.log(`  ✗ ${cible.nom} — aucun élément à survoler (${cible.survol})`);
      echecs++;
      continue;
    }

    // Amener l'élément à l'écran avant toute mesure : la moitié de ces
    // graphiques est sous la ligne de flottaison, et des coordonnées prises
    // hors du cadre visible ne désignent rien.
    await element.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    if (cible.surLAnneau) {
      const boite = await element.boundingBox();
      // Point situé à 45° sur l'anneau : ni le trou central, ni la jointure
      // exacte entre deux arcs, où le survol est incertain.
      const rayon = (boite.width / 180) * 77;
      const angle = (45 - 90) * (Math.PI / 180);
      await page.mouse.move(
        boite.x + boite.width / 2 + rayon * Math.cos(angle),
        boite.y + boite.height / 2 + rayon * Math.sin(angle),
      );
    } else {
      await element.hover({ force: true });
    }
    await page.waitForTimeout(350);

    const infobulle = page.locator('.ds-chart-tip');
    const visible = await infobulle.count();
    if (!visible) {
      console.log(`  ✗ ${cible.nom} — rien ne s'affiche au survol`);
      echecs++;
      continue;
    }

    const texte = (await infobulle.first().innerText()).replace(/\s+/g, ' ').trim();
    // Une infobulle qui n'affiche qu'un titre sans valeur ne sert à rien.
    const aUneValeur = /\d/.test(texte);
    console.log(`  ${aUneValeur ? '✓' : '✗'} ${cible.nom} — « ${texte} »`);
    if (!aUneValeur) echecs++;

    // On s'éloigne pour que l'infobulle suivante ne soit pas celle d'avant.
    await page.mouse.move(2, 2);
    await page.waitForTimeout(200);
  }

  await navigateur.close();

  console.log(
    echecs === 0
      ? `\n  ${CIBLES.length}/${CIBLES.length} graphiques répondent au survol.`
      : `\n  ${echecs} graphique(s) muet(s) sur ${CIBLES.length}.`,
  );
  process.exitCode = echecs === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
