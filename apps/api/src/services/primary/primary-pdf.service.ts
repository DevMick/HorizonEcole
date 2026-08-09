import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { prisma } from '@school/database';
import { computeEvaluationResults, type PrimaryEvaluationResults } from './primary-results.service';
import { getMention, type PrimaryScale } from './class-profiles';
import {
  loadMainTeacherName,
  loadSchoolIdentity,
  loadSchoolLogo,
  type SchoolIdentity,
} from './primary-branding';

/**
 * Documents du primaire : fiche de classement et bulletins.
 *
 * Même chaîne de production que les bulletins du secondaire (HTML → Chrome
 * headless), mais la mise en page suit le modèle officiel de l'enseignement
 * primaire : en-tête administratif à deux colonnes, et **strictement noir sur
 * blanc**. Ces fiches sont affichées, photocopiées et signées à la main ; un
 * aplat de couleur y devient une tache grise. Le logo de l'école est la seule
 * image de la page.
 *
 * Au primaire la fiche de référence est le **classement de la composition**, un
 * tableau élèves × matières avec total, moyenne et rang, suivi du récapitulatif
 * par sexe qu'exige l'administration scolaire.
 */

const PRIMARY_DIR = path.join(process.cwd(), 'uploads', 'primary');

/** Emblème national CI embarqué une seule fois au démarrage. */
function loadEmblemDataUri(): string | null {
  const p = path.join(process.cwd(), '..', 'web', 'pubic', 'embleme.jpg');
  try {
    if (!fs.existsSync(p)) return null;
    const buf = fs.readFileSync(p);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

const EMBLEM_DATA_URI = loadEmblemDataUri();

function ensureDir() {
  if (!fs.existsSync(PRIMARY_DIR)) {
    fs.mkdirSync(PRIMARY_DIR, { recursive: true });
  }
}

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const slug = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '-');

/**
 * Note formatée à deux décimales, virgule décimale, ou tiret si absente.
 *
 * Deux décimales comme la fiche de référence, mais la virgule française : ces
 * documents sont lus et signés en Côte d'Ivoire. Même format que le .docx —
 * les deux exports d'une même composition doivent afficher la même note.
 */
export const fmt = (value: number | null | undefined): string =>
  value === null || value === undefined || Number.isNaN(value)
    ? '—'
    : Number(value).toFixed(2).replace('.', ',');

/** Nombre entier ou décimal court, pour les barèmes et diviseurs. */
export const fmtShort = (value: number): string => String(value).replace('.', ',');

export const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
};

const round2 = (v: number) => Math.round(v * 100) / 100;

function isPassageEval(name: string): boolean {
  const n = name.trim().toUpperCase();
  return (
    n.includes('COMPOSITION DE PASSAGE') ||
    n.includes('COMPOS PASSAGE') ||
    n.includes('EXAMEN BLANC 2') ||
    n === 'EB 2' ||
    n === 'EB2'
  );
}

const STATUS_LABELS: Record<string, string> = {
  ADMIS: 'Admis(e)',
  EXAMEN: 'À examiner',
  REDOUBLE: 'Redouble',
  NON_CLASSE: 'Non classé(e)',
};

/** Rang à la française : « 1er », « 2e », et « ex æquo » quand il est partagé. */
function rankLabel(rank: number | null, isExAequo: boolean): string {
  if (rank === null) return '—';
  const suffix = rank === 1 ? 'er' : 'e';
  return `${rank}${suffix}${isExAequo ? ' ex æquo' : ''}`;
}

// ---------------------------------------------------------------------------
// Feuille de style commune aux documents du primaire
// ---------------------------------------------------------------------------

