/**
 * Catalogue des écrans à documenter, dans l'ordre du guide.
 *
 * Le menu d'une école **primaire** est plus court que celui d'un collège :
 * l'application masque Pédagogie, Salles de classe, Liste de présence et
 * Séances non tenues (voir use-app-navigation.tsx). Ce catalogue reflète ce que
 * voit réellement un compte de « Groupe Scolaire les Palmiers ».
 *
 * Règle intangible : aucune action de ce fichier n'écrit en base. On ouvre des
 * formulaires et des panneaux pour les illustrer, jamais le bouton final
 * d'enregistrement.
 *
 * Champs :
 *   cle       identifiant de fichier (capture, légende)
 *   titre     intitulé de l'écran dans le guide
 *   chapitre  regroupement dans le document
 *   chemin    adresse relative à /app
 *   menu      chemin de menu à afficher dans la fiche repère
 *   depuis    (panneaux, fiches) écran d'origine
 *   action    manipulation à faire avant la capture
 *   attendre  sélecteur qui prouve que le contenu est chargé
 */

const PAUSE = 1400;

/** Clique un bouton par son libellé visible. */
function cliquerBouton(nom, { index = 0 } = {}) {
  return async (page) => {
    const cible = page.getByRole('button', { name: nom }).nth(index);
    await cible.waitFor({ state: 'visible', timeout: 15000 });
    await cible.click();
    await page.waitForTimeout(PAUSE);
    return true;
  };
}

/**
 * Clique un onglet. Les onglets portent `role="tab"` : les chercher comme des
 * boutons échoue, le rôle explicite l'emportant sur le rôle implicite.
 */
function cliquerOnglet(nom) {
  return async (page) => {
    const cible = page.getByRole('tab', { name: nom }).first();
    await cible.waitFor({ state: 'visible', timeout: 15000 });
    await cible.click();
    await page.waitForTimeout(PAUSE);
    return true;
  };
}

/** Clique un élément par sélecteur CSS. */
function cliquerSelecteur(selecteur, { index = 0 } = {}) {
  return async (page) => {
    const cible = page.locator(selecteur).nth(index);
    await cible.waitFor({ state: 'visible', timeout: 15000 });
    await cible.click();
    await page.waitForTimeout(PAUSE);
    return true;
  };
}

/**
 * Choisit une valeur dans une liste déroulante Ant Design.
 * Le composant remplace l'élément natif par un rendu maison : on ouvre la
 * liste, puis on clique l'option — impossible de passer par une valeur.
 */
function choisirDansListe(indexListe, { option = 0, texte } = {}) {
  return async (page) => {
    const liste = page.locator('.ant-select').nth(indexListe);
    await liste.waitFor({ state: 'visible', timeout: 15000 });
    await liste.click();
    await page.waitForTimeout(700);
    const options = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
    const choix = texte
      ? options.filter({ hasText: texte }).first()
      : options.nth(option);
    await choix.waitFor({ state: 'visible', timeout: 10000 });
    await choix.click();
    await page.waitForTimeout(PAUSE);
    return true;
  };
}

/**
 * Choisit une valeur dans la liste déroulante portant un libellé donné.
 *
 * Viser par position — « la deuxième liste de l'écran » — casse dès qu'un
 * filtre est ajouté. On vise donc le bloc qui porte l'étiquette, comme le
 * ferait un utilisateur qui lit l'écran.
 */
function choisirParLibelle(libelle, valeur) {
  return async (page) => {
    const bloc = page
      .locator('.ds-field, .ant-form-item')
      .filter({ hasText: new RegExp('^\\s*' + libelle, 'i') })
      .first();
    const liste = bloc.locator('.ant-select').first();
    await liste.waitFor({ state: 'visible', timeout: 15000 });
    await liste.click();
    await page.waitForTimeout(700);
    const options = page.locator(
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
    );
    const choix = valeur ? options.filter({ hasText: valeur }).first() : options.first();
    await choix.waitFor({ state: 'visible', timeout: 10000 });
    await choix.click();
    await page.waitForTimeout(PAUSE);
    return true;
  };
}

