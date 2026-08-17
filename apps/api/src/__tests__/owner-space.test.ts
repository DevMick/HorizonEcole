import fs from 'fs';
import path from 'path';

import request from 'supertest';
import express from 'express';

/**
 * Espace Propriétaire — Lot 1 : socle rôle & sécurité.
 *
 * Couvre les critères 1.3 à 1.7 de §9-Lot 1 du document de conception, ainsi que
 * T-AUTZ-1/2/3, T-AUTZ-10 et T-ISO-8 de §10.
 *
 * Ces tests s'exécutent **sans base de données** : `@school/database` est
 * remplacé par un double qui reproduit le comportement significatif du
 * cloisonnement — l'établissement du contexte ouvert par `authenticate` filtre
 * les lectures, et son absence les laisse traverser les établissements. C'est
 * précisément ce que fait `packages/database/src/tenant-extension.ts:233`.
 *
 * Ce double vérifie donc que **la route est correctement montée dans le
 * contexte** ; il ne remplace pas les tests d'isolation sur base réelle
 * (T-ISO-1, T-ISO-3), qui relèvent des lots suivants et de `verify:tenant`.
 */

jest.mock('@school/database', () => {
  /** Deux établissements peuplés distinctement, pour rendre une fuite visible. */
  const ACADEMIC_YEARS = [
    { id: 'y-a-2025', name: '2025-2026', startYear: 2025, endYear: 2026, isCurrent: true, establishment_id: 'etab-A' },
    { id: 'y-a-2024', name: '2024-2025', startYear: 2024, endYear: 2025, isCurrent: false, establishment_id: 'etab-A' },
    { id: 'y-b-2025', name: '2025-2026', startYear: 2025, endYear: 2026, isCurrent: true, establishment_id: 'etab-B' },
  ];

  const state = {
    /** Contexte d'établissement courant — l'équivalent de `getEstablishmentId()`. */
    establishmentId: null as string | null,
    /** Comptes connus de `authenticate`. */
    users: {} as Record<string, any>,
    academicYears: ACADEMIC_YEARS,
  };

  const runWithEstablishment = (establishmentId: string, fn: () => unknown) => {
    const previous = state.establishmentId;
    state.establishmentId = establishmentId;
    try {
      return fn();
    } finally {
      state.establishmentId = previous;
    }
  };

  const prisma = {
    academicYear: {
      findMany: jest.fn(async ({ select, orderBy }: any = {}) => {
        // Hors contexte, l'extension se retire : toutes les écoles remontent.
        const rows = state.establishmentId
          ? state.academicYears.filter((y) => y.establishment_id === state.establishmentId)
          : state.academicYears;

        const sorted = [...rows].sort((a, b) =>
          orderBy?.startYear === 'desc' ? b.startYear - a.startYear : a.startYear - b.startYear,
        );

        if (!select) return sorted;
        return sorted.map((row) =>
          Object.fromEntries(Object.keys(select).map((key) => [key, (row as any)[key]])),
        );
      }),
    },
    // Compteurs du tableau de bord : neutres, seul le contrôle d'accès est testé.
    student: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
    user: { count: jest.fn(async () => 0) },
    // `findMany` sert au référentiel `/owner/context`, qui expose la liste des
    // classes aux filtres des écrans de pilotage.
    schoolClass: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
    student_payments: {
      aggregate: jest.fn(async () => ({ _sum: { amount: 0 } })),
      findMany: jest.fn(async () => []),
    },
    grades: { findMany: jest.fn(async () => []) },
  };

  const unscopedPrisma = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => state.users[where.id] ?? null),
    },
  };

  return {
    __state: state,
    prisma,
    unscopedPrisma,
    runWithEstablishment,
    runUnscoped: (fn: () => unknown) => fn(),
    getEstablishmentId: () => state.establishmentId,
    requireEstablishmentId: () => {
      if (!state.establishmentId) throw new Error('Contexte d’établissement absent');
      return state.establishmentId;
    },
  };
});

jest.mock('../services/establishment.service', () => ({
  getEstablishment: jest.fn(async (establishmentId: string) => ({
    id: establishmentId,
    name: establishmentId === 'etab-A' ? 'École A' : 'École B',
    code: establishmentId === 'etab-A' ? 'A' : 'B',
    schoolType: 'COLLEGE',
    logoUrl: null,
    modules: { primary: false, secondary: true },
  })),
}));

