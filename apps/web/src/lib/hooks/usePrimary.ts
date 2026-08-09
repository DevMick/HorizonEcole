import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

/**
 * Accès au module primaire (CP1 → CM2).
 *
 * Les types décrivent ce que renvoie `/api/primary/*` : ils tiennent lieu de
 * contrat entre l'API et les écrans, et évitent que chaque page redéclare sa
 * propre forme des mêmes données.
 */

export type PrimaryLevel = 'CP1' | 'CP2' | 'CE1' | 'CE2' | 'CM1' | 'CM2';
export type PrimaryStatus = 'ADMIS' | 'EXAMEN' | 'REDOUBLE' | 'NON_CLASSE';

/** Ordre pédagogique des niveaux — celui dans lequel l'école lit ses classes. */
export const PRIMARY_LEVEL_ORDER: PrimaryLevel[] = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

/**
 * Niveau d'une classe, déduit de son champ `level` ou, à défaut, de son nom.
 * Tolère les divisions : « CM2 », « CM2 A », « cm2 1 » donnent tous `CM2`.
 * Miroir côté écran de la fonction homonyme de l'API — les deux lisent le même
 * référentiel, et c'est lui qui dit quelles compositions un niveau attend.
 */
export function normalizePrimaryLevel(value: string | null | undefined): PrimaryLevel | null {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  return PRIMARY_LEVEL_ORDER.find((level) => normalized.startsWith(level)) ?? null;
}

/**
 * Rang d'une classe pour l'affichage : CP1 avant CP2, … CM1 avant CM2. Le tri
 * alphabétique placerait CE1 en tête, ce qui ne correspond à rien de vécu.
 * Les niveaux non reconnus se rangent à la fin.
 */
export function primaryLevelRank(value: string | null | undefined): number {
  const level = normalizePrimaryLevel(value);
  return level ? PRIMARY_LEVEL_ORDER.indexOf(level) : PRIMARY_LEVEL_ORDER.length;
}

export interface PrimarySettings {
  divisor: number;
  averageScale: number;
  moyenneAdmission: number;
  moyenneRedoublement: number;
}

export interface PrimaryClassSummary {
  id: string;
  name: string;
  level: PrimaryLevel | null;
  studentsCount: number;
  subjectsCount: number;
  isConfigured: boolean;
  settings: PrimarySettings | null;
  mainTeacher: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface PrimaryGridSubject {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  maxScore: number;
  sortOrder: number;
}

export interface PrimaryClassGrid {
  class: { id: string; name: string; level: PrimaryLevel | null; cycle: string };
  profile: { level: PrimaryLevel; label: string; scale: number; evaluations: string[] } | null;
  settings: PrimarySettings | null;
  totalMaxScore: number;
  subjects: PrimaryGridSubject[];
}

export interface PrimaryEvaluation {
  id: string;
  academicYearId: string;
  classId: string;
  className: string | null;
  name: string;
  date: string;
  sortOrder: number;
  isExam: boolean;
  isLocked: boolean;
  divisor: number;
  averageScale: number;
  publishedAt: string | null;
  gradesCount?: number;
  subjects?: Array<{
    id: string;
    subjectId: string;
    name: string;
    code: string;
    maxScore: number;
    sortOrder: number;
  }>;
}

export interface PrimaryStudentResult {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  notes: Record<string, number | null>;
  total: number;
  average: number | null;
  rank: number | null;
  isExAequo: boolean;
  mention: string | null;
  status: PrimaryStatus;
  isAbsent: boolean;
  missingCount: number;
  gradedCount: number;
}

interface PrimaryGenderRecap {
  enrolled: number;
  composed: number;
  admitted: number;
  repeating: number;
  underReview: number;
  successRate: number | null;
}

export interface PrimaryResults {
  evaluation: {
    id: string;
    name: string;
    date: string;
    isExam: boolean;
    isLocked: boolean;
    divisor: number;
    averageScale: number;
    publishedAt: string | null;
  };
  class: { id: string; name: string; level: string | null };
  academicYear: { id: string; name: string };
  thresholds: { admission: number; redoublement: number };
  subjects: Array<{ subjectId: string; name: string; code: string; maxScore: number; sortOrder: number }>;
  totalMaxScore: number;
  results: PrimaryStudentResult[];
  stats: {
    enrolled: number;
    composed: number;
    absent: number;
    classAverage: number | null;
    bestAverage: number | null;
    worstAverage: number | null;
    bestTotal: number | null;
    worstTotal: number | null;
    successRate: number | null;
  };
  recap: { boys: PrimaryGenderRecap; girls: PrimaryGenderRecap; total: PrimaryGenderRecap };
}

export interface PrimaryAnnualStudentRow {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  /** Moyenne par composition, indexée par identifiant de composition. */
  averages: Record<string, number | null>;
  composedCount: number;
  yearAverage: number | null;
  rank: number | null;
  isExAequo: boolean;
  mention: string | null;
  status: PrimaryStatus;
}

export interface PrimaryAnnualReport {
  class: { id: string; name: string; level: string | null; cycle: string };
  academicYear: { id: string; name: string };
  scale: number;
  thresholds: { admission: number; redoublement: number };
  evaluations: Array<{
    id: string;
    name: string;
    date: string;
    isExam: boolean;
    sortOrder: number;
  }>;
  results: PrimaryAnnualStudentRow[];
  stats: {
    enrolled: number;
    composed: number;
    classAverage: number | null;
    bestAverage: number | null;
    worstAverage: number | null;
    admitted: number;
    repeating: number;
    underReview: number;
    successRate: number | null;
  };
}

export interface PrimaryEntryGrid {
  evaluation: PrimaryEvaluation;
  class: { id: string; name: string; level: string | null; cycle: string };
  academicYear: { id: string; name: string };
  subjects: Array<{ subjectId: string; name: string; code: string; maxScore: number; sortOrder: number }>;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    studentNumber: string;
    gender: string;
    grades: Record<string, { note: number | null; isAbsent: boolean }>;
  }>;
}