/** Enchaîne plusieurs actions. */
function enchainer(...actions) {
  return async (page) => {
    for (const a of actions) await a(page);
    return true;
  };
}

const ECRANS_ADMIN = [
  {
    cle: 'connexion',
    titre: "Se connecter à l'application",
    chapitre: 'Prise en main',
    chemin: '/login',
    menu: '—',
    sansSession: true,
    attendre: 'input',
  },
  {
    cle: 'tableau-de-bord',
    titre: 'Le tableau de bord',
    chapitre: 'Prise en main',
    chemin: '/dashboard',
    menu: 'Tableau de bord',
  },

  // ── Élèves ────────────────────────────────────────────────────────────────
  {
    cle: 'eleves-liste',
    titre: 'La liste des élèves',
    chapitre: 'Les élèves',
    chemin: '/people/students',
    menu: 'Gestion des Personnes › Élèves',
  },
  {
    cle: 'eleves-nouveau',
    titre: "Le formulaire d'un nouvel élève",
    chapitre: 'Les élèves',
    depuis: '/people/students',
    action: cliquerBouton('Nouvel élève'),
    menu: 'Gestion des Personnes › Élèves › Nouvel élève',
  },
  {
    cle: 'eleves-fiche',
    titre: "La fiche d'un élève",
    chapitre: 'Les élèves',
    depuis: '/people/students',
    action: cliquerSelecteur('[aria-label="Voir la fiche"]'),
    menu: 'Gestion des Personnes › Élèves › (icône œil)',
  },

  // ── Parents ───────────────────────────────────────────────────────────────
  {
    cle: 'parents-liste',
    titre: 'La liste des parents',
    chapitre: 'Les parents',
    chemin: '/people/parents',
    menu: 'Gestion des Personnes › Parents',
  },
  {
    cle: 'parents-nouveau',
    titre: "Le formulaire d'un nouveau parent",
    chapitre: 'Les parents',
    depuis: '/people/parents',
    action: cliquerBouton('Nouveau parent'),
    menu: 'Gestion des Personnes › Parents › Nouveau parent',
  },
  {
    cle: 'parents-fiche',
    titre: "La fiche d'un parent",
    chapitre: 'Les parents',
    depuis: '/people/parents',
    action: cliquerSelecteur('[aria-label="Voir la fiche"]'),
    menu: 'Gestion des Personnes › Parents › (icône œil)',
  },

  // ── Enseignants ───────────────────────────────────────────────────────────
  {
    cle: 'enseignants-liste',
    titre: 'La liste des enseignants',
    chapitre: 'Les enseignants',
    chemin: '/people/teachers',
    menu: 'Gestion des Personnes › Enseignants',
  },
  {
    cle: 'enseignants-nouveau',
    titre: "Le formulaire d'un nouvel enseignant",
    chapitre: 'Les enseignants',
    depuis: '/people/teachers',
    action: cliquerBouton('Nouvel enseignant'),
    menu: 'Gestion des Personnes › Enseignants › Nouvel enseignant',
  },
  {
    cle: 'enseignants-fiche',
    titre: "La fiche d'un enseignant",
    chapitre: 'Les enseignants',
    depuis: '/people/teachers',
    action: cliquerSelecteur('.ds-entity-card'),
    menu: 'Gestion des Personnes › Enseignants › (cliquer la carte)',
  },

  // ── Année scolaire ────────────────────────────────────────────────────────
  {
    cle: 'annees-scolaires',
    titre: 'Les années scolaires',
    chapitre: "L'année scolaire",
    chemin: '/academic/years',
    menu: 'Année Académique › Années Scolaires',
  },
  {
    cle: 'annee-detail',
    titre: "Les trimestres d'une année",
    chapitre: "L'année scolaire",
    depuis: '/academic/years',
    action: cliquerBouton('Voir les trimestres'),
    menu: 'Année Académique › Années Scolaires › Voir les trimestres',
  },
  {
    cle: 'inscriptions',
    titre: 'Inscrire des élèves dans une classe',
    chapitre: "L'année scolaire",
    chemin: '/academic/inscriptions',
    menu: 'Année Académique › Inscriptions',
  },
  {
    cle: 'emploi-du-temps',
    titre: "L'emploi du temps — écran d'accueil",
    chapitre: "L'année scolaire",
    chemin: '/academic/timetable',
    menu: 'Année Académique › Emploi du Temps',
  },
  {
    cle: 'emploi-du-temps-classe',
    titre: "L'emploi du temps d'une classe",
    chapitre: "L'année scolaire",
    depuis: '/academic/timetable',
    // CE1 plutôt que la première classe de la liste : c'est la seule qui porte
    // des inscriptions, donc la seule qui montre un écran représentatif.
    action: choisirDansListe(1, { texte: 'CE1' }),
    menu: 'Année Académique › Emploi du Temps › (choisir une classe)',
  },

  // ── École primaire ────────────────────────────────────────────────────────
  {
    cle: 'primaire-classes',
    titre: 'Les classes du primaire',
    chapitre: "L'école primaire",
    chemin: '/primary/classes',
    menu: 'École Primaire › Classes',
  },
  {
    cle: 'primaire-classe-config',
    titre: "La grille de matières et les seuils d'une classe",
    chapitre: "L'école primaire",
    depuis: '/primary/classes',
    action: cliquerBouton('Configurer la grille et les seuils'),
    menu: 'École Primaire › Classes › Configurer la grille et les seuils',
  },
  {
    cle: 'primaire-compositions',
    titre: 'Le calendrier des compositions',
    chapitre: "L'école primaire",
    chemin: '/primary/evaluations',
    menu: 'École Primaire › Compositions',
  },
  {
    cle: 'primaire-composition-creer',
    titre: 'Créer une composition',
    chapitre: "L'école primaire",
    depuis: '/primary/evaluations',
    action: cliquerBouton('Créer une composition'),
    menu: 'École Primaire › Compositions › Créer une composition',
  },
  {
    cle: 'primaire-resultats',
    titre: 'Les résultats d’une composition',
    chapitre: "L'école primaire",
    chemin: '/primary/grades',
    menu: 'École Primaire › Résultats & Bulletins',
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    cle: 'finance-echeanciers',
    titre: 'Les échéanciers de paiement',
    chapitre: 'La finance',
    chemin: '/finance/payment-conditions',
    menu: 'Finance › Échéanciers',
  },
  {
    cle: 'finance-echeancier-nouveau',
    titre: 'Créer un échéancier',
    chapitre: 'La finance',
    depuis: '/finance/payment-conditions',
    action: cliquerBouton('Nouvelle condition'),
    menu: 'Finance › Échéanciers › Nouvelle condition',
  },
  {
    cle: 'finance-paiements',
    titre: 'Le suivi des paiements',
    chapitre: 'La finance',
    chemin: '/finance/payments',
    menu: 'Finance › Paiements',
  },
  {
    cle: 'finance-paiements-classe',
    titre: "Les paiements d'une classe",
    chapitre: 'La finance',
    depuis: '/finance/payments',
    action: choisirDansListe(1, { texte: 'CE1' }),
    menu: 'Finance › Paiements › (choisir une classe)',
  },

  // ── Administration ────────────────────────────────────────────────────────
  {
    cle: 'roles',
    titre: 'Les rôles',
    chapitre: 'Administration',
    chemin: '/people/roles',
    menu: 'Administration › Rôles',
  },
  {
    cle: 'roles-nouveau',
    titre: 'Créer un rôle et choisir ses menus',
    chapitre: 'Administration',
    depuis: '/people/roles',
    action: cliquerBouton('Nouveau rôle'),
    menu: 'Administration › Rôles › Nouveau rôle',
  },
  {
    cle: 'utilisateurs',
    titre: 'Les comptes du personnel',
    chapitre: 'Administration',
    chemin: '/people/users',
    menu: 'Administration › Utilisateurs',
  },
  {
    cle: 'utilisateurs-nouveau',
    titre: 'Créer un compte utilisateur',
    chapitre: 'Administration',
    depuis: '/people/users',
    action: cliquerBouton('Nouvel utilisateur'),
    menu: 'Administration › Utilisateurs › Nouvel utilisateur',
  },
  {
    cle: 'etablissement',
    titre: "La fiche de l'établissement",
    chapitre: 'Administration',
    chemin: '/etablissement',
    menu: 'Administration › Établissement',
  },
];

