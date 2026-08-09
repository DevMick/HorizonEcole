import fs from 'fs';
import path from 'path';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { computeEvaluationResults } from './primary-results.service';
import {
  fitLogo,
  loadMainTeacherName,
  loadSchoolIdentity,
  loadSchoolLogo,
} from './primary-branding';

/**
 * Fiche de classement du primaire au format Word.
 *
 * Le document reprend la fiche officielle de l'enseignement primaire ivoirien :
 * en-tête administratif à deux colonnes (ministère à gauche, république à
 * droite), identification de l'école et de la classe, tableau élèves × matières,
 * récapitulatif par sexe, puis l'emplacement de signature du directeur.
 *
 * Pourquoi Word en plus du PDF : les écoles retouchent la fiche avant de
 * l'afficher — une observation ajoutée à la main, un nom corrigé. Un PDF les
 * oblige à tout ressaisir ; le .docx se reprend dans le traitement de texte de
 * l'école.
 *
 * La mise en page est en twips (1/1440 pouce) et les tailles de police en
 * demi-points, comme l'exige OpenXML : `size: 22` vaut donc 11 pt.
 */

export const PRIMARY_DIR = path.join(process.cwd(), 'uploads', 'primary');

/** A4 portrait (11906 twips) moins les marges de 2 cm de chaque côté. */
export const CONTENT_WIDTH_TWIPS = 11906 - 567 * 2;

/** Côté maximal du logo de l'école dans l'en-tête, en points. */
const LOGO_BOX_PT = 55;

export const slug = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '-');

/**
 * Note à deux décimales, virgule décimale, ou tiret si absente. Même format
 * que le PDF : les deux exports d'une même composition doivent afficher la
 * même note au même endroit.
 */
export const fmt = (value: number | null | undefined): string =>
  value === null || value === undefined || Number.isNaN(value)
    ? '-'
    : Number(value).toFixed(2).replace('.', ',');

/** Nombre entier ou décimal court, pour les barèmes et diviseurs. */
export const fmtShort = (value: number): string => String(value).replace('.', ',');

/**
 * Répartit une largeur totale selon des pourcentages. Sans largeurs de colonnes
 * explicites, Word réajuste le tableau à sa guise et la fiche imprimée ne
 * correspond plus au modèle officiel.
 */
export function buildColumnWidths(totalWidth: number, percentages: number[]): number[] {
  const widths = percentages.map((percentage) => Math.floor((totalWidth * percentage) / 100));
  const drift = totalWidth - widths.reduce((sum, width) => sum + width, 0);
  if (widths.length > 0) widths[widths.length - 1] += drift;
  return widths;
}

/** Espaces insécables : empêche Word de couper un intitulé court sur deux lignes. */
const keepSingleLine = (value: string): string => value.replace(/ /g, ' ');

/**
 * Intitulé de matière sur deux lignes quand il est long : les colonnes de notes
 * sont étroites, et un nom laissé d'un bloc élargirait tout le tableau.
 */
function subjectHeaderRuns(rawName: string): TextRun[] {
  const cleaned = String(rawName || '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (!cleaned) return [new TextRun({ text: '-', bold: true, size: 15 })];

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 1) {
    const single = words[0];
    if (single.length <= 10) return [new TextRun({ text: single, bold: true, size: 15 })];
    const cut = Math.ceil(single.length / 2);
    return [
      new TextRun({ text: single.slice(0, cut), bold: true, size: 15 }),
      new TextRun({ text: single.slice(cut), bold: true, size: 15, break: 1 }),
    ];
  }

  const midpoint = Math.ceil(words.length / 2);
  return [
    new TextRun({ text: words.slice(0, midpoint).join(' '), bold: true, size: 15 }),
    new TextRun({ text: words.slice(midpoint).join(' '), bold: true, size: 15, break: 1 }),
  ];
}

/** Cellule de tableau centrée, le format de la quasi-totalité de la fiche. */
export function cell(text: string, width: number, options: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: options.bold ?? false, size: options.size ?? 22 })],
        alignment: options.align ?? AlignmentType.CENTER,
      }),
    ],
    width: { size: width, type: WidthType.DXA },
    margins: { top: 20, bottom: 20, left: 30, right: 30 },
  });
}

