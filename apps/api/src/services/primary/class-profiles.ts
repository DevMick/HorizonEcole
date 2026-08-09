/**
 * Référentiel des niveaux du primaire ivoirien (CP1 → CM2).
 *
 * Chaque niveau définit sa grille de matières avec leur barème propre, et le
 * diviseur qui ramène la somme des notes sur l'échelle de la classe. La
 * relation tient par construction :
 *
 *     diviseur = (somme des barèmes) / échelle
 *
 * CP1  : 7 × 10                   = 70  / 7   = /10
 * CP2  : 6 × 10 + 20              = 80  / 8   = /10
 * CE1  : 30 + 30 + 10 + 30        = 100 / 10  = /10
 * CM1  : 50 + 50 + 20 + 50        = 170 / 8,5 = /20
 * CM2 examen blanc : + EPS /20    = 190 / 9,5 = /20
 *
 * `computeDivisor` recalcule cette valeur dès qu'un barème est retouché par
 * l'administration : le diviseur n'est jamais saisi à la main, il se déduit.
 */

export const PRIMARY_LEVELS = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'] as const;

export type PrimaryLevel = (typeof PRIMARY_LEVELS)[number];

/** Échelle de notation d'une classe : la moyenne est sur 10 ou sur 20. */
export type PrimaryScale = 10 | 20;

export interface PrimarySubjectProfile {
  /** Code global dans `subjects` — préfixé pour ne pas heurter le secondaire. */
  code: string;
  /** Libellé affiché dans les grilles et sur les documents. */
  label: string;
  maxScore: number;
  order: number;
}

export interface PrimaryThresholds {
  moyenneAdmission: number;
  moyenneRedoublement: number;
}

export interface PrimaryLevelProfile {
  level: PrimaryLevel;
  label: string;
  scale: PrimaryScale;
  subjects: PrimarySubjectProfile[];
  evaluations: readonly string[];
  thresholds: PrimaryThresholds;
}

/**
 * Codes des matières du primaire dans le catalogue global `subjects`.
 * Le préfixe `P_` est indispensable : `subjects.code` est unique pour toute
 * l'école, et « MATH » appartient déjà au secondaire.
 */
export const PRIMARY_SUBJECT_CODES = {
  COPIE: 'P_COPIE',
  EXP_ECRIT: 'P_EXP_ECRIT',
  DICTEE: 'P_DICTEE',
  MATH: 'P_MATH',
  LECTURE: 'P_LECT',
  DESSIN: 'P_DESS',
  CHANT: 'P_CHANT',
  EXP_TEXTE: 'P_EXP_TEXTE',
  EV_MILIEU: 'P_EV_MILIEU',
  EPS: 'P_EPS',
} as const;

/** Libellé affiché pour chaque code — sert à créer les matières manquantes. */
export const PRIMARY_SUBJECT_LABELS: Record<string, string> = {
  [PRIMARY_SUBJECT_CODES.COPIE]: 'COPIE',
  [PRIMARY_SUBJECT_CODES.EXP_ECRIT]: 'EXP ECRIT',
  [PRIMARY_SUBJECT_CODES.DICTEE]: 'DICTEE',
  [PRIMARY_SUBJECT_CODES.MATH]: 'MATH',
  [PRIMARY_SUBJECT_CODES.LECTURE]: 'LECT',
  [PRIMARY_SUBJECT_CODES.DESSIN]: 'DESS',
  [PRIMARY_SUBJECT_CODES.CHANT]: 'CHANT',
  [PRIMARY_SUBJECT_CODES.EXP_TEXTE]: 'EXP TEXTE',
  [PRIMARY_SUBJECT_CODES.EV_MILIEU]: 'EV MILIEU',
  [PRIMARY_SUBJECT_CODES.EPS]: 'EPS',
};

/** Compositions de l'année, communes à tous les niveaux sauf le CM2. */
export const DEFAULT_PRIMARY_EVALUATIONS = [
  'COMPOSITION 1',
  'COMPOSITION 2',
  'COMPOSITION 3',
  'COMPOSITION DE PASSAGE',
] as const;

/**
 * Le CM2 prépare le CEPE : les deux dernières compositions sont des examens
 * blancs, qui ajoutent l'EPS à la grille (d'où un diviseur de 9,5).
 */
export const CM2_EVALUATIONS = [
  'COMPOSITION 1',
  'COMPOSITION 2',
  'EXAMEN BLANC 1',
  'EXAMEN BLANC 2',
] as const;

const CM2_EXAM_NAMES = new Set<string>(['EXAMEN BLANC 1', 'EXAMEN BLANC 2']);

