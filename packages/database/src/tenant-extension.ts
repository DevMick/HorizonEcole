import { Prisma, type PrismaClient } from '@prisma/client';
import { getEstablishmentId } from './tenant';

/**
 * Cloisonnement multi-établissements, appliqué au client Prisma lui-même.
 *
 * Le principe : plutôt que d'ajouter `where: { establishment_id }` dans chacune
 * des centaines de requêtes de l'API — où un seul oubli suffirait à exposer les
 * élèves d'une autre école — le filtre est injecté ici, pour toutes les
 * opérations et tous les modèles concernés. Un service ne *peut pas* lire ou
 * écrire hors de son établissement, même en l'ignorant complètement.
 *
 * Trois cas demandent plus qu'une injection de `where` :
 *
 *  - `findUnique` n'accepte que des champs uniques dans son `where` : on ne
 *    peut donc pas y ajouter l'établissement. La requête est réécrite en
 *    `findFirst`, qui l'accepte.
 *  - `update` / `delete` ont la même contrainte, mais changent l'état : on
 *    vérifie d'abord que la ligne visée appartient bien à l'établissement, et
 *    on refuse sinon. Sans cela, connaître un identifiant suffirait à modifier
 *    la donnée d'une autre école.
 *  - les écritures imbriquées (`data: { lignes: { create: [...] } }`) ne
 *    passent pas par l'opération du modèle enfant : l'établissement y est
 *    injecté en parcourant l'arbre des données.
 *
 * Hors requête (scripts, migrations) ou sous `runUnscoped`, l'extension est
 * transparente — c'est ce qui permet à l'authentification de retrouver un
 * compte avant de savoir à quelle école il appartient.
 */

const TENANT_FIELD = 'establishment_id';

/** Modèles portant la colonne d'établissement, et leurs relations sortantes. */
const scopedModels = new Set<string>();
const relationTargets = new Map<string, Map<string, string>>();
const scalarFields = new Map<string, Set<string>>();
const toOneRelations = new Map<string, Set<string>>();

for (const model of Prisma.dmmf.datamodel.models) {
  if (model.fields.some((field) => field.name === TENANT_FIELD)) {
    scopedModels.add(model.name);
  }

  const relations = new Map<string, string>();
  const scalars = new Set<string>();
  const toOne = new Set<string>();

  for (const field of model.fields) {
    if (field.kind === 'object') {
      relations.set(field.name, field.type);
      // Relation « vers-un » portant la clé étrangère : c'est la seule dont la
      // forme `connect` bascule Prisma en entrée « checked ».
      if (!field.isList && (field.relationFromFields?.length ?? 0) > 0) {
        toOne.add(field.name);
      }
    } else {
      scalars.add(field.name);
    }
  }

  relationTargets.set(model.name, relations);
  scalarFields.set(model.name, scalars);
  toOneRelations.set(model.name, toOne);
}

/**
 * Aplatit un `where` d'opération unique en filtre utilisable par `findFirst`.
 *
 * Les clés uniques composées y sont imbriquées — `{ evaluation_id_student_id:
 * { evaluation_id, student_id } }` — forme que seules les opérations « unique »
 * acceptent. Le contrôle d'appartenance passe, lui, par `findFirst` : il faut
 * donc redescendre ces composantes au premier niveau.
 */
function flattenUniqueWhere(modelName: string, where: unknown): Record<string, unknown> {
  if (!where || typeof where !== 'object') return {};

  const scalars = scalarFields.get(modelName) ?? new Set<string>();
  const flat: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
    const isCompound =
      !scalars.has(key) && value !== null && typeof value === 'object' && !Array.isArray(value);

    if (isCompound) {
      Object.assign(flat, value as Record<string, unknown>);
    } else {
      flat[key] = value;
    }
  }

  return flat;
}

/** Opérations de lecture dont le `where` accepte des champs non uniques. */
const FILTERABLE_READS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/** Opérations d'écriture en lot, dont le `where` accepte aussi des filtres. */
const FILTERABLE_WRITES = new Set(['updateMany', 'deleteMany']);

/** `where` ne portant que des champs uniques : nécessite une réécriture. */
const UNIQUE_READS = new Set(['findUnique', 'findUniqueOrThrow']);
const UNIQUE_WRITES = new Set(['update', 'delete']);

/**
 * Ajoute la contrainte d'établissement à un `where`, sans écraser un filtre
 * déjà posé par l'appelant : les deux se cumulent.
 */
function withTenant(where: unknown, establishmentId: string): Record<string, unknown> {
  const base = (where ?? {}) as Record<string, unknown>;
  if (base[TENANT_FIELD] !== undefined) return base;
  return { ...base, [TENANT_FIELD]: establishmentId };
}

/**
 * Injecte l'établissement dans un objet de création, puis descend dans les
 * écritures imbriquées (`create`, `createMany`, `connectOrCreate`) portées par
 * ses relations.
 */