/** Contexte d'en-tête : l'école, la classe et son titulaire pour cette année. */
export async function loadHeaderContext(classId: string, academicYearId: string) {
  const [establishment, teacherName] = await Promise.all([
    loadSchoolIdentity(classId),
    loadMainTeacherName(classId, academicYearId),
  ]);

  return {
    establishment,
    // Le logo de l'école qui délivre la fiche, pas celui de l'application :
    // chaque établissement téléverse le sien depuis /etablissement.
    logo: loadSchoolLogo(establishment?.logoUrl),
    teacherName,
  };
}

export type DocxHeaderContext = Awaited<ReturnType<typeof loadHeaderContext>>;

/**
 * Paragraphe portant le logo de l'école, ou rien du tout.
 *
 * Repli propre : école sans logo, fichier absent du disque ou format que Word
 * ne sait pas afficher (WebP) → la fiche sort sans logo, jamais avec celui
 * d'une autre école.
 */
function logoParagraphs(logo: ReturnType<typeof loadSchoolLogo>): Paragraph[] {
  if (!logo || !logo.docxType) return [];

  const { width, height } = fitLogo(logo, LOGO_BOX_PT);

  return [
    new Paragraph({
      children: [
        new ImageRun({
          data: logo.buffer,
          type: logo.docxType,
          transformation: { width, height },
        }),
      ],
      spacing: { before: 120 },
    }),
  ];
}

/** Filets noirs continus : le seul style de bordure des documents du primaire. */
export const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
} as const;

const NO_BORDERS = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE },
  insideVertical: { style: BorderStyle.NONE },
} as const;

/**
 * En-tête institutionnel Word, identique sur tous les documents du primaire :
 * ministère et rattachement d'inspection à gauche (avec le logo de l'école),
 * république et année scolaire à droite, puis l'identification de l'école et de
 * la classe. Mêmes libellés et même ordre que la version PDF — les deux exports
 * d'une même classe doivent être reconnaissables comme le même document.
 */
export function buildDocxHeader(
  context: DocxHeaderContext,
  info: { academicYearName: string; className: string },
): Array<Table | Paragraph> {
  const { establishment, logo, teacherName } = context;

  return [
    // ---- En-tête administratif à deux colonnes -------------------------
    new Table({
      width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
      columnWidths: buildColumnWidths(CONTENT_WIDTH_TWIPS, [60, 40]),
      layout: TableLayoutType.FIXED,
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "MINISTÈRE DE L'ÉDUCATION NATIONALE",
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "ET DE L'ALPHABÉTISATION", bold: true, size: 20 }),
                  ],
                }),
                new Paragraph({ children: [new TextRun({ text: '------------', size: 20 })] }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `DIRECTION RÉGIONALE ${(establishment?.directionRegionale || 'NON RENSEIGNÉE').toUpperCase()}`,
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
                new Paragraph({ children: [new TextRun({ text: '------------', size: 20 })] }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "INSPECTION DE L'ENSEIGNEMENT",
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      // À défaut de secteur pédagogique saisi, on retombe
                      // sur la direction régionale plutôt que sur la ville :
                      // c'est la hiérarchie réelle de l'inspection.
                      text: `PRÉSCOLAIRE ET PRIMAIRE ${(establishment?.secteurPedagogique || establishment?.directionRegionale || '').toUpperCase()}`.trimEnd(),
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
                ...logoParagraphs(logo),
              ],
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "RÉPUBLIQUE DE CÔTE D'IVOIRE",
                      bold: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
                new Paragraph({
                  children: [new TextRun({ text: '------------', size: 20 })],
                  alignment: AlignmentType.RIGHT,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: establishment?.motto || 'Union - Discipline - Travail',
                      italics: true,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'ANNÉE SCOLAIRE : ', bold: true, size: 20 }),
                    new TextRun({ text: info.academicYearName, bold: true, size: 20 }),
                  ],
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 300, after: 200 },
                }),
              ],
              width: { size: 40, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ],
    }),

    new Paragraph({ children: [], spacing: { before: 200, after: 0 } }),

    // ---- Identification de l'école et de la classe ---------------------
    ...(establishment?.secteurPedagogique
      ? [
          new Paragraph({
            children: [
              new TextRun({ text: 'Secteur Pédagogique : ', bold: true, size: 22 }),
              new TextRun({ text: establishment.secteurPedagogique, size: 22 }),
            ],
            spacing: { after: 100 },
          }),
        ]
      : []),
    new Paragraph({
      children: [
        new TextRun({ text: 'École : ', bold: true, size: 22 }),
        new TextRun({ text: establishment?.name || 'Non renseignée', size: 22 }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Cours : ', size: 22 }),
        new TextRun({ text: info.className, bold: true, size: 22 }),
        new TextRun({ text: ' / Tenue par : ', bold: true, size: 22 }),
        new TextRun({ text: teacherName || 'Non désigné(e)', size: 22 }),
      ],
      spacing: { after: 200 },
    }),
  ];
}

