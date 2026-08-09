import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './tenant-extension';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaScoped: unknown | undefined;
}

// Function to reset Prisma client (useful after regeneration)
export function resetPrismaClient() {
  if (globalThis.__prisma) {
    globalThis.__prisma.$disconnect().catch(() => {
      // Ignore disconnect errors
    });
    globalThis.__prisma = undefined;
    globalThis.__prismaScoped = undefined;
  }
}

// Prevent multiple instances of Prisma Client in development
// Force recreation if refreshToken model is missing (after regeneration)
const basePrisma: PrismaClient = (() => {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient({
      log: ['error'],
    });
  }

  // In development, always check and recreate if needed
  // Force recreation if refreshToken model is missing (after regeneration)
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }

  // Guard against a stale client left over from a previous schema (HMR under tsx watch)
  if (!('refreshToken' in globalThis.__prisma)) {
    console.warn('⚠️  Prisma client missing refreshToken model. Resetting...');
    resetPrismaClient();
    globalThis.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
    console.log('✅ Prisma client recreated with refreshToken model.');
  }

  return globalThis.__prisma;
})();

/**
 * Client applicatif : cloisonné par établissement.
 *
 * C'est celui qu'importent tous les services. L'extension y ajoute d'office le
 * filtre `establishment_id` tiré du contexte de la requête (cf. `tenant.ts`),
 * de sorte qu'aucune requête ne puisse atteindre les données d'une autre école
 * — pas même par omission. Hors requête, ou sous `runUnscoped`, il se comporte
 * comme un client Prisma ordinaire.
 */
export const prisma = (() => {
  if (process.env.NODE_ENV === 'production') {
    return basePrisma.$extends(createTenantExtension(basePrisma)) as unknown as PrismaClient;
  }

  if (!globalThis.__prismaScoped) {
    globalThis.__prismaScoped = basePrisma.$extends(createTenantExtension(basePrisma));
  }

  return globalThis.__prismaScoped as PrismaClient;
})();

/**
 * Client brut, sans cloisonnement.
 *
 * Réservé à ce qui traverse légitimement les établissements : création d'une
 * école, authentification (retrouver un compte avant de connaître son école),
 * scripts d'exploitation. Tout autre usage contournerait l'isolation.
 */
export const unscopedPrisma = basePrisma;

export {
  getEstablishmentId,
  getTenantContext,
  requireEstablishmentId,
  runUnscoped,
  runWithEstablishment,
  type TenantContext,
} from './tenant';
export { TenantScopeError, tenantScopedModels } from './tenant-extension';

export * from '@prisma/client';
export default prisma;