const ECRANS_ENSEIGNANT = [
  { cle: 'connexion', titre: 'Se connecter', chapitre: 'Prise en main', chemin: '/login', menu: '—', sansSession: true, attendre: 'input' },
  { cle: 'tableau-de-bord', titre: 'Le tableau de bord', chapitre: 'Prise en main', chemin: '/dashboard', menu: 'Tableau de bord' },
  { cle: 'ma-classe', titre: 'Ma Classe', chapitre: 'Ma classe', chemin: '/primary/my-class', menu: 'Ma Classe' },
  { cle: 'eleves', titre: 'Mes élèves', chapitre: 'Ma classe', chemin: '/primary/my-students', menu: 'Élèves', hauteurMax: 1500 },
  { cle: 'saisie-notes', titre: 'La saisie des notes — écran d’accueil', chapitre: 'Les notes', chemin: '/primary/saisie', menu: 'Saisie de Notes' },
  {
    cle: 'saisie-notes-grille',
    titre: 'La grille de saisie d’une composition',
    chapitre: 'Les notes',
    depuis: '/primary/saisie',
    // La grille n'apparaît qu'une fois la composition choisie : sans cette
    // action, la capture ne montrerait que l'invite de sélection.
    action: choisirDansListe(1, { option: 0 }),
    menu: 'Saisie de Notes › choisir une composition',
    hauteurMax: 1500,
  },
  {
    cle: 'saisie-notes-enregistrer',
    titre: 'Enregistrer la saisie',
    chapitre: 'Les notes',
    depuis: '/primary/saisie',
    action: choisirDansListe(1, { option: 0 }),
    // Le bouton d'enregistrement se trouve sous le dernier élève, à plus de
    // 2 300 px du haut : seul un cadrage sur la fin de la page le montre.
    cadrage: 'bas',
    hauteurMax: 900,
    menu: 'Saisie de Notes › bas de la grille',
  },
  { cle: 'resultats', titre: 'Résultats & Bulletins', chapitre: 'Les notes', chemin: '/primary/grades', menu: 'Résultats & Bulletins' },
  { cle: 'bilan-annuel', titre: 'Le bilan annuel', chapitre: 'Les notes', chemin: '/primary/annual-report', menu: 'Bilan Annuel' },
  { cle: 'profil', titre: 'Mon profil', chapitre: 'Mon compte', chemin: '/primary/profile', menu: 'Profil' },
];