export function buildStyles(): string {
  return `
    :root {
      --ink: #000;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', 'Times', serif;
      font-size: 11px;
      line-height: 1.35;
      color: var(--ink);
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet { page-break-after: always; }
    .sheet:last-child { page-break-after: auto; }

    /* ===== En-tête administratif (modèle officiel) =====
       Deux colonnes : le ministère et le rattachement d'inspection à gauche,
       la république et l'année scolaire à droite. Aucun aplat, aucune couleur :
       la fiche est faite pour être photocopiée. */
    .doc-head {
      display: grid;
      grid-template-columns: 60% 40%;
      align-items: start;
    }
    .head-left { font-size: 10px; line-height: 1.35; text-align: left; }
    .head-right { font-size: 10px; line-height: 1.35; text-align: right; }
    .doc-head .strong { font-weight: bold; }
    .doc-head .dashes { letter-spacing: -0.5px; }
    .head-right .year { margin-top: 14px; }
    .head-right .cours-info { margin-top: 6px; font-size: 10px; }
    /* Identification de l'école et de la classe, sous l'en-tête. */
    .school-block { margin-top: 6px; font-size: 11px; }
    .school-block > div { margin-bottom: 3px; }

    /* Titre de la composition : centré, gras, souligné.
       Les marges sont serrées à dessein : l'en-tête administratif est haut, et
       une classe de trente élèves doit tenir sur une seule feuille. */
    .doc-title { margin: 12px 0 10px; text-align: center; }
    .doc-title h1 {
      display: inline-block;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid var(--ink);
      padding-bottom: 1px;
    }
    .doc-sub { margin-top: 6px; font-size: 10px; }

    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px; }
    table th, table td {
      border: 1px solid var(--ink);
      padding: 3px 4px;
      text-align: center;
      background: #fff;
      color: var(--ink);
    }
    table thead th { font-weight: bold; font-size: 9px; }
    table thead th .bareme { display: block; font-size: 8px; font-weight: normal; }
    td.name { text-align: left; padding-left: 6px; white-space: nowrap; }

    /* ===== Fiche de classement =====
       En portrait, la largeur utile est de 192 mm pour quatre à sept colonnes
       de matières en plus des colonnes fixes. Les largeurs sont donc imposées
       en pourcentages via un <colgroup> et table-layout: fixed — laissé libre,
       le navigateur donnerait tout l'espace aux intitulés de matières et
       écraserait les noms. Les intitulés se replient d'eux-mêmes sur deux
       lignes, overflow-wrap autorisant la coupure d'un mot trop long. */
    table.ranking { table-layout: fixed; font-size: 8.5px; }
    table.ranking th,
    table.ranking td { padding: 2px 1px; overflow-wrap: anywhere; }
    table.ranking thead th { font-size: 7.5px; line-height: 1.15; letter-spacing: 0; }
    table.ranking thead th .bareme { font-size: 6.5px; }
    table.ranking td.name {
      white-space: normal;
      padding-left: 3px;
      line-height: 1.15;
    }
    table.ranking td.mat { font-size: 7px; }

    /* ===== Bilan annuel =====
       Même tableau élèves × colonnes que la fiche de classement — d'où la
       classe .ranking conservée — mais les colonnes de queue portent du texte
       (mention, décision) et non des notes : elles ont besoin d'être plus
       serrées encore, et la décision doit ressortir puisqu'elle est ce que le
       conseil des maîtres lit en premier. */
    table.annual td.mention { font-size: 7px; line-height: 1.1; }
    table.annual td.decision { font-weight: bold; font-size: 9px; }

    /* Récapitulatif : catégories en lignes, sexes en colonnes. */
    table.recap { font-size: 10px; margin: 0; }
    table.recap td.cat { text-align: left; padding-left: 6px; font-weight: bold; }
    .pct-admis { font-weight: bold; font-size: 11px; margin: 5px 0 2px; }
    td.num { font-variant-numeric: tabular-nums; }
    td.strong { font-weight: bold; }
    /* Note manquante ou élève absent : l'italique suffit à distinguer, sans
       recourir à une couleur qui disparaîtrait à la photocopie. */
    td.na { font-style: italic; }
    tr.absent td { font-style: italic; }

    .section-title {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      padding: 4px;
      border-bottom: 1px solid var(--ink);
    }
    .grid-2 { display: grid; grid-template-columns: 1.35fr 1fr; gap: 10px; margin-bottom: 8px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .card { border: 1px solid var(--ink); }
    .card .body { padding: 6px 8px; font-size: 10px; }
    .kv { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
    .kv .v { font-weight: bold; }
    .section-title + .kv, .section-title + div .kv:first-child { margin-top: 5px; }

    .mg { text-align: center; padding: 4px 0 6px; }
    .mg .val { font-size: 26px; font-weight: bold; line-height: 1.1; }
    .mg .val small { font-size: 13px; font-weight: normal; }
    .mg .cap { font-size: 9.5px; text-transform: uppercase; }

    .student-section {
      border: 1px solid var(--ink);
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    .student-name {
      font-size: 13px; font-weight: bold;
      margin-bottom: 7px;
      text-align: center;
      text-transform: uppercase;
    }
    .student-details { display: grid; grid-template-columns: 1.15fr 1fr .9fr; gap: 10px; font-size: 10.5px; }
    .student-detail-item { margin-bottom: 4px; }
    .student-detail-item .lbl { font-weight: bold; }

    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 14px; font-size: 11px; }
    .signatures.signatures-2 { grid-template-columns: 1fr 1fr; }
    .signature { text-align: center; }
    .signature .lbl { font-weight: bold; text-transform: uppercase; }
    .signature .rule { margin-top: 28px; border-top: .8px solid var(--ink); }
    .foot { margin-top: 8px; font-size: 8.5px; text-align: center; }
  `;
}

export type { SchoolIdentity };

// ---------------------------------------------------------------------------
// Styles et emblème du bulletin redesigné
// ---------------------------------------------------------------------------

/** Emblème réel depuis le fichier téléversé, ou vide si absent. */
function buildEmblemImg(size = 70): string {
  if (!EMBLEM_DATA_URI) return '';
  return `<img src="${EMBLEM_DATA_URI}" alt="Emblème CI" style="width:${size}px;height:${size}px;object-fit:contain;">`;
}