import { UserRole } from '@school/types';
import ownerRoutes from '../routes/owner';
import dashboardRoutes from '../routes/dashboard';
import { isOwner } from '../middleware/rbac';
import { TokenService } from '../services/token.service';

const db = jest.requireMock('@school/database') as any;

const app = express();
app.use(express.json());
app.use('/api/owner', ownerRoutes);
app.use('/api/dashboard', dashboardRoutes);

/** Enregistre un compte auprès du double d'`unscopedPrisma` et signe son jeton. */
function tokenFor(role: string, establishmentId = 'etab-A'): string {
  const id = `user-${role}-${establishmentId}`;
  const email = `${role.toLowerCase()}@${establishmentId}.test`;

  db.__state.users[id] = {
    id,
    email,
    role,
    isActive: true,
    establishment_id: establishmentId,
    establishment: { isActive: true },
  };

  return TokenService.generateAccessToken({ userId: id, email, role: role as UserRole, establishmentId });
}

const OTHER_ROLES = ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'STUDENT', 'PARENT'];
const WRITE_METHODS = ['post', 'put', 'patch', 'delete'] as const;

describe('Espace Propriétaire — socle rôle & sécurité (Lot 1)', () => {
  // =========================================================================
  // Critère 1.3 / T-ISO-8 — GET /api/owner/context
  // =========================================================================

  describe('GET /api/owner/context', () => {
    it('répond 200 à un compte OWNER (critère 1.3)', async () => {
      const response = await request(app)
        .get('/api/owner/context')
        .set('Authorization', `Bearer ${tokenFor('OWNER')}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schoolType).toBe('COLLEGE');
      expect(response.body.data.modules).toEqual({ primary: false, secondary: true });
      expect(response.body.data.currentAcademicYearId).toBe('y-a-2025');
    });

    it("ne renvoie que l'établissement du jeton et ses années (T-ISO-8)", async () => {
      const response = await request(app)
        .get('/api/owner/context')
        .set('Authorization', `Bearer ${tokenFor('OWNER', 'etab-A')}`)
        .expect(200);

      expect(response.body.data.establishment.id).toBe('etab-A');

      const ids = response.body.data.academicYears.map((year: any) => year.id);
      expect(ids).toEqual(['y-a-2025', 'y-a-2024']);
      expect(ids).not.toContain('y-b-2025');
    });

    it("lit les années dans le contexte d'établissement, jamais hors contexte", async () => {
      db.prisma.academicYear.findMany.mockClear();

      await request(app)
        .get('/api/owner/context')
        .set('Authorization', `Bearer ${tokenFor('OWNER', 'etab-B')}`)
        .expect(200);

      // La route ne pose aucun filtre d'établissement elle-même : c'est le
      // contexte ouvert par `authenticate` qui le fournit. Si ce contexte
      // manquait, la lecture traverserait les écoles sans lever d'erreur.
      const [args] = db.prisma.academicYear.findMany.mock.calls[0];
      expect(JSON.stringify(args ?? {})).not.toContain('establishment');
    });

    it("n'expose aucun paramètre d'établissement", async () => {
      const response = await request(app)
        .get('/api/owner/context?establishmentId=etab-B')
        .set('Authorization', `Bearer ${tokenFor('OWNER', 'etab-A')}`)
        .expect(200);

      expect(response.body.data.establishment.id).toBe('etab-A');
    });
  });

  // =========================================================================
  // Critère 1.4 / T-AUTZ-2 — les cinq rôles existants sont refusés
  // =========================================================================

  describe('Autorisation par rôle', () => {
    it.each(OTHER_ROLES)('répond 403 à un compte %s (critère 1.4)', async (role) => {
      const response = await request(app)
        .get('/api/owner/context')
        .set('Authorization', `Bearer ${tokenFor(role)}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    // =======================================================================
    // Critère 1.6 / T-AUTZ-1
    // =======================================================================

    it('répond 401 sans jeton (critère 1.6)', async () => {
      const response = await request(app).get('/api/owner/context').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('répond 401 avec un jeton invalide', async () => {
      await request(app)
        .get('/api/owner/context')
        .set('Authorization', 'Bearer jeton-invalide')
        .expect(401);
    });
  });

  // =========================================================================
  // Critère 1.5 / T-AUTZ-3 — lecture seule structurelle
  // =========================================================================

  describe('Lecture seule', () => {
    it.each(WRITE_METHODS)('refuse %s avec 405 et un en-tête Allow (critère 1.5)', async (method) => {
      const response = await request(app)[method]('/api/owner/context')
        .set('Authorization', `Bearer ${tokenFor('OWNER')}`)
        .expect(405);

      expect(response.headers.allow).toBe('GET, HEAD, OPTIONS');
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("L'espace Propriétaire est en lecture seule");
    });

    it("refuse les écritures sur un chemin inexistant, avant tout routage", async () => {
      // La barrière est un middleware du routeur racine : elle s'applique donc
      // aussi aux chemins qu'aucun handler ne sert, et couvrira les routes
      // ajoutées par les lots suivants.
      await request(app)
        .post('/api/owner/enrollment')
        .set('Authorization', `Bearer ${tokenFor('OWNER')}`)
        .expect(405);
    });

    it('laisse passer HEAD', async () => {
      await request(app)
        .head('/api/owner/context')
        .set('Authorization', `Bearer ${tokenFor('OWNER')}`)
        .expect(200);
    });

    it('applique le refus de rôle avant celui de méthode', async () => {
      // L'ordre compte : un compte non propriétaire ne doit pas apprendre
      // quelles méthodes l'espace accepte.
      await request(app)
        .post('/api/owner/context')
        .set('Authorization', `Bearer ${tokenFor('ADMIN')}`)
        .expect(403);
    });
  });

  // =========================================================================
  // Critère 1.7 / T-AUTZ-10 — /api/dashboard n'est plus ouvert à tout compte
  // =========================================================================

  describe('GET /api/dashboard', () => {
    it('répond 403 à un OWNER sur /activities (critère 1.7)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activities')
        .set('Authorization', `Bearer ${tokenFor('OWNER')}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('répond 403 à un OWNER sur /stats', async () => {
      await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${tokenFor('OWNER')}`)
        .expect(403);
    });

    it.each(['ADMIN', 'ACCOUNTANT', 'TEACHER'])(
      'reste ouvert à %s — non-régression',
      async (role) => {
        await request(app)
          .get('/api/dashboard/stats')
          .set('Authorization', `Bearer ${tokenFor(role)}`)
          .expect(200);

        await request(app)
          .get('/api/dashboard/activities')
          .set('Authorization', `Bearer ${tokenFor(role)}`)
          .expect(200);
      },
    );

    it.each(['STUDENT', 'PARENT'])('répond 403 à %s', async (role) => {
      await request(app)
        .get('/api/dashboard/activities')
        .set('Authorization', `Bearer ${tokenFor(role)}`)
        .expect(403);
    });
  });

  // =========================================================================
  // Cycle de vie du compte — T-AUTZ-12 / T-AUTZ-13
  // =========================================================================

  describe('État du compte propriétaire', () => {
    it('répond 401 si le compte est désactivé (T-AUTZ-12)', async () => {
      const token = tokenFor('OWNER');
      db.__state.users['user-OWNER-etab-A'].isActive = false;

      await request(app)
        .get('/api/owner/context')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      db.__state.users['user-OWNER-etab-A'].isActive = true;
    });

    it("répond 403 si l'établissement est inactif (T-AUTZ-13)", async () => {
      const token = tokenFor('OWNER');
      db.__state.users['user-OWNER-etab-A'].establishment = { isActive: false };

      const response = await request(app)
        .get('/api/owner/context')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Établissement inactif');

      db.__state.users['user-OWNER-etab-A'].establishment = { isActive: true };
    });
  });
});

// ===========================================================================
// Helpers de rôle
// ===========================================================================

describe('isOwner', () => {
  it('reconnaît le rôle OWNER et lui seul', () => {
    expect(isOwner({ user: { role: 'OWNER' } } as any)).toBe(true);
    expect(isOwner({ user: { role: 'ADMIN' } } as any)).toBe(false);
    expect(isOwner({} as any)).toBe(false);
  });
});

// ===========================================================================
// Cohérence des deux énumérations UserRole (§7.2.1)
// ===========================================================================

describe('enum UserRole', () => {
  const schema = fs.readFileSync(
    path.join(__dirname, '../../../../packages/database/prisma/schema.prisma'),
    'utf8',
  );

  const prismaRoles = (() => {
    const block = schema.match(/enum UserRole \{([\s\S]*?)\n\}/);
    if (!block) throw new Error('enum UserRole introuvable dans schema.prisma');
    return block[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^[A-Z_]+$/.test(line));
  })();

  it("déclare OWNER côté Prisma, en fin d'énumération", () => {
    expect(prismaRoles).toContain('OWNER');
    expect(prismaRoles[prismaRoles.length - 1]).toBe('OWNER');
  });

  it('déclare OWNER côté TypeScript', () => {
    expect(UserRole.OWNER).toBe('OWNER');
  });

  it('ne laisse aucune valeur Prisma absente de TypeScript', () => {
    // L'écart inverse est préexistant et hors-périmètre : SECRETARY et STAFF
    // n'existent que côté TypeScript (§2.1.1).
    const tsRoles = Object.values(UserRole) as string[];
    expect(prismaRoles.filter((role) => !tsRoles.includes(role))).toEqual([]);
  });
});

// ===========================================================================
// Barrières statiques — T-ISO-4, T-ISO-5, §7.4.1 niveau 3
// ===========================================================================

describe('Sources de owner/** — barrières statiques', () => {
  const roots = [
    path.join(__dirname, '../routes/owner'),
    path.join(__dirname, '../services/owner'),
  ].filter((dir) => fs.existsSync(dir));

  const walk = (dir: string): { file: string; code: string }[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      if (!entry.name.endsWith('.ts')) return [];
      return [{ file: full, code: fs.readFileSync(full, 'utf8') }];
    });

  const sources = roots.flatMap(walk);

  /**
   * Les barrières examinent le **code exécuté**, pas la prose : un commentaire
   * qui explique pourquoi tel usage est proscrit ne doit pas déclencher le
   * garde-fou qui le proscrit.
   */
  const stripComments = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('trouve au moins le routeur racine', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it("n'utilise jamais unscopedPrisma ni new PrismaClient() (T-ISO-4)", () => {
    const faulty = sources.filter(
      ({ code }) => /\bunscopedPrisma\b/.test(code) || /new\s+PrismaClient\s*\(/.test(code),
    );
    expect(faulty.map((s) => s.file)).toEqual([]);
  });

  it("n'appelle aucune opération d'écriture Prisma (§7.4.1, niveau 3)", () => {
    // Ancré sur `prisma.` : c'est l'écriture **en base** qui est proscrite. Un
    // `Map.delete` sur un cache mémoire n'a rien à voir, et le confondre avec
    // un `prisma.user.delete` ferait crier la barrière là où il n'y a rien.
    const prismaWrites =
      /\bprisma\.[\w$]+\.(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)\s*\(|\bprisma\.\$execute/;
    const faulty = sources.filter(({ code }) => prismaWrites.test(stripComments(code)));
    expect(faulty.map((s) => s.file)).toEqual([]);
  });

  it("n'accepte aucun paramètre d'établissement (§7.3)", () => {
    // `req.user!.establishmentId` est la seule forme admise : l'établissement
    // vient du jeton, jamais de la requête.
    // Deux formes sont admises, et deux seulement : la lecture du jeton, et la
    // variable locale issue de `requireEstablishmentId()` — qui lit le contexte
    // de la requête et ne peut donc pas désigner une autre école.
    const faulty = sources.filter(({ code }) =>
      stripComments(code)
        .replace(/req\.user!?\??\.establishmentId/g, '')
        .replace(/const establishmentId = requireEstablishmentId\(\);/g, '')
        .replace(/\$\{establishmentId\}/g, '')
        .match(/establishmentId/),
    );
    expect(faulty.map((s) => s.file)).toEqual([]);
  });

  it('cite establishment_id dans chaque $queryRaw (T-ISO-5)', () => {
    const faulty = sources.filter(({ code }) => {
      const executed = stripComments(code);
      return /\$queryRaw/.test(executed) && !/establishment_id/.test(executed);
    });
    expect(faulty.map((s) => s.file)).toEqual([]);
  });

  it('monte authenticate sur le routeur racine (B1)', () => {
    const rootRouter = fs.readFileSync(path.join(__dirname, '../routes/owner/index.ts'), 'utf8');
    expect(rootRouter).toMatch(/router\.use\(\s*authenticate\s*,\s*requireRole\(UserRole\.OWNER\)\s*\)/);
  });
});
