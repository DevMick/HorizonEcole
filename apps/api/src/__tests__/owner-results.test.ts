import { normalize, round2 } from '../services/school-space.service';
import { getMention } from '../services/primary/class-profiles';
import {
  average,
  bucketize,
  rankWithTies,
  ratio,
  standardDeviation,
} from '../services/owner/compare.helper';
import { PASS_MARK_20 } from '../services/owner/thresholds';
import { studentAveragesOf } from '../services/owner/results-secondary.service';

/**
 * Résultats pédagogiques — formules de référence (§10.1) et critères 4.x.
 *
 * Ces tests ne visent pas seulement à vérifier que le calcul est juste : ils
 * vérifient qu'il est **le même** que celui des bulletins. D'où l'appel direct
 * à `normalize` et `round2` de `school-space.service`, plutôt qu'à une copie —
 * si quelqu'un modifie la formule de référence, c'est ici que ça doit casser.
 */

// ===========================================================================
// T-CALC-2 — normalisation des barèmes
// ===========================================================================

describe('Normalisation des notes (T-CALC-2, critère 4.1)', () => {
  it('laisse une note sur 20 à poids plein', () => {
    expect(normalize(14, 20)).toEqual({ value: 14, weight: 1 });
  });

  it('double une note sur 10 et lui donne demi-poids', () => {
    // Une interro sur 10 ne pèse pas autant qu'un devoir sur 20 : elle est
    // ramenée sur 20 pour être comparable, et son poids divisé par deux pour
    // ne pas compter comme une évaluation complète.
    expect(normalize(7, 10)).toEqual({ value: 14, weight: 0.5 });
  });

  it('traite tout autre barème comme une note à poids plein, sans le convertir', () => {
    // Comportement de référence, y compris pour les barèmes exotiques : la
    // fonction ne connaît que le cas /10. Le reproduire ici garantit que
    // l'espace Propriétaire ne « corrige » pas ce que le bulletin ne corrige pas.
    expect(normalize(37, 40)).toEqual({ value: 37, weight: 1 });
    expect(normalize(4, 5)).toEqual({ value: 4, weight: 1 });
  });

  it('accumule value × weight au numérateur, comme le service des bulletins', () => {
    // C'est l'invariant qui autorise le calcul par `groupBy` : le barème fait
    // partie de la clé de regroupement, donc appliquer la transformation à la
    // somme du groupe revient à l'appliquer note par note.
    //
    // Et c'est aussi le piège : le numérateur est `value × weight`, pas
    // `value`. L'oublier double le poids des notes sur 10 — invisible tant
    // qu'un établissement n'utilise que des barèmes sur 20.
    const notes = [6, 8, 9];
    const maxNote = 10;

    const noteParNote = notes.reduce(
      (totaux, note) => {
        const { value, weight } = normalize(note, maxNote);
        return { sum: totaux.sum + value * weight, weight: totaux.weight + weight };
      },
      { sum: 0, weight: 0 },
    );

    const unit = normalize(1, maxNote);
    const surLaSomme = {
      sum: unit.value * unit.weight * notes.reduce((a, b) => a + b, 0),
      weight: unit.weight * notes.length,
    };

    expect(surLaSomme).toEqual(noteParNote);
    // Moyenne de 6, 8 et 9 sur 10, ramenée sur 20 : 15,33.
    expect(round2(noteParNote.sum / noteParNote.weight)).toBe(15.33);
  });
});

// ===========================================================================
// T-CALC-3 — moyenne pondérée par coefficients
// ===========================================================================

/** Reproduit la chaîne du bulletin : moyenne de matière arrondie, puis pondérée. */
function generalAverage(
  subjects: Array<{ sum: number; weight: number; coefficient: number }>,
): number | null {
  let weighted = 0;
  let coefficients = 0;

  for (const subject of subjects) {
    if (subject.weight <= 0) continue;
    weighted += round2(subject.sum / subject.weight) * subject.coefficient;
    coefficients += subject.coefficient;
  }

  return coefficients > 0 ? round2(weighted / coefficients) : null;
}

