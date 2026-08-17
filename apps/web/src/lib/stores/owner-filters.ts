import { create } from 'zustand';

/**
 * Filtre global de l'espace Propriétaire : l'année scolaire observée.
 *
 * Il ne vit pas dans les composants parce qu'il traverse tous les écrans :
 * changer d'année depuis la page Finance doit être vu par la page Effectifs. Et
 * il entre dans la clé React Query de chaque requête
 * (`['owner', domaine, academicYearId, …]`), si bien qu'un changement d'année
 * invalide le cache de lui-même, sans `invalidateQueries` manuel.
 *
 * L'**année de comparaison** n'est plus choisie : elle suit automatiquement
 * l'année précédente. Les deltas de chaque indicateur comparent donc toujours
 * N à N-1, ce qui est la seule lecture qu'un dirigeant fait spontanément d'une
 * flèche verte. Le sélecteur qui permettait d'en choisir une autre a été retiré.
 *
 * Persistance en `sessionStorage` — et non `localStorage` : l'année consultée
 * est le contexte d'une session de travail, pas une préférence durable. L'URL
 * (`?y=`) prime au chargement, ce qui rend chaque vue partageable et rejouable
 * telle quelle.
 */

const YEAR_KEY = 'owner.academicYearId';

/** `sessionStorage` peut lever (navigation privée, stockage désactivé). */
function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Sans persistance, la sélection reste valable pour la durée de la page.
  }
}

export interface OwnerYearOption {
  id: string;
  name: string;
}

/** Année précédant `id` dans une liste triée par année de début décroissante. */
function previousOf(years: OwnerYearOption[], id: string): string | null {
  const index = years.findIndex((year) => year.id === id);
  return index >= 0 ? years[index + 1]?.id ?? null : null;
}

interface OwnerFiltersState {
  academicYearId: string | null;
  /** Référentiel courant, mémorisé par `resolve` pour déduire la comparaison. */
  years: OwnerYearOption[];
  /**
   * Année de comparaison, toujours déduite : celle qui précède l'année
   * observée, ou `null` pour la plus ancienne. Elle n'est pas modifiable.
   */
  compareAcademicYearId: string | null;
  setAcademicYearId: (id: string) => void;
  /**
   * Fixe l'année manquante à partir du référentiel renvoyé par
   * `GET /api/owner/context`, sans jamais écraser un choix déjà exprimé.
   * `years` est attendu trié par année de début décroissante.
   */
  resolve: (
    years: OwnerYearOption[],
    currentAcademicYearId: string | null,
    fromUrl?: { year?: string | null },
  ) => void;
}

export const useOwnerFilters = create<OwnerFiltersState>((set, get) => ({
  academicYearId: readSession(YEAR_KEY),
  years: [],
  compareAcademicYearId: null,

  setAcademicYearId: (id) => {
    const { years } = get();
    writeSession(YEAR_KEY, id);
    set({ academicYearId: id, compareAcademicYearId: previousOf(years, id) });
  },

  resolve: (years, currentAcademicYearId, fromUrl) => {
    if (years.length === 0) return;

    const known = (id?: string | null) => (id && years.some((y) => y.id === id) ? id : null);
    const state = get();

    // L'URL prime, puis la session, puis l'année courante, puis la plus récente.
    const year =
      known(fromUrl?.year) ??
      known(state.academicYearId) ??
      known(currentAcademicYearId) ??
      years[0].id;

    if (year !== state.academicYearId) writeSession(YEAR_KEY, year);

    set({ academicYearId: year, compareAcademicYearId: previousOf(years, year), years });
  },
}));
