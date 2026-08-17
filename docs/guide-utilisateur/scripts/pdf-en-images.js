/**
 * Rend des pages d'un PDF en images PNG, pour pouvoir **regarder** le document
 * livré au lieu de supposer qu'il est correct.
 *
 * Le rendu passe par pdf.js dans un vrai navigateur : c'est le seul moyen, sans
 * dépendance native, d'obtenir une image fidèle d'une page PDF sur Windows.
 *
 *   node scripts/pdf-en-images.js build/Guide.pdf build/apercu 1,5,12,20
 *   node scripts/pdf-en-images.js build/Guide.pdf build/apercu --reparties 10
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { cheminNavigateur } = require('./config');

const RACINE = path.resolve(__dirname, '..');
const PDFJS = path.join(RACINE, 'node_modules/pdfjs-dist/build');

async function main() {
  const [, , fichierPdf, dossierSortie] = process.argv;
  if (!fichierPdf || !dossierSortie) {
    console.error('Usage : node scripts/pdf-en-images.js <pdf> <dossier> [pages|--reparties N]');
    process.exit(1);
  }
  const iRep = process.argv.indexOf('--reparties');
  const nbReparties = iRep > -1 ? Number(process.argv[iRep + 1]) : null;
  // argv : [node, script, pdf, dossier, pages]
  const listeDemandee = iRep > -1 ? null : (process.argv[4] || '').split(',').filter(Boolean).map(Number);

  fs.mkdirSync(dossierSortie, { recursive: true });

  const navigateur = await chromium.launch({
    executablePath: cheminNavigateur(),
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });
  const contexte = await navigateur.newContext({ viewport: { width: 1200, height: 1600 } });
  const page = await contexte.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('    [navigateur]', m.text());
  });

  // Une page vide servie depuis le dossier de pdf.js : les imports relatifs du
  // module (et son « worker ») se résolvent alors sans requête réseau.
  const socle = path.join(PDFJS, '__apercu.html');
  fs.writeFileSync(socle, '<!doctype html><meta charset="utf-8"><body></body>', 'utf8');
  await page.goto('file:///' + socle.replace(/\\/g, '/'));

  const base64 = fs.readFileSync(fichierPdf).toString('base64');

  const total = await page.evaluate(async (donnees) => {
    const pdfjs = await import('./pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';
    const binaire = Uint8Array.from(atob(donnees), (c) => c.charCodeAt(0));
    window.__doc = await pdfjs.getDocument({ data: binaire }).promise;
    return window.__doc.numPages;
  }, base64);

  const pages =
    listeDemandee && listeDemandee.length
      ? listeDemandee
      : Array.from({ length: Math.min(nbReparties || 10, total) }, (_, i) =>
          // Réparties sur tout le document : un défaut de mise en page ne se
          // trouve pas forcément dans les premières pages.
          Math.max(1, Math.round(((i + 0.5) * total) / Math.min(nbReparties || 10, total))),
        );

  for (const numero of pages) {
    if (numero < 1 || numero > total) continue;
    const dataUrl = await page.evaluate(async (n) => {
      const p = await window.__doc.getPage(n);
      const echelle = 1.6;
      const vue = p.getViewport({ scale: echelle });
      const toile = document.createElement('canvas');
      toile.width = Math.floor(vue.width);
      toile.height = Math.floor(vue.height);
      const ctx = toile.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, toile.width, toile.height);
      await p.render({ canvasContext: ctx, viewport: vue }).promise;
      return toile.toDataURL('image/png');
    }, numero);

    const sortie = path.join(dossierSortie, `page-${String(numero).padStart(3, '0')}.png`);
    fs.writeFileSync(sortie, Buffer.from(dataUrl.split(',')[1], 'base64'));
    process.stdout.write(`  page ${numero} → ${path.basename(sortie)}\n`);
  }

  console.log(`  ${total} pages au total.`);
  fs.unlinkSync(socle);
  await navigateur.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
