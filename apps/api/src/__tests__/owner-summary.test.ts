/**
 * Synthèse & finitions — critères 8.x.
 *
 * Le cœur de ce lot n'est pas un calcul mais **un cache**, et un cache mal
 * cloisonné ferait lire à une école les agrégats d'une autre : une fuite
 * silencieuse, sans erreur ni trace. C'est le risque R11, et c'est ce que la
 * moitié de ces tests vérifie.
 */

// Le cache lit l'établissement dans le contexte de la requête : le double
// reproduit ce comportement, y compris son refus de fonctionner hors contexte.
jest.mock('@school/database', () => {
  const state = { establishmentId: null as string | null };
  return {
    __state: state,
    requireEstablishmentId: () => {
      if (!state.establishmentId) throw new Error('Contexte d’établissement absent');
      return state.establishmentId;
    },
    prisma: {},
    unscopedPrisma: {},
    runWithEstablishment: (id: string, fn: () => unknown) => {
      const previous = state.establishmentId;
      state.establishmentId = id;
      try {
        return fn();
      } finally {
        state.establishmentId = previous;
      }
    },
  };
});

/**
 * Les services de domaine sont doublés : la synthèse est testée pour ce qu'elle
 * fait — choisir, accentuer, alerter — et non pour ce que font les six services
 * qu'elle assemble, déjà couverts par les lots 3 à 7.
 */
const metric = (value: number | null, unit = 'count') => ({
  value,
  previous: null,
  delta: null,
  deltaPct: null,
  unit,
});

jest.mock('../services/owner/enrollment.service', () => ({
  getEnrollment: jest.fn(async () => ({
    total: { value: 842, previous: 806, delta: 36, deltaPct: 0.045, unit: 'count' },
    newcomers: { value: 187, previous: 199, delta: -12, deltaPct: -0.06, unit: 'count' },
    retentionRate: { value: 0.884, previous: 0.863, delta: 0.021, deltaPct: 0.024, unit: 'percent' },
    occupancy: { overcrowded: [{ classId: 'c1' }, { classId: 'c2' }, { classId: 'c3' }] },
  })),
}));

jest.mock('../services/owner/staff.service', () => ({
  getStaff: jest.fn(async () => ({
    headcount: { value: 47, previous: 44, delta: 3, deltaPct: 0.068, unit: 'count' },
    unassignedSlots: metric(9),
  })),
}));

jest.mock('../services/owner/finance.service', () => ({
  getFinanceOverview: jest.fn(async () => ({
    // Volontairement sous le seuil d'alerte de 60 %.
    collectionRate: metric(0.45, 'percent'),
    outstanding: metric(24_100_000, 'currency'),
    invoiced: metric(89_900_000, 'currency'),
  })),
}));

jest.mock('../services/owner/results-secondary.service', () => ({
  getSecondaryResults: jest.fn(async () => ({
    generalAverage: metric(12.4, 'grade'),
    successRate: metric(0.685, 'percent'),
  })),
}));

jest.mock('../services/owner/results-primary.service', () => ({
  getPrimaryResults: jest.fn(async () => ({
    generalAverage: metric(12.8, 'grade'),
    successRate: metric(0.74, 'percent'),
    evaluationCount: metric(18),
  })),
}));

jest.mock('../services/owner/attendance.service', () => ({
  getAttendance: jest.fn(async () => ({ presenceRate: metric(0.913, 'percent') })),
  // Conduite non calculée : le test vérifie qu'aucune alerte n'en découle.
  getAttendanceConduct: jest.fn(async () => ({ averageNote: metric(null, 'grade') })),
}));

import {
  clearOwnerCache,
  isClosedYear,
  ownerCacheSize,
  withYearCache,
} from '../services/owner/cache';
import { getSummary } from '../services/owner/summary.service';
import { ALERT } from '../services/owner/thresholds';

const db = jest.requireMock('@school/database') as { __state: { establishmentId: string | null } };

