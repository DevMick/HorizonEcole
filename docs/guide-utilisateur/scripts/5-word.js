/**
 * Génération du document Word à partir du contenu rédigé et des captures
 * annotées.
 *
 * Points de vigilance propres à la librairie `docx`, tous appris en corrigeant
 * un rendu abîmé :
 *
 * - les largeurs de colonnes se déclarent en DXA sur le tableau **et** sur
 *   chaque cellule ; les pourcentages se comportent mal d'un lecteur à l'autre ;
 * - l'ombrage doit être de type CLEAR : SOLID donne des cellules noires ;
 * - aucun « \n » dans un texte — un paragraphe par ligne, sinon Word colle tout ;
 * - les listes numérotées passent par une configuration de numérotation, jamais
 *   par des chiffres saisis à la main (sinon la numérotation ne se recalcule pas) ;
 * - les titres doivent utiliser les styles Titre 1 / Titre 2 intégrés, faute de
 *   quoi le sommaire automatique reste désespérément vide.
 *
 *   node scripts/5-word.js admin
 */
const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
  TableOfContents,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  LevelFormat,
  VerticalAlign,
  convertMillimetersToTwip,
} = require('docx');
const { DOSSIERS, assurerDossiers, versNomFichier } = require('./config');

// ── Géométrie de la page ────────────────────────────────────────────────────
const MARGE = convertMillimetersToTwip(20);
/** Largeur utile d'une page A4 moins les marges, en twips. */
const LARGEUR_UTILE = 11906 - 2 * MARGE;
/** Taille maximale d'une image insérée, en pixels d'affichage. */
const IMAGE_MAX = { largeur: 620, hauteur: 760 };

// ── Palette ─────────────────────────────────────────────────────────────────
const BLEU = '1E3A70';
const GRIS = '5A6473';
const ENCARTS = {
  attention: { titre: 'Attention', fond: 'FCEBEA', bord: 'C0392B', texte: '8E2A20' },
  astuce: { titre: 'Astuce', fond: 'E9F5EC', bord: '2E7D4F', texte: '1E5B39' },
  savoir: { titre: 'À savoir', fond: 'EAEFF9', bord: '2C4E8A', texte: '1E3A70' },
};

/** Dimensions d'un PNG, lues dans son en-tête IHDR. */
function tailleImage(fichier) {
  const tampon = fs.readFileSync(fichier);
  return { largeur: tampon.readUInt32BE(16), hauteur: tampon.readUInt32BE(20) };
}

/** Réduit une image pour qu'elle tienne dans la page sans être déformée. */
function ajuster(fichier) {
  const { largeur, hauteur } = tailleImage(fichier);
  const facteur = Math.min(IMAGE_MAX.largeur / largeur, IMAGE_MAX.hauteur / hauteur, 1);
  return {
    width: Math.round(largeur * facteur),
    height: Math.round(hauteur * facteur),
  };
}

// ── Briques de mise en page ─────────────────────────────────────────────────

function p(texte, options = {}) {
  const { taille = 21, gras = false, italique = false, couleur, ...reste } = options;
  return new Paragraph({
    children: [new TextRun({ text: texte, size: taille, bold: gras, italics: italique, color: couleur })],
    spacing: { after: 120, line: 276 },
    ...reste,
  });
}

