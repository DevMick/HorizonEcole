import {
  ageAt,
  computeSnapshot,
  type InscriptionRow,
} from '../services/owner/enrollment.service';
import { average, metric, ratio, round, series } from '../services/owner/compare.helper';
import { historyOf, previousYearOf } from '../services/owner/academic-year.helper';

/**
 * Effectifs & scolarité — formules d'agrégation (§10.1) et critères 3.1 à 3.10.
 *
 * Aucune base de données : `computeSnapshot` est une fonction pure, ce qui est
 * précisément la raison pour laquelle l'extraction Prisma et le calcul sont
 * séparés dans le service. Les cas limites — première année, effectif nul,
 * capacité absente — sont testés ici parce que ce sont eux qui produisent, en
 * production, des zéros trompeurs.
 */

let sequence = 0;

function inscription(overrides: Partial<InscriptionRow> = {}): InscriptionRow {
  sequence += 1;
  return {
    studentId: `s-${sequence}`,
    classId: 'c-6A',
    className: '6e A',
    level: '6e',
    cycle: 'SECONDAIRE',
    capacity: null,
    gender: 'M',
    birthYear: 2014,
    status: 'ACTIVE',
    isStateAssigned: false,
    ...overrides,
  };
}

/** Cohorte simple : `count` élèves d'identifiants prévisibles. */
function cohort(ids: string[], overrides: Partial<InscriptionRow> = {}): InscriptionRow[] {
  return ids.map((studentId) => inscription({ studentId, ...overrides }));
}

const YEARS = [
  { id: 'y-2025', name: '2025-2026', startYear: 2025, endYear: 2026, isCurrent: true },
  { id: 'y-2024', name: '2024-2025', startYear: 2024, endYear: 2025, isCurrent: false },
  { id: 'y-2023', name: '2023-2024', startYear: 2023, endYear: 2024, isCurrent: false },
];

// ===========================================================================
// T-CALC-1 — contrat de comparaison
// ===========================================================================

describe('compare.helper — contrat Metric (T-CALC-1)', () => {
  it('rend delta et deltaPct nuls sans année de comparaison', () => {
    expect(metric(120, null)).toEqual({
      value: 120,
      previous: null,
      delta: null,
      deltaPct: null,
      unit: 'count',
    });
  });

  it('rend deltaPct nul quand la valeur précédente est zéro, sans perdre le delta', () => {
    const result = metric(12, 0);
    expect(result.delta).toBe(12);
    // Passer de 0 à 12 n'est pas « +∞ % » : la variation relative n'a pas de sens.
    expect(result.deltaPct).toBeNull();
  });

  it('gère les écarts négatifs', () => {
    const result = metric(80, 100);
    expect(result.delta).toBe(-20);
    expect(result.deltaPct).toBe(-0.2);
  });

  it('propage une valeur absente sans la confondre avec zéro', () => {
    const result = metric(null, 50);
    expect(result.value).toBeNull();
    expect(result.delta).toBeNull();
  });

  it('protège la division : un dénominateur nul rend null, jamais Infinity', () => {
    expect(ratio(5, 0)).toBeNull();
    expect(ratio(5, null)).toBeNull();
    expect(ratio(null, 5)).toBeNull();
    expect(ratio(5, 10)).toBe(0.5);
  });

  it('rend null sur un échantillon vide plutôt que zéro', () => {
    expect(average([])).toBeNull();
    expect(average([10, 20])).toBe(15);
  });

  it('conserve les clés présentes d’un seul côté de la comparaison', () => {
    const result = series(
      new Map([['6e', 30], ['5e', 20]]),
      new Map([['5e', 25], ['4e', 18]]),
      (key) => key,
    );

    const byKey = Object.fromEntries(result.points.map((p) => [p.key, p]));
    // Une classe ouverte cette année existe avec previous = 0…
    expect(byKey['6e']).toMatchObject({ value: 30, previous: 0 });
    // …et une classe fermée reste visible avec value = 0.
    expect(byKey['4e']).toMatchObject({ value: 0, previous: 18 });
    expect(result.total).toBe(50);
  });
});

// ===========================================================================
// T-CALC-12 — âge
// ===========================================================================

describe('Âge (T-CALC-12, critère 3.5)', () => {
  it("se calcule sur l'année de début de l'année scolaire, jamais sur la date du jour", () => {
    expect(ageAt(2025, 2014)).toBe(11);
    // Consulter une année ancienne doit rendre l'âge de l'époque : la valeur ne
    // doit pas bouger avec le calendrier réel.
    expect(ageAt(2019, 2014)).toBe(5);
  });

  it("n'utilise pas Date.now() — la pyramide d'une année close est stable", () => {
    const rows = cohort(['a', 'b'], { birthYear: 2013 });
    const enPremiereLecture = computeSnapshot(rows, 2025, null);
    const enSecondeLecture = computeSnapshot(rows, 2025, null);
    expect(enPremiereLecture.ageDistribution).toEqual(enSecondeLecture.ageDistribution);
    expect([...enPremiereLecture.ageDistribution.entries()]).toEqual([['12', 2]]);
  });
});

