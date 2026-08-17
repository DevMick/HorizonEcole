/**
 * Captures d'écran, brutes puis annotées, en un seul passage par écran.
 *
 * Deux partis pris, appris à la dure :
 *
 * 1. Pas de `fullPage`. Sur une application à barre latérale fixe, Playwright
 *    décale la mise en page et le contenu passe sous le menu. On mesure donc la
 *    hauteur réelle du document, on **agrandit la fenêtre** à cette hauteur, et
 *    on capture normalement.
 * 2. Les pastilles sont dessinées dans la page **avant** le déclenchement :
 *    elles font partie des pixels. Un calque posé par-dessus l'image ne
 *    survivrait pas au passage dans Word.
 *
 *   node scripts/3-captures.js admin
 *   node scripts/3-captures.js admin --ecran roles-nouveau   (un seul écran)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const {
  BASE,
  FENETRE,
  DENSITE,
  DOSSIERS,
  CSS_MASQUAGE,
  cheminNavigateur,
  assurerDossiers,
  fichierSession,
  attendreStabilite,
} = require('./config');
const { PROFILS } = require('./ecrans');
const { poserAnnotations } = require('./annotation');

/** Au-delà, l'image devient illisible une fois réduite à la largeur d'une page. */
const HAUTEUR_MAX = 2400;

function chargerContenu(profil) {
  const fichier = path.join(DOSSIERS.contenu, `${profil}.js`);
  if (!fs.existsSync(fichier)) return null;
  delete require.cache[require.resolve(fichier)];
  return require(fichier);
}

/** Table « clé d'écran → pastilles », extraite des légendes du contenu rédigé. */
function ciblesParEcran(contenu) {
  const table = {};
  if (!contenu) return table;
  for (const chapitre of contenu.chapitres || []) {
    for (const section of chapitre.sections || []) {
      if (!section.ecran || !section.legendes) continue;
      table[section.ecran] = section.legendes
        .filter((l) => l.selecteur)
        .map((l) => ({ n: l.n, selecteur: l.selecteur, index: l.index, cote: l.cote }));
    }
  }
  return table;
}

async function ajusterHauteur(page, { plafond = HAUTEUR_MAX, cadrage } = {}) {
  const hauteur = await page.evaluate(() =>
    Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
    ),
  );

  // Cadrage « bas » : certains boutons décisifs — « Enregistrer » sous une
  // grille de trente élèves — vivent tout en bas d'une page trop haute pour
  // être montrée entière. On cadre alors la fin de la page, et le lecteur
  // apprend au passage où le bouton se trouve réellement.
  if (cadrage === 'bas') {
    const fenetre = Math.min(plafond, hauteur);
    await page.setViewportSize({ width: FENETRE.width, height: fenetre });
    await page.waitForTimeout(400);
    const decalage = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return Math.round(window.scrollY);
    });
    await page.waitForTimeout(400);
    return {
      hauteurDocument: hauteur,
      hauteurCapture: fenetre,
      decalage,
      tronquee: hauteur > fenetre,
    };
  }

  const voulue = Math.min(Math.max(hauteur, FENETRE.height), plafond);
  if (voulue !== FENETRE.height) {
    await page.setViewportSize({ width: FENETRE.width, height: voulue });
    await page.waitForTimeout(500);
  }
  return {
    hauteurDocument: hauteur,
    hauteurCapture: voulue,
    decalage: 0,
    tronquee: hauteur > plafond,
  };
}