/** Feuille de style réservée aux bulletins — en-tête blanc, filigrane robuste, textes lisibles. */
function buildBulletinStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1a1a2e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet { position: relative; page-break-after: always; }
    .sheet:last-child { page-break-after: auto; }

    .content { position: relative; z-index: 1; }

    /* ── En-tête blanc ── */
    .doc-header {
      background: #fff;
      border-bottom: 2px solid #1B4F72;
      padding: 10px 14px 8px;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .logo-box {
      width: 70px; height: 70px; flex: none;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-box img { max-width: 70px; max-height: 70px; object-fit: contain; }
    .emblem-box { width: 70px; height: 70px; flex: none; display: flex; align-items: center; justify-content: center; }
    .emblem-box img { max-width: 70px; max-height: 70px; object-fit: contain; }
    .header-center { flex: 1; text-align: center; padding: 0 8px; color: #1a1a2e; }
    .republic   { font-size: 9.5px; letter-spacing: 0.6px; text-transform: uppercase; font-weight: 700; color: #1B4F72; }
    .motto      { font-size: 9px; font-style: italic; color: #555; margin-top: 2px; }
    .ministry   { font-size: 8.5px; font-weight: bold; text-transform: uppercase; margin-top: 5px; color: #333; line-height: 1.35; }
    .school-name { font-size: 15px; font-weight: bold; text-transform: uppercase; margin-top: 5px; letter-spacing: 0.5px; color: #1B4F72; }
    .school-sub  { font-size: 9px; color: #666; margin-top: 2px; }

    /* Bandeau tricolore CI */
    .ci-stripe { display: flex; height: 5px; }
    .ci-o { background: #F77F00; flex: 1; }
    .ci-w { background: #e8e8e8; flex: 1; }
    .ci-g { background: #009A44; flex: 1; }

    /* Titre */
    .bulletin-title { background: #EBF5FB; padding: 6px 14px; }
    .bulletin-title h1 { font-size: 11.5px; font-weight: bold; text-transform: uppercase; color: #1B4F72; }
    .bulletin-title .meta { font-size: 9px; color: #555; margin-top: 2px; }

    /* Identité élève */
    .student-block { margin: 8px 12px; border: 1.5px solid #2874A6; border-radius: 5px; overflow: hidden; }
    .student-block-head { background: #2874A6; color: #fff; padding: 5px 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .4px; }
    .student-name { font-size: 16px; font-weight: bold; text-align: center; color: #1B4F72; padding: 7px 10px 4px; text-transform: uppercase; letter-spacing: .4px; }
    .student-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 5px 12px 10px; gap: 6px; }
    .smeta-item .lbl { font-size: 9px; color: #777; display: block; margin-bottom: 1px; }
    .smeta-item .val { font-size: 11px; font-weight: bold; color: #1a1a2e; }

    /* Tableau des notes */
    .grades-section { margin: 0 12px 8px; }
    .sec-title { background: #1B4F72; color: #fff; padding: 5px 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .4px; }
    table.grades { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    table.grades th {
      background: #2874A6; color: #fff; padding: 5px 7px;
      text-align: center; font-size: 10px; font-weight: bold; text-transform: uppercase;
    }
    table.grades th.left { text-align: left; }
    table.grades td { padding: 4px 7px; border-bottom: 1px solid #e3ecf5; text-align: center; }
    table.grades td.name { text-align: left; font-weight: 500; }
    table.grades tr:nth-child(even) td { background: #f4f9fd; }
    table.grades tr.total td { background: #dbeafe; font-weight: bold; border-top: 1.5px solid #2874A6; border-bottom: none; font-size: 12px; }
    td.na { color: #aaa; font-style: italic; }
    td.num { font-variant-numeric: tabular-nums; }

    /* Cartes de synthèse */
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 0 12px 8px; }
    .scard { border-radius: 5px; overflow: hidden; border: 1px solid #d6e8f5; }
    .scard .sc-head { padding: 5px 10px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; letter-spacing: .4px; color: #fff; }
    .scard.avg    .sc-head { background: #2874A6; }
    .scard.rank   .sc-head { background: #1B4F72; }
    .scard.decide .sc-head { background: #1A5276; }
    .scard .sc-body { padding: 6px 10px; font-size: 10px; }
    .avg-big { font-size: 30px; font-weight: bold; text-align: center; line-height: 1; padding: 6px 0 3px; }
    .avg-big .sc { font-size: 14px; font-weight: normal; color: #666; }
    .avg-big.success { color: #1a7a3c; }
    .avg-big.warning { color: #b7770d; }
    .avg-big.danger  { color: #c0392b; }
    .avg-big.neutral { color: #888; }
    .mention-tag { text-align: center; font-size: 9px; color: #555; margin-top: 2px; }
    .kv { display: flex; justify-content: space-between; gap: 4px; margin-bottom: 3px; }
    .kv .k { color: #666; }
    .kv .v { font-weight: bold; color: #1a1a2e; }
    .decision-val { text-align: center; padding: 8px 4px 4px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; }
    .decision-val.admis    { color: #1a7a3c; }
    .decision-val.examen   { color: #b7770d; }
    .decision-val.redouble { color: #c0392b; }
    .decision-val.non-classe { color: #888; }

    /* Stats classe */
    .class-stats { margin: 0 12px 10px; background: #f4f9fd; border: 1px solid #d6e8f5; border-radius: 4px; padding: 5px 12px; }
    .cs-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #2874A6; margin-bottom: 4px; letter-spacing: .3px; }
    .cs-row { display: flex; gap: 16px; flex-wrap: wrap; font-size: 9.5px; }
    .cs-item .l { color: #777; }
    .cs-item .v { font-weight: bold; color: #1a1a2e; }

    /* Récapitulatif annuel (Composition de Passage) */
    .annual-recap { margin: 0 12px 8px; }
    .ar-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    .ar-table td { padding: 4px 10px; border-bottom: 1px solid #e3ecf5; }
    .ar-label { color: #333; }
    .ar-value { text-align: right; font-variant-numeric: tabular-nums; font-weight: bold; color: #1a1a2e; min-width: 90px; }
    .ar-sub-total td { background: #EBF5FB; font-weight: bold; border-top: 1.5px solid #2874A6; border-bottom: 1px solid #aac8e0; }
    .ar-passage td { background: #EBF5FB; border-bottom: 1.5px solid #2874A6; }
    .ar-mga-row td { background: #1B4F72; color: #fff; padding: 6px 10px; border-bottom: none; }
    .ar-mga-row .ar-label { color: #fff; font-size: 11px; }
    .ar-mga-row .ar-value { color: #fff; font-size: 14px; text-align: right; vertical-align: middle; }
    .ar-mga-row .ar-value.success { color: #7DCEA0; }
    .ar-mga-row .ar-value.danger  { color: #F1948A; }
    .ar-mga-row .ar-value.warning { color: #F8C471; }
    .ar-formula { font-size: 8px; color: rgba(255,255,255,0.7); font-weight: normal; display: block; margin-top: 2px; }
    .ar-appr { font-size: 9px; color: rgba(255,255,255,0.85); font-weight: normal; display: block; margin-top: 2px; }

    /* Signatures */
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 24px 12px 0; }
    .sig { text-align: center; }
    .sig .lbl { font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #1B4F72; letter-spacing: .3px; }

  `;
}

/** Ce que l'en-tête officiel dit de la classe, sous le bloc administratif. */
export interface HeaderContext {
  academicYearName: string;
  className: string;
  teacherName: string | null;
}

/**
 * En-tête institutionnel, identique sur tous les documents et repris tel quel
 * du modèle officiel : ministère et rattachement d'inspection à gauche,
 * république et année scolaire à droite, puis l'identification de l'école et
 * de la classe. Même ordre et mêmes libellés que la version Word.
 *
 * L'école vient de la base : l'application est multi-établissements, un nom
 * écrit en dur ferait sortir toutes les fiches au nom de la première école
 * installée. Le logo est la seule adaptation à notre application.
 */
export function buildHeader(
  school: SchoolIdentity | null,
  context: HeaderContext,
): string {
  const inspectionArea = (school?.secteurPedagogique || school?.directionRegionale || '')
    .toUpperCase()
    .trim();

  return `
  <div class="doc-head">
    <div class="head-left">
      <div class="strong">MINISTÈRE DE L'ÉDUCATION NATIONALE</div>
      <div class="strong">ET DE L'ALPHABÉTISATION</div>
      <div class="dashes">------------</div>
      <div class="strong">DIRECTION RÉGIONALE ${escapeHtml((school?.directionRegionale || 'NON RENSEIGNÉE').toUpperCase())}</div>
      <div class="dashes">------------</div>
      <div class="strong">INSPECTION DE L'ENSEIGNEMENT</div>
      <div class="strong">${escapeHtml(`PRÉSCOLAIRE ET PRIMAIRE ${inspectionArea}`.trimEnd())}</div>
    </div>
    <div class="head-right">
      <div class="strong">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
      <div class="dashes">------------</div>
      <div><em>${escapeHtml(school?.motto || 'Union - Discipline - Travail')}</em></div>
      <div class="strong year">ANNÉE SCOLAIRE : ${escapeHtml(context.academicYearName)}</div>
      <div class="cours-info">Cours : <strong>${escapeHtml(context.className)}</strong> / Tenue par : <strong>${escapeHtml(context.teacherName || 'Non désigné(e)')}</strong></div>
    </div>
  </div>

  <div class="school-block">
    ${
      school?.secteurPedagogique
        ? `<div><strong>Secteur Pédagogique : </strong>${escapeHtml(school.secteurPedagogique)}</div>`
        : ''
    }
    <div><strong>École : </strong>${escapeHtml(school?.name || 'Non renseignée')}</div>
  </div>`;
}

/**
 * Rendu Chrome headless — un seul navigateur par document, quel qu'il soit.
 *
 * Tous les documents du primaire sortent en A4 portrait, comme les fiches
 * officielles : la largeur du tableau de classement est tenue par la
 * répartition en pourcentages de ses colonnes, pas par la mise en paysage.
 */
export async function renderPdf(
  html: string,
  fileName: string,
  options?: { footerText?: string },
): Promise<string> {
  ensureDir();
  const filePath = path.join(PRIMARY_DIR, fileName);
  const { footerText } = options ?? {};

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    // Une classe entière fait plusieurs dizaines de pages : le délai par défaut
    // (30 s) suffit pour une fiche, pas toujours pour trente bulletins.
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120_000 });

    await page.pdf({
      path: filePath,
      format: 'A4',
      margin: { top: '10mm', right: '9mm', bottom: footerText ? '14mm' : '10mm', left: '9mm' },
      displayHeaderFooter: !!footerText,
      headerTemplate: '<span></span>',
      footerTemplate: footerText
        ? `<div style="box-sizing:border-box;width:100%;padding:3px 9mm 0;font-size:8px;font-family:Arial,sans-serif;text-align:center;color:#444;border-top:0.4pt solid #aaa;">${footerText}</div>`
        : '<span></span>',
      printBackground: true,
      timeout: 120_000,
    });

    await browser.close();
    return `/uploads/primary/${fileName}`;
  } catch (error: any) {
    if (browser) await browser.close();
    throw new Error(`Génération du PDF impossible : ${error.message}`);
  }
}

export function wrapDocument(title: string, styles: string, bodies: string[]): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
  ${bodies.join('\n')}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Fiche de classement
// ---------------------------------------------------------------------------

/**
 * Bloc « Récapitulatif des résultats » de la fiche officielle : les catégories
 * d'effectif en lignes, la ventilation garçons / filles / total en colonnes.
 * Le taux de réussite ne figure pas dans le tableau — il porte sur la classe
 * entière et se lit sur sa propre ligne, juste en dessous.
 */
function buildRecapTable(results: PrimaryEvaluationResults): string {
  const { recap } = results;
  const lines: Array<[string, 'enrolled' | 'composed' | 'admitted' | 'repeating']> = [
    ['Inscrits', 'enrolled'],
    ['Présents', 'composed'],
    ['Admis', 'admitted'],
    ['Redoublants', 'repeating'],
  ];

  return `
  <div>
    <div class="section-title">RÉCAPITULATIF DES RÉSULTATS</div>
    <table class="recap">
      <thead>
        <tr>
          <th></th>
          <th>Garçons</th>
          <th>Filles</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${lines
          .map(
            ([label, key]) => `
        <tr>
          <td class="cat">${label}</td>
          <td class="num">${recap.boys[key]}</td>
          <td class="num">${recap.girls[key]}</td>
          <td class="num strong">${recap.total[key]}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
    <div class="pct-admis">% Admis : ${recap.total.successRate === null ? '—' : fmt(recap.total.successRate)}</div>
  </div>`;
}

/**
 * Fiche de classement d'une composition : le tableau élèves × matières, suivi
 * des statistiques de classe et du récapitulatif par sexe.
 */
export async function generateRankingSheetPDF(evaluationId: string): Promise<string> {
  const data = await computeEvaluationResults(evaluationId);
  const [school, teacherName] = await Promise.all([
    loadSchoolIdentity(data.class.id),
    loadMainTeacherName(data.class.id, data.academicYear.id),
  ]);

  const scale = data.evaluation.averageScale;

  // Répartition en pourcentages de la largeur utile : les colonnes fixes et de
  // queue sont dimensionnées d'abord, les matières se partagent le reste.
  const subjectCount = Math.max(data.subjects.length, 1);
  const fixedWidths = [6, 24, 4];
  const trailingWidths = [7];
  const subjectWidth =
    (100 -
      fixedWidths.reduce((sum, value) => sum + value, 0) -
      trailingWidths.reduce((sum, value) => sum + value, 0)) /
    subjectCount;

  const colgroup = [
    ...fixedWidths,
    ...data.subjects.map(() => subjectWidth),
    ...trailingWidths,
  ]
    .map((width) => `<col style="width:${width.toFixed(3)}%">`)
    .join('');

  const headerCells = data.subjects
    .map((subject) => `<th>${escapeHtml(subject.name.toUpperCase())}</th>`)
    .join('');

  const rows = data.results
    .map((result) => {
      const noteCells = data.subjects
        .map((subject) => {
          const note = result.notes[subject.subjectId];
          if (result.isAbsent) return '<td class="na">abs.</td>';
          return note === null || note === undefined
            ? '<td class="na">—</td>'
            : `<td class="num">${fmt(note)}</td>`;
        })
        .join('');

      return `
      <tr${result.isAbsent ? ' class="absent"' : ''}>
        <td class="num">${result.rank === null ? '—' : `${result.rank}${result.isExAequo ? ' ex' : ''}`}</td>
        <td class="name">${escapeHtml(result.fullName)}</td>
        <td>${escapeHtml(result.gender === 'M' ? 'M' : 'F')}</td>
        ${noteCells}
        <td class="num strong">${fmt(result.average)}</td>
      </tr>`;
    })
    .join('');

  const body = `
<div class="sheet">
  ${buildHeader(school, {
    academicYearName: data.academicYear.name,
    className: data.class.name,
    teacherName,
  })}

  <div class="doc-title">
    <h1>${escapeHtml(data.evaluation.name.toUpperCase())} DU ${formatDate(data.evaluation.date)}</h1>
  </div>

  <table class="ranking">
    <colgroup>${colgroup}</colgroup>
    <thead>
      <tr>
        <th>RANG</th>
        <th>Nom et Prénoms</th>
        <th>SEXE</th>
        ${headerCells}
        <th>MOY</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="${data.subjects.length + 4}" class="na">Aucun élève inscrit dans cette classe</td></tr>`}
    </tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:inherit;">
    <tr>
      <td style="width:57%;padding-right:5px;vertical-align:top;border:none;">
        ${buildRecapTable(data)}
      </td>
      <td style="width:43%;padding-left:5px;vertical-align:top;border:none;">
        <div class="section-title">STATISTIQUES DE LA CLASSE</div>
        <div class="card">
          <div class="body">
            <div class="kv"><span>Moyenne de la classe</span><span class="v">${fmt(data.stats.classAverage)} / ${scale}</span></div>
            <div class="kv"><span>Plus forte moyenne</span><span class="v">${fmt(data.stats.bestAverage)}</span></div>
            <div class="kv"><span>Plus faible moyenne</span><span class="v">${fmt(data.stats.worstAverage)}</span></div>
            <div class="kv"><span>Élèves ayant composé</span><span class="v">${data.stats.composed} / ${data.stats.enrolled}</span></div>
            <div class="kv"><span>Absents</span><span class="v">${data.stats.absent}</span></div>
          </div>
        </div>
      </td>
    </tr>
  </table>

  <div class="signatures signatures-2">
    <div class="signature"><div class="lbl">L'ENSEIGNANT(E)</div></div>
    <div class="signature"><div class="lbl">LE DIRECTEUR</div></div>
  </div>

</div>`;

  const fileName = `classement-${slug(data.class.name)}-${slug(data.evaluation.name)}-${Date.now()}.pdf`;

  return renderPdf(
    wrapDocument(`Fiche de classement — ${data.class.name}`, buildStyles(), [body]),
    fileName,
    { footerText: `Document généré le ${formatDate(new Date())}${school?.name ? ` — ${escapeHtml(school.name)}` : ''}` },
  );
}

// ---------------------------------------------------------------------------
// Bulletins
// ---------------------------------------------------------------------------

interface BulletinContext {
  data: PrimaryEvaluationResults;
  generatedAt: Date;
  school: SchoolIdentity | null;
  /** Logo en base64 prêt à insérer en <img src="…"> et en filigrane. */
  logoDataUri: string | null;
  teacherName: string | null;
  studentDetails: Map<string, { dateOfBirth: Date | null; placeOfBirth: string | null }>;
  isPassage: boolean;
  isExamClass: boolean;
  previousEvals: Array<{ id: string; name: string; isExam: boolean }>;
  previousAveragesByStudent: Map<string, Record<string, number | null>>;
}

/**
 * Section récapitulatif annuel insérée uniquement dans les bulletins de
 * Composition de Passage : liste les moyennes de chaque composition précédente,
 * la moyenne annuelle partielle, la moyenne de passage, puis la MGA.
 *
 * Formule (non-CM2) : MGA = (moy. annuelle × 1 + moy. passage × 2) ÷ 3
 */
function buildAnnualRecapSection(
  context: BulletinContext,
  result: PrimaryEvaluationResults['results'][number],
): string {
  if (!context.isPassage || context.previousEvals.length === 0) return '';

  const scale = context.data.evaluation.averageScale as PrimaryScale;
  const prevAvgs = context.previousAveragesByStudent.get(result.studentId) ?? {};

  const prevRows = context.previousEvals
    .map((ev) => {
      const avg = prevAvgs[ev.id] ?? null;
      return `
        <tr>
          <td class="ar-label">${escapeHtml(ev.name)}</td>
          <td class="ar-value">${avg !== null ? `${fmt(avg)} / ${scale}` : ''}</td>
        </tr>`;
    })
    .join('');

  const prevScores = context.previousEvals
    .map((ev) => prevAvgs[ev.id])
    .filter((a): a is number => a !== null && a !== undefined);

  const moyAnnuelle =
    prevScores.length > 0
      ? round2(prevScores.reduce((s, v) => s + v, 0) / prevScores.length)
      : null;

  const moyPassage = result.average;

  let mga: number | null = null;
  if (moyAnnuelle !== null && moyPassage !== null) {
    mga = round2((moyAnnuelle * 1 + moyPassage * 2) / 3);
  } else if (moyPassage !== null && prevScores.length === 0) {
    mga = moyPassage;
  }

  const mgaAppreciation = mga !== null ? getMention(mga, scale) : null;
  const mgaClass =
    mga === null
      ? 'neutral'
      : mga >= context.data.thresholds.admission
        ? 'success'
        : mga < context.data.thresholds.redoublement
          ? 'danger'
          : 'warning';

  return `
  <!-- RÉCAPITULATIF ANNUEL -->
  <div class="annual-recap">
    <div class="sec-title">Récapitulatif annuel</div>
    <table class="ar-table">
      <tbody>
        ${prevRows}
        <tr class="ar-passage">
          <td class="ar-label">${escapeHtml(context.data.evaluation.name)}</td>
          <td class="ar-value">${moyPassage !== null ? `${fmt(moyPassage)} / ${scale}` : ''}</td>
        </tr>
        <tr class="ar-mga-row">
          <td class="ar-label">
            <strong>Moyenne Générale Annuelle (MGA)</strong>
          </td>
          <td class="ar-value ${mgaClass}">
            ${mga !== null ? `${fmt(mga)} / ${scale}` : ''}
            ${mgaAppreciation ? `<span class="ar-appr">Appréciation : ${escapeHtml(mgaAppreciation)}</span>` : ''}
          </td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

/** Corps d'un bulletin redesigné — une feuille par élève. */
function buildBulletinBody(
  context: BulletinContext,
  result: PrimaryEvaluationResults['results'][number],
): string {
  const { data, generatedAt, school, logoDataUri, teacherName } = context;
  const scale = data.evaluation.averageScale;
  const details = context.studentDetails.get(result.studentId);

  // Couleur de la moyenne selon les seuils
  const avgClass =
    result.average === null
      ? 'neutral'
      : result.average >= data.thresholds.admission
        ? 'success'
        : result.average < data.thresholds.redoublement
          ? 'danger'
          : 'warning';

  // Classe CSS de la décision
  const decisionCss =
    result.status === 'NON_CLASSE'
      ? 'non-classe'
      : result.status.toLowerCase().replace('_', '-');

  // Lignes du tableau des matières
  const subjectRows = data.subjects
    .map((subject) => {
      const note = result.notes[subject.subjectId];
      const noteCell = result.isAbsent
        ? '<td class="na">Absent(e)</td>'
        : note === null || note === undefined
          ? '<td class="na"></td>'
          : `<td class="num">${fmt(note)}</td>`;
      return `<tr>
        <td class="name">${escapeHtml(subject.name)}</td>
        <td class="num">${subject.maxScore}</td>
        ${noteCell}
      </tr>`;
    })
    .join('');

  const logoImg = logoDataUri
    ? `<img src="${logoDataUri}" alt="${escapeHtml(school?.name ?? '')}">`
    : '';

  const inspArea = [school?.secteurPedagogique, school?.directionRegionale]
    .filter(Boolean)
    .join(' — ');

  return `
<div class="sheet">
  <div class="content">

  <!-- EN-TÊTE blanc -->
  <div class="doc-header">
    <div class="header-top">
      <div class="logo-box">${logoImg}</div>
      <div class="header-center">
        <div class="republic">République de Côte d'Ivoire</div>
        <div class="motto">${escapeHtml(school?.motto || 'Union – Discipline – Travail')}</div>
        <div class="ministry">Ministère de l'Éducation Nationale et de l'Alphabétisation</div>
        <div class="school-name">${escapeHtml(school?.name || 'École')}</div>
        ${inspArea ? `<div class="school-sub">${escapeHtml(inspArea)}</div>` : ''}
        ${school?.phone || school?.email ? `<div class="school-sub">${[school.phone, school.email].filter(Boolean).map(escapeHtml).join(' · ')}</div>` : ''}
      </div>
      <div class="emblem-box">${buildEmblemImg(70)}</div>
    </div>
  </div>

  <!-- BANDEAU CI -->
  <div class="ci-stripe"><div class="ci-o"></div><div class="ci-w"></div><div class="ci-g"></div></div>

  <!-- TITRE -->
  <div class="bulletin-title">
    <h1>Bulletin de Notes — ${escapeHtml(data.evaluation.name)}</h1>
    <div class="meta">
      Date : ${formatDate(data.evaluation.date)}
      &nbsp;·&nbsp; Classe : ${escapeHtml(data.class.name)}
      &nbsp;·&nbsp; Année scolaire : ${escapeHtml(data.academicYear.name)}
      ${data.evaluation.isExam ? '&nbsp;·&nbsp; <strong>Examen blanc</strong>' : ''}
    </div>
  </div>

  <!-- IDENTITÉ -->
  <div class="student-block">
    <div class="student-block-head">Identité de l'élève</div>
    <div class="student-name">${escapeHtml(result.lastName)} ${escapeHtml(result.firstName)}</div>
    <div class="student-meta">
      <div class="smeta-item">
        <span class="lbl">Né(e) le</span>
        <span class="val">${formatDate(details?.dateOfBirth) || ''}</span>
      </div>
      <div class="smeta-item">
        <span class="lbl">Lieu de naissance</span>
        <span class="val">${escapeHtml(details?.placeOfBirth || '')}</span>
      </div>
      <div class="smeta-item">
        <span class="lbl">Sexe</span>
        <span class="val">${result.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
      </div>
    </div>
  </div>

  <!-- NOTES -->
  <div class="grades-section">
    <div class="sec-title">Résultats par discipline</div>
    <table class="grades">
      <thead>
        <tr>
          <th class="left" style="width:55%">Discipline</th>
          <th style="width:20%">Barème</th>
          <th style="width:25%">Note obtenue</th>
        </tr>
      </thead>
      <tbody>
        ${result.isAbsent
          ? `<tr><td colspan="3" class="na" style="text-align:center;padding:10px;">Élève absent(e) à cette composition — non classé(e)</td></tr>`
          : subjectRows
        }
        ${!result.isAbsent ? `<tr class="total">
          <td class="name">TOTAL</td>
          <td class="num">${data.totalMaxScore}</td>
          <td class="num">${fmt(result.total)}</td>
        </tr>` : ''}
      </tbody>
    </table>
  </div>

  ${buildAnnualRecapSection(context, result)}

  <!-- SYNTHÈSE -->
  <div class="summary-grid">
    <div class="scard avg">
      <div class="sc-head">Moyenne générale</div>
      <div class="sc-body">
        <div class="avg-big ${avgClass}">${fmt(result.average)}<span class="sc"> / ${scale}</span></div>
        ${result.mention ? `<div class="mention-tag">Appréciation : <strong>${escapeHtml(result.mention)}</strong></div>` : ''}
      </div>
    </div>
    <div class="scard rank">
      <div class="sc-head">Classement</div>
      <div class="sc-body">
        <div class="kv"><span class="k">Rang</span><span class="v">${rankLabel(result.rank, result.isExAequo)}</span></div>
        <div class="kv"><span class="k">Effectif présent</span><span class="v">${data.stats.composed} élève(s)</span></div>
        <div class="kv"><span class="k">Moy. de la classe</span><span class="v">${fmt(data.stats.classAverage)} / ${scale}</span></div>
        <div class="kv"><span class="k">Meilleure moyenne</span><span class="v">${fmt(data.stats.bestAverage)}</span></div>
      </div>
    </div>
    <div class="scard decide">
      <div class="sc-head">Décision du conseil</div>
      <div class="sc-body">
        <div class="decision-val ${decisionCss}">${escapeHtml(STATUS_LABELS[result.status] ?? result.status)}</div>
        <div class="kv"><span class="k">Seuil d'admission</span><span class="v">${fmtShort(data.thresholds.admission)} / ${scale}</span></div>
        <div class="kv"><span class="k">Seuil redoublement</span><span class="v">${fmtShort(data.thresholds.redoublement)} / ${scale}</span></div>
      </div>
    </div>
  </div>

  <!-- STATS CLASSE -->
  <div class="class-stats">
    <div class="cs-title">Informations complémentaires</div>
    <div class="cs-row">
      <div class="cs-item"><span class="l">Enseignant(e) : </span><span class="v">${escapeHtml(teacherName || 'Non désigné(e)')}</span></div>
      <div class="cs-item"><span class="l">Plus faible moy. : </span><span class="v">${fmt(data.stats.worstAverage)} / ${scale}</span></div>
      <div class="cs-item"><span class="l">Taux de réussite : </span><span class="v">${data.stats.successRate === null ? '—' : fmt(data.stats.successRate) + ' %'}</span></div>
      <div class="cs-item"><span class="l">Élèves inscrits : </span><span class="v">${data.stats.enrolled}</span></div>
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="signatures">
    <div class="sig"><div class="lbl">Le Maître / La Maîtresse</div></div>
    <div class="sig"><div class="lbl">Le Directeur / La Directrice</div></div>
    <div class="sig"><div class="lbl">Le Parent / Le Tuteur</div></div>
  </div>

  </div><!-- /.content -->
</div>`;
}

/**
 * Contexte partagé d'un lot de bulletins : les résultats de la composition sont
 * calculés une seule fois, et les dates de naissance chargées en une requête.
 */
async function buildBulletinContext(
  evaluationId: string,
  generatedAt?: Date,
): Promise<BulletinContext> {
  const data = await computeEvaluationResults(evaluationId);

  const [students, school, teacherName] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: data.results.map((result) => result.studentId) } },
      select: { id: true, dateOfBirth: true, placeOfBirth: true },
    }),
    loadSchoolIdentity(data.class.id),
    loadMainTeacherName(data.class.id, data.academicYear.id),
  ]);

  const logo = loadSchoolLogo(school?.logoUrl);
  const isPassage = isPassageEval(data.evaluation.name);
  const isExamClass = data.class.level?.toUpperCase().includes('CM2') ?? false;

  let previousEvals: BulletinContext['previousEvals'] = [];
  let previousAveragesByStudent: BulletinContext['previousAveragesByStudent'] = new Map();

  if (isPassage) {
    const allEvals = await prisma.primary_evaluations.findMany({
      where: { academic_year_id: data.academicYear.id, class_id: data.class.id },
      orderBy: [{ sort_order: 'asc' }, { date: 'asc' }],
      select: { id: true, name: true, is_exam: true },
    });

    previousEvals = allEvals
      .filter((e) => e.id !== data.evaluation.id)
      .map((e) => ({ id: e.id, name: e.name, isExam: e.is_exam }));

    for (const ev of previousEvals) {
      const evResults = await computeEvaluationResults(ev.id);
      evResults.results.forEach((r) => {
        const bucket = previousAveragesByStudent.get(r.studentId) ?? {};
        bucket[ev.id] = r.average;
        previousAveragesByStudent.set(r.studentId, bucket);
      });
    }
  }

  return {
    data,
    generatedAt: generatedAt ?? data.evaluation.publishedAt ?? new Date(),
    school,
    logoDataUri: logo?.dataUri ?? null,
    teacherName,
    studentDetails: new Map(
      students.map((student) => [
        student.id,
        { dateOfBirth: student.dateOfBirth, placeOfBirth: student.placeOfBirth },
      ]),
    ),
    isPassage,
    isExamClass,
    previousEvals,
    previousAveragesByStudent,
  };
}

/** Bulletin d'un élève pour une composition. */
export async function generateStudentBulletinPDF(
  evaluationId: string,
  studentId: string,
  generatedAt?: Date,
): Promise<string> {
  const context = await buildBulletinContext(evaluationId, generatedAt);
  const result = context.data.results.find((entry) => entry.studentId === studentId);

  if (!result) {
    throw new Error("Cet élève ne figure pas dans cette composition");
  }

  const fileName = `bulletin-${slug(result.lastName)}-${slug(result.firstName)}-${slug(context.data.evaluation.name)}-${Date.now()}.pdf`;

  return renderPdf(
    wrapDocument(
      `Bulletin — ${result.fullName}`,
      buildBulletinStyles(),
      [buildBulletinBody(context, result)],
    ),
    fileName,
    { footerText: `Document généré le ${formatDate(context.generatedAt)}${context.school?.name ? ` — ${escapeHtml(context.school.name)}` : ''}` },
  );
}

/**
 * Bulletins de toute la classe dans un seul PDF, un par page, prêt à imprimer.
 * Un seul Chrome pour l'ensemble : c'est ce qui rend une classe entière tenable.
 */
export async function generateClassBulletinsPDF(
  evaluationId: string,
  generatedAt?: Date,
): Promise<{ path: string; count: number }> {
  const context = await buildBulletinContext(evaluationId, generatedAt);

  if (context.data.results.length === 0) {
    throw new Error('Aucun élève dans cette classe');
  }

  const bodies = context.data.results.map((result) => buildBulletinBody(context, result));
  const fileName = `bulletins-${slug(context.data.class.name)}-${slug(context.data.evaluation.name)}-${Date.now()}.pdf`;

  const filePath = await renderPdf(
    wrapDocument(
      `Bulletins ${context.data.class.name} — ${context.data.evaluation.name}`,
      buildBulletinStyles(),
      bodies,
    ),
    fileName,
    { footerText: `Document généré le ${formatDate(context.generatedAt)}${context.school?.name ? ` — ${escapeHtml(context.school.name)}` : ''}` },
  );

  return { path: filePath, count: bodies.length };
}

export { PRIMARY_DIR };