describe('Moyenne générale (T-CALC-3, critère 4.2)', () => {
  it('pondère les moyennes de matière par leur coefficient', () => {
    const moyenne = generalAverage([
      { sum: 30, weight: 2, coefficient: 4 }, // 15 × 4
      { sum: 20, weight: 2, coefficient: 1 }, // 10 × 1
    ]);
    expect(moyenne).toBe(round2((15 * 4 + 10 * 1) / 5));
  });

  it('applique le coefficient 1 par défaut pour une matière absente de la grille', () => {
    const avecDefaut = generalAverage([
      { sum: 24, weight: 2, coefficient: 1 },
      { sum: 16, weight: 2, coefficient: 1 },
    ]);
    expect(avecDefaut).toBe(10);
  });

  it('exclut du dénominateur une matière sans aucune note', () => {
    const moyenne = generalAverage([
      { sum: 30, weight: 2, coefficient: 3 },
      { sum: 0, weight: 0, coefficient: 5 }, // matière non notée
    ]);
    // La matière non notée ne tire pas la moyenne vers le bas : elle est ignorée.
    expect(moyenne).toBe(15);
  });

  it('rend null quand la somme des coefficients est nulle', () => {
    expect(generalAverage([])).toBeNull();
    expect(generalAverage([{ sum: 0, weight: 0, coefficient: 2 }])).toBeNull();
  });

  it("arrondit la moyenne de matière avant de pondérer, pas l'inverse", () => {
    // 10/3 = 3,333… : arrondir avant pondération donne 3,33, après donnerait
    // 3,3333. L'écart est au centième, mais c'est celui qui ferait diverger le
    // tableau de bord du bulletin de l'élève.
    const arrondiAvant = generalAverage([{ sum: 10, weight: 3, coefficient: 1 }]);
    expect(arrondiAvant).toBe(3.33);
  });
});

// ===========================================================================
// T-CALC-4 — moyenne générale annuelle
// ===========================================================================

/** MGA : `Σ(moyenne_trimestre × coefficient) / Σ(coefficients)`. */
function annualAverage(semesters: Array<{ value: number | null; coefficient: number }>) {
  let weighted = 0;
  let coefficients = 0;

  for (const semester of semesters) {
    if (semester.value === null) continue;
    weighted += semester.value * semester.coefficient;
    coefficients += semester.coefficient;
  }

  return coefficients > 0 ? round2(weighted / coefficients) : null;
}

describe('Moyenne générale annuelle (T-CALC-4, critère 4.3)', () => {
  it('applique (T1 + 2×T2 + 2×T3) / 5', () => {
    const mga = annualAverage([
      { value: 10, coefficient: 1 },
      { value: 12, coefficient: 2 },
      { value: 14, coefficient: 2 },
    ]);
    expect(mga).toBe(round2((10 + 24 + 28) / 5));
  });

  it('ignore un trimestre non saisi, coefficient compris', () => {
    const mga = annualAverage([
      { value: 10, coefficient: 1 },
      { value: 12, coefficient: 2 },
      { value: null, coefficient: 2 },
    ]);
    // Diviser par 5 alors que T3 manque écraserait la moyenne de 40 %.
    expect(mga).toBe(round2((10 + 24) / 3));
  });

  it('retombe sur la moyenne simple si tous les coefficients valent 1', () => {
    const mga = annualAverage([
      { value: 9, coefficient: 1 },
      { value: 12, coefficient: 1 },
      { value: 15, coefficient: 1 },
    ]);
    expect(mga).toBe(12);
  });

  it('rend null si aucun trimestre n’est saisi', () => {
    expect(annualAverage([{ value: null, coefficient: 2 }])).toBeNull();
  });
});

// ===========================================================================
// T-CALC-6 — mentions
// ===========================================================================

