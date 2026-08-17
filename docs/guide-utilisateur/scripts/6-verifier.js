/**
 * Contrôle automatique du livrable, avant le contrôle visuel.
 *
 * Ce qu'on cherche ici, ce sont les incohérences qu'un coup d'œil ne repère
 * pas : une pastille sans ligne de légende, une légende qui renvoie à une
 * pastille absente de l'image, une capture manquante, une image orpheline dans
 * le dossier, un sommaire resté vide.
 *
 *   node scripts/6-verifier.js admin
 */
const fs = require('fs');
const path = require('path');
const { DOSSIERS, versNomFichier } = require('./config');
const { structure } = require('./docx-lecture');

const anomalies = [];
const constats = [];

function verifier(condition, message, detail) {
  if (condition) constats.push(message);
  else anomalies.push(detail || message);
}

function main() {
  const profil = (process.argv[2] || 'admin').toLowerCase();

  const fichierContenu = path.join(DOSSIERS.contenu, `${profil}.js`);
  const contenu = require(fichierContenu);
  const dossierAnnotees = path.join(DOSSIERS.annotees, profil);
  const dossierBrutes = path.join(DOSSIERS.brutes, profil);
  const rapportCaptures = JSON.parse(
    fs.readFileSync(path.join(DOSSIERS.recon, `captures-${profil}.json`), 'utf8'),
  );

  const sections = contenu.chapitres.flatMap((c) => c.sections);
  const parEcran = Object.fromEntries(rapportCaptures.map((r) => [r.cle, r]));

  console.log(`\n  Guide ${contenu.meta.profil} — ${sections.length} écrans documentés\n`);

  // 1. Chaque écran documenté a bien sa capture annotée.
  for (const s of sections) {
    const image = path.join(dossierAnnotees, `${s.ecran}.png`);
    verifier(
      fs.existsSync(image),
      `capture présente : ${s.ecran}`,
      `CAPTURE MANQUANTE pour l'écran « ${s.ecran} » (${s.titre})`,
    );
  }

  // 2. Aucune image orpheline : une capture annotée sans section qui l'utilise
  //    signifierait un chapitre supprimé du contenu mais pas des dossiers.
  const clesDocumentees = new Set(sections.map((s) => s.ecran));
  for (const fichier of fs.readdirSync(dossierAnnotees)) {
    const cle = path.basename(fichier, '.png');
    verifier(
      clesDocumentees.has(cle),
      `image utilisée : ${cle}`,
      `IMAGE ORPHELINE : captures-annotees/${profil}/${fichier} n'est référencée par aucun chapitre`,
    );
  }

  // 3. Pastilles et légendes se répondent, dans les deux sens.
  for (const s of sections) {
    const legendes = s.legendes || [];
    const rapport = parEcran[s.ecran];

    const numeros = legendes.map((l) => l.n);
    const attendus = Array.from({ length: legendes.length }, (_, i) => i + 1);
    verifier(
      JSON.stringify(numeros) === JSON.stringify(attendus),
      `numérotation continue : ${s.ecran}`,
      `NUMÉROTATION à trous sur « ${s.ecran} » : ${numeros.join(', ')}`,
    );

    if (!rapport) {
      anomalies.push(`AUCUN RAPPORT DE CAPTURE pour « ${s.ecran} »`);
      continue;
    }
    verifier(
      (rapport.manquees || []).length === 0,
      `toutes les pastilles posées : ${s.ecran}`,
      `PASTILLES NON POSÉES sur « ${s.ecran} » : ${(rapport.manquees || [])
        .map((m) => `n°${m.n} (${m.motif})`)
        .join(', ')} — la légende renverrait à un numéro absent de l'image`,
    );
    verifier(
      rapport.posees === legendes.filter((l) => l.selecteur).length,
      `pastilles et légendes en nombre égal : ${s.ecran}`,
      `ÉCART sur « ${s.ecran} » : ${rapport.posees} pastilles sur l'image pour ${legendes.length} lignes de légende`,
    );
    verifier(
      !rapport.tronquee || rapport.cadrageVoulu,
      `capture entière : ${s.ecran}`,
      `CAPTURE TRONQUÉE sur « ${s.ecran} » : la page dépasse la hauteur maximale ` +
        `sans que l'écran ait déclaré un cadrage volontaire (champ hauteurMax)`,
    );
  }

  // 4. Chaque section a de quoi être utile : fiche repère et procédure.
  for (const s of sections) {
    verifier(s.fiche && s.fiche.menu, `fiche repère : ${s.ecran}`, `FICHE REPÈRE absente sur « ${s.ecran} »`);
    verifier(
      s.procedure && s.procedure.length > 0,
      `procédure : ${s.ecran}`,
      `PROCÉDURE absente sur « ${s.ecran} »`,
    );
  }

  // 5. Le document lui-même.
  // Le nom exact, reconstruit comme le fait 5-word.js. Chercher « le fichier
  // dont le nom contient le profil » désignait le guide d'une autre école dès
  // qu'un second établissement était documenté : tous les contrôles suivants
  // portaient alors sur le mauvais document.
  const nomAttendu =
    `Guide-${versNomFichier(contenu.meta.profil)}-${versNomFichier(contenu.meta.etablissement)}.docx`;
  const docx = path.join(DOSSIERS.build, nomAttendu);

  if (!fs.existsSync(docx)) {
    anomalies.push(`DOCUMENT WORD introuvable : build/${nomAttendu}`);
  } else {
    const s = structure(docx);
    console.log(
      `  Document : ${s.images} images · ${s.titre1} titres 1 · ${s.titre2} titres 2 · ` +
        `${s.tableaux} tableaux · ${s.listesNumerotees} étapes numérotées`,
    );
    verifier(
      s.images === sections.length,
      'une image par écran',
      `IMAGES : ${s.images} dans le document pour ${sections.length} écrans documentés`,
    );
    verifier(
      s.titre2 === sections.length,
      'un titre de niveau 2 par écran',
      `TITRES 2 : ${s.titre2} pour ${sections.length} écrans`,
    );
    verifier(
      s.titre1 >= contenu.chapitres.length,
      'un titre de niveau 1 par chapitre',
      `TITRES 1 : ${s.titre1} pour ${contenu.chapitres.length} chapitres`,
    );
    verifier(
      s.entreesSommaire > 0,
      'sommaire calculé',
      'SOMMAIRE VIDE : lancez scripts/word-pdf.ps1 pour que Word le calcule',
    );
    verifier(
      s.lignesInsecables > 0 && s.solidarites > 0,
      'blocs solidarisés',
      'SOLIDARITÉ : ni lignes insécables ni titres solidaires — figures et légendes risquent d’être séparées',
    );
    const tropLarge = s.dimensions.filter((d) => d.largeurPouces > 6.7);
    verifier(
      tropLarge.length === 0,
      'images dans la colonne de texte',
      `IMAGES TROP LARGES : ${tropLarge.length} dépassent la largeur utile de la page`,
    );

    // Le texte de chaque légende doit réellement figurer dans le document.
    const manquants = [];
    for (const sec of sections) {
      for (const l of sec.legendes || []) {
        const extrait = l.element.slice(0, 22).replace(/\s+/g, ' ');
        if (!s.texte.includes(extrait)) manquants.push(`${sec.ecran} n°${l.n}`);
      }
    }
    verifier(
      manquants.length === 0,
      'toutes les légendes présentes dans le document',
      `LÉGENDES ABSENTES du document : ${manquants.join(', ')}`,
    );
  }

  // 6. Les captures brutes sont livrées elles aussi.
  verifier(
    fs.existsSync(dossierBrutes) && fs.readdirSync(dossierBrutes).length >= sections.length,
    'captures brutes livrées',
    'CAPTURES BRUTES incomplètes dans captures-brutes/',
  );

  console.log(`\n  ${constats.length} contrôles passés.`);
  if (anomalies.length) {
    console.log(`\n  ${anomalies.length} ANOMALIE(S) :`);
    for (const a of anomalies) console.log(`    · ${a}`);
    process.exitCode = 1;
  } else {
    console.log('  Aucune anomalie automatique.\n');
  }
}

main();