const CP_SUBJECTS = (mathMaxScore: number): PrimarySubjectProfile[] => [
  { code: PRIMARY_SUBJECT_CODES.COPIE, label: 'COPIE', maxScore: 10, order: 1 },
  { code: PRIMARY_SUBJECT_CODES.EXP_ECRIT, label: 'EXP ECRIT', maxScore: 10, order: 2 },
  { code: PRIMARY_SUBJECT_CODES.DICTEE, label: 'DICTEE', maxScore: 10, order: 3 },
  { code: PRIMARY_SUBJECT_CODES.MATH, label: 'MATH', maxScore: mathMaxScore, order: 4 },
  { code: PRIMARY_SUBJECT_CODES.LECTURE, label: 'LECT', maxScore: 10, order: 5 },
  { code: PRIMARY_SUBJECT_CODES.DESSIN, label: 'DESS', maxScore: 10, order: 6 },
  { code: PRIMARY_SUBJECT_CODES.CHANT, label: 'CHANT', maxScore: 10, order: 7 },
];

const CE_CM_SUBJECTS = (maxScore: number, dicteeMaxScore: number): PrimarySubjectProfile[] => [
  { code: PRIMARY_SUBJECT_CODES.EXP_TEXTE, label: 'EXP TEXTE', maxScore, order: 1 },
  { code: PRIMARY_SUBJECT_CODES.EV_MILIEU, label: 'EV MILIEU', maxScore, order: 2 },
  { code: PRIMARY_SUBJECT_CODES.DICTEE, label: 'DICTEE', maxScore: dicteeMaxScore, order: 3 },
  { code: PRIMARY_SUBJECT_CODES.MATH, label: 'MATH', maxScore, order: 4 },
];

export const PRIMARY_PROFILES: Record<PrimaryLevel, PrimaryLevelProfile> = {
  CP1: {
    level: 'CP1',
    label: 'CP1 — Cours Préparatoire 1',
    scale: 10,
    subjects: CP_SUBJECTS(10),
    evaluations: DEFAULT_PRIMARY_EVALUATIONS,
    thresholds: { moyenneAdmission: 5, moyenneRedoublement: 4 },
  },
  CP2: {
    level: 'CP2',
    label: 'CP2 — Cours Préparatoire 2',
    scale: 10,
    subjects: CP_SUBJECTS(20),
    evaluations: DEFAULT_PRIMARY_EVALUATIONS,
    thresholds: { moyenneAdmission: 5, moyenneRedoublement: 4 },
  },
  CE1: {
    level: 'CE1',
    label: 'CE1 — Cours Élémentaire 1',
    scale: 10,
    subjects: CE_CM_SUBJECTS(30, 10),
    evaluations: DEFAULT_PRIMARY_EVALUATIONS,
    thresholds: { moyenneAdmission: 5, moyenneRedoublement: 4 },
  },
  CE2: {
    level: 'CE2',
    label: 'CE2 — Cours Élémentaire 2',
    scale: 10,
    subjects: CE_CM_SUBJECTS(30, 10),
    evaluations: DEFAULT_PRIMARY_EVALUATIONS,
    thresholds: { moyenneAdmission: 5, moyenneRedoublement: 4 },
  },
  CM1: {
    level: 'CM1',
    label: 'CM1 — Cours Moyen 1',
    scale: 20,
    subjects: CE_CM_SUBJECTS(50, 20),
    evaluations: DEFAULT_PRIMARY_EVALUATIONS,
    thresholds: { moyenneAdmission: 10, moyenneRedoublement: 9 },
  },
  CM2: {
    level: 'CM2',
    label: 'CM2 — Cours Moyen 2 (CEPE)',
    scale: 20,
    subjects: CE_CM_SUBJECTS(50, 20),
    evaluations: CM2_EVALUATIONS,
    thresholds: { moyenneAdmission: 10, moyenneRedoublement: 9 },
  },
};

/** Matière ajoutée à la grille pour les examens blancs du CM2. */
export const CM2_EXAM_EXTRA_SUBJECT: PrimarySubjectProfile = {
  code: PRIMARY_SUBJECT_CODES.EPS,
  label: 'EPS',
  maxScore: 20,
  order: 5,
};

/**
 * Toutes les matières susceptibles d'être créées pour le primaire, quel que
 * soit le niveau — utilisé pour garantir leur présence dans `subjects`.
 */
export const ALL_PRIMARY_SUBJECTS: PrimarySubjectProfile[] = (() => {
  const byCode = new Map<string, PrimarySubjectProfile>();
  Object.values(PRIMARY_PROFILES).forEach((profile) => {
    profile.subjects.forEach((subject) => {
      if (!byCode.has(subject.code)) byCode.set(subject.code, subject);
    });
  });
  byCode.set(CM2_EXAM_EXTRA_SUBJECT.code, CM2_EXAM_EXTRA_SUBJECT);
  return Array.from(byCode.values());
})();