async function main() {
  const profil = (process.argv[2] || 'admin').toLowerCase();
  const def = PROFILS[profil];
  if (!def) throw new Error(`Profil inconnu : ${profil}`);
  const iEcran = process.argv.indexOf('--ecran');
  const filtre = iEcran > -1 ? process.argv[iEcran + 1] : null;

  assurerDossiers();
  const dossierBrutes = path.join(DOSSIERS.brutes, profil);
  const dossierAnnotees = path.join(DOSSIERS.annotees, profil);
  fs.mkdirSync(dossierBrutes, { recursive: true });
  fs.mkdirSync(dossierAnnotees, { recursive: true });

  const session = fichierSession(profil);
  if (!fs.existsSync(session)) throw new Error(`Session absente : sessions/${profil}.json`);

  const cibles = ciblesParEcran(chargerContenu(profil));
  const navigateur = await chromium.launch({ executablePath: cheminNavigateur(), headless: true });

  const nouveauContexte = (avecSession) =>
    navigateur.newContext({
      ...(avecSession ? { storageState: session } : {}),
      viewport: FENETRE,
      deviceScaleFactor: DENSITE,
      locale: 'fr-FR',
      timezoneId: 'Africa/Abidjan',
    });

  const contexte = await nouveauContexte(true);
  const rapport = [];

  for (const ecran of def.ecrans) {
    if (filtre && ecran.cle !== filtre) continue;
    process.stdout.write(`  ${ecran.cle} … `);
    let page;
    let contexteJetable = null;
    try {
      if (ecran.sansSession) {
        contexteJetable = await nouveauContexte(false);
        page = await contexteJetable.newPage();
      } else {
        page = await contexte.newPage();
      }
      await page.setViewportSize(FENETRE);
      await page.goto(`${BASE}${ecran.depuis || ecran.chemin}`, { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: CSS_MASQUAGE }).catch(() => {});
      await attendreStabilite(page, { selecteur: ecran.attendre });
      if (ecran.action) await ecran.action(page);
      // Le style de masquage se perd si la navigation a rechargé la page.
      await page.addStyleTag({ content: CSS_MASQUAGE }).catch(() => {});
      await attendreStabilite(page, { delaiFinal: 400 });

      // Une liste de trente élèves donnerait une image si haute qu'une fois
      // ramenée à la largeur d'une page, son texte serait illisible. Certains
      // écrans déclarent donc un plafond : on n'en montre que le haut, et c'est
      // un choix de mise en page, pas un accident.
      const mesures = await ajusterHauteur(page, {
        plafond: ecran.hauteurMax || undefined,
        cadrage: ecran.cadrage,
      });
      mesures.cadrageVoulu = Boolean(ecran.hauteurMax || ecran.cadrage);

      const brute = path.join(dossierBrutes, `${ecran.cle}.png`);
      await page.screenshot({ path: brute });

      let annotations = [];
      const liste = cibles[ecran.cle];
      if (liste && liste.length) {
        annotations = await page.evaluate(poserAnnotations, liste);
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(dossierAnnotees, `${ecran.cle}.png`) });
      }

      // Une pastille posée sous le bas de l'image n'existe pas pour le lecteur.
      const hautCadre = mesures.decalage || 0;
      const basCadre = hautCadre + mesures.hauteurCapture;
      const horsCadre = annotations
        .filter((a) => a.ok && (a.basPastille > basCadre || a.basPastille < hautCadre))
        .map((a) => ({ n: a.n, motif: 'hors du cadre de la capture' }));
      const manquees = [...annotations.filter((a) => !a.ok), ...horsCadre];
      rapport.push({
        cle: ecran.cle,
        titre: ecran.titre,
        url: page.url(),
        ...mesures,
        pastilles: liste ? liste.length : 0,
        posees: annotations.filter((a) => a.ok).length - horsCadre.length,
        manquees,
      });
      console.log(
        `ok (${mesures.hauteurCapture}px${mesures.tronquee ? ', TRONQUÉE' : ''}` +
          (liste ? `, ${annotations.filter((a) => a.ok).length}/${liste.length} pastilles` : '') +
          ')' +
          (manquees.length ? ` — manquées : ${manquees.map((m) => `${m.n} (${m.motif})`).join(', ')}` : ''),
      );
      await page.close();
      if (contexteJetable) await contexteJetable.close();
    } catch (e) {
      console.log(`ÉCHEC (${e.message})`);
      rapport.push({ cle: ecran.cle, titre: ecran.titre, erreur: e.message });
      if (page) await page.close().catch(() => {});
      if (contexteJetable) await contexteJetable.close().catch(() => {});
    }
  }

  // Une exécution filtrée sur un seul écran ne doit pas effacer le rapport des
  // autres : le contrôle automatique croirait ensuite qu'ils n'ont jamais été
  // capturés. On fusionne au lieu de remplacer.
  const fichierRapport = path.join(DOSSIERS.recon, `captures-${profil}.json`);
  let precedent = [];
  if (filtre && fs.existsSync(fichierRapport)) {
    try {
      precedent = JSON.parse(fs.readFileSync(fichierRapport, 'utf8'));
    } catch {
      precedent = [];
    }
  }
  const fusion = new Map(precedent.map((r) => [r.cle, r]));
  for (const r of rapport) fusion.set(r.cle, r);
  // On garde l'ordre du catalogue, pas celui des exécutions successives.
  const ordonne = def.ecrans.map((e) => fusion.get(e.cle)).filter(Boolean);
  fs.writeFileSync(fichierRapport, JSON.stringify(ordonne, null, 2), 'utf8');
  await navigateur.close();

  const echecs = rapport.filter((r) => r.erreur || (r.manquees || []).length);
  console.log(
    `\n  ${rapport.filter((r) => !r.erreur).length}/${rapport.length} captures — ` +
      (echecs.length ? `${echecs.length} à revoir.` : 'aucun défaut.'),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
