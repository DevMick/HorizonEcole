import fs from 'fs';
import path from 'path';
import { prisma } from '@school/database';

/**
 * Identité visuelle de l'établissement pour les documents du primaire.
 *
 * L'application est multi-établissements : chaque école téléverse son propre
 * logo depuis /etablissement (POST /api/establishments/me/logo, chemin conservé
 * dans `establishment.logoUrl`). Lire un fichier statique du dépôt ferait sortir
 * les fiches de toutes les écoles sous le même sigle — celui de l'application,
 * qui n'est celui d'aucune d'entre elles.
 *
 * Le module sert donc de point unique où l'on résout « quelle école, quel
 * logo », partagé par le PDF (Puppeteer) et le Word (docx).
 */

/** Racine des fichiers téléversés, identique à celle de `middleware/upload`. */
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

/** Identité de l'école portée par l'en-tête des documents. */
export interface SchoolIdentity {
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  motto: string | null;
  /** Rattachement administratif du primaire, porté par l'en-tête officiel. */
  directionRegionale: string | null;
  secteurPedagogique: string | null;
  /** Chemin public du logo téléversé, ex. `/uploads/logos/ecole-123.png`. */
  logoUrl: string | null;
}

/**
 * Logo prêt à insérer : le data-URI pour le HTML rendu par Chrome, les octets
 * bruts et le type pour l'`ImageRun` de docx, les dimensions pour conserver les
 * proportions plutôt que d'étirer le sigle de l'école dans un carré.
 */
export interface SchoolLogo {
  dataUri: string;
  buffer: Buffer;
  /** Types acceptés par `ImageRun`; `null` quand le format n'y est pas gérable. */
  docxType: 'png' | 'jpg' | 'gif' | 'bmp' | null;
  width: number;
  height: number;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
};

const DOCX_TYPE_BY_EXTENSION: Record<string, SchoolLogo['docxType']> = {
  '.png': 'png',
  '.jpg': 'jpg',
  '.jpeg': 'jpg',
  '.gif': 'gif',
  '.bmp': 'bmp',
  // Word ne sait pas afficher un WebP : le document sortira sans logo plutôt
  // qu'avec une image que le traitement de texte refuserait d'ouvrir.
  '.webp': null,
};

/**
 * Dimensions intrinsèques d'une image, lues dans son en-tête.
 *
 * Aucune dépendance d'imagerie n'est installée côté API, et on n'en ajoute pas
 * pour deux entiers : sans eux le logo serait inséré dans un carré, ce qui
 * écrase un sigle horizontal. Format non reconnu → `null`, l'appelant retombe
 * sur un carré.
 */
function readIntrinsicSize(buffer: Buffer): { width: number; height: number } | null {
  // PNG : signature de 8 octets, puis le bloc IHDR qui porte les dimensions.
  if (
    buffer.length >= 24 &&
    buffer.readUInt32BE(0) === 0x89504e47 &&
    buffer.toString('ascii', 12, 16) === 'IHDR'
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // GIF : largeur et hauteur en little-endian juste après « GIF87a »/« GIF89a ».
  if (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  // BMP : en-tête DIB, dimensions signées (une hauteur négative = image
  // stockée de haut en bas, la valeur absolue reste la hauteur réelle).
  if (buffer.length >= 26 && buffer.toString('ascii', 0, 2) === 'BM') {
    return { width: Math.abs(buffer.readInt32LE(18)), height: Math.abs(buffer.readInt32LE(22)) };
  }

  // JPEG : on parcourt les segments jusqu'au « Start Of Frame », seul endroit
  // où les dimensions sont écrites.
  if (buffer.length >= 4 && buffer.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      // SOF0-3, SOF5-7, SOF9-11, SOF13-15 : tous portent la même structure.
      // Sont exclus DHT (c4), JPG (c8) et DAC (cc), qui partagent la plage.
      const isStartOfFrame =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

      if (isStartOfFrame) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }

      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }

  return null;
}

/**
 * Résout un chemin public `/uploads/...` en chemin disque, en refusant tout ce
 * qui sortirait du dossier des téléversements. La valeur vient de la base, donc
 * en principe de notre propre middleware d'upload — mais une fiche de classement
 * n'a aucune raison de pouvoir lire un fichier arbitraire du serveur.
 */
function resolveUploadPath(publicPath: string): string | null {
  const normalized = publicPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized.startsWith('uploads/')) return null;

  const filePath = path.resolve(process.cwd(), normalized);
  const root = path.resolve(UPLOAD_ROOT);

  return filePath === root || filePath.startsWith(root + path.sep) ? filePath : null;
}

/**
 * Charge le logo téléversé par l'école.
 *
 * Repli propre : une école sans logo, un fichier effacé du disque ou un format
 * illisible renvoient `null`, et les documents sortent sans logo — jamais avec
 * celui d'une autre école ni celui de l'application.
 */
export function loadSchoolLogo(logoUrl: string | null | undefined): SchoolLogo | null {
  if (!logoUrl) return null;

  const filePath = resolveUploadPath(logoUrl);
  if (!filePath) return null;

  let buffer: Buffer;
  try {
    if (!fs.existsSync(filePath)) return null;
    buffer = fs.readFileSync(filePath);
  } catch {
    return null;
  }

  if (buffer.length === 0) return null;

  const extension = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) return null;

  const size = readIntrinsicSize(buffer);

  return {
    dataUri: `data:${mime};base64,${buffer.toString('base64')}`,
    buffer,
    docxType: DOCX_TYPE_BY_EXTENSION[extension] ?? null,
    width: size?.width ?? 1,
    height: size?.height ?? 1,
  };
}

/**
 * Dimensions d'insertion du logo, ajustées pour tenir dans une boîte sans
 * déformer l'image. Un sigle large occupe toute la largeur disponible, un sigle
 * haut toute la hauteur.
 */
export function fitLogo(logo: SchoolLogo, box: number): { width: number; height: number } {
  if (!(logo.width > 0) || !(logo.height > 0)) return { width: box, height: box };

  const ratio = Math.min(box / logo.width, box / logo.height);
  return {
    width: Math.max(1, Math.round(logo.width * ratio)),
    height: Math.max(1, Math.round(logo.height * ratio)),
  };
}

/**
 * Titulaire de la classe pour l'année, en majuscules — la ligne « Tenue par »
 * de l'en-tête officiel. `null` quand la classe n'a pas encore de titulaire
 * désigné, l'appelant décidant du libellé de remplacement.
 */
export async function loadMainTeacherName(
  classId: string,
  academicYearId: string,
): Promise<string | null> {
  const row = await prisma.class_main_teachers.findFirst({
    where: { class_id: classId, academic_year_id: academicYearId },
    select: { teacher: { select: { first_name: true, last_name: true } } },
  });

  const teacher = row?.teacher;
  if (!teacher) return null;

  return `${(teacher.last_name || '').toUpperCase()} ${(teacher.first_name || '').toUpperCase()}`.trim();
}

/** Charge l'identité — et le logo — de l'école qui porte cette classe. */
export async function loadSchoolIdentity(classId: string): Promise<SchoolIdentity | null> {
  const row = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: {
      establishment: {
        select: {
          name: true,
          code: true,
          phone: true,
          email: true,
          motto: true,
          directionRegionale: true,
          secteurPedagogique: true,
          logoUrl: true,
        },
      },
    },
  });

  return row?.establishment ?? null;
}
