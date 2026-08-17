/**
 * Contenu rédigé du Guide Administrateur — lycée (6ème → Terminale).
 *
 * Différence majeure avec le primaire : la moyenne se calcule par
 * **coefficients** matière par matière, l'assiduité se tient **séance par
 * séance**, et la conduite en découle automatiquement. Le menu ajoute donc tout
 * un groupe « Pédagogie », les salles de classe et le suivi des appels.
 */

module.exports = {
  meta: {
    titre: 'Guide de l’administrateur',
    sousTitre: 'HorizonEcole — Collège et Lycée',
    etablissement: 'Lycée Moderne de Cocody',
    profil: 'Administrateur',
    version: '1.0',
    adresse: 'http://localhost:5173/app',
    avertissement:
      'Ce guide décrit l’application telle qu’elle se présente à un compte Administrateur ' +
      'dans un établissement du secondaire. Les copies d’écran proviennent du « Lycée Moderne ' +
      'de Cocody », un établissement de démonstration : les élèves, les parents et les ' +
      'enseignants qui y figurent sont fictifs.',
  },

  introduction: {
    titre: 'À qui s’adresse ce guide',
    paragraphes: [
      'Ce guide s’adresse au personnel administratif d’un collège ou d’un lycée : direction, secrétariat, censeur, comptabilité. Il ne suppose aucune connaissance informatique. Les écrans y sont présentés dans l’ordre où vous les rencontrerez au fil d’une année scolaire.',
      'HorizonEcole s’adapte au type de votre établissement. Un lycée reprend les classes du collège : vous pouvez y créer de la 6ème à la Terminale. Les écrans propres à l’école primaire — compositions, moyenne par division — n’apparaissent pas.',
      'Trois mécanismes structurent tout le reste, et il faut les avoir en tête avant de commencer. La **moyenne** d’un élève est la somme de ses moyennes par matière pondérées par les coefficients. L’**assiduité** est relevée séance par séance par les enseignants, à partir de l’emploi du temps. La **conduite** se déduit des heures manquées, sans que personne ait à la saisir.',
      'Chaque copie d’écran porte des pastilles numérotées en rouge, expliquées dans le tableau qui suit l’image. La procédure numérotée donne ensuite l’enchaînement des gestes.',
    ],
    reperes: [
      ['Attention', 'Ce qui casse, ou ce qui ne se rattrape pas facilement.'],
      ['Astuce', 'Le raccourci que connaissent ceux qui utilisent l’application tous les jours.'],
      ['À savoir', 'Ce que fait l’application en coulisse, et qui explique un comportement.'],
    ],
  },

  chapitres: [
    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'Prise en main',
      chapeau:
        'Entrer dans l’application, et comprendre comment son menu est organisé. Ces deux écrans vous serviront tous les jours.',
      sections: [
        {
          ecran: 'connexion',
          titre: 'Se connecter',
          chapeau:
            'La porte d’entrée. Votre compte détermine tout ce qui suit : un administrateur, un enseignant, un parent et un élève se connectent au même endroit et n’arrivent pas au même endroit.',
          fiche: {
            menu: '—',
            adresse: '/app/login',
            profil: 'Tous',
            prerequis: 'Une adresse e-mail et un mot de passe créés à l’ouverture de l’établissement.',
            resultat: 'Vous arrivez sur le tableau de bord de votre établissement.',
          },
          paragraphe:
            'L’écran ne demande que deux informations. Le texte grisé dans les cases est un exemple : il disparaît dès que vous tapez.',
          legendes: [
            { n: 1, selecteur: 'champ=Email', element: 'Champ « Email »', role: 'L’adresse de votre compte. C’est elle qui identifie votre établissement : vous n’avez jamais à le choisir.' },
            { n: 2, selecteur: 'champ=Mot de passe', element: 'Champ « Mot de passe »', role: 'Votre mot de passe. L’icône d’œil barré l’affiche en clair, le temps de vérifier une faute de frappe.' },
            { n: 3, selecteur: 'texte=Se connecter', cote: 'droite', element: 'Bouton « Se connecter »', role: 'Valide la connexion. En cas d’erreur, l’application ne dit jamais lequel des deux champs est faux — c’est volontaire.' },
            { n: 4, selecteur: 'texte=Configurer un établissement', cote: 'bas', element: 'Lien « Configurer un établissement »', role: 'Sert à enregistrer une école qui n’existe pas encore. Votre établissement l’étant déjà, ne l’utilisez pas : vous créeriez un second lycée, vide et séparé du vôtre.' },
          ],
          procedure: [
            'Ouvrez votre navigateur à l’adresse de l’application.',
            'Saisissez l’adresse e-mail de votre compte.',
            'Saisissez votre mot de passe.',
            'Cliquez sur « Se connecter ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Il n’y a pas de lien « Mot de passe oublié ». Seul un administrateur peut réattribuer un mot de passe, depuis Administration › Utilisateurs. Prévoyez toujours au moins deux comptes administrateurs dans l’établissement.',
            },
            {
              type: 'attention',
              titre: 'Le mot de passe d’ouverture',
              texte:
                'À la création de l’établissement, l’application affiche une seule fois un mot de passe provisoire. Changez-le dès votre première connexion, par le menu de votre nom en bas de la barre latérale.',
            },
          ],
        },
        {
          ecran: 'tableau-de-bord',
          titre: 'Le tableau de bord et la barre latérale',
          chapeau:
            'Le tableau de bord donne l’état de l’établissement. Surtout, il vous présente la barre latérale : c’est par elle que vous atteindrez tous les écrans du guide.',
          fiche: {
            menu: 'Tableau de bord',
            adresse: '/app/dashboard',
            profil: 'Administrateur',
            prerequis: 'Être connecté.',
            resultat: 'Vue d’ensemble des effectifs et accès à tous les modules.',
          },
          paragraphe:
            'La barre latérale compte six groupes. L’ordre suit à peu près celui d’une année : on enregistre les personnes, on ouvre l’année, on organise la pédagogie, on encaisse, on administre.',
          legendes: [
            { n: 1, selecteur: '.ds-brand', cote: 'bas', element: 'Bandeau de marque', role: 'Le nom de l’application et, en dessous, celui de votre établissement. Si ce n’est pas le vôtre, vous n’êtes pas sur le bon compte.' },
            { n: 2, selecteur: 'groupe=GESTION DES PERSONNES', element: 'Groupe « Gestion des Personnes »', role: 'Les fiches d’identité : élèves, parents, enseignants. On y crée les personnes ; on ne les affecte pas encore à une classe.' },
            { n: 3, selecteur: 'groupe=ANNÉE ACADÉMIQUE', element: 'Groupe « Année Académique »', role: 'Le cadre de l’année : années scolaires, inscriptions, salles, emploi du temps et suivi des appels.' },
            { n: 4, selecteur: 'groupe=PÉDAGOGIE', element: 'Groupe « Pédagogie »', role: 'Le cœur du secondaire : classes, matières, affectations, coefficients, notes, conduite et moyennes. Ce groupe n’existe pas dans une école primaire.' },
            { n: 5, selecteur: 'input[placeholder*="Rechercher un élève"]', cote: 'bas', element: 'Recherche générale', role: 'Cherche un élève ou une classe dans toute l’application. Le chemin le plus court vers une fiche quand on connaît le nom.' },
            { n: 6, selecteur: 'bloc=Élèves actifs', element: 'Compteurs d’effectifs', role: 'Les effectifs de l’établissement : élèves, enseignants et classes, toutes années confondues.' },
            { n: 7, selecteur: 'bloc=Nouveaux élèves', cote: 'droite', element: 'Panneau « Nouveaux élèves »', role: 'Les dernières fiches créées, avec leur matricule. Pratique pour retrouver une fiche que l’on vient de saisir.' },
            { n: 8, selecteur: '.ds-sidebar-footer', cote: 'droite', element: 'Votre compte', role: 'Votre nom et votre rôle. En cliquant dessus : changement de mot de passe et déconnexion.' },
          ],
          procedure: [
            'Repérez le nom de votre établissement sous « HorizonEcole ».',
            'Parcourez les six groupes de la barre latérale pour situer les modules.',
            'Cliquez sur une entrée pour ouvrir l’écran correspondant ; la barre latérale reste visible.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'La recherche du haut est le chemin le plus court vers une fiche : tapez trois lettres du nom, sans passer par le menu ni par les filtres.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'Les personnes',
      chapeau:
        'Élèves, parents et enseignants. Une fiche est une identité : elle ne dit pas encore dans quelle classe l’élève travaille, ni quelle matière l’enseignant assure. Ces rattachements viennent ensuite, et c’est ce qui évite la plupart des malentendus.',
      sections: [
        {
          ecran: 'eleves-liste',
          titre: 'La liste des élèves',
          chapeau: 'L’écran d’où part tout ce qui concerne les élèves.',
          fiche: {
            menu: 'Gestion des Personnes › Élèves',
            adresse: '/app/people/students',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des élèves inscrits dans l’année sélectionnée.',
          },
          paragraphe:
            'Chaque élève occupe une carte portant son nom, sa classe et trois icônes. Le nombre annoncé sous le titre suit les filtres.',
          legendes: [
            { n: 1, selecteur: 'texte=Nouvel élève', cote: 'gauche', element: 'Bouton « Nouvel élève »', role: 'Ouvre le formulaire de création d’une fiche. Cette action crée une identité, pas une inscription.' },
            { n: 2, selecteur: 'bloc=Inscrits — 2025-2026', cote: 'bas', element: 'Compteur « Inscrits »', role: 'Le nombre d’élèves réellement inscrits dans une classe pour l’année affichée. C’est le chiffre à donner quand on vous demande l’effectif.' },
            { n: 3, selecteur: 'champ=Rechercher', element: 'Case « Rechercher »', role: 'Filtre sur le nom, le matricule ou le contact, dès la troisième lettre.' },
            { n: 4, selecteur: 'champ=Année scolaire', cote: 'bas', element: 'Filtre « Année scolaire »', role: 'Change l’année observée. L’application se place d’elle-même sur l’année en cours.' },
            { n: 5, selecteur: 'champ=Classe', cote: 'bas', element: 'Filtre « Classe »', role: 'Restreint la liste à une classe. Combiné à l’année, c’est ainsi qu’on obtient la liste d’une classe à une date donnée.' },
            { n: 6, selecteur: 'aria=Voir la fiche', cote: 'bas', element: 'Icône œil « Voir la fiche »', role: 'Ouvre la fiche complète : parents rattachés, compte, pièces jointes et paiements.' },
            { n: 7, selecteur: 'aria=Supprimer', cote: 'bas', element: 'Icône corbeille « Supprimer »', role: 'Supprime définitivement la fiche et son historique. Une confirmation est demandée.' },
          ],
          procedure: [
            'Ouvrez Gestion des Personnes › Élèves.',
            'Vérifiez l’année scolaire affichée dans le filtre.',
            'Cherchez l’élève par son nom, ou filtrez sur sa classe.',
            'Cliquez sur l’icône en forme d’œil pour ouvrir sa fiche.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Pour un élève qui quitte l’établissement, ne supprimez pas sa fiche : il suffit de ne pas le réinscrire l’année suivante. Vous conserverez ainsi ses notes et ses bulletins.',
            },
          ],
        },
        {
          ecran: 'eleves-nouveau',
          titre: 'Créer une fiche élève',
          chapeau:
            'Ce formulaire crée l’identité de l’élève. Il ne demande aucune classe : un élève peut être enregistré en juillet et inscrit en septembre.',
          fiche: {
            menu: 'Gestion des Personnes › Élèves › Nouvel élève',
            adresse: '/app/people/students',
            profil: 'Administrateur',
            prerequis: 'Disposer de l’extrait de naissance ou d’une pièce d’identité.',
            resultat: 'Une fiche élève avec son matricule.',
          },
          paragraphe:
            'Contrairement au primaire, le matricule est saisissable : au secondaire, il provient souvent du dossier transmis par l’établissement d’origine.',
          legendes: [
            { n: 1, selecteur: 'champ=Nom', element: 'Champ « Nom »', role: 'Le nom de famille, tel qu’il apparaîtra sur les bulletins et les listes. Soignez les accents dès la saisie.' },
            { n: 2, selecteur: 'champ=Genre', element: 'Liste « Genre »', role: 'Masculin ou Féminin. Alimente la répartition garçons / filles des tableaux de classe.' },
            { n: 3, selecteur: 'champ=Matricule', element: 'Champ « Matricule »', role: 'L’identifiant de l’élève dans l’établissement. Il doit être unique et ne changera plus.' },
            { n: 4, selecteur: 'champ=Né le', element: 'Champ « Né le »', role: 'La date de naissance : statistiques d’âge et documents officiels.' },
            { n: 5, selecteur: 'contient=Affecté de l\'État', cote: 'gauche', element: 'Case « Affecté de l’État »', role: 'À cocher pour un élève affecté par l’État. Cette mention conditionne le traitement de ses frais de scolarité.' },
            { n: 6, selecteur: 'texte=Enregistrer', cote: 'gauche', element: 'Bouton « Enregistrer »', role: 'Crée la fiche. Tant que vous n’avez pas cliqué ici, rien n’est enregistré.' },
          ],
          procedure: [
            'Depuis la liste des élèves, cliquez sur « Nouvel élève ».',
            'Saisissez le nom, le prénom, le genre, le matricule et la naissance.',
            'Cochez « Affecté de l’État » si c’est le cas.',
            'Cliquez sur « Enregistrer ».',
            'Rendez-vous ensuite dans Année Académique › Inscriptions pour placer l’élève dans une classe.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Créer n’est pas inscrire',
              texte:
                'À la fin de ce formulaire, l’élève existe dans l’établissement mais n’appartient à aucune classe. Il n’apparaîtra ni dans les listes de classe, ni dans les notes, ni dans les bulletins tant que vous ne l’aurez pas inscrit. C’est la cause la plus fréquente d’un « élève introuvable ».',
            },
          ],
        },
        {
          ecran: 'eleves-fiche',
          titre: 'La fiche d’un élève',
          chapeau: 'Tout ce que l’établissement sait d’un élève, en cinq onglets.',
          fiche: {
            menu: 'Gestion des Personnes › Élèves › icône œil',
            adresse: '/app/people/students/(identifiant)',
            profil: 'Administrateur',
            prerequis: 'La fiche doit exister.',
            resultat: 'Consultation de l’identité, du compte, des parents, des documents et des paiements.',
          },
          paragraphe:
            'L’onglet « Profil » est ouvert par défaut. L’onglet « Compte » pilote l’accès de l’élève à son espace personnel.',
          legendes: [
            { n: 1, selecteur: 'texte=Profil', cote: 'haut', element: 'Onglet « Profil »', role: 'Matricule, identité, naissance, statut et coordonnées.' },
            { n: 2, selecteur: 'texte=Compte', cote: 'haut', element: 'Onglet « Compte »', role: 'L’accès de l’élève à son espace « Ma Scolarité » : existence du compte et identifiant.' },
            { n: 3, selecteur: 'texte=Parents', cote: 'haut', element: 'Onglet « Parents »', role: 'Les parents rattachés. Si le compteur affiche zéro, aucune famille ne pourra suivre cet élève.' },
            { n: 4, selecteur: 'texte=Paiements', cote: 'haut', element: 'Onglet « Paiements »', role: 'Les versements enregistrés et ce qu’il reste à régler.' },
            { n: 5, selecteur: 'contient=Statut', cote: 'gauche', element: 'Ligne « Statut »', role: 'L’état de la fiche. Un élève actif est un élève dont la scolarité est en cours.' },
          ],
          procedure: [
            'Ouvrez la liste des élèves et cliquez sur l’icône en forme d’œil.',
            'Vérifiez l’identité dans « Profil ».',
            'Ouvrez « Parents » pour retrouver le contact d’un responsable.',
            'Ouvrez « Paiements » pour connaître sa situation financière.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'La ligne « Statut » affiche la valeur technique ACTIVE, en anglais et en majuscules, alors que le reste de l’écran est en français. Lisez-la comme « élève actif ». Ce libellé est signalé pour correction.',
            },
          ],
        },
        {
          ecran: 'parents-liste',
          titre: 'La liste des parents',
          chapeau: 'Le répertoire des responsables. Un parent enregistré, c’est un contact en cas d’urgence et, s’il a un compte, un accès à l’Espace Famille.',
          fiche: {
            menu: 'Gestion des Personnes › Parents',
            adresse: '/app/people/parents',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des parents enregistrés.',
          },
          paragraphe: 'L’écran fonctionne comme celui des élèves : des cartes, une recherche, les mêmes icônes.',
          legendes: [
            { n: 1, selecteur: 'texte=Nouveau parent', cote: 'gauche', element: 'Bouton « Nouveau parent »', role: 'Ouvre le formulaire de création, où l’on rattache aussi le parent à ses enfants.' },
            { n: 2, selecteur: 'bloc=Total parents', cote: 'bas', element: 'Compteur « Total parents »', role: 'Le nombre de parents enregistrés. Il est normalement inférieur au nombre d’élèves : les fratries partagent un parent.' },
            { n: 3, selecteur: 'champ=Rechercher', element: 'Case « Rechercher »', role: 'Filtre sur le nom ou le numéro de téléphone.' },
            { n: 4, selecteur: 'aria=Voir la fiche', cote: 'bas', element: 'Icône œil « Voir la fiche »', role: 'Ouvre la fiche : coordonnées, compte d’accès et enfants rattachés.' },
          ],
          procedure: [
            'Ouvrez Gestion des Personnes › Parents.',
            'Tapez le nom recherché dans la case « Rechercher ».',
            'Cliquez sur l’icône en forme d’œil pour ouvrir la fiche.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Un même parent peut suivre plusieurs enfants. Créez-le une seule fois, puis ajoutez ses enfants sur sa fiche : vous éviterez les doublons qui compliquent l’envoi des accès à l’Espace Famille.',
            },
          ],
        },
        {
          ecran: 'parents-fiche',
          titre: 'La fiche d’un parent',
          chapeau: 'Les coordonnées du parent, son compte et la liste de ses enfants.',
          fiche: {
            menu: 'Gestion des Personnes › Parents › icône œil',
            adresse: '/app/people/parents/(identifiant)',
            profil: 'Administrateur',
            prerequis: 'La fiche du parent doit exister.',
            resultat: 'Consultation des coordonnées et gestion de l’accès à l’Espace Famille.',
          },
          paragraphe: 'L’onglet « Compte » est celui qui intéresse les familles : c’est de là que se pilote leur accès.',
          legendes: [
            { n: 1, selecteur: 'texte=Profil', cote: 'haut', element: 'Onglet « Profil »', role: 'Nom, relation, contact, e-mail et profession.' },
            { n: 2, selecteur: 'texte=Compte', cote: 'haut', element: 'Onglet « Compte »', role: 'L’accès du parent à l’Espace Famille : existence du compte et identifiant de connexion.' },
            { n: 3, selecteur: 'texte=Élèves rattachés', cote: 'haut', element: 'Onglet « Élèves rattachés »', role: 'Les enfants suivis par ce parent. Le chiffre entre parenthèses en donne le nombre.' },
            { n: 4, selecteur: 'contient=Contact', cote: 'gauche', element: 'Ligne « Contact »', role: 'Le numéro à composer en cas d’urgence. L’information la plus utile de la fiche.' },
          ],
          procedure: [
            'Ouvrez la liste des parents et cliquez sur l’icône en forme d’œil.',
            'Vérifiez le contact dans « Profil ».',
            'Ouvrez « Compte » pour savoir si le parent dispose d’un accès.',
            'Ouvrez « Élèves rattachés » pour vérifier que tous ses enfants sont liés.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un parent sans enfant rattaché est un contact orphelin : il n’apparaîtra sur la fiche d’aucun élève et son Espace Famille sera vide.',
            },
          ],
        },
        {
          ecran: 'enseignants-liste',
          titre: 'La liste des enseignants',
          chapeau:
            'Au secondaire, un enseignant assure une matière dans plusieurs classes — l’inverse du primaire, où il assure toutes les matières d’une seule classe.',
          fiche: {
            menu: 'Gestion des Personnes › Enseignants',
            adresse: '/app/people/teachers',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste du personnel enseignant, avec contrat et spécialité.',
          },
          paragraphe: 'Chaque carte porte le nom, l’adresse e-mail, le type de contrat et la matière enseignée.',
          legendes: [
            { n: 1, selecteur: 'texte=Nouvel enseignant', cote: 'gauche', element: 'Bouton « Nouvel enseignant »', role: 'Ouvre le formulaire de création d’une fiche enseignant.' },
            { n: 2, selecteur: 'champ=Rechercher', element: 'Case « Rechercher »', role: 'Filtre sur le nom, l’e-mail ou la spécialité.' },
            { n: 3, selecteur: 'champ=Contrat', cote: 'bas', element: 'Filtre « Contrat »', role: 'Restreint aux CDI, CDD ou vacataires. Utile pour préparer la paie.' },
            { n: 4, selecteur: '.ds-entity-card', cote: 'droite', element: 'Carte d’un enseignant', role: 'Cliquez n’importe où sur la carte pour ouvrir la fiche complète. Les icônes de droite ne servent qu’à modifier ou supprimer.' },
          ],
          procedure: [
            'Ouvrez Gestion des Personnes › Enseignants.',
            'Repérez l’enseignant, au besoin avec la recherche ou le filtre « Contrat ».',
            'Cliquez sur sa carte pour ouvrir sa fiche.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'La matière affichée sur la carte est la spécialité déclarée. Elle ne suffit pas à faire travailler l’enseignant : c’est l’affectation à une classe, au chapitre « La pédagogie », qui lui ouvre la saisie des notes.',
            },
          ],
        },
        {
          ecran: 'enseignants-fiche',
          titre: 'La fiche d’un enseignant',
          chapeau: 'Le dossier de l’enseignant : identité, compte, classes et matières, documents.',
          fiche: {
            menu: 'Gestion des Personnes › Enseignants › cliquer la carte',
            adresse: '/app/people/teachers/(identifiant)',
            profil: 'Administrateur',
            prerequis: 'La fiche doit exister.',
            resultat: 'Consultation du dossier complet.',
          },
          paragraphe: 'L’onglet « Classes & Matières » renseigne sur la charge réelle de l’enseignant.',
          legendes: [
            { n: 1, selecteur: 'texte=Profil', cote: 'haut', element: 'Onglet « Profil »', role: 'Identité, contact, type de contrat et date d’embauche.' },
            { n: 2, selecteur: 'texte=Compte', cote: 'haut', element: 'Onglet « Compte »', role: 'L’accès de l’enseignant à l’application.' },
            { n: 3, selecteur: 'texte=Classes & Matières', cote: 'haut', element: 'Onglet « Classes & Matières »', role: 'Les classes où il intervient et les matières qu’il y assure. C’est le reflet des affectations.' },
            { n: 4, selecteur: 'contient=Type de contrat', cote: 'gauche', element: 'Ligne « Type de contrat »', role: 'CDI, CDD ou vacataire. Sert au suivi du personnel et à la paie.' },
          ],
          procedure: [
            'Ouvrez la liste des enseignants et cliquez sur la carte voulue.',
            'Vérifiez l’identité et le contrat dans « Profil ».',
            'Ouvrez « Classes & Matières » pour connaître sa charge.',
          ],
          encarts: [],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'L’année académique',
      chapeau:
        'Le squelette de tout le reste. L’année porte les trimestres, les trimestres portent les notes ; les inscriptions portent les élèves, l’emploi du temps porte les appels. Une année mal ouverte, et rien ne fonctionne en aval.',
      sections: [
        {
          ecran: 'annees-scolaires',
          titre: 'Les années scolaires',
          chapeau: 'Une seule année est « en cours » à la fois. C’est elle que tous les autres écrans utilisent par défaut.',
          fiche: {
            menu: 'Année Académique › Années Scolaires',
            adresse: '/app/academic/years',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des années, avec celle qui est en cours et son nombre de trimestres.',
          },
          paragraphe: 'La mention sous le titre rappelle en permanence quelle année est active.',
          legendes: [
            { n: 1, selecteur: 'contient=Année en cours : 2025-2026.', cote: 'bas', element: 'Rappel de l’année en cours', role: 'L’année sur laquelle travaille l’application partout ailleurs.' },
            { n: 2, selecteur: 'texte=Nouvelle année', cote: 'gauche', element: 'Bouton « Nouvelle année »', role: 'Crée l’année suivante. À faire une fois par an, avant les inscriptions de la rentrée.' },
            { n: 3, selecteur: 'contient=3 trimestres', cote: 'droite', element: 'Compteur de trimestres', role: 'Le nombre de trimestres définis. Sans trimestre, ni notes ni bulletins ne sont possibles : c’est le premier réglage de l’année.' },
            { n: 4, selecteur: 'texte=Voir les trimestres', cote: 'gauche', element: 'Bouton « Voir les trimestres »', role: 'Ouvre la fenêtre de gestion des trimestres.' },
          ],
          procedure: [
            'Ouvrez Année Académique › Années Scolaires.',
            'Vérifiez que l’année marquée « En cours » est bien l’année de travail.',
            'Contrôlez qu’elle compte bien trois trimestres.',
            'Pour préparer la rentrée suivante, cliquez sur « Nouvelle année ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Ne créez pas une nouvelle année en cours d’année pour « repartir de zéro ». Inscriptions, notes, appels et bulletins sont attachés à une année précise : en changer déplacerait tout votre travail hors de portée des écrans de résultats.',
            },
          ],
        },
        {
          ecran: 'annee-trimestres',
          titre: 'Les trimestres',
          chapeau:
            'Les trimestres découpent l’année. Ils décident du trimestre « actif », que l’application propose partout par défaut — et ce choix se fait sur la date du jour.',
          fiche: {
            menu: 'Année Académique › Années Scolaires › Voir les trimestres',
            adresse: '/app/academic/years',
            profil: 'Administrateur',
            prerequis: 'Une année scolaire doit exister.',
            resultat: 'Trois trimestres, avec leurs dates de début et de fin.',
          },
          paragraphe:
            'La fenêtre s’ouvre par-dessus la liste, qui reste visible en arrière-plan grisé.',
          legendes: [
            { n: 1, selecteur: '.ds-modal-title', cote: 'droite', element: 'Titre de la fenêtre', role: 'Rappelle l’année concernée : les trimestres appartiennent à une année précise, jamais à l’établissement en général.' },
            { n: 2, selecteur: 'texte=Nouveau trimestre', cote: 'gauche', element: 'Bouton « Nouveau trimestre »', role: 'Ajoute un trimestre avec sa date de début et sa date de fin.' },
            { n: 3, selecteur: 'texte=Fermer', cote: 'gauche', element: 'Bouton « Fermer »', role: 'Referme la fenêtre et revient à la liste des années.' },
          ],
          procedure: [
            'Depuis la liste des années, cliquez sur « Voir les trimestres ».',
            'Cliquez sur « Nouveau trimestre ».',
            'Renseignez le libellé et les dates de début et de fin.',
            'Répétez pour les trois trimestres, puis fermez.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Les dates décident du trimestre actif',
              texte:
                'L’application déduit le trimestre « actif » de la date du jour. Des dates fausses, et les écrans de saisie s’ouvriront sur le mauvais trimestre — les enseignants saisiraient leurs notes au mauvais endroit. Vérifiez-les à l’ouverture de l’année.',
            },
          ],
        },
        {
          ecran: 'inscriptions',
          titre: 'Inscrire des élèves dans une classe',
          chapeau: 'L’acte central de la rentrée. C’est ici — et nulle part ailleurs — qu’un élève entre dans une classe pour une année donnée.',
          fiche: {
            menu: 'Année Académique › Inscriptions',
            adresse: '/app/academic/inscriptions',
            profil: 'Administrateur',
            prerequis: 'Les fiches élèves et les classes doivent exister.',
            resultat: 'Les élèves apparaissent dans la classe, les listes, les notes et les bulletins.',
          },
          paragraphe: 'L’écran tient en deux champs. Le premier accepte plusieurs élèves : on inscrit une classe entière en une opération.',
          legendes: [
            { n: 1, selecteur: 'contient=Inscrivez un ou plusieurs élèves dans une classe pour l\'année 2025-2026 (en cours).', cote: 'bas', element: 'Rappel de l’année visée', role: 'L’année dans laquelle l’inscription sera enregistrée. Vérifiez-la : c’est l’erreur la plus coûteuse de cet écran.' },
            { n: 2, selecteur: 'champ=Élève', element: 'Champ « Élève »', role: 'Recherchez les élèves par leur nom et ajoutez-les un à un. Le champ en accepte plusieurs.' },
            { n: 3, selecteur: 'champ=Classe', element: 'Champ « Classe »', role: 'La classe d’accueil. Tous les élèves sélectionnés y seront inscrits ensemble.' },
            { n: 4, selecteur: 'texte=Inscrire', cote: 'gauche', element: 'Bouton « Inscrire »', role: 'Enregistre les inscriptions. À partir de cet instant, les élèves appartiennent à la classe pour toute l’année.' },
            { n: 5, selecteur: 'texte=Réinitialiser', cote: 'haut', element: 'Bouton « Réinitialiser »', role: 'Vide les deux champs sans rien enregistrer, pour enchaîner sur une autre classe.' },
          ],
          procedure: [
            'Ouvrez Année Académique › Inscriptions.',
            'Lisez la phrase sous le titre et vérifiez l’année indiquée.',
            'Dans « Élève », tapez le nom d’un élève et sélectionnez-le ; répétez pour toute la classe.',
            'Dans « Classe », choisissez la classe d’accueil.',
            'Cliquez sur « Inscrire ».',
            'Contrôlez dans Gestion des Personnes › Élèves en filtrant sur la classe.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'À la rentrée, procédez classe par classe : sélectionnez tous les élèves d’une même classe, choisissez-la, puis « Inscrire ». Quelques opérations suffisent pour tout l’établissement.',
            },
          ],
        },
        {
          ecran: 'salles-de-classe',
          titre: 'Les salles de classe',
          chapeau:
            'Les salles servent à l’emploi du temps : chaque créneau peut en désigner une. Cet écran n’existe pas dans une école primaire, où la classe et la salle se confondent.',
          fiche: {
            menu: 'Année Académique › Salles de Classes',
            adresse: '/app/people/classrooms',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des salles disponibles pour l’emploi du temps.',
          },
          paragraphe: 'Une salle porte un nom et une capacité. C’est volontairement minimal.',
          legendes: [
            { n: 1, selecteur: 'texte=Nouvelle salle', cote: 'gauche', element: 'Bouton « Nouvelle salle »', role: 'Ajoute une salle : son nom et sa capacité.' },
            { n: 2, selecteur: 'champ=Rechercher', element: 'Case « Rechercher »', role: 'Filtre les salles par leur nom.' },
            { n: 3, selecteur: 'aria=Modifier', cote: 'bas', element: 'Icône crayon « Modifier »', role: 'Corrige le nom ou la capacité d’une salle.' },
          ],
          procedure: [
            'Ouvrez Année Académique › Salles de Classes.',
            'Cliquez sur « Nouvelle salle ».',
            'Renseignez le nom et la capacité, puis enregistrez.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'Créez toutes vos salles avant de bâtir les emplois du temps : la liste des salles est proposée à chaque créneau, et il est fastidieux de revenir en arrière.',
            },
          ],
        },
        {
          ecran: 'emploi-du-temps',
          titre: 'L’emploi du temps — écran d’accueil',
          chapeau: 'L’écran s’ouvre volontairement vide : il attend que vous lui disiez de quelle classe vous parlez.',
          fiche: {
            menu: 'Année Académique › Emploi du Temps',
            adresse: '/app/academic/timetable',
            profil: 'Administrateur',
            prerequis: 'Une année scolaire et au moins une classe.',
            resultat: 'La grille horaire de la classe choisie.',
          },
          paragraphe: 'Deux listes déroulantes et un message qui explique ce qu’il attend. Ce n’est pas une panne.',
          legendes: [
            { n: 1, selecteur: 'champ=Année scolaire', cote: 'bas', element: 'Liste « Année scolaire »', role: 'L’année dont on veut voir l’emploi du temps, pré-remplie sur l’année en cours.' },
            { n: 2, selecteur: 'champ=Classe', cote: 'bas', element: 'Liste « Classe »', role: 'La classe à afficher. Tant qu’aucune classe n’est choisie, la grille reste masquée.' },
            { n: 3, selecteur: 'contient=Choisissez une année scolaire et une classe pour gérer son emploi du temps.', cote: 'bas', element: 'Message d’attente', role: 'Rappelle ce qu’il manque pour afficher la grille.' },
          ],
          procedure: [
            'Ouvrez Année Académique › Emploi du Temps.',
            'Vérifiez l’année scolaire.',
            'Choisissez une classe : la grille apparaît aussitôt.',
          ],
          encarts: [],
        },
        {
          ecran: 'emploi-du-temps-classe',
          titre: 'La grille horaire d’une classe',
          chapeau:
            'La semaine de la classe. C’est le document le plus structurant de l’application : l’appel des enseignants en découle, et donc la conduite des élèves.',
          fiche: {
            menu: 'Année Académique › Emploi du Temps › choisir une classe',
            adresse: '/app/academic/timetable',
            profil: 'Administrateur',
            prerequis: 'Une classe, des matières affectées, des enseignants et des salles.',
            resultat: 'Un emploi du temps consultable par les enseignants, les familles et les élèves.',
          },
          paragraphe:
            'L’écran se lit de haut en bas : qui est professeur principal, ce qu’on ajoute, puis la grille obtenue.',
          legendes: [
            { n: 1, selecteur: 'contient=Professeur principal', cote: 'droite', element: 'Bloc « Professeur principal »', role: 'Désigne le professeur principal de la classe. Il apparaîtra sur les bulletins et sert de référent aux familles.' },
            { n: 2, selecteur: 'contient=Créneaux à créer', cote: 'droite', element: 'Bloc « Créneaux à créer »', role: 'La zone de préparation : on y compose un ou plusieurs créneaux avant de les enregistrer d’un bloc. Rien n’est encore inscrit dans la grille à ce stade.' },
            { n: 3, selecteur: 'champ=Matière', cote: 'bas', element: 'Liste « Matière »', role: 'La matière du créneau. Seules les matières affectées à la classe sont proposées.' },
            { n: 4, selecteur: 'champ=Salle (optionnel)', cote: 'bas', element: 'Liste « Salle »', role: 'La salle où se tient le cours. Facultative, mais utile aux élèves comme aux surveillants.' },
            { n: 5, selecteur: 'texte=Ajouter un créneau', cote: 'droite', element: 'Bouton « Ajouter un créneau »', role: 'Ajoute une ligne de préparation supplémentaire, pour enchaîner plusieurs créneaux avant d’enregistrer.' },
          ],
          procedure: [
            'Choisissez la classe dans la liste du haut.',
            'Désignez le professeur principal, puis enregistrez ce bloc.',
            'Dans « Créneaux à créer », choisissez le jour, l’horaire, la matière, l’enseignant et la salle.',
            'Cliquez sur « Ajouter un créneau » pour préparer les suivants.',
            'Cliquez sur le bouton « Enregistrer les … créneaux » pour tout inscrire dans la grille.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'L’emploi du temps commande l’appel',
              texte:
                'Chaque créneau devient une séance à appeler pour l’enseignant concerné. Un emploi du temps incomplet donne des appels manquants ; un emploi du temps trop généreux fait apparaître des centaines de « séances non tenues ». Bâtissez-le au plus près de la réalité.',
            },
            {
              type: 'astuce',
              texte:
                'Préparez plusieurs créneaux avant d’enregistrer : le bouton d’enregistrement indique combien seront inscrits d’un coup. C’est bien plus rapide que créneau par créneau.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'La pédagogie',
      chapeau:
        'Le groupe propre au secondaire. On y définit les classes et les matières, on affecte les matières aux classes, on leur donne un coefficient — et l’on obtient, à l’autre bout, les moyennes et les bulletins. L’ordre de ce chapitre est celui dans lequel il faut procéder.',
      sections: [
        {
          ecran: 'classes',
          titre: 'Les classes',
          chapeau: 'De la 6ème à la Terminale. Chaque classe porte un nom, un cycle et une grille de matières.',
          fiche: {
            menu: 'Pédagogie › Classes',
            adresse: '/app/academic/classes',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des classes et le nombre de matières de chacune.',
          },
          paragraphe:
            'Le bouton « Générer les classes » crée d’un coup les classes habituelles du cycle, plutôt que de les saisir une par une.',
          legendes: [
            { n: 1, selecteur: 'texte=Générer les classes', cote: 'gauche', element: 'Bouton « Générer les classes »', role: 'Crée en une fois les classes standard de l’établissement. Le moyen le plus rapide d’ouvrir une année.' },
            { n: 2, selecteur: 'contient=Secondaire', cote: 'droite', element: 'Étiquette de cycle', role: 'Le cycle de la classe. Dans un lycée qui reprend le collège, toutes les classes de la 6ème à la Terminale sont du secondaire.' },
            { n: 3, selecteur: 'contient=8 matières', cote: 'droite', element: 'Étiquette « … matières »', role: 'Le nombre de matières affectées à la classe. À zéro, aucune note ne pourra y être saisie.' },
            { n: 4, selecteur: 'champ=Rechercher', element: 'Case « Rechercher »', role: 'Filtre les classes par leur nom.' },
          ],
          procedure: [
            'Ouvrez Pédagogie › Classes.',
            'Cliquez sur « Générer les classes » pour créer les classes du cycle, ou créez-les une à une.',
            'Vérifiez que chaque classe affiche bien un nombre de matières.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Une classe sans matière est une coquille vide : ni notes, ni moyennes, ni bulletins. Après avoir créé vos classes, passez immédiatement par « Affectations ».',
            },
          ],
        },
        {
          ecran: 'matieres',
          titre: 'Les matières',
          chapeau:
            'Le catalogue des disciplines de l’établissement. Une matière y est créée une seule fois, puis affectée aux classes qui l’enseignent.',
          fiche: {
            menu: 'Pédagogie › Matières',
            adresse: '/app/academic/subjects',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'Le catalogue des matières, avec leur code.',
          },
          paragraphe:
            'Chaque matière porte un nom complet et un code court. Le code est ce qui apparaît dans les grilles serrées — emploi du temps, tableaux de notes.',
          legendes: [
            { n: 1, selecteur: 'texte=Nouvelle matière', cote: 'gauche', element: 'Bouton « Nouvelle matière »', role: 'Ajoute une discipline au catalogue de l’établissement.' },
            { n: 2, selecteur: 'champ=Rechercher', element: 'Case « Rechercher »', role: 'Filtre sur le nom ou le code.' },
            { n: 3, selecteur: 'contient=FRA', cote: 'droite', element: 'Code de la matière', role: 'L’abréviation affichée dans les tableaux étroits. Choisissez-la courte et sans ambiguïté.' },
          ],
          procedure: [
            'Ouvrez Pédagogie › Matières.',
            'Cliquez sur « Nouvelle matière ».',
            'Saisissez le nom complet et un code court.',
            'Répétez pour toutes les disciplines de l’établissement.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Le catalogue est commun à tout l’établissement : « Français » n’existe qu’une fois, même s’il est enseigné de la 6ème à la Terminale. C’est l’affectation qui décide des classes concernées, et le coefficient qui décide de son poids.',
            },
          ],
        },
        {
          ecran: 'affectations',
          titre: 'Affecter les matières à une classe',
          chapeau:
            'L’étape qui relie le catalogue des matières aux classes. Sans elle, une classe n’a aucun programme et aucune note n’est possible.',
          fiche: {
            menu: 'Pédagogie › Affectations',
            adresse: '/app/academic/assignments',
            profil: 'Administrateur',
            prerequis: 'Les classes et les matières doivent exister.',
            resultat: 'La liste des matières enseignées dans la classe.',
          },
          paragraphe:
            'On choisit une classe, on coche ses matières, on enregistre. Le compteur « 8 / 8 sélectionnées » indique où l’on en est.',
          legendes: [
            { n: 1, selecteur: 'champ=Classe', cote: 'bas', element: 'Liste « Classe »', role: 'La classe dont on règle le programme. Le nombre de matières déjà affectées est rappelé entre parenthèses.' },
            { n: 2, selecteur: 'contient=sélectionnées', cote: 'gauche', element: 'Compteur de sélection', role: 'Combien de matières sont cochées sur le total du catalogue. Le contrôle le plus rapide.' },
            { n: 3, selecteur: 'texte=Tout', cote: 'haut', element: 'Boutons « Tout » et « Aucune »', role: 'Cochent ou décochent toutes les matières d’un coup. Pratique pour partir d’un programme complet et retirer les exceptions.' },
            { n: 4, selecteur: 'champ=Français · FRA', cote: 'droite', element: 'Case d’une matière', role: 'Coche la matière pour cette classe. Elle deviendra alors disponible dans l’emploi du temps, les coefficients et les notes.' },
            { n: 5, selecteur: 'texte=Enregistrer', cote: 'gauche', element: 'Bouton « Enregistrer »', role: 'Applique le programme à la classe. Tant que vous n’avez pas cliqué, rien n’est enregistré.' },
          ],
          procedure: [
            'Ouvrez Pédagogie › Affectations.',
            'Choisissez la classe à régler.',
            'Cochez les matières qu’elle suit, ou cliquez sur « Tout » puis retirez les exceptions.',
            'Vérifiez le compteur de sélection.',
            'Cliquez sur « Enregistrer », puis passez aux coefficients.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Retirer une matière d’une classe en cours d’année rend inaccessibles les notes déjà saisies dans cette matière. Ne le faites qu’en connaissance de cause.',
            },
          ],
        },
        {
          ecran: 'coefficients',
          titre: 'Les coefficients',
          chapeau:
            'Le poids de chaque matière dans la moyenne générale. C’est le réglage qui distingue le secondaire du primaire, et celui qui décide du classement des élèves.',
          fiche: {
            menu: 'Pédagogie › Coefficients',
            adresse: '/app/academic/coefficients',
            profil: 'Administrateur',
            prerequis: 'Les matières doivent être affectées à la classe.',
            resultat: 'Un coefficient par matière, pour la classe choisie.',
          },
          paragraphe:
            'Un tableau à deux colonnes : la matière, son coefficient. Les coefficients sont propres à chaque classe — le français ne pèse pas le même poids en 6ème et en Terminale littéraire.',
          legendes: [
            { n: 1, selecteur: 'champ=Classe', cote: 'bas', element: 'Liste « Classe »', role: 'La classe dont on règle les coefficients. Chaque classe a les siens.' },
            { n: 2, selecteur: 'contient=Éducation Civique et Morale', cote: 'gauche', element: 'Colonne des matières', role: 'Les matières affectées à la classe. Une matière absente d’ici n’a pas été affectée : revenez à l’écran « Affectations ».' },
            { n: 3, selecteur: 'aria=Coefficient de Français', cote: 'gauche', element: 'Champ « Coefficient »', role: 'Le poids de la matière dans la moyenne générale. Une matière à coefficient 4 compte quatre fois plus qu’une matière à coefficient 1.' },
            { n: 4, selecteur: 'texte=Enregistrer', cote: 'gauche', element: 'Bouton « Enregistrer »', role: 'Applique les coefficients. Les moyennes générales sont aussitôt recalculées.' },
          ],
          procedure: [
            'Ouvrez Pédagogie › Coefficients.',
            'Choisissez la classe.',
            'Saisissez le coefficient de chaque matière.',
            'Cliquez sur « Enregistrer ».',
          ],
          encarts: [
            {
              type: 'savoir',
              titre: 'Comment la moyenne générale est calculée',
              texte:
                'Pour chaque matière, l’application calcule d’abord une moyenne à partir des notes et de leurs propres coefficients d’évaluation. Elle multiplie ensuite chaque moyenne par le coefficient de la matière, additionne le tout, et divise par la somme des coefficients. La conduite entre dans ce calcul comme une matière ordinaire.',
            },
            {
              type: 'attention',
              texte:
                'Modifier un coefficient en cours d’année recalcule toutes les moyennes et tous les classements du trimestre. Si des bulletins ont été remis aux familles, ils ne correspondront plus. Réglez les coefficients avant les premières notes.',
            },
          ],
        },
        {
          ecran: 'notes-par-matiere',
          titre: 'Les notes par matière',
          chapeau:
            'Le relevé complet d’une classe : chaque élève, chaque matière, chaque note. C’est l’écran de contrôle de l’administration avant l’édition des bulletins.',
          fiche: {
            menu: 'Pédagogie › Notes par Matière',
            adresse: '/app/academic/class-grades',
            profil: 'Administrateur',
            prerequis: 'Des notes saisies par les enseignants.',
            resultat: 'Le tableau des notes et moyennes de la classe, exportable en PDF.',
          },
          paragraphe:
            'Le tableau est large : une matière occupe quatre colonnes — les trois notes, puis la moyenne. Faites-le défiler horizontalement pour voir toutes les disciplines.',
          legendes: [
            { n: 1, selecteur: 'contient=Trimestre actif : 1er Trimestre', cote: 'bas', element: 'Rappel du trimestre actif', role: 'Le trimestre que l’application propose par défaut, déduit de la date du jour.' },
            { n: 2, selecteur: 'champ=Classe', cote: 'bas', element: 'Filtre « Classe »', role: 'La classe observée. En changer recharge tout le tableau.' },
            { n: 3, selecteur: 'champ=Trimestre', cote: 'bas', element: 'Filtre « Trimestre »', role: 'Le trimestre observé. Les notes d’un autre trimestre ne se mélangent jamais.' },
            { n: 4, selecteur: 'colonne=FRANÇAIS', cote: 'haut', element: 'Colonnes d’une matière', role: 'Les trois notes de la matière puis leur moyenne. Une case vide signale une note non saisie.' },
            { n: 5, selecteur: 'colonne=CONDUITE', cote: 'haut', element: 'Colonne « Conduite »', role: 'La note de conduite, calculée automatiquement à partir des absences. Elle compte dans la moyenne générale.' },
            { n: 6, selecteur: 'texte=Exporter (choisir une matière)', cote: 'gauche', element: 'Bouton d’export', role: 'Produit le relevé en PDF. Il faut d’abord choisir une matière dans le filtre : l’export porte sur une discipline à la fois.' },
          ],
          procedure: [
            'Ouvrez Pédagogie › Notes par Matière.',
            'Choisissez la classe et le trimestre.',
            'Parcourez le tableau à la recherche de cases vides : ce sont les notes manquantes.',
            'Relancez les enseignants concernés avant d’éditer les bulletins.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'C’est l’écran du conseil de classe : il tient sur une page une fois exporté, et montre d’un coup d’œil les matières où la classe décroche.',
            },
          ],
        },
        {
          ecran: 'conduite',
          titre: 'La conduite',
          chapeau:
            'La note de conduite n’est pas saisie : elle est calculée à partir des heures de cours manquées sans justification. Cet écran explique la règle et permet de la corriger au cas par cas.',
          fiche: {
            menu: 'Pédagogie › Conduite',
            adresse: '/app/academic/conduct',
            profil: 'Administrateur',
            prerequis: 'Des appels saisis par les enseignants.',
            resultat: 'Une note de conduite par élève, intégrée à la moyenne générale.',
          },
          paragraphe:
            'Le bandeau du haut énonce la règle appliquée. Le tableau donne, pour chaque élève, ses heures d’absence, la pénalité qui en découle et sa note finale.',
          legendes: [
            { n: 1, selecteur: 'contient=Règle de calcul', cote: 'bas', element: 'Bandeau « Règle de calcul »', role: 'La règle appliquée, en toutes lettres : 20 au départ, un point perdu par tranche pleine de deux heures manquées sans justificatif.' },
            { n: 2, selecteur: 'texte=Paramètres du calcul', cote: 'gauche', element: 'Bouton « Paramètres du calcul »', role: 'Ouvre le réglage de la règle : note de départ, heures par point, coefficient de la conduite.' },
            { n: 3, selecteur: 'colonne=HEURES ABS.', cote: 'haut', element: 'Colonne « Heures abs. »', role: 'Les heures de cours manquées, cumulées sur le trimestre à partir des appels.' },
            { n: 4, selecteur: 'colonne=PÉNALITÉ', cote: 'haut', element: 'Colonne « Pénalité »', role: 'Les points retirés, déduits des heures selon la règle affichée en haut.' },
            { n: 5, selecteur: 'colonne=NOTE FINALE', cote: 'haut', element: 'Colonne « Note finale »', role: 'La note retenue pour le bulletin. C’est elle qui entre dans la moyenne générale.' },
            { n: 6, selecteur: 'texte=Voir le détail par matière', cote: 'gauche', element: 'Bouton « Voir le détail par matière »', role: 'Détaille les heures manquées matière par matière, et permet de les corriger sur présentation d’un justificatif.' },
          ],
          procedure: [
            'Ouvrez Pédagogie › Conduite.',
            'Choisissez le trimestre et la classe.',
            'Vérifiez la règle affichée dans le bandeau.',
            'Pour un élève qui a produit un justificatif, cliquez sur « Voir le détail par matière » et corrigez les heures de la matière concernée.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'La conduite dépend entièrement des appels. Si des enseignants ne font pas l’appel, leurs séances apparaissent dans « Séances non tenues » et les absences correspondantes ne sont jamais comptées : la conduite de la classe entière s’en trouve faussée, à la hausse.',
            },
            {
              type: 'savoir',
              texte:
                'Une correction se fait sur les heures, jamais sur la note. On corrige la cause — les heures indûment comptées — et l’application recalcule la note. C’est ce qui rend le calcul défendable devant une famille.',
            },
          ],
        },
        {
          ecran: 'moyennes-completes',
          titre: 'Les moyennes complètes et les bulletins',
          chapeau:
            'L’aboutissement de toute la chaîne : moyennes par matière, rangs, moyenne générale et bulletins. C’est aussi ici que l’administration décide de publier les bulletins aux familles.',
          fiche: {
            menu: 'Pédagogie › Moyennes Complètes',
            adresse: '/app/academic/complete-averages',
            profil: 'Administrateur',
            prerequis: 'Notes saisies, coefficients réglés, conduite calculée.',
            resultat: 'Le tableau de classe complet, les bulletins PDF et leur publication.',
          },
          paragraphe:
            'Chaque matière donne une moyenne et un rang. La colonne MG porte la moyenne générale, celle qui classe l’élève dans la classe.',
          legendes: [
            { n: 1, selecteur: 'contient=Bulletins du trimestre', cote: 'bas', element: 'Bandeau « Bulletins du trimestre »', role: 'L’état de publication : « Non générés » signifie que les familles ne voient encore rien.' },
            { n: 2, selecteur: 'texte=Générer les bulletins', cote: 'gauche', element: 'Bouton « Générer les bulletins »', role: 'Publie les bulletins du trimestre. À partir de ce clic, parents et élèves y accèdent depuis leur espace, et la date de génération est imprimée sur les documents.' },
            { n: 3, selecteur: 'colonne=RANG', cote: 'haut', element: 'Colonne « Rang »', role: 'La place de l’élève dans la classe, selon sa moyenne générale.' },
            { n: 4, selecteur: 'colonne=MG', cote: 'haut', element: 'Colonne « MG »', role: 'La moyenne générale : moyennes par matière pondérées par les coefficients, conduite comprise.' },
            { n: 5, selecteur: 'colonne=BULLETIN', cote: 'haut', element: 'Colonne « Bulletin »', role: 'Le bulletin individuel de chaque élève, en PDF. À utiliser pour un duplicata demandé par une famille.' },
            { n: 6, selecteur: 'texte=Exporter en PDF', cote: 'gauche', element: 'Bouton « Exporter en PDF »', role: 'Produit le tableau de classe complet, celui que l’on lit en conseil de classe.' },
          ],
          procedure: [
            'Ouvrez Pédagogie › Moyennes Complètes.',
            'Choisissez la classe et le trimestre.',
            'Contrôlez qu’aucune moyenne de matière n’est vide.',
            'Exportez le tableau en PDF pour le conseil de classe.',
            'Une fois le conseil tenu, cliquez sur « Générer les bulletins » pour les ouvrir aux familles.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Générer les bulletins est un acte de publication',
              texte:
                'Tant que vous n’avez pas cliqué, les parents et les élèves voient « En préparation ». Après le clic, ils voient les notes. Ne générez qu’après le conseil de classe : une note corrigée ensuite obligerait à régénérer, avec une nouvelle date sur les documents déjà distribués.',
            },
            {
              type: 'astuce',
              texte:
                'Comparez la colonne MG à la colonne CONDUITE : un élève dont la moyenne chute uniquement à cause de la conduite est un élève dont il faut d’abord vérifier les absences, pas le travail.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'L’assiduité',
      chapeau:
        'L’appel est fait par les enseignants, séance par séance, depuis leur propre espace. L’administration, elle, surveille deux choses : ce qui a été relevé, et ce qui ne l’a pas été.',
      sections: [
        {
          ecran: 'liste-presence',
          titre: 'La liste de présence',
          chapeau: 'Le cumul de tous les appels d’une classe sur l’année, matière par matière.',
          fiche: {
            menu: 'Année Académique › Liste de Présence',
            adresse: '/app/academic/attendance',
            profil: 'Administrateur',
            prerequis: 'Des appels saisis par les enseignants.',
            resultat: 'Le taux de présence de la classe et le détail par matière.',
          },
          paragraphe:
            'Quatre indicateurs résument l’année. En dessous, trois onglets permettent de lire les mêmes données par matière, par élève ou séance par séance.',
          legendes: [
            { n: 1, selecteur: 'bloc=Séances effectuées', cote: 'bas', element: 'Indicateurs d’assiduité', role: 'Séances effectuées, pointages cumulés, taux de présence et absences. Le portrait de la classe en un coup d’œil.' },
            { n: 2, selecteur: 'contient=sur 6600 attendus (séances × effectif)', cote: 'bas', element: 'Pointages attendus', role: 'Le nombre de pointages attendus — séances multipliées par l’effectif. Un écart avec les pointages réalisés signale des appels incomplets.' },
            { n: 3, selecteur: 'texte=Par matière', cote: 'haut', element: 'Onglets de lecture', role: 'Trois façons de lire les mêmes appels : par matière, par élève, ou séance par séance.' },
            { n: 4, selecteur: 'colonne=SÉANCES', cote: 'haut', element: 'Colonne « Séances »', role: 'Le nombre de séances appelées dans la matière. Une matière très en retrait des autres trahit un enseignant qui ne fait pas l’appel.' },
            { n: 5, selecteur: 'colonne=ABSENTS', cote: 'haut', element: 'Colonne « Absents »', role: 'Le cumul des absences relevées dans la matière. C’est cette colonne qui alimente le calcul de la conduite.' },
          ],
          procedure: [
            'Ouvrez Année Académique › Liste de Présence.',
            'Choisissez la classe.',
            'Comparez « Pointages cumulés » aux pointages attendus.',
            'Ouvrez l’onglet « Par élève » pour repérer les élèves les plus absents.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'Le rapport entre pointages réalisés et pointages attendus est le meilleur indicateur de la discipline d’appel de vos enseignants. En dessous de 90 %, la conduite calculée n’est plus fiable.',
            },
          ],
        },
        {
          ecran: 'seances-non-tenues',
          titre: 'Les séances non tenues',
          chapeau:
            'La liste des séances prévues à l’emploi du temps pour lesquelles aucun appel n’a été fait passé un délai de grâce. C’est l’outil de rappel de la vie scolaire.',
          fiche: {
            menu: 'Année Académique › Séances non tenues',
            adresse: '/app/academic/uncalled-sessions',
            profil: 'Administrateur',
            prerequis: 'Un emploi du temps saisi.',
            resultat: 'La liste des appels manquants et des demandes de déplacement de cours.',
          },
          paragraphe:
            'Chaque ligne donne le créneau, la matière, la classe, l’enseignant et la date. Le bouton « Faire l’appel » permet à l’administration de régulariser.',
          legendes: [
            { n: 1, selecteur: 'texte=Séances non tenues', cote: 'bas', element: 'Onglet « Séances non tenues »', role: 'Les appels manquants. Le nombre entre parenthèses donne l’ampleur du retard.' },
            { n: 2, selecteur: 'texte=Demandes de déplacement', cote: 'bas', element: 'Onglet « Demandes de déplacement »', role: 'Les demandes des enseignants pour déplacer un cours à venir, en attente de votre validation.' },
            { n: 3, selecteur: 'champ=Enseignant', cote: 'bas', element: 'Filtre « Enseignant »', role: 'Restreint la liste à un enseignant : le moyen le plus direct de préparer un entretien.' },
            { n: 4, selecteur: 'contient=Non fait', cote: 'droite', element: 'Étiquette « Non fait »', role: 'L’état de la séance. Une séance non faite n’a compté aucune absence.' },
            { n: 5, selecteur: 'texte=Faire l\'appel', cote: 'gauche', element: 'Bouton « Faire l’appel »', role: 'Permet à l’administration de saisir l’appel à la place de l’enseignant, sur justificatif.' },
          ],
          procedure: [
            'Ouvrez Année Académique › Séances non tenues.',
            'Filtrez sur un enseignant ou une classe.',
            'Régularisez les séances qui doivent l’être avec « Faire l’appel ».',
            'Consultez l’onglet « Demandes de déplacement » pour valider les reports.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un nombre très élevé de séances non tenues en début d’usage vient souvent de l’emploi du temps, pas des enseignants : toute séance inscrite à la grille et jamais assurée y apparaît. Vérifiez la grille avant de convoquer qui que ce soit.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'La finance',
      chapeau:
        'Un écran définit ce que les familles doivent et quand ; l’autre enregistre ce qu’elles ont versé. Le premier se règle une fois par an, le second sert tous les jours.',
      sections: [
        {
          ecran: 'echeanciers',
          titre: 'Les échéanciers',
          chapeau: 'Un échéancier est un modèle de versements, défini une fois puis affecté aux classes concernées.',
          fiche: {
            menu: 'Finance › Échéanciers',
            adresse: '/app/finance/payment-conditions',
            profil: 'Administrateur',
            prerequis: 'Les classes doivent exister.',
            resultat: 'Des échéanciers réutilisables, affectés à des classes.',
          },
          paragraphe: 'Chaque carte indique le nombre de versements du modèle et le nombre de classes auxquelles il s’applique.',
          legendes: [
            { n: 1, selecteur: 'texte=Nouvelle condition', cote: 'gauche', element: 'Bouton « Nouvelle condition »', role: 'Crée un échéancier : son nom, ses versements, leurs montants et leurs dates.' },
            { n: 2, selecteur: 'contient=3 versements', cote: 'droite', element: 'Étiquette « … versements »', role: 'Le nombre de tranches prévues par le modèle.' },
            { n: 3, selecteur: 'contient=1 classe', cote: 'droite', element: 'Étiquette « … classe »', role: 'Le nombre de classes auxquelles l’échéancier est affecté. À zéro, le modèle ne s’applique à personne.' },
            { n: 4, selecteur: 'texte=Affecter aux classes', cote: 'gauche', element: 'Bouton « Affecter aux classes »', role: 'Applique l’échéancier à une ou plusieurs classes. Sans cette étape, aucun élève n’est concerné.' },
          ],
          procedure: [
            'Ouvrez Finance › Échéanciers.',
            'Cliquez sur « Nouvelle condition » et définissez les versements.',
            'Une fois le modèle enregistré, cliquez sur « Affecter aux classes ».',
            'Cochez les classes concernées et validez.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un échéancier non affecté ne produit aucun effet : l’écran Paiements n’attendra rien des élèves. Vérifiez que l’étiquette « … classe » n’affiche pas zéro.',
            },
          ],
        },
        {
          ecran: 'paiements',
          titre: 'Le suivi des paiements',
          chapeau: 'Comme l’emploi du temps, cet écran attend qu’on lui désigne une classe.',
          fiche: {
            menu: 'Finance › Paiements',
            adresse: '/app/finance/payments',
            profil: 'Administrateur',
            prerequis: 'Une classe avec des élèves inscrits et un échéancier affecté.',
            resultat: 'La situation de paiement de chaque élève de la classe.',
          },
          paragraphe: 'Le message affiché n’est pas une erreur : il manque simplement le choix d’une classe.',
          legendes: [
            { n: 1, selecteur: 'champ=Année scolaire', cote: 'bas', element: 'Liste « Année scolaire »', role: 'L’année dont on suit les paiements.' },
            { n: 2, selecteur: 'champ=Classe', cote: 'bas', element: 'Liste « Classe »', role: 'La classe à afficher. Le suivi se fait toujours classe par classe.' },
            { n: 3, selecteur: 'contient=Choisissez une année scolaire et une classe pour voir la liste des élèves.', cote: 'bas', element: 'Message d’attente', role: 'Rappelle ce qui manque pour afficher la liste.' },
          ],
          procedure: [
            'Ouvrez Finance › Paiements.',
            'Vérifiez l’année scolaire.',
            'Choisissez la classe : la liste des élèves apparaît.',
          ],
          encarts: [],
        },
        {
          ecran: 'paiements-classe',
          titre: 'Les paiements d’une classe',
          chapeau: 'La situation financière de chaque élève, et l’endroit où l’on enregistre un versement reçu au secrétariat.',
          fiche: {
            menu: 'Finance › Paiements › choisir une classe',
            adresse: '/app/finance/payments',
            profil: 'Administrateur',
            prerequis: 'Des élèves inscrits et un échéancier affecté à la classe.',
            resultat: 'L’état des versements et l’enregistrement des paiements.',
          },
          paragraphe:
            'Chaque élève apparaît avec le montant déjà payé, le pourcentage réglé et un état — à jour ou en retard.',
          legendes: [
            { n: 1, selecteur: 'contient=25 élèves — 6ème A', cote: 'bas', element: 'Effectif de la classe', role: 'Le nombre d’élèves suivis. S’il ne correspond pas à la classe réelle, ce sont les inscriptions qu’il faut vérifier.' },
            { n: 2, selecteur: 'contient=En retard', cote: 'droite', element: 'État du paiement', role: 'Compare ce qui a été versé aux échéances déjà passées. « En retard » signale une échéance dépassée non réglée.' },
            { n: 3, selecteur: 'texte=Gérer', cote: 'gauche', element: 'Bouton « Gérer »', role: 'Ouvre le détail des versements de l’élève et permet d’enregistrer un paiement reçu.' },
          ],
          procedure: [
            'Choisissez l’année et la classe.',
            'Repérez l’élève concerné.',
            'Cliquez sur « Gérer » pour ouvrir son échéancier.',
            'Enregistrez le versement reçu, avec son mode de paiement.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Si la liste reste vide alors que la classe compte des élèves, c’est que ceux-ci ne sont pas inscrits pour l’année sélectionnée. Le suivi des paiements repose sur les inscriptions, pas sur les fiches élèves.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'L’administration',
      chapeau:
        'Qui a le droit de faire quoi, avec quel compte, et sous quelle identité d’établissement. Ces écrans se règlent rarement, mais une erreur s’y paie cher.',
      sections: [
        {
          ecran: 'roles',
          titre: 'Les rôles',
          chapeau: 'Un rôle décide des menus visibles pour les comptes qui le portent. C’est le seul mécanisme de droits de l’application.',
          fiche: {
            menu: 'Administration › Rôles',
            adresse: '/app/people/roles',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des rôles et le nombre de comptes qui les portent.',
          },
          paragraphe: 'Deux rôles existent d’office : « Administrateur », qui voit tout, et « Propriétaire », réservé aux tableaux de bord de pilotage.',
          legendes: [
            { n: 1, selecteur: 'texte=Nouveau rôle', cote: 'gauche', element: 'Bouton « Nouveau rôle »', role: 'Crée un profil sur mesure — un rôle « Censeur » limité à la pédagogie et à l’assiduité, par exemple.' },
            { n: 2, selecteur: 'contient=24 menu(s)', cote: 'droite', element: 'Compteur de menus', role: 'Le nombre de menus accordés au rôle. Il reflète le type d’établissement : un lycée en compte davantage qu’une école primaire.' },
            { n: 3, selecteur: 'contient=1 utilisateur(s)', cote: 'droite', element: 'Compteur d’utilisateurs', role: 'Le nombre de comptes portant ce rôle. Un rôle à zéro utilisateur ne sert à rien.' },
            { n: 4, selecteur: 'aria=Modifier', cote: 'bas', element: 'Icône crayon « Modifier »', role: 'Rouvre le rôle pour ajuster les menus accordés.' },
          ],
          procedure: [
            'Ouvrez Administration › Rôles.',
            'Repérez le rôle à ajuster.',
            'Cliquez sur l’icône en forme de crayon pour modifier ses menus.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Décocher des menus sur le rôle « Administrateur » les retire aussi de votre propre barre latérale. Le menu « Rôles » reste toujours visible : c’est le garde-fou qui vous permet de revenir en arrière.',
            },
          ],
        },
        {
          ecran: 'roles-nouveau',
          titre: 'Créer un rôle',
          chapeau: 'Un nom, une description, et des cases à cocher. Chaque case correspond exactement à une entrée de la barre latérale.',
          fiche: {
            menu: 'Administration › Rôles › Nouveau rôle',
            adresse: '/app/people/roles',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'Un rôle attribuable aux comptes du personnel.',
          },
          paragraphe: 'Les menus sont regroupés comme dans la barre latérale. Chaque groupe porte un compteur et deux raccourcis.',
          legendes: [
            { n: 1, selecteur: 'champ=Nom du rôle', element: 'Champ « Nom du rôle »', role: 'Le nom du profil, tel qu’il apparaîtra au moment de créer un compte : « Censeur », « Économat »…' },
            { n: 2, selecteur: 'champ=Description (optionnel)', element: 'Champ « Description »', role: 'Une phrase qui rappelle à quoi sert le rôle. Elle s’affiche dans la liste des rôles.' },
            { n: 3, selecteur: 'contient=Gestion des Personnes', cote: 'gauche', element: 'Groupe de menus', role: 'Les menus présentés par groupe, dans l’ordre de la barre latérale. Le compteur indique combien sont cochés.' },
            { n: 4, selecteur: 'texte=Tout', cote: 'haut', element: 'Boutons « Tout » et « Aucune »', role: 'Cochent ou décochent d’un coup tous les menus du groupe.' },
            { n: 5, selecteur: 'texte=Enregistrer', cote: 'gauche', element: 'Bouton « Enregistrer »', role: 'Crée le rôle. Il devient aussitôt proposé dans le formulaire de création d’un compte.' },
          ],
          procedure: [
            'Depuis la liste des rôles, cliquez sur « Nouveau rôle ».',
            'Nommez le rôle et décrivez-le en une phrase.',
            'Cochez les menus que ce profil doit voir, groupe par groupe.',
            'Vérifiez le compteur général.',
            'Cliquez sur « Enregistrer ».',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Un changement de rôle n’est pris en compte qu’au rechargement de l’application. Demandez à la personne concernée de se déconnecter puis de se reconnecter pour voir sa nouvelle barre latérale.',
            },
          ],
        },
        {
          ecran: 'utilisateurs',
          titre: 'Les comptes du personnel',
          chapeau: 'La liste des personnes qui peuvent se connecter côté administration. Un compte, une adresse e-mail, un rôle.',
          fiche: {
            menu: 'Administration › Utilisateurs',
            adresse: '/app/people/users',
            profil: 'Administrateur',
            prerequis: 'Les rôles doivent être définis.',
            resultat: 'La liste des comptes, leur rôle et leur état.',
          },
          paragraphe: 'Le compte administrateur créé à l’ouverture de l’établissement porte la mention « Protégé ».',
          legendes: [
            { n: 1, selecteur: 'texte=Nouvel utilisateur', cote: 'gauche', element: 'Bouton « Nouvel utilisateur »', role: 'Crée un compte de connexion pour un membre du personnel.' },
            { n: 2, selecteur: 'contient=Protégé', cote: 'gauche', element: 'Mention « Protégé »', role: 'Ce compte ne peut pas être supprimé. C’est ce qui empêche l’établissement de se retrouver sans aucun accès d’administration.' },
            { n: 3, selecteur: 'contient=Actif', cote: 'droite', element: 'État du compte', role: 'Un compte inactif existe encore mais ne peut plus se connecter. La bonne manière de suspendre un accès sans effacer l’historique.' },
            { n: 4, selecteur: 'champ=Rechercher', element: 'Case « Rechercher »', role: 'Filtre sur le nom ou l’adresse e-mail.' },
          ],
          procedure: [
            'Ouvrez Administration › Utilisateurs.',
            'Repérez le compte concerné.',
            'Cliquez sur l’icône en forme de crayon pour le modifier.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'Quand quelqu’un quitte l’établissement, désactivez son compte plutôt que de le supprimer : les actions qu’il a réalisées restent rattachées à son nom dans l’historique.',
            },
          ],
        },
        {
          ecran: 'utilisateurs-nouveau',
          titre: 'Créer un compte utilisateur',
          chapeau: 'C’est ici que se donne l’accès à l’application, y compris à un enseignant dont la fiche seule ne suffit pas.',
          fiche: {
            menu: 'Administration › Utilisateurs › Nouvel utilisateur',
            adresse: '/app/people/users',
            profil: 'Administrateur',
            prerequis: 'Le rôle à attribuer doit exister.',
            resultat: 'Un compte capable de se connecter.',
          },
          paragraphe: 'Le mot de passe est saisi par vous et communiqué à la personne, qui pourra le changer ensuite.',
          legendes: [
            { n: 1, selecteur: 'champ=Adresse email', element: 'Champ « Adresse email »', role: 'L’identifiant de connexion. Il doit être unique et rester valide : c’est par lui que la personne entre dans l’application.' },
            { n: 2, selecteur: 'champ=Rôle', element: 'Liste « Rôle »', role: 'Le profil de droits attribué au compte. Il décide des menus visibles.' },
            { n: 3, selecteur: 'contient=Compte actif', cote: 'droite', element: 'Interrupteur « Compte actif »', role: 'Autorise ou bloque la connexion. Un compte préparé à l’avance peut être créé inactif, puis activé le jour de la prise de poste.' },
            { n: 4, selecteur: 'champ=Mot de passe', element: 'Champ « Mot de passe »', role: 'Le mot de passe initial, à communiquer à la personne. Elle pourra le modifier depuis son compte.' },
            { n: 5, selecteur: 'texte=Enregistrer', cote: 'gauche', element: 'Bouton « Enregistrer »', role: 'Crée le compte. La personne peut se connecter immédiatement s’il est actif.' },
          ],
          procedure: [
            'Ouvrez Administration › Utilisateurs et cliquez sur « Nouvel utilisateur ».',
            'Saisissez le nom, le prénom et l’adresse e-mail.',
            'Choisissez le rôle correspondant au poste.',
            'Vérifiez que « Compte actif » est activé.',
            'Saisissez un mot de passe initial, puis enregistrez.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Transmettez le mot de passe initial de vive voix ou par un canal sûr, et demandez à la personne de le changer à sa première connexion.',
            },
            {
              type: 'savoir',
              texte:
                'Fiche et compte sont deux choses distinctes. La fiche enseignant décrit un membre du personnel ; le compte lui donne une clé d’entrée. Un enseignant sans compte figure dans les listes mais ne peut pas se connecter.',
            },
          ],
        },
        {
          ecran: 'etablissement',
          titre: 'La fiche de l’établissement',
          chapeau: 'L’identité de l’établissement : nom, coordonnées, logo. Ces informations apparaissent sur les documents produits.',
          fiche: {
            menu: 'Administration › Établissement',
            adresse: '/app/etablissement',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'Les coordonnées et le logo, à jour.',
          },
          paragraphe:
            'Le type d’école — ici « Lycée » — n’est pas un simple libellé : c’est lui qui décide des menus affichés dans toute l’application.',
          legendes: [
            { n: 1, selecteur: 'contient=Lycée Moderne de Cocody', cote: 'bas', element: 'Nom de l’établissement', role: 'Le nom officiel. Il figure sous la marque, dans la barre latérale, et sur les documents édités.' },
            { n: 2, selecteur: 'contient=Type d\'école', cote: 'gauche', element: 'Ligne « Type d’école »', role: 'Le cycle de l’établissement. C’est ce réglage qui fait apparaître le groupe « Pédagogie » et masque les écrans du primaire.' },
            { n: 3, selecteur: 'texte=Charger un logo', cote: 'droite', element: 'Bouton « Charger un logo »', role: 'Charge le logo — JPG, PNG ou WEBP, 2 Mo au maximum. Sans logo, l’application affiche un sigle générique.' },
            { n: 4, selecteur: 'texte=Modifier', cote: 'gauche', element: 'Bouton « Modifier »', role: 'Ouvre les coordonnées en saisie : nom, e-mail, téléphone, ville, adresse.' },
            { n: 5, selecteur: 'contient=Identifiant', cote: 'gauche', element: 'Ligne « Identifiant »', role: 'Le code technique de l’établissement, dérivé de son nom. Il ne se modifie pas.' },
          ],
          procedure: [
            'Ouvrez Administration › Établissement.',
            'Vérifiez le nom, le type d’école et les coordonnées.',
            'Cliquez sur « Modifier » pour corriger une information.',
            'Cliquez sur « Charger un logo » pour personnaliser l’application.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Ne changez pas le type d’école en cours d’année. Passer de « Lycée » à un autre cycle réorganiserait entièrement les menus et rendrait inaccessibles les écrans où se trouvent vos notes.',
            },
            {
              type: 'astuce',
              texte:
                'Chargez le logo dès la mise en service : il apparaît sur la page de connexion et dans la barre latérale, et les familles reconnaissent immédiatement leur établissement.',
            },
          ],
        },
      ],
    },
  ],
};