function normalizeText(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Déduit le niveau d'après le nom ou le champ `level` d'une classe.
 * Tolère les divisions numérotées et les variantes d'écriture : « CM2 »,
 * « CM2 A », « cm2-1 » donnent tous `CM2`.
 */
export function normalizePrimaryLevel(value: string | null | undefined): PrimaryLevel | null {
  const normalized = normalizeText(String(value ?? ''));
  if (!normalized) return null;

  for (const level of PRIMARY_LEVELS) {
    if (normalized === level) return level;
    if (!normalized.startsWith(level)) continue;

    // « CM2 A » oui, « CM21 » non : un chiffre collé change le niveau.
    const next = normalized.charAt(level.length);
    if (!next || next === ' ' || /[A-Z]/.test(next)) return level;
  }

  return null;
}

/**
 * Rang pédagogique d'une classe : CP1 avant CP2, … CM1 avant CM2. C'est l'ordre
 * dans lequel l'école lit ses classes — l'ordre alphabétique donnerait CE1 en
 * tête. Les classes dont le niveau n'est pas reconnu se rangent à la fin.
 */
export function primaryLevelRank(value: string | null | undefined): number {
  const level = normalizePrimaryLevel(value);
  return level ? PRIMARY_LEVELS.indexOf(level) : PRIMARY_LEVELS.length;
}

/** Profil d'un niveau, à partir du `level` ou du nom de la classe. */
export function getPrimaryProfile(value: string | null | undefined): PrimaryLevelProfile | null {
  const level = normalizePrimaryLevel(value);
  return level ? PRIMARY_PROFILES[level] : null;
}

/** Vrai si la valeur désigne un examen blanc du CM2. */
export function isCm2ExamName(name: string | null | undefined): boolean {
  return CM2_EXAM_NAMES.has(String(name ?? '').trim().toUpperCase());
}

/**
 * Grille d'une composition : celle du niveau, augmentée de l'EPS pour les
 * examens blancs du CM2.
 */
export function getEvaluationSubjects(
  profile: PrimaryLevelProfile,
  evaluationName: string,
): PrimarySubjectProfile[] {
  const subjects = [...profile.subjects];
  if (profile.level === 'CM2' && isCm2ExamName(evaluationName)) {
    subjects.push(CM2_EXAM_EXTRA_SUBJECT);
  }
  return subjects.sort((a, b) => a.order - b.order);
}

/**
 * Diviseur d'une grille : ce par quoi diviser la somme des notes pour obtenir
 * une moyenne sur `scale`. Arrondi au centième, les barèmes usuels donnant des
 * valeurs comme 8,5 ou 9,5.
 */
export function computeDivisor(
  subjects: Array<{ maxScore: number }>,
  scale: PrimaryScale,
): number {
  const total = subjects.reduce((sum, subject) => sum + Number(subject.maxScore || 0), 0);
  if (total <= 0 || scale <= 0) return 1;
  return Math.round((total / scale) * 100) / 100;
}

/**
 * Date par défaut d'une composition, pour préremplir le calendrier de l'année.
 * Les compositions du premier trimestre tombent sur l'année civile de début,
 * les suivantes sur celle de fin.
 */
export function defaultEvaluationDate(
  startYear: number,
  endYear: number,
  evaluationName: string,
): Date {
  const schedule = ((): { month: number; day: number } => {
    switch (String(evaluationName ?? '').trim().toUpperCase()) {
      case 'COMPOSITION 1':
        return { month: 12, day: 15 };
      case 'COMPOSITION 2':
        return { month: 3, day: 15 };
      case 'COMPOSITION 3':
      case 'EXAMEN BLANC 1':
        return { month: 4, day: 30 };
      case 'COMPOSITION DE PASSAGE':
      case 'EXAMEN BLANC 2':
        return { month: 6, day: 15 };
      default:
        return { month: 10, day: 31 };
    }
  })();

  const year = schedule.month >= 9 ? startYear : endYear;
  return new Date(Date.UTC(year, schedule.month - 1, schedule.day));
}

/** Mentions du primaire, exprimées en fraction de l'échelle de la classe. */
const MENTION_BANDS: Array<{ ratio: number; label: string }> = [
  { ratio: 0.9, label: 'Excellent' },
  { ratio: 0.8, label: 'Très Bien' },
  { ratio: 0.7, label: 'Bien' },
  { ratio: 0.6, label: 'Assez Bien' },
  { ratio: 0.5, label: 'Passable' },
];

/** Mention correspondant à une moyenne, sur l'échelle donnée. */
export function getMention(average: number, scale: PrimaryScale): string {
  const ratio = scale > 0 ? average / scale : 0;
  return MENTION_BANDS.find((band) => ratio >= band.ratio)?.label ?? 'Insuffisant';
}