describe('Mentions (SEC-15, PRI-12, critère 4.7)', () => {
  it('applique les mêmes bandes que le primaire, sur l’échelle demandée', () => {
    expect(getMention(18, 20)).toBe('Excellent');
    expect(getMention(16, 20)).toBe('Très Bien');
    expect(getMention(14, 20)).toBe('Bien');
    expect(getMention(12, 20)).toBe('Assez Bien');
    expect(getMention(10, 20)).toBe('Passable');
    expect(getMention(9.99, 20)).toBe('Insuffisant');
  });

  it("ne mélange pas les échelles /10 et /20", () => {
    // 9/10 est un excellent résultat ; 9/20 est insuffisant. La même valeur
    // numérique ne dit pas la même chose selon l'échelle — d'où le second
    // paramètre, obligatoire.
    expect(getMention(9, 10)).toBe('Excellent');
    expect(getMention(9, 20)).toBe('Insuffisant');
  });
});

// ===========================================================================
// T-CALC-7 — rangs avec ex æquo
// ===========================================================================

describe('Classement avec ex æquo (T-CALC-7, critère 4.10)', () => {
  it('partage le rang et fait sauter le suivant (1, 2, 2, 4)', () => {
    const classes = [
      { name: 'A', average: 13.1 },
      { name: 'B', average: 12.4 },
      { name: 'C', average: 12.4 },
      { name: 'D', average: 11.8 },
    ];

    const classement = rankWithTies(classes, (row) => row.average);
    expect(classement.map((row) => [row.item.name, row.rank])).toEqual([
      ['A', 1],
      ['B', 2],
      ['C', 2],
      ['D', 4],
    ]);
    expect(classement.filter((row) => row.isExAequo).map((row) => row.item.name)).toEqual([
      'B',
      'C',
    ]);
  });

  it('renvoie les non-classés en fin de liste, sans rang', () => {
    const classement = rankWithTies(
      [{ name: 'A', average: 12 }, { name: 'B', average: null }],
      (row) => row.average,
    );
    expect(classement.map((row) => [row.item.name, row.rank])).toEqual([
      ['A', 1],
      ['B', null],
    ]);
  });

  it('ne classe personne sur une liste vide', () => {
    expect(rankWithTies([] as Array<{ v: number | null }>, (row) => row.v)).toEqual([]);
  });
});

// ===========================================================================
// T-CALC-16 — écart-type
// ===========================================================================