export interface PrimaryLevelProfile {
  level: PrimaryLevel;
  label: string;
  scale: number;
  divisor: number;
  totalMaxScore: number;
  thresholds: { moyenneAdmission: number; moyenneRedoublement: number };
  evaluations: string[];
  subjects: Array<{ code: string; label: string; maxScore: number; order: number }>;
}

const unwrap = (response: any) => response.data?.data;

/** Référentiel des niveaux : barèmes, diviseurs et compositions par défaut. */
export function usePrimaryLevels() {
  return useQuery<PrimaryLevelProfile[]>({
    queryKey: ['primary', 'levels'],
    // Un référentiel figé côté API : inutile de le rejouer à chaque montage.
    staleTime: Infinity,
    queryFn: async () => unwrap(await api.get('/primary/classes/levels')) || [],
  });
}

/**
 * Toutes les classes du primaire, avec effectif, grille et titulaire.
 *
 * Route réservée à l'administration : `enabled` doit rester à `false` pour les
 * autres rôles, sinon la requête part et se solde par un 403 inutile.
 */
export function usePrimaryClasses(academicYearId?: string, enabled = true) {
  return useQuery<PrimaryClassSummary[]>({
    queryKey: ['primary', 'classes', academicYearId ?? null],
    enabled,
    queryFn: async () =>
      unwrap(
        await api.get('/primary/classes', {
          params: academicYearId ? { academicYearId } : undefined,
        }),
      ) || [],
  });
}

/** Classes du primaire dont l'utilisateur connecté est titulaire. */
export function useMyPrimaryClasses(academicYearId?: string, enabled = true) {
  return useQuery<{
    teacher: { id: string; firstName: string; lastName: string } | null;
    classes: Array<{
      id: string;
      name: string;
      level: PrimaryLevel | null;
      studentsCount: number;
      academicYear: { id: string; name: string; isCurrent: boolean };
    }>;
  }>({
    queryKey: ['primary', 'my-classes', academicYearId ?? null],
    enabled,
    queryFn: async () =>
      unwrap(
        await api.get('/primary/classes/me', {
          params: academicYearId ? { academicYearId } : undefined,
        }),
      ) || { teacher: null, classes: [] },
  });
}