/**
 * Réglages de document communs : Times New Roman partout, et surtout les
 * options de compatibilité qui empêchent Word de redimensionner les colonnes
 * d'un tableau à largeurs fixes.
 */
export const DOCX_DEFAULTS = {
  styles: {
    default: {
      document: {
        paragraph: { spacing: { after: 0 } },
        run: {
          font: {
            ascii: 'Times New Roman',
            hAnsi: 'Times New Roman',
            eastAsia: 'Times New Roman',
            cs: 'Times New Roman',
          },
          snapToGrid: false,
        },
      },
    },
  },
  compatibility: {
    version: 15,
    doNotUseHTMLParagraphAutoSpacing: true,
    // Sans cela Word « aide » en redimensionnant les colonnes, et la fiche
    // imprimée ne correspond plus au modèle officiel.
    doNotAutofitConstrainedTables: true,
    doNotSnapToGridInCell: true,
    autofitToFirstFixedWidthCell: false,
    growAutofit: false,
  },
} as const;

/** A4 portrait, marges de 1 cm — la mise en page de la fiche officielle. */
export const DOCX_PAGE = {
  size: { orientation: 'portrait' as any },
  margin: { top: 567, right: 567, bottom: 567, left: 567, header: 0, footer: 0 },
} as const;

/** Bloc de signatures : l'enseignant à gauche, le directeur à droite. */
export function buildSignatureTable(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "L'ENSEIGNANT(E)", bold: true, size: 22 })],
                alignment: AlignmentType.LEFT,
                spacing: { before: 600, after: 400 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'LE DIRECTEUR', bold: true, size: 22 })],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 600, after: 400 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
  });
}

/**
 * Fiche de classement d'une composition, au format .docx.
 *
 * Renvoie le chemin public du fichier et le nom sous lequel le proposer au
 * téléchargement — l'identifiant de la composition ne dit rien à l'enseignant
 * qui retrouvera le document dans son dossier.
 */