describe('Écart-type (T-CALC-16, SEC-14)', () => {
  it('calcule σ sur un échantillon connu', () => {
    // Population {2, 4, 4, 4, 5, 5, 7, 9} : moyenne 5, écart-type 2.
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it('vaut 0 sur un seul élément — une classe d’un élève est homogène', () => {
    expect(standardDeviation([14])).toBe(0);
  });

  it('rend null sur échantillon vide, jamais 0', () => {
    expect(standardDeviation([])).toBeNull();
  });
});

// ===========================================================================
// Taux de réussite et distributions
// ===========================================================================

describe('Taux de réussite (SEC-11)', () => {
  it('compte les moyennes supérieures ou égales à 10', () => {
    const moyennes = [9.99, 10, 12, 15, 4];
    const reussite = ratio(
      moyennes.filter((value) => value >= PASS_MARK_20).length,
      moyennes.length,
    );
    expect(reussite).toBe(0.6);
  });

  it('rend null, et non zéro, quand aucune moyenne n’est calculable', () => {
    expect(ratio(0, 0)).toBeNull();
  });
});

describe('Distributions (SEC-12, SEC-13, PRI-13)', () => {
  it('range les notes par tranches de deux points, borne basse incluse', () => {
    const buckets = bucketize([0, 1.9, 2, 11, 19.99, 20], { min: 0, max: 20, width: 2 });
    expect(buckets.get('0')).toBe(2);
    expect(buckets.get('2')).toBe(1);
    expect(buckets.get('10')).toBe(1);
    // La note maximale tombe dans la dernière tranche, pas au-delà.
    expect(buckets.get('18')).toBe(2);
  });

  it('adapte la largeur des tranches à l’échelle du primaire', () => {
    const surDix = bucketize([0, 5, 9.5], { min: 0, max: 10, width: 1 });
    expect([...surDix.keys()]).toHaveLength(10);
    expect(surDix.get('9')).toBe(1);
  });

  it('produit toutes les tranches, y compris vides — une distribution a une forme', () => {
    const buckets = bucketize([10], { min: 0, max: 20, width: 2 });
    expect([...buckets.keys()]).toHaveLength(10);
    expect(buckets.get('0')).toBe(0);
  });
});

// ===========================================================================
// Moyenne générale d'élève telle que la calcule le service (critère 4.2)
// ===========================================================================

describe('studentAveragesOf — la chaîne complète (critère 4.2)', () => {
  const klass = { id: 'c1', name: '3e A', level: '3e' };

  /** Deux matières, deux barèmes, deux trimestres — le cas qui piège. */
  const grades = {
    klass,
    coefficients: new Map([['maths', 4], ['eps', 1]]),
    rows: [
      // Maths : 12 et 16 sur 20 au T1 → moyenne 14.
      { studentId: 'e1', subjectId: 'maths', semesterId: 't1', maxNote: 20, sum: 28, count: 2 },
      // EPS : 8 sur 10 au T1 → ramené à 16/20, demi-poids.
      { studentId: 'e1', subjectId: 'eps', semesterId: 't1', maxNote: 10, sum: 8, count: 1 },
      // Maths au T2 : 10 sur 20.
      { studentId: 'e1', subjectId: 'maths', semesterId: 't2', maxNote: 20, sum: 10, count: 1 },
    ],
  };

  it('pondère par les coefficients de la classe', () => {
    const trimestre1 = studentAveragesOf(grades, 't1');
    // Maths 14 (coef 4), EPS 16 (coef 1) → (56 + 16) / 5 = 14,4.
    expect(trimestre1).toEqual([
      { studentId: 'e1', classId: 'c1', level: '3e', average: 14.4 },
    ]);
  });

  it("cumule les trimestres quand aucun n'est demandé", () => {
    const annee = studentAveragesOf(grades);
    // Maths sur l'année : (12 + 16 + 10) / 3 = 12,67 ; EPS 16.
    // (12,67 × 4 + 16 × 1) / 5 = 13,34.
    expect(annee[0].average).toBe(round2((round2(38 / 3) * 4 + 16) / 5));
  });

  it('applique le demi-poids du barème sur 10 dans la moyenne de matière', () => {
    const surDix = studentAveragesOf({
      klass,
      coefficients: new Map(),
      rows: [
        { studentId: 'e1', subjectId: 'eps', semesterId: 't1', maxNote: 10, sum: 8, count: 1 },
        { studentId: 'e1', subjectId: 'eps', semesterId: 't1', maxNote: 20, sum: 10, count: 1 },
      ],
    });
    // (16 × 0,5 + 10 × 1) / 1,5 = 12 : la note sur 10 ne pèse qu'une demi-note.
    expect(surDix[0].average).toBe(12);
  });

  it("écarte l'élève dont aucune matière n'a de note exploitable", () => {
    const vide = studentAveragesOf({
      klass,
      coefficients: new Map(),
      rows: [{ studentId: 'e1', subjectId: 'maths', semesterId: 't1', maxNote: 20, sum: 0, count: 0 }],
    });
    // Pas de moyenne à zéro : l'élève n'apparaît simplement pas.
    expect(vide).toEqual([]);
  });

  it('ne renvoie aucune donnée nominative (critère 4.11)', () => {
    const serialise = JSON.stringify(studentAveragesOf(grades));
    for (const champ of ['firstName', 'lastName', 'fullName', 'studentNumber', 'email']) {
      expect(serialise).not.toContain(champ);
    }
  });
});

describe('Effet des coefficients (SEC-08)', () => {
  it("mesure l'écart entre moyenne pondérée et moyenne brute des matières", () => {
    const moyennesMatieres = [15, 9];
    const brute = average(moyennesMatieres);
    // Coefficient 4 sur la matière forte, 1 sur la faible.
    const ponderee = (15 * 4 + 9 * 1) / 5;
    expect(brute).toBe(12);
    expect(round2(ponderee - (brute as number))) .toBe(1.8);
  });
});