const ECRANS_PARENT = [
  { cle: 'connexion', titre: 'Se connecter', chapitre: 'Prise en main', chemin: '/login', menu: '—', sansSession: true, attendre: 'input' },
  { cle: 'espace-famille', titre: "L'Espace Famille", chapitre: 'Prise en main', chemin: '/parent', menu: 'Espace Famille' },
  { cle: 'mes-enfants', titre: 'Mes enfants', chapitre: 'Suivre mon enfant', chemin: '/parent/children', menu: 'Ma famille › Mes enfants' },
  { cle: 'emploi-du-temps', titre: "L'emploi du temps", chapitre: 'Suivre mon enfant', chemin: '/parent/timetable', menu: 'Suivi scolaire › Emploi du Temps' },
  { cle: 'resultats', titre: 'Résultats & Bulletins', chapitre: 'Suivre mon enfant', chemin: '/parent/grades', menu: 'Suivi scolaire › Résultats & Bulletins' },
];

// ════════════════════════════════════════════════════════════════════════════
// Lycée — le menu du secondaire est nettement plus fourni que celui du
// primaire : il ajoute Pédagogie (classes, matières, affectations,
// coefficients, conduite, moyennes complètes), les salles de classe, et le
// suivi de l'assiduité par séance. Le module « École Primaire » disparaît.
// ════════════════════════════════════════════════════════════════════════════

