import { requireEstablishmentId } from '@school/database';

import type { OwnerAcademicYear } from './academic-year.helper';

/**
 * Cache mémoire des agrégats d'années **closes** (§6.8).
 *
 * Deux règles gouvernent ce fichier, et elles ne sont pas de même nature.
 *
 * La première est fonctionnelle : **l'année courante n'est jamais mise en
 * cache**. Ses chiffres bougent à chaque paiement encaissé, à chaque appel
 * saisi ; un propriétaire qui rafraîchit doit voir la réalité, pas une
 * photographie de quinze minutes. Une année terminée, elle, ne bouge plus.
 *
 * La seconde est de sécurité : **l'établissement préfixe la clé**, et il est lu
 * dans le contexte de la requête, pas reçu en argument. Une clé qui l'oublierait
 * ferait lire à une école les agrégats d'une autre — une fuite qui ne
 * déclencherait aucune erreur et ne laisserait aucune trace. C'est le risque
 * R11 du document, et la raison pour laquelle `requireEstablishmentId()` est
 * appelé ici plutôt que quelque part au-dessus.
 */

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** Une année close ne bouge plus : un quart d'heure suffit à amortir. */
const TTL_MS = 15 * 60 * 1000;

/** Garde-fou mémoire : au-delà, les entrées les plus anciennes sont évincées. */
const MAX_ENTRIES = 500;

const store = new Map<string, Entry>();

/**
 * Une année est close lorsqu'elle n'est plus l'année courante **et** que la
 * date du jour a dépassé son 31 août. Les deux conditions comptent : une année
 * marquée non courante par erreur ne doit pas figer des données encore vivantes.
 */
export function isClosedYear(year: OwnerAcademicYear, now: Date = new Date()): boolean {
  if (year.isCurrent) return false;
  return now > new Date(Date.UTC(year.endYear, 7, 31, 23, 59, 59));
}

/** Clé de cache — l'établissement en préfixe, toujours. */
function keyOf(route: string, params: Record<string, unknown>): string {
  const establishmentId = requireEstablishmentId();
  const normalized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${String(value)}`)
    .join('&');

  return `${establishmentId}:${route}:${normalized}`;
}

function evictIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  const oldest = [...store.entries()].sort(([, a], [, b]) => a.expiresAt - b.expiresAt);
  for (const [key] of oldest.slice(0, store.size - MAX_ENTRIES)) store.delete(key);
}

/**
 * Exécute `compute`, en réutilisant le résultat mis en cache si l'année est
 * close. Sur l'année courante, `compute` est toujours appelé.
 */
export async function withYearCache<T>(
  route: string,
  year: OwnerAcademicYear,
  params: Record<string, unknown>,
  compute: () => Promise<T>,
  now: Date = new Date(),
): Promise<T> {
  if (!isClosedYear(year, now)) return compute();

  const key = keyOf(route, { ...params, year: year.id });
  const hit = store.get(key);
  if (hit && hit.expiresAt > now.getTime()) return hit.value as T;

  const value = await compute();
  store.set(key, { value, expiresAt: now.getTime() + TTL_MS });
  evictIfNeeded();
  return value;
}

/** Vide le cache — réservé aux tests et aux scripts d'exploitation. */
export function clearOwnerCache(): void {
  store.clear();
}

/** Taille courante, pour les tests. */
export function ownerCacheSize(): number {
  return store.size;
}