export async function generateRankingSheetDOCX(
  evaluationId: string,
): Promise<{ path: string; fileName: string }> {
  const results = await computeEvaluationResults(evaluationId);
  const headerContext = await loadHeaderContext(results.class.id, results.academicYear.id);

  const scale = results.evaluation.averageScale;

  // Colonnes : N°, MATRICULE, Nom et Prénoms, SEXE, …matières…, TOTAL, MOY,
  // RANG, OBS. Les largeurs sont exprimées en pourcentages de la largeur utile
  // puis converties en twips : en portrait, sept matières ne laissent qu'un
  // centimètre par colonne de notes, et une largeur fixe ferait déborder la
  // fiche hors de la page.
  const subjectCount = Math.max(results.subjects.length, 1);
  const fixedPercentages = [4, 10, 20, 5];
  const trailingPercentages = [8, 7, 6, 5];
  const subjectShare =
    (100 -
      fixedPercentages.reduce((sum, value) => sum + value, 0) -
      trailingPercentages.reduce((sum, value) => sum + value, 0)) /
    subjectCount;

  const widths = buildColumnWidths(CONTENT_WIDTH_TWIPS, [
    ...fixedPercentages,
    ...results.subjects.map(() => subjectShare),
    ...trailingPercentages,
  ]);

  // Plus il y a de matières, plus les colonnes sont étroites : au-delà de cinq,
  // une note de la forme « 12.50 » ne tient plus en 11 pt.
  const noteSize = results.subjects.length > 5 ? 16 : 18;
  const nameSize = results.subjects.length > 5 ? 16 : 18;

  const SUBJECT_START = 4;
  const totalIdx = SUBJECT_START + results.subjects.length;
  const moyIdx = totalIdx + 1;
  const rangIdx = totalIdx + 2;
  const obsIdx = totalIdx + 3;

  const doc = new Document({
    ...DOCX_DEFAULTS,
    sections: [
      {
        // Portrait, comme la fiche officielle : la largeur est reprise par la
        // répartition en pourcentages des colonnes, pas par la mise en paysage
        // qui donnait un document deux fois trop large.
        properties: { page: DOCX_PAGE },
        children: [
          ...buildDocxHeader(headerContext, {
            academicYearName: results.academicYear.name,
            className: results.class.name,
          }),

          // ---- Titre de la composition ---------------------------------------
          new Paragraph({
            children: [
              new TextRun({
                text: `${results.evaluation.name.toUpperCase()} DU ${new Date(results.evaluation.date).toLocaleDateString('fr-FR')}`,
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
          }),

          // ---- Tableau des notes ---------------------------------------------
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
                  cell('N°', widths[0], { bold: true, size: 16 }),
                  cell(keepSingleLine('MATRICULE'), widths[1], { bold: true, size: 14 }),
                  cell(keepSingleLine('Nom et Prénoms'), widths[2], { bold: true, size: 18 }),
                  cell('SEXE', widths[3], { bold: true, size: 14 }),
                  ...results.subjects.map(
                    (subject, index) =>
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              ...subjectHeaderRuns(subject.name),
                              new TextRun({
                                text: `/${subject.maxScore}`,
                                bold: true,
                                size: 14,
                                break: 1,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        width: { size: widths[SUBJECT_START + index], type: WidthType.DXA },
                        margins: { top: 20, bottom: 20, left: 20, right: 20 },
                      }),
                  ),
                  cell(`TOTAL`, widths[totalIdx], { bold: true, size: 14 }),
                  cell('MOY', widths[moyIdx], { bold: true, size: 14 }),
                  cell('RANG', widths[rangIdx], { bold: true, size: 14 }),
                  cell('OBS', widths[obsIdx], { bold: true, size: 14 }),
                ],
              }),

              ...results.results.map((row, index) =>
                new TableRow({
                  height: { value: 300, rule: HeightRule.ATLEAST },
                  children: [
                    cell(String(index + 1).padStart(2, '0'), widths[0], { size: noteSize }),
                    cell(row.studentNumber || '-', widths[1], { size: 14 }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: row.fullName, size: nameSize })],
                          alignment: AlignmentType.LEFT,
                        }),
                      ],
                      width: { size: widths[2], type: WidthType.DXA },
                      margins: { top: 20, bottom: 20, left: 40, right: 20 },
                    }),
                    cell(row.gender === 'F' ? 'F' : 'M', widths[3], { size: noteSize }),
                    ...results.subjects.map((subject, subjectIndex) =>
                      cell(
                        // Un élève absent n'a pas de note : la fiche officielle
                        // porte « abs », pas un zéro qui se lirait comme une note.
                        row.isAbsent ? 'abs' : fmt(row.notes[subject.subjectId]),
                        widths[SUBJECT_START + subjectIndex],
                        { size: noteSize },
                      ),
                    ),
                    cell(row.isAbsent ? '-' : fmt(row.total), widths[totalIdx], {
                      bold: true,
                      size: noteSize,
                    }),
                    cell(row.isAbsent ? '-' : fmt(row.average), widths[moyIdx], {
                      bold: true,
                      size: noteSize,
                    }),
                    cell(
                      row.rank === null ? '-' : `${row.rank}${row.isExAequo ? ' ex' : ''}`,
                      widths[rangIdx],
                      { size: noteSize },
                    ),
                    cell(
                      row.average === null ? '-' : row.average >= results.thresholds.admission ? 'A' : 'R',
                      widths[obsIdx],
                      { bold: true, size: noteSize },
                    ),
                  ],
                }),
              ),
            ],
          }),

          // ---- Récapitulatif par sexe -----------------------------------------
          new Paragraph({
            children: [new TextRun({ text: 'RÉCAPITULATIF DES RÉSULTATS', bold: true, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 300 },
          }),

          (() => {
            const recapWidths = buildColumnWidths(
              Math.floor(CONTENT_WIDTH_TWIPS * 0.6),
              [34, 22, 22, 22],
            );
            // Lignes et colonnes de la fiche officielle : les effectifs se lisent
            // par catégorie, ventilés garçons / filles / total.
            const lines: Array<[string, 'enrolled' | 'composed' | 'admitted' | 'repeating']> = [
              ['Inscrits', 'enrolled'],
              ['Présents', 'composed'],
              ['Admis', 'admitted'],
              ['Redoublants', 'repeating'],
            ];

            return new Table({
              width: { size: Math.floor(CONTENT_WIDTH_TWIPS * 0.6), type: WidthType.DXA },
              columnWidths: recapWidths,
              layout: TableLayoutType.FIXED,
              borders: TABLE_BORDERS,
              rows: [
                new TableRow({
                  children: [
                    cell('', recapWidths[0]),
                    cell('Garçons', recapWidths[1], { bold: true }),
                    cell('Filles', recapWidths[2], { bold: true }),
                    cell('Total', recapWidths[3], { bold: true }),
                  ],
                }),
                ...lines.map(([label, key]) =>
                  new TableRow({
                    children: [
                      cell(label, recapWidths[0], { bold: true, align: AlignmentType.LEFT }),
                      cell(String(results.recap.boys[key]), recapWidths[1]),
                      cell(String(results.recap.girls[key]), recapWidths[2]),
                      cell(String(results.recap.total[key]), recapWidths[3]),
                    ],
                  }),
                ),
              ],
            });
          })(),

          // Le taux de réussite se lit sur sa propre ligne, sous le tableau :
          // il porte sur l'ensemble de la classe, pas sur une case du tableau.
          new Paragraph({
            children: [
              new TextRun({
                text: `% Admis : ${results.recap.total.successRate === null ? '-' : fmt(results.recap.total.successRate)}`,
                bold: true,
                size: 22,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 400, after: 400 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Moyenne de la classe : ${fmt(results.stats.classAverage)} / ${scale}`,
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 0, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Admission à partir de ${fmtShort(results.thresholds.admission)}/${scale} — redoublement en dessous de ${fmtShort(results.thresholds.redoublement)}/${scale}.`,
                size: 20,
              }),
            ],
            spacing: { after: 300 },
          }),

          // ---- Signatures ------------------------------------------------------
          buildSignatureTable(),
        ],
      },
    ],
  });

  if (!fs.existsSync(PRIMARY_DIR)) fs.mkdirSync(PRIMARY_DIR, { recursive: true });

  // Le nom sur disque porte un horodatage : deux enseignants qui exportent la
  // même composition ne doivent pas s'écraser mutuellement.
  const storedName = `classement-${slug(results.class.name)}-${slug(results.evaluation.name)}-${Date.now()}.docx`;
  await fs.promises.writeFile(
    path.join(PRIMARY_DIR, storedName),
    await Packer.toBuffer(doc),
  );

  const dateSuffix = new Date(results.evaluation.date).toLocaleDateString('fr-FR').replace(/\//g, '-');

  return {
    path: `/uploads/primary/${storedName}`,
    fileName: `classement-${slug(results.class.name)}-${slug(results.evaluation.name)}-${dateSuffix}.docx`,
  };
}