const ECRANS_LYCEE_ADMIN = [
  { cle: 'connexion', titre: 'Se connecter à l’application', chapitre: 'Prise en main', chemin: '/login', menu: '—', sansSession: true, attendre: 'input' },
  { cle: 'tableau-de-bord', titre: 'Le tableau de bord', chapitre: 'Prise en main', chemin: '/dashboard', menu: 'Tableau de bord' },

  // ── Les personnes ─────────────────────────────────────────────────────────
  { cle: 'eleves-liste', titre: 'La liste des élèves', chapitre: 'Les élèves', chemin: '/people/students', menu: 'Gestion des Personnes › Élèves' },
  { cle: 'eleves-nouveau', titre: 'Créer une fiche élève', chapitre: 'Les élèves', depuis: '/people/students', action: cliquerBouton('Nouvel élève'), menu: 'Gestion des Personnes › Élèves › Nouvel élève' },
  { cle: 'eleves-fiche', titre: 'La fiche d’un élève', chapitre: 'Les élèves', depuis: '/people/students', action: cliquerSelecteur('[aria-label="Voir la fiche"]'), menu: 'Gestion des Personnes › Élèves › (icône œil)' },
  { cle: 'parents-liste', titre: 'La liste des parents', chapitre: 'Les parents', chemin: '/people/parents', menu: 'Gestion des Personnes › Parents' },
  { cle: 'parents-fiche', titre: 'La fiche d’un parent', chapitre: 'Les parents', depuis: '/people/parents', action: cliquerSelecteur('[aria-label="Voir la fiche"]'), menu: 'Gestion des Personnes › Parents › (icône œil)' },
  { cle: 'enseignants-liste', titre: 'La liste des enseignants', chapitre: 'Les enseignants', chemin: '/people/teachers', menu: 'Gestion des Personnes › Enseignants' },
  { cle: 'enseignants-fiche', titre: 'La fiche d’un enseignant', chapitre: 'Les enseignants', depuis: '/people/teachers', action: cliquerSelecteur('.ds-entity-card'), menu: 'Gestion des Personnes › Enseignants › (cliquer la carte)' },

  // ── L'année académique ────────────────────────────────────────────────────
  { cle: 'annees-scolaires', titre: 'Les années scolaires', chapitre: 'L’année académique', chemin: '/academic/years', menu: 'Année Académique › Années Scolaires' },
  { cle: 'annee-trimestres', titre: 'Les trimestres de l’année', chapitre: 'L’année académique', depuis: '/academic/years', action: cliquerBouton('Voir les trimestres'), menu: 'Année Académique › Années Scolaires › Voir les trimestres' },
  { cle: 'inscriptions', titre: 'Inscrire des élèves', chapitre: 'L’année académique', chemin: '/academic/inscriptions', menu: 'Année Académique › Inscriptions' },
  { cle: 'salles-de-classe', titre: 'Les salles de classe', chapitre: 'L’année académique', chemin: '/people/classrooms', menu: 'Année Académique › Salles de Classes' },
  { cle: 'emploi-du-temps', titre: 'L’emploi du temps — écran d’accueil', chapitre: 'L’année académique', chemin: '/academic/timetable', menu: 'Année Académique › Emploi du Temps' },
  { cle: 'emploi-du-temps-classe', titre: 'L’emploi du temps de la 6ème A', chapitre: 'L’année académique', depuis: '/academic/timetable', action: choisirDansListe(1, { texte: '6ème A' }), menu: 'Année Académique › Emploi du Temps › (choisir une classe)', hauteurMax: 1800 },

  // ── La pédagogie ──────────────────────────────────────────────────────────
  { cle: 'classes', titre: 'Les classes', chapitre: 'La pédagogie', chemin: '/academic/classes', menu: 'Pédagogie › Classes' },
  { cle: 'matieres', titre: 'Les matières', chapitre: 'La pédagogie', chemin: '/academic/subjects', menu: 'Pédagogie › Matières' },
  { cle: 'affectations', titre: 'Affecter les enseignants aux matières', chapitre: 'La pédagogie', chemin: '/academic/assignments', action: choisirParLibelle('Classe', '6ème A'), menu: 'Pédagogie › Affectations' },
  { cle: 'coefficients', titre: 'Les coefficients', chapitre: 'La pédagogie', chemin: '/academic/coefficients', action: choisirParLibelle('Classe', '6ème A'), menu: 'Pédagogie › Coefficients' },
  { cle: 'notes-par-matiere', titre: 'Les notes par matière', chapitre: 'La pédagogie', chemin: '/academic/class-grades', action: choisirParLibelle('Classe', '6ème A'), menu: 'Pédagogie › Notes par Matière', hauteurMax: 1800 },
  { cle: 'conduite', titre: 'La conduite', chapitre: 'La pédagogie', chemin: '/academic/conduct', action: choisirParLibelle('Classe', '6ème A'), menu: 'Pédagogie › Conduite', hauteurMax: 1800 },
  { cle: 'moyennes-completes', titre: 'Les moyennes complètes', chapitre: 'La pédagogie', chemin: '/academic/complete-averages', action: choisirParLibelle('Classe', '6ème A'), menu: 'Pédagogie › Moyennes Complètes', hauteurMax: 1800 },

  // ── L'assiduité ───────────────────────────────────────────────────────────
  { cle: 'liste-presence', titre: 'La liste de présence', chapitre: 'L’assiduité', chemin: '/academic/attendance', action: choisirParLibelle('Classe', '6ème A'), menu: 'Année Académique › Liste de Présence' },
  { cle: 'seances-non-tenues', titre: 'Les séances non tenues', chapitre: 'L’assiduité', chemin: '/academic/uncalled-sessions', menu: 'Année Académique › Séances non tenues', hauteurMax: 1500 },

  // ── La finance ────────────────────────────────────────────────────────────
  { cle: 'echeanciers', titre: 'Les échéanciers', chapitre: 'La finance', chemin: '/finance/payment-conditions', menu: 'Finance › Échéanciers' },
  { cle: 'paiements', titre: 'Le suivi des paiements', chapitre: 'La finance', chemin: '/finance/payments', menu: 'Finance › Paiements' },
  { cle: 'paiements-classe', titre: 'Les paiements de la 6ème A', chapitre: 'La finance', depuis: '/finance/payments', action: choisirDansListe(1, { texte: '6ème A' }), menu: 'Finance › Paiements › (choisir une classe)', hauteurMax: 1800 },

  // ── L'administration ──────────────────────────────────────────────────────
  { cle: 'roles', titre: 'Les rôles', chapitre: 'L’administration', chemin: '/people/roles', menu: 'Administration › Rôles' },
  { cle: 'roles-nouveau', titre: 'Créer un rôle', chapitre: 'L’administration', depuis: '/people/roles', action: cliquerBouton('Nouveau rôle'), menu: 'Administration › Rôles › Nouveau rôle', hauteurMax: 1800 },
  { cle: 'utilisateurs', titre: 'Les comptes du personnel', chapitre: 'L’administration', chemin: '/people/users', menu: 'Administration › Utilisateurs' },
  { cle: 'utilisateurs-nouveau', titre: 'Créer un compte', chapitre: 'L’administration', depuis: '/people/users', action: cliquerBouton('Nouvel utilisateur'), menu: 'Administration › Utilisateurs › Nouvel utilisateur' },
  { cle: 'etablissement', titre: 'La fiche de l’établissement', chapitre: 'L’administration', chemin: '/etablissement', menu: 'Administration › Établissement' },
];

