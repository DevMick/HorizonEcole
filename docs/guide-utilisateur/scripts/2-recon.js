/**
 * Reconnaissance : passe une fois sur tous les écrans d'un profil et relève ce
 * qui s'y trouve réellement — titres, onglets, boutons, champs, colonnes de
 * tableau, états vides.
 *
 * Ce relevé sert deux choses : écrire des légendes avec les libellés exacts de
 * l'application (jamais de bouton inventé), et choisir des sélecteurs fiables
 * pour ancrer les pastilles.
 *
 *   node scripts/2-recon.js admin
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const {
  BASE,
  FENETRE,
  DOSSIERS,
  CSS_MASQUAGE,
  cheminNavigateur,
  assurerDossiers,
  fichierSession,
  attendreStabilite,
} = require('./config');
const { PROFILS } = require('./ecrans');

/** Relevé exécuté dans la page. Ne garde que ce qui est réellement visible. */
const RELEVE = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x + window.scrollX),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };

  /** Libellé d'un champ : étiquette liée, aria-label, puis indication de saisie. */
  const libelleChamp = (el) => {
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return txt(l);
    }
    const item = el.closest('.ant-form-item');
    if (item) {
      const l = item.querySelector('.ant-form-item-label label');
      if (l) return txt(l);
    }
    return (
      el.getAttribute('aria-label') ||
      el.getAttribute('placeholder') ||
      (el.labels && el.labels[0] ? txt(el.labels[0]) : '') ||
      ''
    );
  };

  const zonePrincipale =
    document.querySelector('main') || document.querySelector('#root') || document.body;

  const titres = [...zonePrincipale.querySelectorAll('h1,h2,h3')]
    .filter(visible)
    .map((el) => ({ niveau: el.tagName, texte: txt(el), rect: rect(el) }))
    .filter((t) => t.texte);

  const onglets = [...document.querySelectorAll('.ant-tabs-tab, [role="tab"]')]
    .filter(visible)
    .map((el) => ({ texte: txt(el), actif: el.className.includes('active') || el.getAttribute('aria-selected') === 'true', rect: rect(el) }));

  const boutons = [...document.querySelectorAll('button, a.ant-btn, [role="button"]')]
    .filter(visible)
    .map((el) => ({
      texte: txt(el).slice(0, 80),
      id: el.id || null,
      titre: el.getAttribute('title') || el.getAttribute('aria-label') || null,
      classe: (el.className || '').toString().split(' ').slice(0, 3).join(' '),
      rect: rect(el),
    }))
    .filter((b) => b.texte || b.titre);

  const champs = [...document.querySelectorAll('input, textarea, select, .ant-select, .ant-picker')]
    .filter(visible)
    .map((el) => ({
      balise: el.tagName.toLowerCase() + (el.className.toString().includes('ant-select') ? '.ant-select' : el.className.toString().includes('ant-picker') ? '.ant-picker' : ''),
      type: el.getAttribute('type') || null,
      id: el.id || null,
      nom: el.getAttribute('name') || null,
      libelle: libelleChamp(el),
      valeur: (el.value || txt(el) || '').slice(0, 60),
      requis: !!el.closest('.ant-form-item-required') || el.required || false,
      rect: rect(el),
    }));

  const tableaux = [...document.querySelectorAll('table')].filter(visible).map((t) => ({
    colonnes: [...t.querySelectorAll('thead th')].map((th) => txt(th)),
    lignes: t.querySelectorAll('tbody tr').length,
    premiereLigne: [...(t.querySelector('tbody tr')?.querySelectorAll('td') || [])]
      .map((td) => txt(td).slice(0, 40))
      .slice(0, 12),
    rect: rect(t),
  }));

  const statistiques = [...document.querySelectorAll('.ant-statistic, [data-stat], [data-testid*="stat"]')]
    .filter(visible)
    .map((el) => ({ texte: txt(el).slice(0, 120), rect: rect(el) }));

  const vides = [...document.querySelectorAll('.ant-empty, .ant-empty-description')]
    .filter(visible)
    .map((el) => txt(el))
    .filter(Boolean);

  const menu = [...document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title')]
    .filter(visible)
    .map((el) => ({ texte: txt(el), cle: el.getAttribute('data-menu-id') || null }));

  // Les fenêtres modales se dessinent hors de <main> : sans ce relevé
  // spécifique, leur contenu — souvent le cœur d'une procédure — n'apparaîtrait
  // nulle part dans le rapport.
  const modales = [...document.querySelectorAll('.ds-modal, .ant-modal, .ant-drawer-content')]
    .filter(visible)
    .map((el) => {
      const t = el.querySelector('.ds-modal-title, .ant-modal-title, .ant-drawer-title');
      return {
        titre: t ? txt(t) : '',
        texte: txt(el).slice(0, 3000),
        rect: rect(el),
      };
    });

  const identifiants = [...zonePrincipale.querySelectorAll('[id]')]
    .filter(visible)
    .map((el) => el.id)
    .slice(0, 120);

  return {
    url: location.href,
    titreDocument: document.title,
    titres,
    onglets,
    boutons,
    champs,
    tableaux,
    statistiques,
    vides,
    modales,
    menu,
    identifiants,
    hauteurDocument: Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    ),
    texte: (zonePrincipale.innerText || '').replace(/\n{3,}/g, '\n\n').slice(0, 4000),
  };
};

