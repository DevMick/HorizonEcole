import fs from 'fs';
import path from 'path';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { getClassAnnualReport } from './primary-results.service';
import { loadMainTeacherName, loadSchoolIdentity } from './primary-branding';
import {
  buildHeader,
  buildStyles,
  escapeHtml,
  fmt,
  fmtShort,
  formatDate,
  renderPdf,
  slug,
  wrapDocument,
} from './primary-pdf.service';
import {
  CONTENT_WIDTH_TWIPS,
  DOCX_DEFAULTS,
  DOCX_PAGE,
  PRIMARY_DIR,
  TABLE_BORDERS,
  buildColumnWidths,
  buildDocxHeader,
  buildSignatureTable,
  cell,
  fmt as fmtDocx,
  loadHeaderContext,
} from './primary-docx.service';

/**
 * Bilan annuel d'une classe du primaire, en PDF et en Word.
 *
 * C'est le document de fin d'année : une ligne par élève, la moyenne obtenue à
 * chacune des compositions de l'année, la moyenne annuelle, la mention et la
 * décision de passage. Le conseil des maîtres le lit pour trancher, le
 * directeur le signe, l'inspection l'archive.
 *
 * La fiche reprend exactement la mise en page des documents de composition —
 * même en-tête administratif, même tableau à colonnes fixes, même récapitulatif
 * par sexe, même noir et blanc : le bilan est photocopié comme les autres, et
 * un aplat de couleur y devient une tache grise.
 *
 * Rien n'est écrit en dur : l'école, sa direction régionale, son secteur
 * pédagogique, le titulaire de la classe et les seuils de passage viennent tous
 * de la base, l'application étant multi-établissements.
 */

/** Effectifs d'une catégorie d'élèves, tels que les lit le récapitulatif. */
interface AnnualRecap {
  enrolled: number;
  composed: number;
  admitted: number;
  repeating: number;
  successRate: number | null;
}

type AnnualReport = Awaited<ReturnType<typeof getClassAnnualReport>>;
type AnnualRow = AnnualReport['results'][number];

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Récapitulatif d'un groupe d'élèves.
 *
 * « Présents » compte au bilan annuel les élèves qui ont composé au moins une
 * fois dans l'année : un élève arrivé en cours d'année a bien une moyenne
 * annuelle, un élève qui n'a jamais composé n'en a aucune et ne peut pas
 * figurer au dénominateur du taux de réussite.
 */
function buildAnnualRecap(rows: AnnualRow[]): AnnualRecap {
  const composed = rows.filter((row) => row.yearAverage !== null).length;
  const admitted = rows.filter((row) => row.status === 'ADMIS').length;

  return {
    enrolled: rows.length,
    composed,
    admitted,
    repeating: rows.filter((row) => row.status === 'REDOUBLE').length,
    successRate: composed > 0 ? round2((admitted / composed) * 100) : null,
  };
}

/** Ventilation garçons / filles / total, l'ordre des colonnes de la fiche. */
function buildRecaps(rows: AnnualRow[]) {
  return {
    boys: buildAnnualRecap(rows.filter((row) => row.gender === 'M')),
    girls: buildAnnualRecap(rows.filter((row) => row.gender !== 'M')),
    total: buildAnnualRecap(rows),
  };
}

/**
 * Décision de fin d'année en une lettre : « A » pour admis, « R » pour
 * redouble. La fiche officielle ne porte que ces deux lettres — et un tiret
 * quand l'élève n'a pas composé, plutôt qu'une décision qu'on ne peut pas
 * prendre. Un cas « à examiner » relève du conseil des maîtres : il reste
 * ouvert, d'où le point d'interrogation.
 */
function decisionLetter(row: AnnualRow): string {
  if (row.yearAverage === null) return '—';
  if (row.status === 'ADMIS') return 'A';
  if (row.status === 'REDOUBLE') return 'R';
  return '?';
}