const ECRANS_LYCEE_ENSEIGNANT = [
  { cle: 'connexion', titre: 'Se connecter', chapitre: 'Prise en main', chemin: '/login', menu: '—', sansSession: true, attendre: 'input' },
  { cle: 'tableau-de-bord', titre: 'Le tableau de bord', chapitre: 'Prise en main', chemin: '/dashboard', menu: 'Tableau de bord' },
  { cle: 'mes-classes', titre: 'Mes classes', chapitre: 'Mon planning', chemin: '/teacher/my-classes', menu: 'Mon Planning › Mes Classes' },
  { cle: 'mon-emploi-du-temps', titre: 'Mon emploi du temps', chapitre: 'Mon planning', chemin: '/teacher/my-timetable', menu: 'Mon Planning › Mon Emploi du Temps', hauteurMax: 1800 },
  { cle: 'liste-presence', titre: 'Faire l’appel', chapitre: 'Mon planning', chemin: '/teacher/attendance', menu: 'Mon Planning › Liste de Présence' },
  {
    cle: 'presence-historique',
    titre: 'L’historique des appels',
    chapitre: 'Mon planning',
    depuis: '/teacher/attendance',
    // L'onglet « Faire l'appel » est vide hors période scolaire : c'est
    // l'historique qui montre le travail réellement fait.
    action: cliquerOnglet('Historique'),
    menu: 'Mon Planning › Liste de Présence › Historique',
    hauteurMax: 1800,
  },
  { cle: 'rattrapage', titre: 'Les séances de rattrapage', chapitre: 'Mon planning', chemin: '/teacher/makeup', menu: 'Mon Planning › Rattrapage', hauteurMax: 1500 },
  { cle: 'types-evaluation', titre: 'Les types d’évaluation', chapitre: 'Les évaluations', chemin: '/evaluations/types', action: enchainer(choisirParLibelle('Classe', '6ème A'), choisirParLibelle('Matière', 'Français')), menu: 'Évaluations › Types d’Évaluation' },
  { cle: 'notes-classements', titre: 'Notes et classements', chapitre: 'Les évaluations', chemin: '/evaluations/grades', action: enchainer(choisirParLibelle('Classe', '6ème A'), choisirParLibelle('Matière', 'Français')), menu: 'Évaluations › Notes & Classements', hauteurMax: 1800 },
  { cle: 'moyennes-trimestre', titre: 'Les moyennes par trimestre', chapitre: 'Les évaluations', chemin: '/evaluations/averages', action: enchainer(choisirParLibelle('Classe', '6ème A'), choisirParLibelle('Matière', 'Français')), menu: 'Évaluations › Moyennes par Trimestre', hauteurMax: 1800 },
];

