/**
 * Lecture minimale d'un .docx, sans dépendance : un .docx est un ZIP, et seul
 * `word/document.xml` nous intéresse pour contrôler ce qui a été produit.
 *
 * Écrit à la main plutôt qu'avec une librairie de décompression : la chaîne
 * n'en avait besoin qu'ici, et une dépendance de plus se paie à chaque
 * réinstallation.
 */
const fs = require('fs');
const zlib = require('zlib');

const SIGNATURE = Buffer.from('PK\x03\x04');

/** Renvoie le contenu texte d'une entrée du ZIP, ou null. */
function lireEntree(fichier, nomVoulu) {
  const tampon = fs.readFileSync(fichier);
  let i = 0;
  while ((i = tampon.indexOf(SIGNATURE, i)) !== -1) {
    const longueurNom = tampon.readUInt16LE(i + 26);
    const longueurExtra = tampon.readUInt16LE(i + 28);
    const nom = tampon.slice(i + 30, i + 30 + longueurNom).toString();
    const methode = tampon.readUInt16LE(i + 8);
    let compressee = tampon.readUInt32LE(i + 18);
    const debut = i + 30 + longueurNom + longueurExtra;
    if (nom === nomVoulu) {
      if (compressee === 0) {
        // Taille reportée dans un descripteur : on lit jusqu'à l'entrée suivante.
        const fin = tampon.indexOf(SIGNATURE, debut);
        compressee = (fin === -1 ? tampon.length : fin) - debut;
      }
      const donnees = tampon.slice(debut, debut + compressee);
      return (methode === 8 ? zlib.inflateRawSync(donnees) : donnees).toString('utf8');
    }
    i = debut + 1;
  }
  return null;
}

/** Relevé structurel d'un document Word. */
function structure(fichier) {
  const xml = lireEntree(fichier, 'word/document.xml');
  if (!xml) throw new Error(`word/document.xml introuvable dans ${fichier}`);

  const compter = (motif) => (xml.match(motif) || []).length;
  const styles = {};
  for (const m of xml.matchAll(/<w:pStyle w:val="([^"]+)"\/?>/g)) {
    styles[m[1]] = (styles[m[1]] || 0) + 1;
  }

  const images = [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)].map((m) => ({
    largeurPouces: Number(m[1]) / 914400,
    hauteurPouces: Number(m[2]) / 914400,
  }));

  return {
    images: compter(/<w:drawing>/g),
    dimensions: images,
    tableaux: compter(/<w:tbl>/g),
    // Word francise les identifiants de style au premier enregistrement.
    titre1: (styles.Titre1 || 0) + (styles.Heading1 || 0),
    titre2: (styles.Titre2 || 0) + (styles.Heading2 || 0),
    entreesSommaire: (styles.TM1 || 0) + (styles.TM2 || 0) + (styles.TOC1 || 0) + (styles.TOC2 || 0),
    listesNumerotees: compter(/<w:numPr>/g),
    lignesInsecables: compter(/<w:cantSplit/g),
    solidarites: compter(/<w:keepNext/g),
    styles,
    // Les entités XML sont décodées : sans cela, « Classes & Matières » se
    // cherche en vain, le document contenant « Classes &amp; Matières ».
    texte: xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' '),
  };
}

module.exports = { lireEntree, structure };