// ===========================================================================
// T-CALC-11 — nouveaux vs réinscrits
// ===========================================================================

describe('Nouveaux et réinscrits (T-CALC-11, critères 3.2 et 3.3)', () => {
  it('EFF-08 + EFF-09 = EFF-01 (critère 3.2)', () => {
    const rows = cohort(['a', 'b', 'c', 'd']);
    const snapshot = computeSnapshot(rows, 2025, {
      studentIds: new Set(['a', 'b']),
      total: 3,
    });

    expect(snapshot.total).toBe(4);
    expect(snapshot.newcomers).toBe(2);
    expect(snapshot.returning).toBe(2);
    expect(snapshot.newcomers + snapshot.returning).toBe(snapshot.total);
  });

  it("compte tout le monde comme nouveau la première année, et laisse le taux de réinscription à null (critère 3.3)", () => {
    const snapshot = computeSnapshot(cohort(['a', 'b', 'c']), 2025, null);

    expect(snapshot.newcomers).toBe(3);
    expect(snapshot.returning).toBe(0);
    // `null`, pas `0` : rien n'a pu être fidélisé.
    expect(snapshot.retentionRate).toBeNull();
    // Idem pour les départs : ils ne sont pas mesurables, ils ne sont pas nuls.
    expect(snapshot.departures).toBeNull();
  });

  it('compte les départs comme les élèves de N-1 absents de N (EFF-11)', () => {
    const snapshot = computeSnapshot(cohort(['a', 'b']), 2025, {
      studentIds: new Set(['a', 'x', 'y']),
      total: 3,
    });

    expect(snapshot.departures).toBe(2);
    expect(snapshot.newcomers).toBe(1);
    expect(snapshot.returning).toBe(1);
    expect(snapshot.retentionRate).toBe(round(1 / 3, 4));
  });

  it('ventile nouveaux et réinscrits par niveau', () => {
    const rows = [
      ...cohort(['a', 'b'], { level: '6e' }),
      ...cohort(['c'], { level: '5e', classId: 'c-5A', className: '5e A' }),
    ];
    const snapshot = computeSnapshot(rows, 2025, { studentIds: new Set(['b']), total: 1 });

    expect(snapshot.newcomersByLevel.get('6e')).toBe(1);
    expect(snapshot.returningByLevel.get('6e')).toBe(1);
    expect(snapshot.newcomersByLevel.get('5e')).toBe(1);
  });
});

// ===========================================================================
// Ventilations — critères 3.4, 3.6
// ===========================================================================

describe('Ventilations', () => {
  const rows = [
    ...cohort(['a', 'b'], { level: '6e', classId: 'c-6A', className: '6e A', gender: 'F' }),
    ...cohort(['c'], { level: '6e', classId: 'c-6B', className: '6e B', gender: 'M' }),
    ...cohort(['d', 'e'], { level: '5e', classId: 'c-5A', className: '5e A', gender: 'M' }),
  ];

  it("la somme des effectifs par niveau égale l'effectif total (critère 3.4)", () => {
    const snapshot = computeSnapshot(rows, 2025, null);
    const somme = [...snapshot.byLevel.values()].reduce((total, value) => total + value, 0);
    expect(somme).toBe(snapshot.total);
    expect(snapshot.byLevel.get('6e')).toBe(3);
    expect(snapshot.byLevel.get('5e')).toBe(2);
  });

  it('la somme des effectifs par classe égale aussi le total', () => {
    const snapshot = computeSnapshot(rows, 2025, null);
    const somme = snapshot.classes.reduce((total, aggregate) => total + aggregate.total, 0);
    expect(somme).toBe(5);
    expect(snapshot.classes).toHaveLength(3);
  });

  it('sépare filles et garçons par classe (EFF-05)', () => {
    const snapshot = computeSnapshot(rows, 2025, null);
    const sixiemeA = snapshot.classes.find((aggregate) => aggregate.classId === 'c-6A')!;
    expect(sixiemeA.girls).toBe(2);
    expect(sixiemeA.boys).toBe(0);
    expect(snapshot.byGender.get('F')).toBe(2);
    expect(snapshot.byGender.get('M')).toBe(3);
  });

  it('reconnaît les libellés de sexe non normalisés', () => {
    const snapshot = computeSnapshot(
      [
        inscription({ gender: 'Féminin' }),
        inscription({ gender: 'f' }),
        inscription({ gender: 'Masculin' }),
      ],
      2025,
      null,
    );
    const classe = snapshot.classes[0];
    expect(classe.girls).toBe(2);
    expect(classe.boys).toBe(1);
  });

  it("calcule l'effectif moyen par classe (EFF-18)", () => {
    const snapshot = computeSnapshot(rows, 2025, null);
    expect(snapshot.averagePerClass).toBe(round(5 / 3, 2));
  });

  it('rend null, et non zéro, sur un effectif vide', () => {
    const snapshot = computeSnapshot([], 2025, null);
    expect(snapshot.total).toBe(0);
    expect(snapshot.averagePerClass).toBeNull();
    expect(snapshot.stateAssignedShare).toBeNull();
    expect(snapshot.dropoutRate).toBeNull();
  });

  it("calcule la part d'élèves affectés par l'État (EFF-15)", () => {
    const snapshot = computeSnapshot(
      [
        inscription({ isStateAssigned: true }),
        inscription({ isStateAssigned: true }),
        inscription({ isStateAssigned: false }),
        inscription({ isStateAssigned: false }),
      ],
      2025,
      null,
    );
    expect(snapshot.stateAssignedShare).toBe(0.5);
  });

  it("calcule le taux d'abandon hors diplômés (EFF-13)", () => {
    const snapshot = computeSnapshot(
      [
        inscription({ status: 'ACTIVE' }),
        inscription({ status: 'GRADUATED' }),
        inscription({ status: 'TRANSFERRED' }),
        inscription({ status: 'EXPELLED' }),
      ],
      2025,
      null,
    );
    // GRADUATED est une sortie expliquée : elle ne compte pas comme un abandon.
    expect(snapshot.dropoutRate).toBe(0.5);
    expect(snapshot.byStatus.get('GRADUATED')).toBe(1);
  });
});

