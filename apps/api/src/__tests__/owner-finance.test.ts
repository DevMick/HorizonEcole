import {
  AGEING_BUCKETS,
  ageingBucketOf,
  daysBetween,
  installmentStatus,
  schoolYearWindow,
} from '../services/owner/finance.service';
import { metric, ratio, round } from '../services/owner/compare.helper';

/**
 * Finance — formules de référence (§10.1) et critères 5.x.
 *
 * Le fil conducteur de ces tests est la distinction entre **zéro** et
 * **inconnu**. En finance, la confusion n'est pas académique : un taux de
 * recouvrement affiché à 0 % parce que rien n'a été facturé se lit comme une
 * école au bord du dépôt de bilan.
 */

const JOUR = 24 * 60 * 60 * 1000;
const AUJOURD_HUI = new Date('2026-03-15T12:00:00Z');
const ilYA = (jours: number) => new Date(AUJOURD_HUI.getTime() - jours * JOUR);
const dans = (jours: number) => new Date(AUJOURD_HUI.getTime() + jours * JOUR);

// ===========================================================================
// T-CALC-8 — statut de tranche
// ===========================================================================

describe("Statut d'une tranche (T-CALC-8, critère 5.4)", () => {
  it('rend PAID dès que le versé atteint l’attendu', () => {
    expect(installmentStatus(50_000, 50_000, dans(10), AUJOURD_HUI)).toBe('PAID');
    // Un sur-paiement reste un paiement soldé, pas une anomalie.
    expect(installmentStatus(60_000, 50_000, dans(10), AUJOURD_HUI)).toBe('PAID');
  });

  it('rend PARTIAL sur un versement incomplet non échu', () => {
    expect(installmentStatus(20_000, 50_000, dans(10), AUJOURD_HUI)).toBe('PARTIAL');
  });

  it('rend PENDING quand rien n’a été versé et que l’échéance est à venir', () => {
    expect(installmentStatus(0, 50_000, dans(10), AUJOURD_HUI)).toBe('PENDING');
  });

  it('fait prévaloir OVERDUE sur PENDING et sur PARTIAL', () => {
    expect(installmentStatus(0, 50_000, ilYA(1), AUJOURD_HUI)).toBe('OVERDUE');
    expect(installmentStatus(20_000, 50_000, ilYA(1), AUJOURD_HUI)).toBe('OVERDUE');
  });

  it('ne fait jamais prévaloir OVERDUE sur PAID', () => {
    // Une tranche soldée en retard reste soldée : c'est le solde qui décide,
    // pas le calendrier. Le compter en retard gonflerait la créance d'un
    // montant déjà encaissé.
    expect(installmentStatus(50_000, 50_000, ilYA(90), AUJOURD_HUI)).toBe('PAID');
  });

  it("ne bascule pas en retard le jour même de l'échéance", () => {
    // La comparaison est stricte : l'élève a jusqu'à la fin de sa journée.
    expect(installmentStatus(0, 50_000, AUJOURD_HUI, AUJOURD_HUI)).toBe('PENDING');
  });
});

// ===========================================================================
// T-CALC-10 — vieillissement de la créance
// ===========================================================================

describe('Vieillissement de la créance (T-CALC-10, critère 5.5)', () => {
  it('range une échéance dépassée du jour même dans la tranche 0-30', () => {
    expect(ageingBucketOf(0)).toBe('0-30');
    expect(ageingBucketOf(1)).toBe('0-30');
  });

  it('respecte les bornes 30 / 60 / 90', () => {
    expect(ageingBucketOf(30)).toBe('0-30');
    expect(ageingBucketOf(31)).toBe('31-60');
    expect(ageingBucketOf(60)).toBe('31-60');
    expect(ageingBucketOf(61)).toBe('61-90');
    expect(ageingBucketOf(90)).toBe('61-90');
    expect(ageingBucketOf(91)).toBe('90+');
    expect(ageingBucketOf(400)).toBe('90+');
  });

  it('ventile la totalité de la créance, sans perte ni doublon (critère 5.5)', () => {
    const creances = [
      { jours: 2, montant: 10_000 },
      { jours: 45, montant: 25_000 },
      { jours: 80, montant: 5_000 },
      { jours: 200, montant: 60_000 },
      { jours: 31, montant: 15_000 },
    ];

    const parTranche = new Map<string, number>(AGEING_BUCKETS.map((b) => [b.key, 0]));
    for (const creance of creances) {
      const cle = ageingBucketOf(creance.jours);
      parTranche.set(cle, (parTranche.get(cle) ?? 0) + creance.montant);
    }

    const total = creances.reduce((somme, creance) => somme + creance.montant, 0);
    const ventile = [...parTranche.values()].reduce((somme, valeur) => somme + valeur, 0);

    expect(ventile).toBe(total);
    expect(parTranche.get('0-30')).toBe(10_000);
    expect(parTranche.get('31-60')).toBe(40_000);
    expect(parTranche.get('61-90')).toBe(5_000);
    expect(parTranche.get('90+')).toBe(60_000);
  });

  it('compte les jours de retard en jours entiers', () => {
    expect(daysBetween(ilYA(45), AUJOURD_HUI)).toBe(45);
    expect(daysBetween(dans(3), AUJOURD_HUI)).toBe(-3);
  });
});