const ANNEE_COURANTE = {
  id: 'y-2025',
  name: '2025-2026',
  startYear: 2025,
  endYear: 2026,
  isCurrent: true,
};
const ANNEE_CLOSE = {
  id: 'y-2023',
  name: '2023-2024',
  startYear: 2023,
  endYear: 2024,
  isCurrent: false,
};

/** Date de référence : bien après la clôture de 2023-2024. */
const MAINTENANT = new Date('2026-03-15T12:00:00Z');

/**
 * Ouvre le contexte d'établissement le temps de `fn`.
 *
 * Le `await` est indispensable : sans lui, le contexte se refermerait dès le
 * premier point d'attente, alors que le travail est encore en cours. Le vrai
 * `runWithEstablishment` s'appuie sur `AsyncLocalStorage`, qui suit les
 * continuations ; ce double, lui, doit le faire à la main.
 */
async function dansEtablissement<T>(id: string, fn: () => T | Promise<T>): Promise<T> {
  db.__state.establishmentId = id;
  try {
    return await fn();
  } finally {
    db.__state.establishmentId = null;
  }
}

beforeEach(() => {
  clearOwnerCache();
  db.__state.establishmentId = null;
});

// ===========================================================================
// Critère 8.6 — l'année courante n'est jamais mise en cache
// ===========================================================================

describe("Cache des années closes (critère 8.6)", () => {
  it("reconnaît une année close et une année en cours", () => {
    expect(isClosedYear(ANNEE_COURANTE, MAINTENANT)).toBe(false);
    expect(isClosedYear(ANNEE_CLOSE, MAINTENANT)).toBe(true);
  });

  it("ne considère pas close une année non courante dont le 31 août n'est pas passé", () => {
    // Les deux conditions comptent : une année marquée non courante par erreur
    // ne doit pas figer des données encore vivantes.
    const enCoursMaisPasMarquee = { ...ANNEE_COURANTE, isCurrent: false };
    expect(isClosedYear(enCoursMaisPasMarquee, new Date('2026-03-15T12:00:00Z'))).toBe(false);
    expect(isClosedYear(enCoursMaisPasMarquee, new Date('2026-09-01T12:00:00Z'))).toBe(true);
  });

  it("recalcule à chaque appel sur l'année courante", async () => {
    let appels = 0;
    const calcul = async () => {
      appels += 1;
      return appels;
    };

    await dansEtablissement('etab-A', async () => {
      await withYearCache('summary', ANNEE_COURANTE, {}, calcul, MAINTENANT);
      await withYearCache('summary', ANNEE_COURANTE, {}, calcul, MAINTENANT);
      await withYearCache('summary', ANNEE_COURANTE, {}, calcul, MAINTENANT);
    });

    // Les chiffres de l'année en cours bougent à chaque encaissement : les
    // figer quinze minutes ferait mentir un rafraîchissement.
    expect(appels).toBe(3);
    expect(ownerCacheSize()).toBe(0);
  });

  it("réutilise le résultat d'une année close", async () => {
    let appels = 0;
    const calcul = async () => {
      appels += 1;
      return { total: 842 };
    };

    const resultats = await dansEtablissement('etab-A', async () => [
      await withYearCache('summary', ANNEE_CLOSE, {}, calcul, MAINTENANT),
      await withYearCache('summary', ANNEE_CLOSE, {}, calcul, MAINTENANT),
    ]);

    expect(appels).toBe(1);
    expect(resultats[0]).toEqual(resultats[1]);
  });

  it("expire l'entrée après un quart d'heure", async () => {
    let appels = 0;
    const calcul = async () => {
      appels += 1;
      return appels;
    };

    await dansEtablissement('etab-A', async () => {
      await withYearCache('summary', ANNEE_CLOSE, {}, calcul, MAINTENANT);
      const plusTard = new Date(MAINTENANT.getTime() + 16 * 60 * 1000);
      await withYearCache('summary', ANNEE_CLOSE, {}, calcul, plusTard);
    });

    expect(appels).toBe(2);
  });

  it('distingue deux jeux de paramètres', async () => {
    let appels = 0;
    const calcul = async () => {
      appels += 1;
      return appels;
    };

    await dansEtablissement('etab-A', async () => {
      await withYearCache('enrollment', ANNEE_CLOSE, { level: '6e' }, calcul, MAINTENANT);
      await withYearCache('enrollment', ANNEE_CLOSE, { level: '5e' }, calcul, MAINTENANT);
      await withYearCache('enrollment', ANNEE_CLOSE, { level: '6e' }, calcul, MAINTENANT);
    });

    expect(appels).toBe(2);
  });

  it("ignore l'ordre d'écriture des paramètres", async () => {
    let appels = 0;
    const calcul = async () => {
      appels += 1;
      return appels;
    };

    await dansEtablissement('etab-A', async () => {
      await withYearCache('enrollment', ANNEE_CLOSE, { level: '6e', gender: 'F' }, calcul, MAINTENANT);
      await withYearCache('enrollment', ANNEE_CLOSE, { gender: 'F', level: '6e' }, calcul, MAINTENANT);
    });

    expect(appels).toBe(1);
  });
});

