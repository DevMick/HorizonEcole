import { describe, expect, it } from 'vitest';
import {
  CYCLES,
  MISE_EN_SERVICE,
  MODULES,
  formaterFcfa,
  formaterMontant,
  type Cycle,
} from './pricing';

/**
 * Montants recopiés à la main depuis docs/grille_tarifaire_horizonecole.pdf, et
 * NON dérivés du module testé — sans quoi le test ne prouverait rien.
 *
 * C'est le lien de traçabilité entre les prix affichés sur le site et le
 * document commercial. Le site ne publie plus ni hébergement, ni forfait
 * d'assistance, ni mise en service payante ; ces tests restent néanmoins la
 * démonstration que la colonne retenue est bien la part logicielle pure de la
 * grille d'origine, et non un chiffre saisi au jugé.
 */
const PUBLIE = {
  // [cloud/an, local/an, part hébergement de la formule associée à la tranche]
  primaire: {
    petit: [280_000, 180_000, 100_000],
    moyen: [420_000, 320_000, 100_000],
    grand: [800_000, 560_000, 240_000],
    'tres-grand': [1_200_000, 880_000, 320_000],
  },
  college: {
    petit: [350_000, 250_000, 100_000],
    moyen: [660_000, 420_000, 240_000],
    grand: [1_000_000, 680_000, 320_000],
    'tres-grand': [1_650_000, 1_100_000, 550_000],
  },
  lycee: {
    petit: [400_000, 300_000, 100_000],
    moyen: [740_000, 500_000, 240_000],
    grand: [1_120_000, 800_000, 320_000],
    'tres-grand': [1_850_000, 1_300_000, 550_000],
  },
} as const satisfies Record<Cycle, Record<string, readonly [number, number, number]>>;

describe('Provenance — le prix affiché est la part logicielle pure de la grille', () => {
  for (const cycle of CYCLES) {
    for (const tranche of MODULES[cycle].tranches) {
      it(`${cycle} / ${tranche.id}`, () => {
        const [cloud, local, hebergement] = PUBLIE[cycle][tranche.id];
        expect(tranche.abonnement).toBe(local);
        // Et l'invariant qui justifie ce choix de colonne : sur les douze
        // lignes de la grille, cloud = logiciel + hébergement.
        expect(tranche.abonnement + hebergement).toBe(cloud);
      });
    }
  }
});

describe('Cohérence des tranches', () => {
  for (const cycle of CYCLES) {
    it(`${cycle} — quatre tranches, bornes et prix strictement croissants`, () => {
      const tranches = MODULES[cycle].tranches;
      expect(tranches).toHaveLength(4);

      for (let i = 1; i < tranches.length; i++) {
        expect(tranches[i].effectifMax).toBeGreaterThan(tranches[i - 1].effectifMax);
        expect(tranches[i].abonnement).toBeGreaterThan(tranches[i - 1].abonnement);
      }
      // La dernière tranche n'a pas de borne : sans cela, un effectif au-delà
      // du dernier palier ne relèverait d'aucune tranche.
      expect(tranches[tranches.length - 1].effectifMax).toBe(Infinity);
    });

    it(`${cycle} — chaque tranche a un libellé d'effectif et une mise en service`, () => {
      for (const tranche of MODULES[cycle].tranches) {
        expect(tranche.libelleEffectif.length).toBeGreaterThan(0);
        expect(MISE_EN_SERVICE[tranche.id]).toBeDefined();
      }
    });
  }
});

describe('La mise en service est offerte', () => {
  it('aucune tranche ne porte de montant', () => {
    for (const m of Object.values(MISE_EN_SERVICE)) {
      expect(m).not.toHaveProperty('montant');
      expect(m.prestations.length).toBeGreaterThan(0);
    }
  });
});

describe('Aucun supplément n’est publié', () => {
  it('le module n’expose plus ni options, ni forfaits, ni remises', async () => {
    // Le site n'affiche plus aucun de ces postes : les exporter encore
    // laisserait croire qu'ils existent, et ils réapparaîtraient un jour dans
    // une page sans que personne ait décidé de les republier.
    const pricing = await import('./pricing');
    for (const disparu of [
      'OPTIONS',
      'PACKS',
      'ASSISTANCES',
      'REMISE_PACK',
      'REMISE_SOLIDAIRE',
      'REMISE_PLURIANNUELLE',
      'REPERES',
      'simuler',
    ]) {
      expect(pricing).not.toHaveProperty(disparu);
    }
  });
});

describe('Format des montants', () => {
  // U+202F explicite : une espace ordinaire dans le littéral rendrait le test
  // faux tout en paraissant juste à la relecture.
  it('sépare les milliers par une espace fine insécable (U+202F)', () => {
    const F = ' ';
    expect(formaterMontant(1_200_000)).toBe(`1${F}200${F}000`);
    expect(formaterFcfa(930_000)).toBe(`930${F}000${F}FCFA`);
  });

  it('formate les montants réellement affichés sur le site', () => {
    for (const cycle of CYCLES) {
      for (const tranche of MODULES[cycle].tranches) {
        expect(formaterMontant(tranche.abonnement)).toMatch(/^[\d ]+$/);
      }
    }
  });
});
