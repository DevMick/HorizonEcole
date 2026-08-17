import {
  ADMIN_LOCKED_MENU_KEY,
  ALL_MENU_KEYS,
  OWNER_MENU_KEYS,
  menuKeysForSchoolType,
  OWNER_HOME_MENU_KEY,
  ownerMenuKeysForSchoolType,
  PROTECTED_ADMIN_ROLE_NAME,
  PROTECTED_OWNER_ROLE_NAME,
} from '@school/types';

/**
 * Rôle protégé « Propriétaire », créé à l'ouverture de chaque école.
 *
 * Le test qui compte ici est celui de la dérivation du rôle système. Deux rôles
 * protégés cohabitent désormais, et la règle précédente — « protégé donc
 * ADMIN » — aurait donné les pleins droits d'administration au profil qu'on
 * cherche précisément à cantonner à la lecture. C'est une élévation de
 * privilèges silencieuse : le compte fonctionnerait, simplement il verrait tout.
 */

/** Reproduit `systemRoleOf` de `routes/users.ts`. */
function systemRoleOf(
  customRole: { name: string; isProtected: boolean } | null,
  requested: 'ADMIN' | 'ACCOUNTANT' | 'OWNER',
): 'ADMIN' | 'ACCOUNTANT' | 'OWNER' {
  if (!customRole?.isProtected) return requested;
  if (customRole.name === PROTECTED_OWNER_ROLE_NAME) return 'OWNER';
  if (customRole.name === PROTECTED_ADMIN_ROLE_NAME) return 'ADMIN';
  return requested;
}

describe('Dérivation du rôle système depuis le rôle personnalisé', () => {
  it('le rôle protégé « Administrateur » donne ADMIN', () => {
    expect(systemRoleOf({ name: PROTECTED_ADMIN_ROLE_NAME, isProtected: true }, 'ACCOUNTANT')).toBe(
      'ADMIN',
    );
  });

  it('le rôle protégé « Propriétaire » donne OWNER, jamais ADMIN', () => {
    // Le cœur du sujet : sous l'ancienne règle, ce compte serait devenu
    // administrateur de l'école.
    expect(systemRoleOf({ name: PROTECTED_OWNER_ROLE_NAME, isProtected: true }, 'ACCOUNTANT')).toBe(
      'OWNER',
    );
  });

  it('ignore un rôle protégé au nom inattendu plutôt que de lui accorder ADMIN', () => {
    // Un rôle protégé qu'on ne reconnaît pas ne doit rien octroyer : on retombe
    // sur le niveau demandé au formulaire.
    expect(systemRoleOf({ name: 'Direction', isProtected: true }, 'ACCOUNTANT')).toBe('ACCOUNTANT');
  });

  it('laisse le choix du formulaire pour un rôle non protégé', () => {
    expect(systemRoleOf({ name: 'Comptabilité', isProtected: false }, 'ACCOUNTANT')).toBe(
      'ACCOUNTANT',
    );
    expect(systemRoleOf({ name: 'Comptabilité', isProtected: false }, 'OWNER')).toBe('OWNER');
  });

  it("n'exige aucun rôle personnalisé", () => {
    expect(systemRoleOf(null, 'OWNER')).toBe('OWNER');
  });
});

describe('Filtrage des menus accordés au Propriétaire', () => {
  /** Reproduit la branche « rôle Propriétaire » de `allowedMenuKeys`. */
  function retain(requested: string[], schoolType: string): string[] {
    const allowed = new Set(ownerMenuKeysForSchoolType(schoolType));
    const kept = requested.filter((key) => allowed.has(key));
    return kept.includes(OWNER_HOME_MENU_KEY) ? kept : [OWNER_HOME_MENU_KEY, ...kept];
  }

  it('conserve les écrans cochés', () => {
    expect(retain(['/owner', '/owner/finance'], 'COLLEGE')).toEqual(['/owner', '/owner/finance']);
  });

  it('retire les écrans décochés', () => {
    const kept = retain(['/owner', '/owner/finance'], 'COLLEGE');
    expect(kept).not.toContain('/owner/effectifs');
    expect(kept).not.toContain('/owner/resultats');
  });

  it("réinjecte « Vue d'ensemble » si on tente de la décocher", () => {
    // Sans elle, la redirection des adresses inconnues pointerait vers un écran
    // non monté : le propriétaire tournerait en rond après connexion.
    expect(retain(['/owner/finance'], 'COLLEGE')).toEqual(['/owner', '/owner/finance']);
    expect(retain([], 'COLLEGE')).toEqual(['/owner']);
  });

  it("refuse l'assiduité dans une école primaire pure, même cochée", () => {
    const kept = retain(['/owner', '/owner/assiduite', '/owner/resultats'], 'PRIMAIRE');
    expect(kept).not.toContain('/owner/assiduite');
    expect(kept).toContain('/owner/resultats');
  });

  it("refuse tout menu d'administration glissé dans la requête", () => {
    // Garantie côté serveur : l'écran n'en propose pas, mais un appel direct
    // pourrait en soumettre.
    const kept = retain(['/owner', '/people/users', '/dashboard'], 'COLLEGE');
    expect(kept).toEqual(['/owner']);
  });
});