// ===========================================================================
// Critère 8.7 — aucun partage entre établissements
// ===========================================================================

describe('Cloisonnement du cache (critère 8.7, risque R11)', () => {
  it('ne partage aucune entrée entre deux établissements', async () => {
    const calculs: string[] = [];
    const calculPour = (etablissement: string) => async () => {
      calculs.push(etablissement);
      return { total: etablissement === 'etab-A' ? 842 : 7 };
    };

    const a = await dansEtablissement('etab-A', () =>
      withYearCache('summary', ANNEE_CLOSE, {}, calculPour('etab-A'), MAINTENANT),
    );
    const b = await dansEtablissement('etab-B', () =>
      withYearCache('summary', ANNEE_CLOSE, {}, calculPour('etab-B'), MAINTENANT),
    );

    // Même route, mêmes paramètres, même année : seul l'établissement change.
    // Si la clé l'oubliait, B lirait les 842 élèves de A sans qu'aucune erreur
    // ne le signale.
    expect(calculs).toEqual(['etab-A', 'etab-B']);
    expect(a).toEqual({ total: 842 });
    expect(b).toEqual({ total: 7 });
    expect(ownerCacheSize()).toBe(2);
  });

  it("relit bien depuis le cache de son propre établissement", async () => {
    let appels = 0;
    const calcul = async () => {
      appels += 1;
      return appels;
    };

    await dansEtablissement('etab-A', () =>
      withYearCache('summary', ANNEE_CLOSE, {}, calcul, MAINTENANT),
    );
    await dansEtablissement('etab-B', () =>
      withYearCache('summary', ANNEE_CLOSE, {}, calcul, MAINTENANT),
    );
    await dansEtablissement('etab-A', () =>
      withYearCache('summary', ANNEE_CLOSE, {}, calcul, MAINTENANT),
    );

    // Deux calculs seulement : le troisième appel ressert l'entrée de A.
    expect(appels).toBe(2);
  });

  it("refuse de servir hors contexte d'établissement", async () => {
    // Hors requête, `requireEstablishmentId()` lève : mieux vaut une erreur
    // franche qu'une clé sans préfixe, qui serait partagée par tout le monde.
    await expect(
      withYearCache('summary', ANNEE_CLOSE, {}, async () => 1, MAINTENANT),
    ).rejects.toThrow(/établissement/i);
  });
});

// ===========================================================================
// Critères 8.1 à 8.4 — composition de la page d'accueil
// ===========================================================================