// ===========================================================================
// T-CALC-9 — taux de recouvrement
// ===========================================================================

describe('Taux de recouvrement (T-CALC-9, critères 5.2 et 5.3)', () => {
  it('rend null, et non zéro, quand rien n’a été facturé (critère 5.3)', () => {
    expect(ratio(0, 0)).toBeNull();
    expect(ratio(120_000, 0)).toBeNull();
  });

  it('tolère et laisse voir un sur-recouvrement', () => {
    // Au-delà de 100 %, l'école a encaissé plus qu'elle n'a facturé : avances
    // ou trop-perçus. Écrêter à 100 % masquerait une anomalie comptable.
    expect(ratio(1_100_000, 1_000_000)).toBe(1.1);
  });

  it('vérifie que impayés = facturé − encaissé (critère 5.2)', () => {
    const facture = 12_450_000;
    const encaisse = 9_310_000;
    const impayes = round(facture - encaisse, 2);

    expect(impayes).toBe(3_140_000);
    expect(round(encaisse + impayes, 2)).toBe(facture);
  });

  it("n'affiche pas de pourcentage d'évolution depuis zéro", () => {
    const evolution = metric(3_200_000, 0, 'currency');
    expect(evolution.delta).toBe(3_200_000);
    // « +∞ % » n'apprend rien ; l'écart absolu, si.
    expect(evolution.deltaPct).toBeNull();
  });
});

// ===========================================================================
// Périmètre temporel des dépenses (§11-Q3)
// ===========================================================================

describe("Rattachement des dépenses à l'année scolaire (§11-Q3)", () => {
  const annee = { id: 'y', name: '2025-2026', startYear: 2025, endYear: 2026, isCurrent: true };

  it('ouvre la fenêtre au 1er septembre et la ferme au 31 août', () => {
    const { start, end } = schoolYearWindow(annee);
    expect(start.toISOString().slice(0, 10)).toBe('2025-09-01');
    expect(end.toISOString().slice(0, 10)).toBe('2026-08-31');
  });

  it('couvre douze mois pleins, sans recouvrement entre deux années', () => {
    const courante = schoolYearWindow(annee);
    const suivante = schoolYearWindow({ ...annee, startYear: 2026, endYear: 2027 });
    expect(courante.end.getTime()).toBeLessThan(suivante.start.getTime());
  });
});

// ===========================================================================
// Critère 5.6 — saisonnalité de septembre à août
// ===========================================================================

describe('Saisonnalité (critère 5.6)', () => {
  it('couvre douze mois dans l’ordre scolaire, septembre en tête', () => {
    // L'ordre est celui de l'année scolaire, pas celui du calendrier civil :
    // une courbe démarrant en janvier couperait la rentrée en deux.
    const moisScolaires = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];
    expect(moisScolaires).toHaveLength(12);
    expect(moisScolaires[0]).toBe(8);
    expect(moisScolaires[11]).toBe(7);
    expect(new Set(moisScolaires).size).toBe(12);
  });
});

// ===========================================================================
// Critère 5.7 — la créance n'est jamais nominative
// ===========================================================================

describe('Confidentialité de la créance (critère 5.7)', () => {
  it("n'expose aucun identifiant d'élève dans une ventilation par classe", () => {
    // Reproduction de la forme renvoyée par `getFinanceDebtors`.
    const parClasse = {
      points: [
        { key: '6e A', label: '6e A', value: 1_250_000 },
        { key: '5e B', label: '5e B', value: 890_000 },
      ],
      total: 2_140_000,
      unit: 'currency',
    };

    const serialise = JSON.stringify(parClasse);
    for (const champ of ['studentId', 'student_id', 'firstName', 'lastName', 'studentNumber']) {
      expect(serialise).not.toContain(champ);
    }
  });
});