describe("Filtrage des menus accordés à l'Administrateur", () => {
  /** Reproduit la branche « rôle d'administration » de `allowedMenuKeys`. */
  function retain(requested: string[], schoolType: string, roleName: string): string[] {
    const allowed = new Set(menuKeysForSchoolType(schoolType));
    const kept = requested.filter((key) => allowed.has(key));
    if (roleName === PROTECTED_ADMIN_ROLE_NAME && !kept.includes(ADMIN_LOCKED_MENU_KEY)) {
      return [ADMIN_LOCKED_MENU_KEY, ...kept];
    }
    return kept;
  }

  it('retire les écrans décochés du rôle protégé', () => {
    // Le sujet du lot : les menus de « Administrateur » s'éditent désormais.
    const kept = retain(
      ['/dashboard', '/people/roles', '/finance/payments'],
      'COLLEGE',
      PROTECTED_ADMIN_ROLE_NAME,
    );
    expect(kept).toContain('/dashboard');
    expect(kept).not.toContain('/people/students');
  });

  it("réinjecte « Rôles » si on tente de la décocher sur l'Administrateur", () => {
    // Sans cet écran, plus aucun moyen de revenir en arrière par l'interface :
    // l'établissement se retrouverait enfermé dehors.
    expect(retain(['/dashboard'], 'COLLEGE', PROTECTED_ADMIN_ROLE_NAME)).toEqual([
      ADMIN_LOCKED_MENU_KEY,
      '/dashboard',
    ]);
    expect(retain([], 'COLLEGE', PROTECTED_ADMIN_ROLE_NAME)).toEqual([ADMIN_LOCKED_MENU_KEY]);
  });

  it('ne réinjecte rien sur un rôle ordinaire', () => {
    // Un « Secrétariat » sans accès aux rôles reste sans accès aux rôles.
    expect(retain(['/dashboard'], 'COLLEGE', 'Secrétariat')).toEqual(['/dashboard']);
  });

  it("refuse tout écran de pilotage glissé dans la requête", () => {
    const kept = retain(['/dashboard', '/owner', '/owner/finance'], 'COLLEGE', 'Secrétariat');
    expect(kept).toEqual(['/dashboard']);
  });

  it("refuse un menu absent du type d'école", () => {
    const kept = retain(
      ['/people/roles', '/academic/coefficients'],
      'PRIMAIRE',
      PROTECTED_ADMIN_ROLE_NAME,
    );
    expect(kept).not.toContain('/academic/coefficients');
  });
});

describe('Menus du rôle Propriétaire', () => {
  it('couvre les six écrans de l’espace', () => {
    expect(OWNER_MENU_KEYS).toHaveLength(6);
    expect(OWNER_MENU_KEYS.every((key) => key === '/owner' || key.startsWith('/owner/'))).toBe(true);
  });

  it("retire l'assiduité dans une école primaire pure", () => {
    const primaire = ownerMenuKeysForSchoolType('PRIMAIRE');
    expect(primaire).toHaveLength(5);
    expect(primaire).not.toContain('/owner/assiduite');
  });

  it("conserve l'assiduité au collège et au lycée", () => {
    for (const type of ['COLLEGE', 'LYCEE']) {
      expect(ownerMenuKeysForSchoolType(type)).toContain('/owner/assiduite');
    }
  });

  it('accorde le jeu complet sur un type inconnu, sans le tronc primaire', () => {
    // Contrairement aux menus d'administration, il n'y a rien de dangereux à
    // proposer les six écrans : ils sont tous en lecture seule.
    expect(ownerMenuKeysForSchoolType(undefined)).toHaveLength(6);
  });

  it('reste hors du catalogue des menus d’administration', () => {
    // Les verser dans `ALL_MENU_KEYS` donnerait l'espace Propriétaire au rôle
    // Administrateur, et proposerait « Pilotage » comme case à cocher pour un
    // comptable — une case qui ne mènerait nulle part.
    for (const key of OWNER_MENU_KEYS) {
      expect(ALL_MENU_KEYS).not.toContain(key);
      expect(menuKeysForSchoolType('COLLEGE')).not.toContain(key);
      expect(menuKeysForSchoolType('PRIMAIRE')).not.toContain(key);
    }
  });

  it('ne recoupe aucun menu d’administration', () => {
    const administration = new Set(ALL_MENU_KEYS);
    expect(OWNER_MENU_KEYS.filter((key) => administration.has(key))).toEqual([]);
  });
});