const ECRANS_LYCEE_PARENT = [
  { cle: 'connexion', titre: 'Se connecter', chapitre: 'Prise en main', chemin: '/login', menu: '—', sansSession: true, attendre: 'input' },
  { cle: 'espace-famille', titre: 'L’Espace Famille', chapitre: 'Prise en main', chemin: '/parent', menu: 'Espace Famille' },
  { cle: 'mes-enfants', titre: 'Mes enfants', chapitre: 'Suivre mon enfant', chemin: '/parent/children', menu: 'Ma famille › Mes enfants' },
  { cle: 'emploi-du-temps', titre: 'L’emploi du temps', chapitre: 'Suivre mon enfant', chemin: '/parent/timetable', menu: 'Suivi scolaire › Emploi du Temps', hauteurMax: 1800 },
  { cle: 'presences', titre: 'Les présences', chapitre: 'Suivre mon enfant', chemin: '/parent/attendance', menu: 'Suivi scolaire › Présences', hauteurMax: 1600 },
  { cle: 'resultats', titre: 'Résultats & Bulletins', chapitre: 'Suivre mon enfant', chemin: '/parent/grades', menu: 'Suivi scolaire › Résultats & Bulletins', hauteurMax: 1800 },
];

const ECRANS_LYCEE_ELEVE = [
  { cle: 'connexion', titre: 'Se connecter', chapitre: 'Prise en main', chemin: '/login', menu: '—', sansSession: true, attendre: 'input' },
  { cle: 'ma-scolarite', titre: 'Ma Scolarité', chapitre: 'Prise en main', chemin: '/student', menu: 'Ma Scolarité' },
  { cle: 'mon-emploi-du-temps', titre: 'Mon emploi du temps', chapitre: 'Mon suivi', chemin: '/student/timetable', menu: 'Mon suivi › Mon Emploi du Temps', hauteurMax: 1800 },
  { cle: 'mes-presences', titre: 'Mes présences', chapitre: 'Mon suivi', chemin: '/student/attendance', menu: 'Mon suivi › Mes Présences' },
  { cle: 'mes-notes', titre: 'Mes notes', chapitre: 'Mon suivi', chemin: '/student/grades', menu: 'Mon suivi › Mes Notes', hauteurMax: 1800 },
  { cle: 'mes-bulletins', titre: 'Mes bulletins', chapitre: 'Mon suivi', chemin: '/student/bulletins', menu: 'Mon suivi › Mes Bulletins' },
];

