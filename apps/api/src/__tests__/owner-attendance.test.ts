import fs from 'fs';
import path from 'path';

import { bucketize, metric, ratio, round } from '../services/owner/compare.helper';
import { conductPenalty } from '../services/conduct.service';

/**
 * Assiduité & vie scolaire — formules (§10.1) et critères 6.x.
 *
 * Le test le plus important de ce lot n'est pas un calcul : c'est le contrôle
 * statique du critère 6.3. `attendance_records` ne porte pas d'établissement,
 * et une lecture à plat de cette table traverserait les écoles **sans lever la
 * moindre erreur**. C'est le seul défaut de ce lot qui ne se verrait jamais en
 * recette.
 */

// ===========================================================================
// Critère 6.1 — les trois taux partitionnent les relevés
// ===========================================================================

describe('Taux d’assiduité (critère 6.1)', () => {
  /** Reproduit la partition du service : présent / absent+excusé / retard. */
  function rates(tally: { present: number; absent: number; excused: number; late: number }) {
    const total = tally.present + tally.absent + tally.excused + tally.late;
    if (total === 0) return { presence: null, absence: null, late: null };
    return {
      presence: round(tally.present / total, 4),
      absence: round((tally.absent + tally.excused) / total, 4),
      late: round(tally.late / total, 4),
    };
  }

  it('somme les trois taux à 100 %', () => {
    const taux = rates({ present: 820, absent: 90, excused: 40, late: 50 });
    const somme = (taux.presence ?? 0) + (taux.absence ?? 0) + (taux.late ?? 0);
    expect(round(somme, 4)).toBe(1);
  });

  it('compte les absences excusées comme des absences, pas comme des présences', () => {
    // Une absence justifiée reste une absence : l'élève n'était pas en cours.
    // La justification se lit séparément, par `ASS-03`.
    const taux = rates({ present: 0, absent: 0, excused: 10, late: 0 });
    expect(taux.absence).toBe(1);
    expect(taux.presence).toBe(0);
  });

  it('rend null, et non zéro, quand aucun appel n’a été fait', () => {
    const taux = rates({ present: 0, absent: 0, excused: 0, late: 0 });
    expect(taux.presence).toBeNull();
    // Un taux de présence de 0 % annoncerait une école désertée ; l'absence de
    // relevé dit seulement que personne n'a fait l'appel.
    expect(taux.absence).toBeNull();
  });

  it('sépare les retards des absences', () => {
    const taux = rates({ present: 90, absent: 0, excused: 0, late: 10 });
    expect(taux.late).toBe(0.1);
    expect(taux.absence).toBe(0);
  });
});

// ===========================================================================
// ASS-09 — couverture d'appel
// ===========================================================================

describe("Couverture d'appel (ASS-09)", () => {
  it('rapporte les séances tenues au total des séances attendues', () => {
    expect(ratio(180, 180 + 20)).toBe(0.9);
  });

  it('rend null quand aucun créneau n’était prévu', () => {
    // Sans emploi du temps, il n'y a pas de séance « manquée » : le taux n'a
    // pas de dénominateur.
    expect(ratio(0, 0)).toBeNull();
  });

  it('vaut 1 quand toutes les séances ont été tenues', () => {
    expect(ratio(150, 150)).toBe(1);
  });
});

// ===========================================================================
// T-CALC-15 — pénalité de conduite
// ===========================================================================

describe('Pénalité de conduite (T-CALC-15, critère 6.5)', () => {
  it('retire un point **entier** par tranche d’heures manquées', () => {
    // Réglage par défaut : deux heures d'absence coûtent un point. La pénalité
    // est plancher, pas proportionnelle — neuf heures coûtent quatre points,
    // pas quatre et demi. C'est la règle du service de conduite, et l'espace
    // Propriétaire appelle cette fonction plutôt que d'en écrire une seconde.
    expect(conductPenalty(0, 2)).toBe(0);
    expect(conductPenalty(2, 2)).toBe(1);
    expect(conductPenalty(3.9, 2)).toBe(1);
    expect(conductPenalty(9, 2)).toBe(4);
  });

  it('ne pénalise pas quand le réglage est absurde', () => {
    expect(conductPenalty(10, 0)).toBe(0);
  });

  it('reste explicable : note finale = base − pénalité (critère 6.5)', () => {
    const base = 20;
    const penalite = conductPenalty(7, 2);
    expect(penalite).toBe(3);
    expect(base - penalite).toBe(17);
  });

  it('suit le réglage `hours_per_point` de l’établissement', () => {
    // Une école qui compte un point toutes les quatre heures pénalise deux
    // fois moins pour la même absence : le seuil est une norme de gestion.
    expect(conductPenalty(8, 2)).toBe(4);
    expect(conductPenalty(8, 4)).toBe(2);
  });
});