function cellule(contenu, { largeur, fond, gras = false, entete = false }) {
  const paragraphes = (Array.isArray(contenu) ? contenu : [contenu]).map((t) =>
    typeof t === 'string'
      ? new Paragraph({
          children: [
            new TextRun({
              text: t,
              size: 18,
              bold: gras || entete,
              color: entete ? 'FFFFFF' : undefined,
            }),
          ],
          spacing: { before: 20, after: 20, line: 252 },
        })
      : t,
  );
  return new TableCell({
    width: { size: largeur, type: WidthType.DXA },
    // CLEAR et jamais SOLID : SOLID rend la cellule noire dans Word.
    shading: fond ? { type: ShadingType.CLEAR, fill: fond, color: 'auto' } : undefined,
    // Marges serrées : chaque millimètre gagné sur une ligne de légende retarde
    // la coupure du tableau, et donc l'éloignement de la légende de sa figure.
    margins: { top: 40, bottom: 40, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: paragraphes,
  });
}

const BORDURE = { style: BorderStyle.SINGLE, size: 4, color: 'C7CEDB' };
const BORDURES = {
  top: BORDURE,
  bottom: BORDURE,
  left: BORDURE,
  right: BORDURE,
  insideHorizontal: BORDURE,
  insideVertical: BORDURE,
};

/** Fiche repère : chemin de menu, adresse, profil, prérequis, résultat. */
function ficheRepere(fiche) {
  const colonnes = [Math.round(LARGEUR_UTILE * 0.26), Math.round(LARGEUR_UTILE * 0.74)];
  const lignes = [
    ['Chemin de menu', fiche.menu],
    ['Adresse', fiche.adresse],
    ['Profil concerné', fiche.profil],
    ['Prérequis', fiche.prerequis],
    ['Résultat attendu', fiche.resultat],
  ];
  return new Table({
    width: { size: LARGEUR_UTILE, type: WidthType.DXA },
    columnWidths: colonnes,
    borders: BORDURES,
    rows: lignes.map(
      ([intitule, valeur]) =>
        new TableRow({
          cantSplit: true,
          children: [
            cellule(intitule, { largeur: colonnes[0], fond: 'EEF1F7', gras: true }),
            cellule(valeur || '—', { largeur: colonnes[1] }),
          ],
        }),
    ),
  });
}

/** Tableau de légende : N° · Élément à l'écran · Rôle / mode d'emploi. */
function tableauLegendes(legendes) {
  const colonnes = [
    Math.round(LARGEUR_UTILE * 0.07),
    Math.round(LARGEUR_UTILE * 0.28),
    Math.round(LARGEUR_UTILE * 0.65),
  ];
  const entete = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      cellule('N°', { largeur: colonnes[0], fond: BLEU, entete: true }),
      cellule('Élément à l’écran', { largeur: colonnes[1], fond: BLEU, entete: true }),
      cellule('Rôle / mode d’emploi', { largeur: colonnes[2], fond: BLEU, entete: true }),
    ],
  });
  const lignes = legendes.map(
    (l, i) =>
      new TableRow({
        // Une ligne de légende coupée entre deux pages devient illisible.
        cantSplit: true,
        children: [
          cellule(String(l.n), { largeur: colonnes[0], fond: 'EEF1F7', gras: true }),
          cellule(l.element, { largeur: colonnes[1], gras: true }),
          cellule(l.role, { largeur: colonnes[2], fond: i % 2 ? 'F7F9FC' : undefined }),
        ],
      }),
  );
  return new Table({
    width: { size: LARGEUR_UTILE, type: WidthType.DXA },
    columnWidths: colonnes,
    borders: BORDURES,
    rows: [entete, ...lignes],
  });
}

/** Encart Attention / Astuce / À savoir. */
function encart({ type, titre, texte }) {
  const style = ENCARTS[type] || ENCARTS.savoir;
  const contenu = [
    new Paragraph({
      children: [
        new TextRun({ text: (titre || style.titre).toUpperCase(), size: 17, bold: true, color: style.texte }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: texte, size: 20 })],
      spacing: { line: 264 },
    }),
  ];
  return new Table({
    width: { size: LARGEUR_UTILE, type: WidthType.DXA },
    columnWidths: [LARGEUR_UTILE],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: style.bord },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: style.bord },
      right: { style: BorderStyle.SINGLE, size: 2, color: style.bord },
      left: { style: BorderStyle.SINGLE, size: 18, color: style.bord },
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: LARGEUR_UTILE, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: style.fond, color: 'auto' },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: contenu,
          }),
        ],
      }),
    ],
  });
}