/**
 * Espace Propriétaire — sept écrans de pilotage, en lecture seule. Les mêmes
 * quel que soit le type d'établissement : le menu owner ne dépend pas du cycle,
 * seul le contenu des écrans s'y adapte.
 */
const ECRANS_OWNER = [
  { cle: 'connexion', titre: 'Se connecter', chapitre: 'Prise en main', chemin: '/login', menu: '—', sansSession: true, attendre: 'input' },
  { cle: 'vue-ensemble', titre: 'La vue d’ensemble', chapitre: 'Prise en main', chemin: '/owner', menu: 'Vue d’ensemble', hauteurMax: 1800 },
  { cle: 'effectifs', titre: 'Les effectifs', chapitre: 'Pilotage', chemin: '/owner/effectifs', menu: 'Pilotage › Effectifs', hauteurMax: 1800 },
  { cle: 'assiduite', titre: 'L’assiduité', chapitre: 'Pilotage', chemin: '/owner/assiduite', menu: 'Pilotage › Assiduité', hauteurMax: 1800 },
  { cle: 'resultats', titre: 'Les résultats', chapitre: 'Pilotage', chemin: '/owner/resultats', menu: 'Pilotage › Résultats', hauteurMax: 1800 },
  { cle: 'enseignants', titre: 'Les enseignants', chapitre: 'Pilotage', chemin: '/owner/enseignants', menu: 'Pilotage › Enseignants', hauteurMax: 1800 },
  { cle: 'finance', titre: 'La finance', chapitre: 'La finance', chemin: '/owner/finance', menu: 'Finance', hauteurMax: 1800 },
];

const PROFILS = {
  admin: { libelle: 'Administrateur', ecrans: ECRANS_ADMIN },
  enseignant: { libelle: 'Enseignant', ecrans: ECRANS_ENSEIGNANT },
  parent: { libelle: 'Parent', ecrans: ECRANS_PARENT },
  'lycee-admin': { libelle: 'Administrateur', ecrans: ECRANS_LYCEE_ADMIN },
  'lycee-enseignant': { libelle: 'Enseignant', ecrans: ECRANS_LYCEE_ENSEIGNANT },
  'lycee-parent': { libelle: 'Parent', ecrans: ECRANS_LYCEE_PARENT },
  'lycee-eleve': { libelle: 'Élève', ecrans: ECRANS_LYCEE_ELEVE },
  'lycee-owner': { libelle: 'Propriétaire', ecrans: ECRANS_OWNER },
};

module.exports = {
  PROFILS,
  cliquerBouton,
  cliquerSelecteur,
  choisirDansListe,
  enchainer,
};