// ===========================================================================
// Occupation — critère 3.7
// ===========================================================================

describe('Occupation des classes (EFF-16, EFF-17, critère 3.7)', () => {
  it('laisse occupancy à null quand la capacité est absente', () => {
    const snapshot = computeSnapshot(cohort(['a', 'b'], { capacity: null }), 2025, null);
    const classe = snapshot.classes[0];
    // Surtout pas 0 : une capacité inconnue n'est pas une classe vide.
    expect(classe.occupancy).toBeNull();
    expect(classe.status).toBe('unknown');
  });

  it('classe les effectifs en surcharge, corrects et sous-remplis', () => {
    const surcharge = computeSnapshot(cohort(['a', 'b', 'c'], { capacity: 2 }), 2025, null);
    expect(surcharge.classes[0].occupancy).toBe(1.5);
    expect(surcharge.classes[0].status).toBe('overcrowded');

    const correcte = computeSnapshot(cohort(['a', 'b'], { capacity: 2 }), 2025, null);
    expect(correcte.classes[0].status).toBe('ok');

    const sousRemplie = computeSnapshot(cohort(['a'], { capacity: 10 }), 2025, null);
    expect(sousRemplie.classes[0].occupancy).toBe(0.1);
    expect(sousRemplie.classes[0].status).toBe('underused');
  });

  it('traite une capacité à zéro comme non renseignée', () => {
    const snapshot = computeSnapshot(cohort(['a'], { capacity: 0 }), 2025, null);
    expect(snapshot.classes[0].occupancy).toBeNull();
  });
});

// ===========================================================================
// Confidentialité — critère 3.10
// ===========================================================================

describe('Confidentialité (critère 3.10)', () => {
  it("ne fait transiter aucune donnée nominative dans l'agrégat", () => {
    const snapshot = computeSnapshot(
      [inscription({ level: '6e' }), inscription({ level: '5e' })],
      2025,
      null,
    );
    const serialise = JSON.stringify({
      ...snapshot,
      byLevel: [...snapshot.byLevel],
      byGender: [...snapshot.byGender],
      byStatus: [...snapshot.byStatus],
      ageDistribution: [...snapshot.ageDistribution],
      ageByLevel: [...snapshot.ageByLevel],
      newcomersByLevel: [...snapshot.newcomersByLevel],
      returningByLevel: [...snapshot.returningByLevel],
    });

    for (const champ of ['firstName', 'lastName', 'email', 'phone', 'address', 'dateOfBirth']) {
      expect(serialise).not.toContain(champ);
    }
  });
});

// ===========================================================================
// Référentiel des années — critère 3.9
// ===========================================================================

describe("Référentiel des années", () => {
  it("distingue l'année précédente de l'année de comparaison", () => {
    expect(previousYearOf(YEARS, 'y-2025')?.id).toBe('y-2024');
    expect(previousYearOf(YEARS, 'y-2023')).toBeNull();
    expect(previousYearOf(YEARS, 'inconnue')).toBeNull();
  });

  it("rend au plus N années, par ordre chronologique croissant (critère 3.9)", () => {
    const deux = historyOf(YEARS, 2);
    expect(deux.map((year) => year.id)).toEqual(['y-2024', 'y-2025']);

    const dix = historyOf(YEARS, 10);
    expect(dix).toHaveLength(3);
    expect(dix.map((year) => year.startYear)).toEqual([2023, 2024, 2025]);
  });
});