/** Grille d'une classe : matières, barèmes, diviseur et seuils. */
export function usePrimaryClassGrid(classId?: string) {
  return useQuery<PrimaryClassGrid>({
    queryKey: ['primary', 'grid', classId],
    enabled: Boolean(classId),
    queryFn: async () => unwrap(await api.get(`/primary/classes/${classId}/grid`)),
  });
}

/** Compositions d'une classe pour une année. */
export function usePrimaryEvaluations(academicYearId?: string, classId?: string) {
  return useQuery<PrimaryEvaluation[]>({
    queryKey: ['primary', 'evaluations', academicYearId ?? null, classId ?? null],
    enabled: Boolean(academicYearId),
    queryFn: async () =>
      unwrap(
        await api.get('/primary/evaluations', {
          params: { academicYearId, ...(classId ? { classId } : {}) },
        }),
      ) || [],
  });
}

/** Tableau de saisie d'une composition. */
export function usePrimaryEntryGrid(evaluationId?: string) {
  return useQuery<PrimaryEntryGrid>({
    queryKey: ['primary', 'entry', evaluationId],
    enabled: Boolean(evaluationId),
    queryFn: async () => unwrap(await api.get(`/primary/grades/${evaluationId}`)),
  });
}

/** Moyennes, rangs et statistiques d'une composition. */
export function usePrimaryResults(evaluationId?: string) {
  return useQuery<PrimaryResults>({
    queryKey: ['primary', 'results', evaluationId],
    enabled: Boolean(evaluationId),
    queryFn: async () => unwrap(await api.get(`/primary/results/${evaluationId}`)),
  });
}

/**
 * Bilan annuel d'une classe : la moyenne de chaque élève à chaque composition,
 * sa moyenne annuelle, son rang et sa décision de fin d'année.
 */
export function usePrimaryAnnualReport(classId?: string, academicYearId?: string) {
  return useQuery<PrimaryAnnualReport>({
    queryKey: ['primary', 'annual', classId ?? null, academicYearId ?? null],
    enabled: Boolean(classId && academicYearId),
    queryFn: async () =>
      unwrap(
        await api.get(`/primary/results/class/${classId}/annual`, {
          params: { academicYearId },
        }),
      ),
  });
}

/**
 * Ouvre un PDF du primaire dans un nouvel onglet.
 *
 * Les routes PDF sont authentifiées : on ne peut pas y pointer une balise
 * `<a href>`, qui n'emporterait pas le jeton. On télécharge donc le flux via
 * l'instance axios (qui l'ajoute) puis on l'affiche depuis un blob local.
 */
export async function openPrimaryPdf(url: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  window.open(blobUrl, '_blank', 'noopener');
  // Laisser le temps à l'onglet de charger le blob avant de le révoquer.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Télécharge un document Word produit par l'API.
 *
 * Contrairement au PDF, un .docx ne s'affiche pas dans un onglet : on force donc
 * l'enregistrement, en reprenant le nom de fichier proposé par le serveur quand
 * il en donne un.
 */
export async function downloadPrimaryDocx(url: string, fallbackName: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' });

  const disposition = String(response.headers?.['content-disposition'] ?? '');
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const fileName = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;

  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: DOCX_MIME }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/** Libellés des décisions, partagés par les écrans de résultats. */
export const PRIMARY_STATUS_LABELS: Record<PrimaryStatus, string> = {
  ADMIS: 'Admis(e)',
  EXAMEN: 'À examiner',
  REDOUBLE: 'Redouble',
  NON_CLASSE: 'Non classé(e)',
};

/** Formatage d'une note : deux décimales, virgule décimale, tiret si absente. */
export const fmtNote = (value: number | null | undefined): string =>
  value === null || value === undefined || Number.isNaN(value)
    ? '—'
    : Number(value).toFixed(2).replace('.', ',');

/** Nombre court (barème, diviseur) : 8,5 plutôt que 8.50. */
export const fmtShort = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? '—'
    : Number.isInteger(value)
      ? String(value)
      : String(value).replace('.', ',');

/** Rang à la française, avec la mention « ex æquo » quand il est partagé. */
export const rankLabel = (rank: number | null, isExAequo = false): string => {
  if (rank === null) return '—';
  return `${rank}${rank === 1 ? 'er' : 'e'}${isExAequo ? ' ex æquo' : ''}`;
};