describe('Composition de la synthèse (critères 8.1 à 8.4)', () => {
  const RESOLVED = {
    years: [ANNEE_COURANTE, ANNEE_CLOSE],
    year: ANNEE_COURANTE,
    compare: null,
  } as never;

  /** Appelle la vraie fonction, les services de domaine étant doublés. */
  async function synthese(modules: { primary: boolean; secondary: boolean }) {
    return dansEtablissement('etab-A', () => getSummary(RESOLVED, modules));
  }

  it('compose neuf cartes dans un collège (critère 8.1)', async () => {
    const { kpis } = await synthese({ primary: false, secondary: true });

    expect(kpis).toHaveLength(9);
    expect(kpis.map((kpi) => kpi.key)).toEqual([
      'students',
      'newcomers',
      'retention',
      'teachers',
      'collection',
      'outstanding',
      'revenue',
      'success',
      'presence',
    ]);
  });

  it('retire les deux cartes écartées de l’accueil', async () => {
    // « Moyenne générale » et « Compositions organisées » ne figurent plus sur
    // la vue d'ensemble, quel que soit le cycle. Les indicateurs restent
    // calculés : ils vivent sur leurs écrans de détail.
    //
    // « Nouveaux élèves », un temps retirée elle aussi, a été remise : elle
    // reste donc attendue ici, et c'est ce que vérifie le test précédent.
    for (const modules of [
      { primary: false, secondary: true },
      { primary: true, secondary: false },
      { primary: true, secondary: true },
    ]) {
      const { kpis } = await synthese(modules);
      const keys = kpis.map((kpi) => kpi.key);
      expect(keys).not.toContain('average');
      expect(keys).not.toContain('evaluations');
    }
  });

  it('compose huit cartes en école primaire pure (critères 8.1 et 8.2)', async () => {
    const { kpis } = await synthese({ primary: true, secondary: false });

    expect(kpis).toHaveLength(8);
    // La présence n'est pas calculable sans appel par séance : la carte est
    // absente plutôt que remplacée par un indicateur qui dirait autre chose.
    expect(kpis.map((kpi) => kpi.key)).not.toContain('presence');
  });

  it('bascule le taux de réussite entre secondaire et primaire (critère 8.3)', async () => {
    const college = await synthese({ primary: false, secondary: true });
    expect(college.kpis.find((kpi) => kpi.key === 'success')?.source).toBe('SEC-11');

    const primaire = await synthese({ primary: true, secondary: false });
    expect(primaire.kpis.find((kpi) => kpi.key === 'success')?.source).toBe('PRI-09');
  });

  it('privilégie le secondaire quand les deux modules sont actifs', async () => {
    const { kpis } = await synthese({ primary: true, secondary: true });
    expect(kpis.find((kpi) => kpi.key === 'success')?.source).toBe('SEC-11');
    expect(kpis.map((kpi) => kpi.key)).toContain('presence');
  });

  it('renseigne toujours chaque carte, valeur ou état vide (critère 8.1)', async () => {
    const { kpis } = await synthese({ primary: false, secondary: true });
    for (const kpi of kpis) {
      expect(kpi.label).toBeTruthy();
      expect(kpi.source).toMatch(/^(EFF|ENS|FIN|SEC|PRI|ASS)-\d{2}$/);
      // Une carte peut valoir `null` — jamais être absente.
      expect(kpi.metric).toHaveProperty('value');
    }
  });

  it('accentue les cartes selon les seuils de §4.h', async () => {
    const { kpis } = await synthese({ primary: false, secondary: true });
    // Recouvrement à 45 % : sous les deux bandes, donc `danger`.
    expect(kpis.find((kpi) => kpi.key === 'collection')?.accent).toBe('danger');
    // Impayés strictement positifs : `danger` également.
    expect(kpis.find((kpi) => kpi.key === 'outstanding')?.accent).toBe('danger');
    // Taux de réussite à 68,5 %, sous le seuil de 70 % : `warning`.
    expect(kpis.find((kpi) => kpi.key === 'success')?.accent).toBe('warning');
  });

  it('regroupe les seuils d’alerte en un seul endroit (§11-Q9)', () => {
    expect(ALERT.collectionRate).toBe(0.6);
    expect(ALERT.successRate).toBe(0.7);
    expect(ALERT.conductNote).toBe(10);
    expect(ALERT.presenceRate).toBe(0.9);
    expect(ALERT.retentionRate).toBe(0.85);
  });
});