function injectIntoCreate(
  modelName: string,
  data: unknown,
  establishmentId: string,
): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => injectIntoCreate(modelName, item, establishmentId));
  }
  if (!data || typeof data !== 'object') return data;

  const source = data as Record<string, unknown>;
  const result: Record<string, unknown> = { ...source };
  const relations = relationTargets.get(modelName);

  if (
    scopedModels.has(modelName) &&
    result[TENANT_FIELD] === undefined &&
    // Une relation explicite vers l'établissement prime : la poser en double
    // ferait échouer Prisma (champ et relation renseignés simultanément).
    result.establishment === undefined
  ) {
    // Prisma refuse de mélanger clé étrangère brute et relation pour une même
    // association. Rattacher un parent par `connect` bascule toute la charge en
    // entrée « checked », où l'établissement doit lui aussi passer par sa
    // relation. Les écritures imbriquées sur une relation *liste* (`subjects:
    // { create: [...] }`), elles, cohabitent très bien avec les clés étrangères
    // brutes : elles ne doivent donc pas déclencher ce basculement.
    const parentRelations = toOneRelations.get(modelName);
    const usesRelationForm = Array.from(parentRelations ?? []).some((field) => {
      if (field === 'establishment') return false;
      const value = source[field];
      return (
        !!value &&
        typeof value === 'object' &&
        ['connect', 'connectOrCreate', 'create'].some((key) => key in (value as object))
      );
    });

    if (usesRelationForm) {
      result.establishment = { connect: { id: establishmentId } };
    } else {
      result[TENANT_FIELD] = establishmentId;
    }
  }

  if (!relations) return result;

  for (const [fieldName, targetModel] of relations) {
    const value = result[fieldName];
    if (!value || typeof value !== 'object') continue;

    const nested = value as Record<string, unknown>;
    const rewritten: Record<string, unknown> = { ...nested };

    if (nested.create !== undefined) {
      rewritten.create = injectIntoCreate(targetModel, nested.create, establishmentId);
    }
    if (nested.createMany !== undefined) {
      const createMany = nested.createMany as Record<string, unknown>;
      rewritten.createMany = {
        ...createMany,
        data: injectIntoCreate(targetModel, createMany.data, establishmentId),
      };
    }
    if (nested.connectOrCreate !== undefined) {
      const entries = Array.isArray(nested.connectOrCreate)
        ? nested.connectOrCreate
        : [nested.connectOrCreate];
      const mapped = entries.map((entry: any) => ({
        ...entry,
        create: injectIntoCreate(targetModel, entry.create, establishmentId),
      }));
      rewritten.connectOrCreate = Array.isArray(nested.connectOrCreate) ? mapped : mapped[0];
    }

    result[fieldName] = rewritten;
  }

  return result;
}

/**
 * Erreur levée quand une écriture vise une ligne d'un autre établissement.
 * Le message reste volontairement identique à celui d'un enregistrement absent :
 * un appelant ne doit pas pouvoir déduire l'existence d'une donnée voisine.
 */
export class TenantScopeError extends Error {
  constructor(model: string) {
    super(`Enregistrement introuvable (${model})`);
    this.name = 'TenantScopeError';
  }
}

/**
 * Construit l'extension. `base` sert aux requêtes de contrôle et aux
 * réécritures : passer par le client étendu provoquerait une récursion.
 */
export function createTenantExtension(base: PrismaClient) {
  return Prisma.defineExtension({
    name: 'establishment-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const establishmentId = getEstablishmentId();

          // Hors requête, sous `runUnscoped`, ou modèle non cloisonné :
          // l'extension se retire complètement.
          if (!establishmentId || !model || !scopedModels.has(model)) {
            return query(args);
          }

          const delegate = (base as any)[model];

          if (FILTERABLE_READS.has(operation) || FILTERABLE_WRITES.has(operation)) {
            return query({ ...args, where: withTenant(args?.where, establishmentId) });
          }

          if (UNIQUE_READS.has(operation)) {
            // `findUnique` n'admet pas de filtre supplémentaire : on bascule sur
            // `findFirst`, qui donne le même résultat une fois l'établissement
            // imposé (l'identifiant reste unique).
            const found = await delegate.findFirst({
              ...args,
              where: withTenant(flattenUniqueWhere(model, args?.where), establishmentId),
            });
            if (!found && operation === 'findUniqueOrThrow') {
              throw new TenantScopeError(model);
            }
            return found;
          }

          if (operation === 'create') {
            return query({
              ...args,
              data: injectIntoCreate(model, args?.data, establishmentId),
            });
          }

          if (operation === 'createMany') {
            return query({
              ...args,
              data: injectIntoCreate(model, args?.data, establishmentId),
            });
          }

          if (operation === 'upsert') {
            // Prisma compile `upsert` en une seule instruction « insérer, sinon
            // mettre à jour » : la charge `create` part donc toujours, même
            // quand la ligne existe déjà. Les deux doivent être complétées.
            //
            // Aucun contrôle d'appartenance préalable ici, volontairement : il
            // devrait s'exécuter sur le même client que l'écriture pour voir
            // l'état de la transaction en cours, ce que l'extension ne permet
            // pas. La sécurité vient d'ailleurs — les clés uniques des upserts
            // du projet sont soit propres à l'établissement, soit fondées sur
            // des clés étrangères dont la lecture est déjà cloisonnée.
            return query({
              ...args,
              create: injectIntoCreate(model, args?.create, establishmentId),
              update: injectIntoCreate(model, args?.update, establishmentId),
            });
          }

          if (UNIQUE_WRITES.has(operation)) {
            // La ligne visée doit appartenir à l'établissement courant. On le
            // vérifie avant d'écrire : sans ce contrôle, connaître un
            // identifiant suffirait à modifier la donnée d'une autre école.
            const owned = await delegate.findFirst({
              where: withTenant(flattenUniqueWhere(model, args?.where), establishmentId),
              select: { [TENANT_FIELD]: true },
            });

            if (!owned) throw new TenantScopeError(model);
            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}

/** Exposé pour les tests et le script de vérification d'étanchéité. */
export const tenantScopedModels = scopedModels;
