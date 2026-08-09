import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexte d'établissement de la requête en cours.
 *
 * Il est porté par un `AsyncLocalStorage` plutôt que passé de fonction en
 * fonction : les quarante-cinq services de l'API n'ont ainsi rien à changer, et
 * surtout aucun d'eux ne peut *oublier* de transmettre l'établissement. Le
 * cloisonnement ne dépend donc pas de la vigilance de celui qui écrit une
 * requête — il est appliqué en un seul endroit, dans l'extension Prisma qui lit
 * ce contexte (cf. `tenant-extension.ts`).
 */

export interface TenantContext {
  establishmentId: string;
  /**
   * Échappatoire volontaire pour les traitements hors requête (migrations,
   * scripts d'administration, connexion avant que l'établissement soit connu).
   * Quand elle est vraie, aucune restriction n'est ajoutée : à n'utiliser que
   * dans du code qui ne sert jamais une requête utilisateur.
   */
  bypass?: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Exécute `callback` dans le contexte d'un établissement donné. */
export function runWithEstablishment<T>(establishmentId: string, callback: () => T): T {
  return storage.run({ establishmentId }, callback);
}

/**
 * Exécute `callback` sans cloisonnement.
 *
 * Réservé aux usages qui traversent légitimement les établissements :
 * l'authentification (qui doit retrouver un compte avant de savoir à quelle
 * école il appartient), la création d'un établissement, et les scripts
 * d'exploitation. Tout autre appel serait une faille.
 */
export function runUnscoped<T>(callback: () => T): T {
  return storage.run({ establishmentId: '', bypass: true }, callback);
}

/** Contexte courant, ou `undefined` hors de toute requête. */
export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/**
 * Établissement courant, ou `null` si la requête n'est pas cloisonnée.
 * `null` signifie « ne filtre pas » ; il ne doit jamais provenir d'un oubli,
 * seulement d'un `runUnscoped` explicite ou d'un appel hors requête.
 */
export function getEstablishmentId(): string | null {
  const context = storage.getStore();
  if (!context || context.bypass) return null;
  return context.establishmentId || null;
}

/**
 * Établissement courant, ou erreur. À utiliser quand l'absence de contexte
 * traduit un bug (une route métier montée sans le middleware de tenant).
 */
export function requireEstablishmentId(): string {
  const establishmentId = getEstablishmentId();
  if (!establishmentId) {
    throw new Error(
      "Aucun établissement dans le contexte : la requête n'est pas cloisonnée. " +
        'Vérifiez que la route passe par le middleware d’authentification.',
    );
  }
  return establishmentId;
}
