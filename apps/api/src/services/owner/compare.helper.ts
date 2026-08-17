/**
 * Contrat de comparaison N vs N-1 de l'espace Propriétaire (§6.3).
 *
 * Fonctions **pures** : aucune lecture de base ici. C'est ce qui permet de les
 * tester exhaustivement, et surtout d'avoir une seule définition du delta pour
 * tous les domaines — un écart calculé différemment selon l'écran serait la
 * pire des régressions, puisqu'invisible.
 */

export type MetricUnit = 'count' | 'percent' | 'currency' | 'grade' | 'hours' | 'days';

export interface Metric {
  /** `null` = aucune ligne source. Ce n'est **pas** zéro. */
  value: number | null;
  /** `null` si aucune année de comparaison n'a été demandée. */
  previous: number | null;
  delta: number | null;
  /** `null` si `previous` vaut 0 ou n'existe pas : une division impossible. */
  deltaPct: number | null;
  unit: MetricUnit;
}

export interface SeriesPoint {
  key: string;
  label: string;
  value: number | null;
  previous?: number | null;
}

export interface Series {
  points: SeriesPoint[];
  total?: number | null;
  unit: MetricUnit;
}

/**
 * Fabrique un `Metric`.
 *
 * Le point délicat est `deltaPct` : passer de 0 à 12 n'est pas « +∞ % », c'est
 * une grandeur dont la variation relative n'a pas de sens. On renvoie donc
 * `null`, et l'interface n'affiche que l'écart absolu — plutôt qu'un
 * pourcentage spectaculaire et vide de contenu.
 */
export function metric(
  value: number | null,
  previous: number | null,
  unit: MetricUnit = 'count',
): Metric {
  const delta = value !== null && previous !== null ? round(value - previous) : null;
  const deltaPct =
    delta !== null && previous !== null && previous !== 0 ? round(delta / previous, 4) : null;

  return { value: value === null ? null : round(value), previous, delta, deltaPct, unit };
}

/** Division protégée : un dénominateur nul rend `null`, jamais `0` ni `Infinity`. */
export function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

/** Moyenne d'un échantillon ; `null` sur échantillon vide (et non `0`). */
export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Arrondi de présentation — évite les 0,30000000000000004 dans les réponses. */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Écart-type de population : `σ = √(Σ(x−x̄)² / n)`.
 *
 * `null` sur échantillon vide — une dispersion ne se mesure pas sur rien. Sur
 * un seul élément elle vaut `0`, ce qui est exact : une classe d'un élève est
 * parfaitement homogène.
 */
export function standardDeviation(values: number[]): number | null {
  if (values.length === 0) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Classement par valeur décroissante, ex æquo partagés : deux égalités
 * occupent le même rang et le suivant saute d'autant (1, 2, 2, 4).
 *
 * Miroir exact de la règle appliquée aux élèves du primaire
 * (`primary-results.service.ts:72-99`) : un classement de classes qui
 * départagerait les ex æquo alors que celui des élèves les regroupe serait
 * incohérent d'un écran à l'autre.
 */
export function rankWithTies<T>(
  items: T[],
  valueOf: (item: T) => number | null,
): Array<{ item: T; rank: number | null; isExAequo: boolean }> {
  const ranked = items
    .filter((item) => valueOf(item) !== null)
    .sort((left, right) => (valueOf(right) ?? 0) - (valueOf(left) ?? 0));

  const counts = new Map<number, number>();
  ranked.forEach((item) => {
    const value = valueOf(item) as number;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  let previousValue: number | null = null;
  let previousRank = 0;

  const rows = ranked.map((item, index) => {
    const value = valueOf(item) as number;
    const rank = previousValue !== null && value === previousValue ? previousRank : index + 1;
    previousValue = value;
    previousRank = rank;
    return { item, rank, isExAequo: (counts.get(value) ?? 0) > 1 };
  });

  // Les non-classés ferment la marche, sans rang : ils n'ont pas concouru.
  return [
    ...rows,
    ...items
      .filter((item) => valueOf(item) === null)
      .map((item) => ({ item, rank: null, isExAequo: false })),
  ];
}

/** Répartition en tranches d'égale largeur, bornes basses incluses. */
export function bucketize(
  values: number[],
  { min, max, width }: { min: number; max: number; width: number },
): Map<string, number> {
  const count = Math.max(1, Math.ceil((max - min) / width));
  const buckets = new Map<string, number>();
  for (let index = 0; index < count; index += 1) {
    buckets.set(String(round(min + index * width, 2)), 0);
  }

  for (const value of values) {
    // La borne haute appartient à la dernière tranche : un 20/20 se range avec
    // les 18-20, il n'ouvre pas une tranche « 20 » d'un seul point de large.
    // Le calage par l'indice évite l'arithmétique flottante sur les bornes,
    // où `max − ε` retombe sur `max` dès que l'échelle dépasse quelques unités.
    const index = Math.min(Math.max(Math.floor((value - min) / width), 0), count - 1);
    const key = String(round(min + index * width, 2));
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return buckets;
}

/**
 * Assemble une série à partir de deux ventilations (année observée, année de
 * comparaison), en conservant les clés présentes d'un seul côté : une classe
 * ouverte cette année doit apparaître avec `previous: 0`, et une classe fermée
 * rester visible avec `value: 0`. Les faire disparaître masquerait précisément
 * ce qu'un propriétaire cherche à voir.
 */
export function series(
  current: Map<string, number>,
  previous: Map<string, number> | null,
  labelOf: (key: string) => string,
  unit: MetricUnit = 'count',
  sort?: (a: SeriesPoint, b: SeriesPoint) => number,
): Series {
  const keys = new Set<string>([...current.keys(), ...(previous ? previous.keys() : [])]);

  const points: SeriesPoint[] = [...keys].map((key) => ({
    key,
    label: labelOf(key),
    value: current.get(key) ?? 0,
    previous: previous ? previous.get(key) ?? 0 : null,
  }));

  points.sort(sort ?? ((a, b) => (b.value ?? 0) - (a.value ?? 0)));

  return {
    points,
    total: points.reduce((sum, point) => sum + (point.value ?? 0), 0),
    unit,
  };
}