function versMarkdown(profil, releves) {
  const l = [`# Reconnaissance — profil ${profil}`, ''];
  for (const r of releves) {
    l.push(`## ${r.titre}  \`${r.cle}\``);
    l.push('');
    l.push(`- Adresse : ${r.url || r.chemin}`);
    l.push(`- Menu : ${r.menu}`);
    if (r.erreur) {
      l.push(`- **ERREUR** : ${r.erreur}`);
      l.push('');
      continue;
    }
    if (r.titres?.length) l.push(`- Titres : ${r.titres.map((t) => `${t.niveau} « ${t.texte} »`).join(' · ')}`);
    if (r.onglets?.length) l.push(`- Onglets : ${r.onglets.map((o) => `« ${o.texte} »${o.actif ? ' (actif)' : ''}`).join(' · ')}`);
    if (r.boutons?.length) l.push(`- Boutons : ${r.boutons.map((b) => `« ${b.texte || b.titre} »${b.id ? ` #${b.id}` : ''}`).join(' · ')}`);
    if (r.champs?.length) l.push(`- Champs : ${r.champs.map((c) => `« ${c.libelle || c.nom || c.id || c.balise} » (${c.balise}${c.requis ? ', requis' : ''})`).join(' · ')}`);
    for (const t of r.tableaux || []) l.push(`- Tableau (${t.lignes} lignes) : ${t.colonnes.join(' | ')}`);
    if (r.statistiques?.length) l.push(`- Indicateurs : ${r.statistiques.map((s) => `« ${s.texte} »`).join(' · ')}`);
    if (r.vides?.length) l.push(`- État vide : ${r.vides.join(' · ')}`);
    for (const m of r.modales || []) {
      l.push(`- Fenêtre « ${m.titre || 'sans titre'} » : ${m.texte}`);
    }
    l.push(`- Hauteur du document : ${r.hauteurDocument} px`);
    l.push('');
    l.push('<details><summary>Texte visible</summary>');
    l.push('');
    l.push('```');
    l.push((r.texte || '').trim());
    l.push('```');
    l.push('');
    l.push('</details>');
    l.push('');
  }
  return l.join('\n');
}

async function main() {
  const profil = (process.argv[2] || 'admin').toLowerCase();
  const def = PROFILS[profil];
  if (!def) throw new Error(`Profil inconnu : ${profil}`);
  assurerDossiers();

  const session = fichierSession(profil);
  if (!fs.existsSync(session)) {
    throw new Error(`Session absente : lancez d'abord « node scripts/1-session.js ${profil} »`);
  }

  const navigateur = await chromium.launch({ executablePath: cheminNavigateur(), headless: true });
  const contexte = await navigateur.newContext({
    storageState: session,
    viewport: FENETRE,
    locale: 'fr-FR',
    timezoneId: 'Africa/Abidjan',
  });
  const page = await contexte.newPage();
  await page.addStyleTag({ content: CSS_MASQUAGE }).catch(() => {});

  const releves = [];
  for (const ecran of def.ecrans) {
    process.stdout.write(`  ${ecran.cle} … `);
    try {
      if (ecran.sansSession) {
        // La page de connexion se relève dans un contexte neuf : avec une
        // session valide, l'application redirige aussitôt vers l'accueil.
        const anonyme = await navigateur.newContext({ viewport: FENETRE, locale: 'fr-FR' });
        const p2 = await anonyme.newPage();
        await p2.goto(`${BASE}${ecran.chemin}`, { waitUntil: 'domcontentloaded' });
        await attendreStabilite(p2, { selecteur: ecran.attendre });
        const r = await p2.evaluate(RELEVE);
        releves.push({ ...ecran, ...r });
        await anonyme.close();
      } else {
        const cible = ecran.depuis || ecran.chemin;
        await page.goto(`${BASE}${cible}`, { waitUntil: 'domcontentloaded' });
        await attendreStabilite(page, { selecteur: ecran.attendre });
        if (ecran.action) {
          const ok = await ecran.action(page);
          if (!ok) throw new Error("aucun élément à ouvrir sur la liste d'origine");
          await attendreStabilite(page);
        }
        const r = await page.evaluate(RELEVE);
        releves.push({ ...ecran, ...r });
      }
      console.log('ok');
    } catch (e) {
      console.log(`ÉCHEC (${e.message})`);
      releves.push({ ...ecran, erreur: e.message });
    }
  }

  // Les fonctions du catalogue ne se sérialisent pas.
  const propre = releves.map(({ action, ...reste }) => reste);
  fs.writeFileSync(path.join(DOSSIERS.recon, `${profil}.json`), JSON.stringify(propre, null, 2), 'utf8');
  fs.writeFileSync(path.join(DOSSIERS.recon, `${profil}.md`), versMarkdown(profil, propre), 'utf8');
  console.log(`\n  Relevé écrit : recon/${profil}.json et recon/${profil}.md`);

  await navigateur.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