/** Élèves du 1er au dernier, les non classés en queue, par ordre alphabétique. */
function sortByRank(rows: AnnualRow[]): AnnualRow[] {
  return [...rows].sort((left, right) => {
    if (left.rank !== null && right.rank !== null) return left.rank - right.rank;
    if (left.rank !== null) return -1;
    if (right.rank !== null) return 1;
    return left.fullName.localeCompare(right.fullName, 'fr');
  });
}

/** Contexte commun aux deux formats : le bilan, l'école, le titulaire. */
async function loadAnnualContext(classId: string, academicYearId: string) {
  const report = await getClassAnnualReport(classId, academicYearId);

  // Un bilan sans composition n'aurait ni moyenne annuelle, ni rang, ni
  // décision : autant le dire plutôt que de sortir une feuille de colonnes
  // vides. Le libellé reprend les tournures que `handleError` traduit en 400 —
  // c'est une demande impossible, pas une panne du serveur.
  if (report.evaluations.length === 0) {
    throw new Error(
      "Aucune composition n'a été ouverte pour cette année scolaire : le bilan annuel doit s'appuyer sur au moins une composition",
    );
  }

  return { report, rows: sortByRank(report.results), recaps: buildRecaps(report.results) };
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Récapitulatif ScolarFlow : à gauche les effectifs + seuils avec G/F/T,
 * à droite le tableau de pourcentage (admis / non-admis), plus les stats sous.
 *
 * Ce layout suit exactement le modèle papier utilisé par l'inspection : le
 * directeur retrouve les mêmes cases au même endroit que sur la fiche vierge.
 */
function buildAnnualRecapSection(
  recaps: ReturnType<typeof buildRecaps>,
  report: AnnualReport,
): string {
  const pct = (num: number, denom: number): string =>
    denom > 0 ? `${((num / denom) * 100).toFixed(1).replace('.', ',')}%` : '0%';

  const leftRows: Array<[string, keyof Omit<AnnualRecap, 'successRate'>]> = [
    ["EFFECTIF EN DÉBUT D'ANNÉE", 'enrolled'],
    ["EFFECTIF EN FIN D'ANNÉE", 'composed'],
    [`MOYENNE D'ADMISSION ${fmtShort(report.thresholds.admission)} /${report.scale}`, 'admitted'],
    [
      `MOYENNE DE REDOUBLEMENT ${fmtShort(report.thresholds.redoublement)} /${report.scale}`,
      'repeating',
    ],
  ];

  return `
  <div class="grid-2">
    <div>
      <div class="section-title">Récapitulatif des résultats</div>
      <table class="recap">
        <tbody>
          ${leftRows
            .map(
              ([label, key]) => `
          <tr>
            <td class="cat">${label}</td>
            <td class="num">${recaps.boys[key]}</td>
            <td class="num">${recaps.girls[key]}</td>
            <td class="num strong">${recaps.total[key]}</td>
          </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div>
      <div class="section-title">POURCENTAGE</div>
      <table class="recap">
        <tbody>
          <tr>
            <td class="num">${pct(recaps.boys.admitted, recaps.boys.enrolled)}</td>
            <td class="num">${pct(recaps.girls.admitted, recaps.girls.enrolled)}</td>
            <td class="num strong">${pct(recaps.total.admitted, recaps.total.enrolled)}</td>
          </tr>
          <tr>
            <td class="num">${pct(recaps.boys.enrolled - recaps.boys.admitted, recaps.boys.enrolled)}</td>
            <td class="num">${pct(recaps.girls.enrolled - recaps.girls.admitted, recaps.girls.enrolled)}</td>
            <td class="num strong">${pct(recaps.total.enrolled - recaps.total.admitted, recaps.total.enrolled)}</td>
          </tr>
        </tbody>
      </table>
      <div class="body">
        <div class="kv"><span>Moy. de la classe</span><span class="v">${fmt(report.stats.classAverage)} / ${report.scale}</span></div>
        <div class="kv"><span>Plus forte moy. annuelle</span><span class="v">${fmt(report.stats.bestAverage)}</span></div>
        <div class="kv"><span>Plus faible moy. annuelle</span><span class="v">${fmt(report.stats.worstAverage)}</span></div>
      </div>
    </div>
  </div>`;
}

/**
 * Bilan annuel d'une classe au format PDF, A4 portrait.
 *
 * Renvoie le chemin public du fichier produit.
 */
export async function generateAnnualReportPDF(
  classId: string,
  academicYearId: string,
): Promise<string> {
  const { report, rows, recaps } = await loadAnnualContext(classId, academicYearId);

  const [school, teacherName] = await Promise.all([
    loadSchoolIdentity(classId),
    loadMainTeacherName(classId, academicYearId),
  ]);

  // Répartition en pourcentages de la largeur utile : les colonnes fixes et de
  // queue sont dimensionnées d'abord, les compositions se partagent le reste.
  // Laissé libre, le navigateur donnerait toute la place aux intitulés de
  // compositions — « COMPOSITION DE PASSAGE » — et écraserait les noms.
  const evaluationCount = Math.max(report.evaluations.length, 1);
  const fixedWidths = [5, 23, 4];
  const trailingWidths = [9, 7];
  const evaluationWidth =
    (100 -
      fixedWidths.reduce((sum, value) => sum + value, 0) -
      trailingWidths.reduce((sum, value) => sum + value, 0)) /
    evaluationCount;

  const colgroup = [
    ...fixedWidths,
    ...report.evaluations.map(() => evaluationWidth),
    ...trailingWidths,
  ]
    .map((width) => `<col style="width:${width.toFixed(3)}%">`)
    .join('');

  const headerCells = report.evaluations
    .map((_, index) => `<th>MOY. COMPO N°${index + 1}</th>`)
    .join('');

  const bodyRows = rows
    .map((row) => {
      const noteCells = report.evaluations
        .map((evaluation) => {
          const average = row.averages[evaluation.id];
          // Une composition non composée n'est pas un zéro : elle ne compte pas
          // dans la moyenne annuelle et se lit comme une absence.
          return average === null || average === undefined
            ? '<td class="na">—</td>'
            : `<td class="num">${fmt(average)}</td>`;
        })
        .join('');

      return `
      <tr>
        <td class="num">${row.rank === null ? '—' : `${row.rank}${row.isExAequo ? ' ex' : ''}`}</td>
        <td class="name">${escapeHtml(row.fullName)}</td>
        <td>${escapeHtml(row.gender === 'M' ? 'M' : 'F')}</td>
        ${noteCells}
        <td class="num strong">${fmt(row.yearAverage)}</td>
        <td class="decision">${decisionLetter(row)}</td>
      </tr>`;
    })
    .join('');

  const columnCount = report.evaluations.length + 5;

  const body = `
<div class="sheet">
  ${buildHeader(school, {
    academicYearName: report.academicYear.name,
    className: report.class.name,
    teacherName,
  })}

  <div class="doc-title">
    <h1>BILAN ANNUEL — CLASSE DE ${escapeHtml(report.class.name.toUpperCase())}</h1>
  </div>

  <table class="ranking annual">
    <colgroup>${colgroup}</colgroup>
    <thead>
      <tr>
        <th>RANG</th>
        <th>Nom et Prénoms</th>
        <th>SEXE</th>
        ${headerCells}
        <th>MOY. ANNUELLE</th>
        <th>DÉCISION</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="${columnCount}" class="na">Aucun élève inscrit dans cette classe</td></tr>`}
    </tbody>
  </table>

  ${buildAnnualRecapSection(recaps, report)}

  <div class="signatures signatures-2">
    <div class="signature"><div class="lbl">L'ENSEIGNANT(E)</div><div class="rule"></div></div>
    <div class="signature"><div class="lbl">LE DIRECTEUR</div><div class="rule"></div></div>
  </div>

</div>`;

  const fileName = `bilan-annuel-${slug(report.class.name)}-${slug(report.academicYear.name)}-${Date.now()}.pdf`;

  return renderPdf(
    wrapDocument(`Bilan annuel — ${report.class.name}`, buildStyles(), [body]),
    fileName,
    { footerText: `Document généré le ${formatDate(new Date())}${school?.name ? ` — ${escapeHtml(school.name)}` : ''}` },
  );
}

// ---------------------------------------------------------------------------
// Word
// ---------------------------------------------------------------------------

/**
 * Même bilan au format .docx.
 *
 * Les écoles retouchent le document avant de l'afficher — une observation du
 * conseil des maîtres ajoutée sous le tableau, un cas « à examiner » tranché à
 * la main. Un PDF les oblige à tout ressaisir.
 */
export async function generateAnnualReportDOCX(
  classId: string,
  academicYearId: string,
): Promise<{ path: string; fileName: string }> {
  const { report, rows, recaps } = await loadAnnualContext(classId, academicYearId);
  const headerContext = await loadHeaderContext(classId, academicYearId);

  // Colonnes : RANG, Nom et Prénoms, SEXE, …compositions…, MOY. ANNUELLE,
  // DÉCISION. Mêmes proportions que le PDF, converties en twips.
  const evaluationCount = Math.max(report.evaluations.length, 1);
  const fixedPercentages = [6, 24, 5];
  const trailingPercentages = [10, 8];
  const evaluationShare =
    (100 -
      fixedPercentages.reduce((sum, value) => sum + value, 0) -
      trailingPercentages.reduce((sum, value) => sum + value, 0)) /
    evaluationCount;

  const widths = buildColumnWidths(CONTENT_WIDTH_TWIPS, [
    ...fixedPercentages,
    ...report.evaluations.map(() => evaluationShare),
    ...trailingPercentages,
  ]);

  // Plus il y a de compositions, plus les colonnes sont étroites : au-delà de
  // quatre, une note de la forme « 12,50 » ne tient plus en 9 pt.
  const noteSize = report.evaluations.length > 4 ? 14 : 16;

  const EVALUATION_START = 3;
  const moyIdx = EVALUATION_START + report.evaluations.length;
  const decisionIdx = moyIdx + 1;

  // ---- Récapitulatif ScolarFlow : seuils (gauche) + pourcentage (droite) ----
  const NO_TABLE_BORDERS = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE },
    insideVertical: { style: BorderStyle.NONE },
  };

  const pctStr = (num: number, denom: number): string =>
    denom > 0 ? `${((num / denom) * 100).toFixed(1).replace('.', ',')}%` : '0%';

  const wrapperColWidths = buildColumnWidths(CONTENT_WIDTH_TWIPS, [56, 4, 40]);
  const seuilsWidth = wrapperColWidths[0];
  const pctWidth = wrapperColWidths[2];
  const seuilColWidths = buildColumnWidths(seuilsWidth, [79, 7, 7, 7]);
  const pctColWidths = buildColumnWidths(pctWidth, [34, 33, 33]);

  const seuilsTable = new Table({
    width: { size: seuilsWidth, type: WidthType.DXA },
    columnWidths: seuilColWidths,
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          cell('', seuilColWidths[0]),
          cell('G', seuilColWidths[1], { bold: true, size: 18 }),
          cell('F', seuilColWidths[2], { bold: true, size: 18 }),
          cell('T', seuilColWidths[3], { bold: true, size: 18 }),
        ],
      }),
      new TableRow({
        children: [
          cell("EFFECTIF EN DÉBUT D'ANNÉE", seuilColWidths[0], { bold: true, size: 16, align: AlignmentType.LEFT }),
          cell(String(recaps.boys.enrolled), seuilColWidths[1], { size: 18 }),
          cell(String(recaps.girls.enrolled), seuilColWidths[2], { size: 18 }),
          cell(String(recaps.total.enrolled), seuilColWidths[3], { size: 18 }),
        ],
      }),
      new TableRow({
        children: [
          cell("EFFECTIF EN FIN D'ANNÉE", seuilColWidths[0], { bold: true, size: 16, align: AlignmentType.LEFT }),
          cell(String(recaps.boys.composed), seuilColWidths[1], { size: 18 }),
          cell(String(recaps.girls.composed), seuilColWidths[2], { size: 18 }),
          cell(String(recaps.total.composed), seuilColWidths[3], { size: 18 }),
        ],
      }),
      new TableRow({
        children: [
          cell(`MOYENNE D'ADMISSION ${fmtShort(report.thresholds.admission)} /${report.scale}`, seuilColWidths[0], { bold: true, size: 16, align: AlignmentType.LEFT }),
          cell(String(recaps.boys.admitted), seuilColWidths[1], { size: 18 }),
          cell(String(recaps.girls.admitted), seuilColWidths[2], { size: 18 }),
          cell(String(recaps.total.admitted), seuilColWidths[3], { size: 18 }),
        ],
      }),
      new TableRow({
        children: [
          cell(`MOYENNE DE REDOUBLEMENT ${fmtShort(report.thresholds.redoublement)} /${report.scale}`, seuilColWidths[0], { bold: true, size: 16, align: AlignmentType.LEFT }),
          cell(String(recaps.boys.repeating), seuilColWidths[1], { size: 18 }),
          cell(String(recaps.girls.repeating), seuilColWidths[2], { size: 18 }),
          cell(String(recaps.total.repeating), seuilColWidths[3], { size: 18 }),
        ],
      }),
    ],
  });

  const pctTable = new Table({
    width: { size: pctWidth, type: WidthType.DXA },
    columnWidths: pctColWidths,
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'POURCENTAGE', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
              }),
            ],
            columnSpan: 3,
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
          }),
        ],
      }),
      new TableRow({
        children: [
          cell('G', pctColWidths[0], { bold: true, size: 18 }),
          cell('F', pctColWidths[1], { bold: true, size: 18 }),
          cell('T', pctColWidths[2], { bold: true, size: 18 }),
        ],
      }),
      new TableRow({
        children: [
          cell(pctStr(recaps.boys.admitted, recaps.boys.enrolled), pctColWidths[0], { size: 18 }),
          cell(pctStr(recaps.girls.admitted, recaps.girls.enrolled), pctColWidths[1], { size: 18 }),
          cell(pctStr(recaps.total.admitted, recaps.total.enrolled), pctColWidths[2], { size: 18 }),
        ],
      }),
      new TableRow({
        children: [
          cell(pctStr(recaps.boys.enrolled - recaps.boys.admitted, recaps.boys.enrolled), pctColWidths[0], { size: 18 }),
          cell(pctStr(recaps.girls.enrolled - recaps.girls.admitted, recaps.girls.enrolled), pctColWidths[1], { size: 18 }),
          cell(pctStr(recaps.total.enrolled - recaps.total.admitted, recaps.total.enrolled), pctColWidths[2], { size: 18 }),
        ],
      }),
    ],
  });

  const recapWrapperTable = new Table({
    width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
    columnWidths: wrapperColWidths,
    layout: TableLayoutType.FIXED,
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [seuilsTable],
            borders: NO_TABLE_BORDERS,
            width: { size: wrapperColWidths[0], type: WidthType.DXA },
          }),
          new TableCell({
            children: [new Paragraph({ children: [] })],
            borders: NO_TABLE_BORDERS,
            width: { size: wrapperColWidths[1], type: WidthType.DXA },
          }),
          new TableCell({
            children: [pctTable],
            borders: NO_TABLE_BORDERS,
            width: { size: wrapperColWidths[2], type: WidthType.DXA },
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    ...DOCX_DEFAULTS,
    sections: [
      {
        // Portrait, comme la fiche officielle : la largeur est tenue par la
        // répartition en pourcentages des colonnes.
        properties: { page: DOCX_PAGE },
        children: [
          ...buildDocxHeader(headerContext, {
            academicYearName: report.academicYear.name,
            className: report.class.name,
          }),

          // ---- Titre ----------------------------------------------------------
          new Paragraph({
            children: [
              new TextRun({
                text: `BILAN ANNUEL - CLASSE DE ${report.class.name.toUpperCase()}`,
                bold: true,
                size: 24,
                underline: {},
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
          }),

          // ---- Tableau du bilan -----------------------------------------------
          new Table({
            width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
            columnWidths: widths,
            layout: TableLayoutType.FIXED,
            borders: TABLE_BORDERS,
            rows: [
              new TableRow({
                // `tableHeader` : si la classe déborde sur une seconde page, Word
                // y répète les intitulés au lieu d'un tableau décapité.
                tableHeader: true,
                height: { value: 460, rule: HeightRule.ATLEAST },
                children: [
                  cell('RANG', widths[0], { bold: true, size: 14 }),
                  cell('Nom et Prénoms', widths[1], { bold: true, size: 18 }),
                  cell('SEXE', widths[2], { bold: true, size: 14 }),
                  ...report.evaluations.map((_, index) =>
                    cell(`MOY. COMPO N°${index + 1}`, widths[EVALUATION_START + index], {
                      bold: true,
                      size: 14,
                    }),
                  ),
                  cell('MOY. ANNUELLE', widths[moyIdx], { bold: true, size: 14 }),
                  cell('DÉCISION', widths[decisionIdx], { bold: true, size: 14 }),
                ],
              }),

              ...rows.map(
                (row) =>
                  new TableRow({
                    height: { value: 300, rule: HeightRule.ATLEAST },
                    children: [
                      cell(
                        row.rank === null ? '-' : `${row.rank}${row.isExAequo ? ' ex' : ''}`,
                        widths[0],
                        { size: noteSize },
                      ),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: row.fullName, size: noteSize })],
                            alignment: AlignmentType.LEFT,
                          }),
                        ],
                        width: { size: widths[1], type: WidthType.DXA },
                        margins: { top: 20, bottom: 20, left: 40, right: 20 },
                      }),
                      cell(row.gender === 'M' ? 'M' : 'F', widths[2], { size: noteSize }),
                      ...report.evaluations.map((evaluation, index) =>
                        cell(
                          fmtDocx(row.averages[evaluation.id]),
                          widths[EVALUATION_START + index],
                          { size: noteSize },
                        ),
                      ),
                      cell(fmtDocx(row.yearAverage), widths[moyIdx], {
                        bold: true,
                        size: noteSize,
                      }),
                      cell(decisionLetter(row).replace('—', '-'), widths[decisionIdx], {
                        bold: true,
                        size: noteSize,
                      }),
                    ],
                  }),
              ),
            ],
          }),

          // ---- Récapitulatif ScolarFlow : seuils (gauche) + pourcentage (droite)
          new Paragraph({
            children: [new TextRun({ text: 'RÉCAPITULATIF DES RÉSULTATS', bold: true, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 300 },
          }),

          recapWrapperTable,

          new Paragraph({
            children: [
              new TextRun({
                text: `Moyenne de la classe : ${fmtDocx(report.stats.classAverage)} / ${report.scale}`,
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 300, after: 100 },
          }),

          // ---- Signatures ------------------------------------------------------
          buildSignatureTable(),
        ],
      },
    ],
  });

  if (!fs.existsSync(PRIMARY_DIR)) fs.mkdirSync(PRIMARY_DIR, { recursive: true });

  // Le nom sur disque porte un horodatage : deux enseignants qui exportent le
  // même bilan ne doivent pas s'écraser mutuellement.
  const storedName = `bilan-annuel-${slug(report.class.name)}-${slug(report.academicYear.name)}-${Date.now()}.docx`;
  await fs.promises.writeFile(path.join(PRIMARY_DIR, storedName), await Packer.toBuffer(doc));

  return {
    path: `/uploads/primary/${storedName}`,
    fileName: `bilan-annuel-${slug(report.class.name)}-${slug(report.academicYear.name)}.docx`,
  };
}