/**
 * Hauteur d'image, en pixels d'affichage, au-delà de laquelle la figure et son
 * tableau de légende ne peuvent plus tenir sur une même page. La zone utile
 * d'une page A4 fait environ 900 px une fois les marges et l'en-tête déduits ;
 * un tableau de légende de six lignes en occupe déjà près de 280.
 */
const FIGURE_PLEINE_PAGE = 600;

/** Image annotée, solidaire du tableau de légende qui la suit. */
function figure(fichier, numero, titre) {
  const dimensions = ajuster(fichier);
  const pleinePage = dimensions.height > FIGURE_PLEINE_PAGE;
  return [
    new Paragraph({
      children: [
        new ImageRun({
          type: 'png',
          data: fs.readFileSync(fichier),
          transformation: dimensions,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      // La capture ne doit pas se retrouver seule en bas de page, séparée de sa
      // légende — sauf quand elle est si haute que les deux ne tiendront jamais
      // ensemble. Les forcer produit alors l'inverse du but recherché : Word
      // repousse le bloc entier et laisse la page précédente aux deux tiers
      // vide, sans que la légende soit plus proche pour autant.
      keepNext: !pleinePage,
      keepLines: true,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Figure ${numero} — ${titre}`, size: 18, italics: true, color: GRIS }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      keepNext: !pleinePage,
    }),
  ];
}

function titreProcedure() {
  return new Paragraph({
    children: [new TextRun({ text: 'Procédure', size: 21, bold: true, color: BLEU })],
    spacing: { before: 220, after: 100 },
    keepNext: true,
  });
}

// ── Assemblage ──────────────────────────────────────────────────────────────

function couverture(meta) {
  return [
    new Paragraph({ text: '', spacing: { after: 2600 } }),
    new Paragraph({
      children: [new TextRun({ text: meta.sousTitre, size: 26, color: GRIS })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: meta.titre, size: 56, bold: true, color: BLEU })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: meta.etablissement, size: 28, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Profil : ${meta.profil}`, size: 21, color: GRIS }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Version ${meta.version} — ${meta.dateEdition}`, size: 21, color: GRIS }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 900 },
    }),
    encart({ type: 'attention', titre: 'Diffusion', texte: meta.avertissement }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function sommaire() {
  return [
    new Paragraph({
      text: 'Sommaire',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
    new TableOfContents('Sommaire', {
      hyperlink: true,
      headingStyleRange: '1-2',
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function introduction(intro) {
  const blocs = [
    new Paragraph({ text: intro.titre, heading: HeadingLevel.HEADING_1 }),
    ...intro.paragraphes.map((t) => p(t)),
    p('Les encarts se répartissent en trois familles :', { gras: true }),
  ];
  for (const [type, texte] of intro.reperes) {
    const cle = type === 'Attention' ? 'attention' : type === 'Astuce' ? 'astuce' : 'savoir';
    blocs.push(encart({ type: cle, texte }));
    blocs.push(new Paragraph({ text: '', spacing: { after: 80 } }));
  }
  blocs.push(new Paragraph({ children: [new PageBreak()] }));
  return blocs;
}

function construire(contenu, dossierImages) {
  const enfants = [];
  let numeroFigure = 0;
  let numeroProcedure = 0;
  const manquantes = [];

  enfants.push(...couverture(contenu.meta));
  enfants.push(...sommaire());
  enfants.push(...introduction(contenu.introduction));

  for (const chapitre of contenu.chapitres) {
    enfants.push(
      new Paragraph({
        text: chapitre.titre,
        heading: HeadingLevel.HEADING_1,
        // Un titre seul en bas de page est une faute de mise en page classique.
        keepNext: true,
        pageBreakBefore: true,
      }),
    );
    enfants.push(p(chapitre.chapeau, { italique: true, couleur: GRIS }));

    for (const section of chapitre.sections) {
      enfants.push(
        new Paragraph({
          text: section.titre,
          heading: HeadingLevel.HEADING_2,
          keepNext: true,
          spacing: { before: 320, after: 120 },
        }),
      );
      enfants.push(p(section.chapeau));
      enfants.push(ficheRepere(section.fiche));
      enfants.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      if (section.paragraphe) enfants.push(p(section.paragraphe));

      const image = path.join(dossierImages, `${section.ecran}.png`);
      if (fs.existsSync(image)) {
        numeroFigure += 1;
        enfants.push(...figure(image, numeroFigure, section.titre));
      } else {
        manquantes.push(section.ecran);
      }

      if (section.legendes && section.legendes.length) {
        enfants.push(tableauLegendes(section.legendes));
        enfants.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }

      if (section.procedure && section.procedure.length) {
        numeroProcedure += 1;
        enfants.push(titreProcedure());
        section.procedure.forEach((etape, i) => {
          enfants.push(
            new Paragraph({
              children: [new TextRun({ text: etape, size: 21 })],
              numbering: { reference: 'procedure', level: 0, instance: numeroProcedure },
              spacing: { after: 60, line: 276 },
              keepNext: i < section.procedure.length - 1,
            }),
          );
        });
        enfants.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }

      for (const e of section.encarts || []) {
        enfants.push(encart(e));
        enfants.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }
    }
  }

  return { enfants, numeroFigure, manquantes };
}

function document(contenu, enfants) {
  return new Document({
    creator: 'HorizonEcole',
    title: `${contenu.meta.titre} — ${contenu.meta.etablissement}`,
    description: contenu.meta.sousTitre,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 21, color: '1F2733' },
          paragraph: { spacing: { line: 276 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 34, bold: true, color: BLEU, font: 'Calibri' },
          paragraph: { spacing: { before: 360, after: 200 }, keepNext: true },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 27, bold: true, color: '2C4E8A', font: 'Calibri' },
          paragraph: { spacing: { before: 300, after: 140 }, keepNext: true },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'procedure',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                run: { bold: true, color: BLEU },
                paragraph: { indent: { left: 480, hanging: 300 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${contenu.meta.titre} · ${contenu.meta.etablissement}`,
                    size: 17,
                    color: GRIS,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C7CEDB', space: 6 } },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  // Le sous-titre porte déjà le nom du produit : le préfixer une
                  // seconde fois donnait « HorizonEcole — HorizonEcole — … ».
                  new TextRun({ text: contenu.meta.sousTitre, size: 17, color: GRIS }),
                  new TextRun({ text: '     Page ', size: 17, color: GRIS }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 17, color: GRIS, bold: true }),
                  new TextRun({ text: ' / ', size: 17, color: GRIS }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: GRIS }),
                ],
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'C7CEDB', space: 6 } },
              }),
            ],
          }),
        },
        children: enfants,
      },
    ],
  });
}

async function main() {
  const profil = (process.argv[2] || 'admin').toLowerCase();
  assurerDossiers();

  const fichierContenu = path.join(DOSSIERS.contenu, `${profil}.js`);
  if (!fs.existsSync(fichierContenu)) throw new Error(`Contenu absent : contenu/${profil}.js`);
  delete require.cache[require.resolve(fichierContenu)];
  const contenu = require(fichierContenu);

  contenu.meta.dateEdition = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const dossierImages = path.join(DOSSIERS.annotees, profil);
  const { enfants, numeroFigure, manquantes } = construire(contenu, dossierImages);

  const sortie = path.join(
    DOSSIERS.build,
    `Guide-${versNomFichier(contenu.meta.profil)}-${versNomFichier(contenu.meta.etablissement)}.docx`,
  );
  const tampon = await Packer.toBuffer(document(contenu, enfants));
  fs.writeFileSync(sortie, tampon);

  console.log(`  ${path.basename(sortie)} — ${numeroFigure} figures`);
  if (manquantes.length) {
    console.log(`  CAPTURES MANQUANTES : ${manquantes.join(', ')}`);
  }
  console.log(`  ${sortie}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
