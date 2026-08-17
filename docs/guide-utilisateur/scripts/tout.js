/**
 * Chaîne complète pour un profil : reconnaissance, captures annotées, Word,
 * sommaire calculé par Word, PDF, contrôles automatiques, aperçus.
 *
 * C'est la commande à relancer après avoir corrigé un texte dans contenu/ :
 * tout se régénère sans qu'aucune étape ne soit oubliée.
 *
 *   node scripts/tout.js admin
 *   node scripts/tout.js admin --sans-recon     (si l'application n'a pas changé)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DOSSIERS, versNomFichier } = require('./config');

const RACINE = path.resolve(__dirname, '..');

function etape(titre, commande, args, options = {}) {
  console.log(`\n── ${titre} ${'─'.repeat(Math.max(0, 60 - titre.length))}`);
  try {
    const sortie = execFileSync(commande, args, {
      cwd: RACINE,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
    process.stdout.write(sortie);
    return sortie;
  } catch (e) {
    process.stdout.write(e.stdout || '');
    process.stderr.write(e.stderr || '');
    if (!options.tolerant) throw new Error(`Étape « ${titre} » en échec.`);
    console.log(`  (étape non bloquante, on continue)`);
    return '';
  }
}

function main() {
  const profil = (process.argv[2] || 'admin').toLowerCase();
  const sansRecon = process.argv.includes('--sans-recon');

  const contenu = require(path.join(DOSSIERS.contenu, `${profil}.js`));
  const base = `Guide-${versNomFichier(contenu.meta.profil)}-${versNomFichier(contenu.meta.etablissement)}`;
  const docx = path.join(DOSSIERS.build, `${base}.docx`);
  const pdf = path.join(DOSSIERS.build, `${base}.pdf`);

  if (!sansRecon) etape('Reconnaissance', process.execPath, ['scripts/2-recon.js', profil]);
  etape('Captures et annotations', process.execPath, ['scripts/3-captures.js', profil]);
  etape('Document Word', process.execPath, ['scripts/5-word.js', profil]);

  // Word calcule le sommaire et la pagination, puis exporte le PDF de contrôle.
  // Sans traitement de texte installé, le .docx reste valable : seul son
  // sommaire attend d'être mis à jour à la première ouverture.
  etape(
    'Sommaire et PDF (Microsoft Word)',
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/word-pdf.ps1', '-Docx', docx, '-Pdf', pdf],
    { tolerant: true },
  );

  etape('Contrôles automatiques', process.execPath, ['scripts/6-verifier.js', profil], { tolerant: true });

  if (fs.existsSync(pdf)) {
    const apercu = path.join(DOSSIERS.build, `apercu-${profil}`);
    fs.rmSync(apercu, { recursive: true, force: true });
    etape('Aperçus de pages', process.execPath, [
      'scripts/pdf-en-images.js',
      pdf,
      apercu,
      '--reparties',
      '10',
    ]);
  }

  console.log(`\n  Terminé : ${docx}`);
}

main();