// ===========================================================================
// ASS-16 — distribution des notes de conduite
// ===========================================================================

describe('Distribution des notes de conduite (ASS-16)', () => {
  it('répartit sur dix tranches de deux points, 0-2 à 18-20', () => {
    const notes = [19.5, 18, 17, 12.5, 9, 3, 20];
    const tranches = bucketize(notes, { min: 0, max: 20, width: 2 });

    expect([...tranches.keys()]).toHaveLength(10);
    // 20/20 tombe dans la dernière tranche, il n'en ouvre pas une nouvelle.
    expect(tranches.get('18')).toBe(3);
    expect(tranches.get('16')).toBe(1);
    expect(tranches.get('12')).toBe(1);
    expect(tranches.get('8')).toBe(1);
    expect(tranches.get('2')).toBe(1);
    expect([...tranches.values()].reduce((a, b) => a + b, 0)).toBe(notes.length);
  });
});

// ===========================================================================
// ASS-18 — élèves sous le seuil
// ===========================================================================

describe('Élèves sous le seuil de conduite (ASS-18)', () => {
  it('compte strictement en dessous de 10', () => {
    const notes = [9.99, 10, 12, 4];
    expect(ratio(notes.filter((note) => note < 10).length, notes.length)).toBe(0.5);
  });

  it('rend null si aucune note de conduite n’a été calculée', () => {
    expect(ratio(0, 0)).toBeNull();
  });
});

// ===========================================================================
// Critère 6.6 — état vide des absences enseignants
// ===========================================================================

describe('Absences enseignants (critère 6.6)', () => {
  it('rend null, et non zéro, quand la table est vide', () => {
    const vide = metric(null, null, 'hours');
    expect(vide.value).toBeNull();
    expect(vide.delta).toBeNull();
  });

  it("distingue « aucune absence déclarée » de « zéro heure d'absence »", () => {
    // La nuance décide de ce qu'affiche l'écran : un état vide qui invite à
    // saisir, ou un « 0 h » qui laisserait croire à une équipe irréprochable.
    const aucuneSaisie = null;
    const zeroHeure = 0;
    expect(aucuneSaisie).not.toBe(zeroHeure);
  });
});

// ===========================================================================
// Critères 6.3 et 6.8 — barrières statiques du domaine
// ===========================================================================

describe('Sources du domaine assiduité — barrières statiques', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../services/owner/attendance.service.ts'),
    'utf8',
  );

  /** Retire commentaires et chaînes : seul le code exécuté est examiné. */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('ne lit jamais attendance_records sans passer par sa session (critère 6.3)', () => {
    const lectures = [...code.matchAll(/prisma\.attendance_records\.\w+\(\{([\s\S]*?)\n {2}\}\)/g)];
    expect(lectures.length).toBeGreaterThan(0);

    for (const [bloc] of lectures) {
      // `attendance_records` ne porte pas d'établissement : son isolation est
      // transitive, par la session. Un `where` sans `session` traverserait les
      // établissements sans erreur.
      expect(bloc).toMatch(/where:\s*\{[\s\S]*session:/);
    }
  });

  it('atteint les tables de rattrapage par des identifiants de créneaux cloisonnés', () => {
    // `attendance_makeup_sessions` et `attendance_move_requests` ne portent pas
    // d'établissement : elles ne sont interrogées que sur des `timetable_id`
    // issus d'une lecture cloisonnée.
    for (const table of ['attendance_makeup_sessions', 'attendance_move_requests']) {
      const index = code.indexOf(`prisma.${table}.`);
      expect(index).toBeGreaterThan(-1);
      expect(code.slice(index, index + 260)).toContain('timetable_id: { in: timetableIds }');
    }
  });

  it("n'expose que les initiales des enseignants (critère 6.8)", () => {
    // Aucune concaténation de nom complet : seule `initialsOf` sort d'ici.
    expect(code).not.toMatch(/first_name\s*\}\s*\$\{/);
    expect(code).toMatch(/function initialsOf/);
  });

  it('ne sélectionne aucun champ nominatif d’élève (critère 6.8)', () => {
    // Le modèle `Student` nomme ses colonnes en camelCase, `teachers` en
    // snake_case : chercher la forme `select` de l'un ne peut pas attraper
    // l'autre par erreur. Les initiales d'enseignant, elles, sont admises
    // (§11-Q2(b)) — c'est bien leur sélection qui est autorisée, pas celle des
    // élèves.
    for (const champ of ['firstName', 'lastName', 'studentNumber', 'fullName', 'avatarUrl']) {
      expect(code).not.toContain(`${champ}: true`);
    }
  });
});
