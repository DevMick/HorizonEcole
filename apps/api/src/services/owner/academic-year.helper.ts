import { prisma, requireEstablishmentId } from '@school/database';

import { getEstablishment } from '../establishment.service';

/**
 * Résolution des années scolaires pour l'espace Propriétaire.
 *
 * Trois notions distinctes, qu'il ne faut pas confondre :
 *
 *  - **l'année observée** (`academicYearId`), choisie par l'utilisateur ;
 *  - **l'année de comparaison** (`compareAcademicYearId`), également choisie,
 *    et qui sert au delta de chaque indicateur ;
 *  - **l'année précédente**, celle qui précède immédiatement une année donnée
 *    dans l'ordre chronologique, et qui n'a rien à voir avec la précédente.
 *
 * La distinction est structurante : « nouveaux élèves » (`EFF-08`) se définit
 * par rapport à l'année *précédente*, jamais par rapport à l'année de
 * comparaison. Comparer 2025-2026 à 2020-2021 doit changer les deltas affichés,
 * pas la définition d'un nouvel élève.
 *
 * La lecture passe par le client `prisma` cloisonné : les années remontées sont
 * nécessairement celles de l'établissement du jeton.
 */

export interface OwnerAcademicYear {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  isCurrent: boolean;
}

/** Années de l'établissement, triées par année de début **décroissante**. */
export async function listAcademicYears(): Promise<OwnerAcademicYear[]> {
  return prisma.academicYear.findMany({
    select: { id: true, name: true, startYear: true, endYear: true, isCurrent: true },
    orderBy: { startYear: 'desc' },
  });
}

/** Année précédant immédiatement `yearId`, ou `null` si c'est la première. */
export function previousYearOf(
  years: OwnerAcademicYear[],
  yearId: string,
): OwnerAcademicYear | null {
  const index = years.findIndex((year) => year.id === yearId);
  return index >= 0 ? years[index + 1] ?? null : null;
}

/** Les `count` années les plus récentes, rendues par ordre chronologique croissant. */
export function historyOf(years: OwnerAcademicYear[], count: number): OwnerAcademicYear[] {
  return years.slice(0, count).reverse();
}

export class UnknownAcademicYearError extends Error {
  constructor() {
    // Volontairement muet sur l'existence de l'identifiant : une année d'un
    // autre établissement doit être indiscernable d'une année inexistante.
    super('Année scolaire introuvable');
    this.name = 'UnknownAcademicYearError';
  }
}

export interface ResolvedYears {
  years: OwnerAcademicYear[];
  year: OwnerAcademicYear;
  compare: OwnerAcademicYear | null;
}

/**
 * Valide les années demandées contre le référentiel de l'établissement.
 *
 * Une année inconnue — y compris celle d'une autre école — lève, ce qui donne
 * un `404` : la route ne doit jamais répondre avec les données d'un autre
 * établissement, ni laisser deviner qu'un identifiant existe ailleurs.
 */
export async function resolveYears(
  academicYearId: string,
  compareAcademicYearId?: string,
): Promise<ResolvedYears> {
  const years = await listAcademicYears();

  const year = years.find((candidate) => candidate.id === academicYearId);
  if (!year) throw new UnknownAcademicYearError();

  let compare: OwnerAcademicYear | null = null;
  if (compareAcademicYearId && compareAcademicYearId !== academicYearId) {
    compare = years.find((candidate) => candidate.id === compareAcademicYearId) ?? null;
    if (!compare) throw new UnknownAcademicYearError();
  }

  return { years, year, compare };
}

export interface OwnerMeta {
  academicYear: { id: string; name: string };
  compareAcademicYear: { id: string; name: string } | null;
  schoolType: string;
  modules: { primary: boolean; secondary: boolean };
  /** Domaines sans donnée exploitable, pour piloter les états vides (§5.7). */
  unavailable: string[];
  generatedAt: string;
}

/**
 * Enveloppe `meta` commune à toutes les réponses `/api/owner/*` (§6.3).
 *
 * L'établissement est lu **dans le contexte de la requête**, pas reçu en
 * argument. La nuance n'est pas cosmétique : un paramètre, même toujours
 * alimenté par `req.user.establishmentId` aujourd'hui, offrirait demain une
 * prise à qui passerait autre chose. `requireEstablishmentId()` lève si le
 * contexte manque — c'est la garde d'exécution demandée par §7.3.
 */
export async function buildMeta(
  resolved: ResolvedYears,
  unavailable: string[] = [],
): Promise<OwnerMeta> {
  const establishment = await getEstablishment(requireEstablishmentId());

  return {
    academicYear: { id: resolved.year.id, name: resolved.year.name },
    compareAcademicYear: resolved.compare
      ? { id: resolved.compare.id, name: resolved.compare.name }
      : null,
    schoolType: establishment.schoolType,
    modules: establishment.modules,
    unavailable,
    generatedAt: new Date().toISOString(),
  };
}
