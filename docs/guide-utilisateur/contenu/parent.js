/**
 * Contenu rédigé du Guide du parent — Espace Famille, école primaire.
 *
 * L'espace du parent est en lecture seule : il consulte, il ne modifie jamais
 * rien. Le guide est donc court, et sa difficulté est ailleurs — expliquer à
 * une famille comment lire une moyenne, un rang et une mention sans jargon.
 */

module.exports = {
  meta: {
    titre: 'Guide du parent',
    sousTitre: 'HorizonEcole — Espace Famille',
    etablissement: 'Groupe Scolaire les Palmiers',
    profil: 'Parent',
    version: '1.0',
    adresse: 'http://localhost:5173/app',
    avertissement:
      'Ce guide décrit l’Espace Famille tel qu’il se présente au parent d’un ou plusieurs ' +
      'élèves d’une école primaire. Les copies d’écran proviennent de « Groupe Scolaire les ' +
      'Palmiers » et contiennent des noms réels d’élèves : à anonymiser avant toute diffusion ' +
      'hors de l’école.',
  },

  introduction: {
    titre: 'Bienvenue dans l’Espace Famille',
    paragraphes: [
      'L’Espace Famille vous permet de suivre la scolarité de vos enfants depuis un téléphone ou un ordinateur : leur emploi du temps, leurs notes, leur classement et leurs bulletins.',
      'Votre espace est en lecture seule. Vous consultez, vous n’enregistrez rien. Toute correction — une date de naissance, un numéro de téléphone, une note — passe par le secrétariat de l’école ou par l’enseignant.',
      'Si vous avez plusieurs enfants dans l’établissement, une barre d’onglets en haut de chaque écran vous permet de passer de l’un à l’autre. Vérifiez toujours quel enfant est sélectionné avant de lire un résultat.',
      'Chaque copie d’écran porte des pastilles numérotées en rouge, expliquées dans le tableau qui suit l’image.',
    ],
    reperes: [
      ['Attention', 'Ce qui peut prêter à confusion, ou vous faire lire le résultat du mauvais enfant.'],
      ['Astuce', 'Le raccourci qui fait gagner du temps.'],
      ['À savoir', 'Ce que fait l’application en coulisse, et qui explique un affichage.'],
    ],
  },

  chapitres: [
    {
      titre: 'Prise en main',
      chapeau:
        'Se connecter, et comprendre la page d’accueil qui résume la journée de votre enfant.',
      sections: [
        {
          ecran: 'connexion',
          titre: 'Se connecter',
          chapeau:
            'L’école vous a remis une adresse e-mail et un mot de passe. Ce sont vos identifiants pour l’Espace Famille.',
          fiche: {
            menu: '—',
            adresse: '/app/login',
            profil: 'Parent',
            prerequis: 'Un compte ouvert par l’école, et vos enfants rattachés à ce compte.',
            resultat: 'Vous arrivez sur votre Espace Famille.',
          },
          paragraphe:
            'L’écran ne demande que deux informations. Le texte grisé dans les cases est un exemple : il disparaît dès que vous tapez.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Email',
              element: 'Champ « Email »',
              role: 'L’adresse e-mail que vous avez communiquée à l’école. C’est elle qui relie votre compte à vos enfants.',
            },
            {
              n: 2,
              selecteur: 'champ=Mot de passe',
              element: 'Champ « Mot de passe »',
              role: 'Votre mot de passe. L’icône d’œil barré, à droite, l’affiche en clair le temps de vérifier votre saisie.',
            },
            {
              n: 3,
              selecteur: 'texte=Se connecter',
              cote: 'droite',
              element: 'Bouton « Se connecter »',
              role: 'Valide la connexion. En cas d’erreur, un message apparaît : vérifiez d’abord l’adresse e-mail, c’est la source d’erreur la plus fréquente.',
            },
            {
              n: 4,
              selecteur: 'texte=Configurer un établissement',
              cote: 'bas',
              element: 'Lien « Configurer un établissement »',
              role: 'Ne vous concerne pas : il sert à enregistrer une école entière dans l’application. Ne cliquez pas dessus.',
            },
          ],
          procedure: [
            'Ouvrez votre navigateur à l’adresse que l’école vous a indiquée.',
            'Saisissez votre adresse e-mail.',
            'Saisissez votre mot de passe.',
            'Cliquez sur « Se connecter ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Il n’y a pas de lien « Mot de passe oublié ». Si vous perdez votre mot de passe, contactez le secrétariat de l’école : lui seul peut vous en attribuer un nouveau.',
            },
            {
              type: 'savoir',
              texte:
                'Si vous vous connectez mais qu’aucun enfant n’apparaît, c’est que vos enfants ne sont pas encore rattachés à votre compte. Le secrétariat règle cela en quelques secondes.',
            },
          ],
        },
        {
          ecran: 'espace-famille',
          titre: 'La page d’accueil',
          chapeau:
            'Le résumé de la journée : les cours du jour, les dernières compositions et l’assiduité. Tout y concerne l’enfant sélectionné en haut de l’écran.',
          fiche: {
            menu: 'Espace Famille',
            adresse: '/app/parent',
            profil: 'Parent',
            prerequis: 'Au moins un enfant rattaché à votre compte.',
            resultat: 'Vue d’ensemble de la scolarité de l’enfant choisi.',
          },
          paragraphe:
            'La barre d’onglets du haut porte le nom de chacun de vos enfants. L’onglet actif décide de tout ce qui s’affiche en dessous — et la phrase du bas de page vous le rappelle.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Bonjour, Franck',
              cote: 'bas',
              element: 'Salutation et date',
              role: 'Votre prénom, la date du jour et l’année scolaire en cours.',
            },
            {
              n: 2,
              selecteur: 'contient=ENFANT',
              cote: 'droite',
              element: 'Barre de sélection de l’enfant',
              role: 'Un onglet par enfant, avec sa classe. Cliquez sur un nom pour basculer tout l’écran sur cet enfant.',
            },
            {
              n: 3,
              selecteur: 'bloc=Taux de présence',
              cote: 'bas',
              element: 'Indicateurs d’assiduité',
              role: 'Présences, retards et absences de l’enfant. Dans une école primaire, ces compteurs restent souvent à zéro : l’appel par séance n’y est pas activé.',
            },
            {
              n: 4,
              selecteur: 'bloc=Dernières compositions',
              cote: 'droite',
              element: 'Bloc « Dernières compositions »',
              role: 'Les résultats les plus récents, avec la date, la mention et la moyenne. « Tout voir » ouvre le détail complet.',
            },
            {
              n: 5,
              selecteur: 'contient=RACCOURCIS',
              cote: 'droite',
              element: 'Barre « Raccourcis »',
              role: 'Cinq boutons vers les écrans les plus consultés. Ils font la même chose que les entrées du menu.',
            },
            {
              n: 6,
              selecteur: 'contient=Données affichées pour Yannick Kouassi — CE1.',
              cote: 'haut',
              element: 'Rappel de l’enfant sélectionné',
              role: 'La phrase la plus utile de l’écran quand on a plusieurs enfants : elle nomme celui dont vous lisez les résultats.',
            },
          ],
          procedure: [
            'Connectez-vous : l’Espace Famille s’ouvre automatiquement.',
            'Vérifiez le nom de l’enfant sélectionné dans la barre d’onglets.',
            'Lisez le bloc « Dernières compositions » pour les résultats récents.',
            'Utilisez les raccourcis pour ouvrir l’emploi du temps ou les bulletins.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Vérifiez toujours quel enfant est affiché',
              texte:
                'Si vous avez plusieurs enfants dans l’école, l’application en affiche un seul à la fois. Une moyenne excellente lue en croyant qu’il s’agit de l’aîné alors qu’elle concerne la cadette est vite arrivée. La phrase en bas de page nomme l’enfant affiché : prenez l’habitude de la lire.',
            },
            {
              type: 'savoir',
              texte:
                'Les compteurs d’assiduité à zéro ne signifient pas que votre enfant n’est jamais venu. Dans une école primaire, l’appel par séance n’est pas tenu dans l’application : l’assiduité se règle directement avec l’enseignant.',
            },
          ],
        },
      ],
    },

    {
      titre: 'Suivre mon enfant',
      chapeau:
        'Trois écrans : la fiche de vos enfants, leur semaine de cours, et leurs résultats. Tous se lisent enfant par enfant.',
      sections: [
        {
          ecran: 'mes-enfants',
          titre: 'Mes enfants',
          chapeau:
            'La liste de vos enfants scolarisés dans l’établissement, avec un accès direct à leur suivi.',
          fiche: {
            menu: 'Ma famille › Mes enfants',
            adresse: '/app/parent/children',
            profil: 'Parent',
            prerequis: 'Vos enfants doivent être rattachés à votre compte par l’école.',
            resultat: 'La fiche de chaque enfant et les liens vers son suivi.',
          },
          paragraphe:
            'Chaque carte reprend l’identité de l’enfant telle que l’école l’a enregistrée, et trois boutons vers ses écrans de suivi.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Les élèves rattachés à votre compte, et l\'accès direct à leur suivi.',
              cote: 'bas',
              element: 'Sous-titre de l’écran',
              role: 'Rappelle que seuls les enfants rattachés à votre compte apparaissent ici.',
            },
            {
              n: 2,
              selecteur: 'contient=2026-0001',
              cote: 'droite',
              element: 'Matricule de l’enfant',
              role: 'Son identifiant unique dans l’école. À citer dans tout échange avec le secrétariat.',
            },
            {
              n: 3,
              selecteur: 'contient=Inscrit',
              cote: 'droite',
              element: 'Étiquette « Inscrit »',
              role: 'Confirme que l’enfant est bien inscrit dans une classe pour l’année en cours. Sans cette mention, ses résultats n’apparaîtraient pas.',
            },
            {
              n: 4,
              selecteur: 'contient=Lien de parenté',
              cote: 'gauche',
              element: 'Ligne « Lien de parenté »',
              role: 'Le lien enregistré par l’école entre vous et l’enfant : père, mère, tuteur.',
            },
            {
              n: 5,
              selecteur: 'texte=Bulletins',
              cote: 'gauche',
              element: 'Bouton « Bulletins »',
              role: 'Ouvre directement les résultats de cet enfant, sans passer par la barre d’onglets.',
            },
          ],
          procedure: [
            'Ouvrez « Mes enfants » dans le menu.',
            'Vérifiez que tous vos enfants scolarisés dans l’école y figurent.',
            'Contrôlez la date de naissance et le lien de parenté.',
            'Cliquez sur « Bulletins » pour ouvrir le suivi d’un enfant.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Si l’un de vos enfants manque à cette liste, ou si une date de naissance est fausse, signalez-le au secrétariat. Vous ne pouvez rien corriger depuis votre espace.',
            },
          ],
        },
        {
          ecran: 'emploi-du-temps',
          titre: 'L’emploi du temps',
          chapeau:
            'La semaine de votre enfant, heure par heure. Utile pour savoir ce qu’il doit préparer pour le lendemain.',
          fiche: {
            menu: 'Suivi scolaire › Emploi du Temps',
            adresse: '/app/parent/timetable',
            profil: 'Parent',
            prerequis: 'L’école doit avoir saisi l’emploi du temps de la classe.',
            resultat: 'La grille hebdomadaire de la classe de votre enfant.',
          },
          paragraphe:
            'Les créneaux vides portent un tiret : rien n’y est programmé. Les récréations et la coupure du midi traversent toute la semaine.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=ENFANT',
              cote: 'droite',
              element: 'Barre de sélection de l’enfant',
              role: 'Chaque enfant a l’emploi du temps de sa classe. Vérifiez l’onglet actif avant de lire la grille.',
            },
            {
              n: 2,
              selecteur: 'champ=Année scolaire',
              cote: 'bas',
              element: 'Liste « Année scolaire »',
              role: 'L’année consultée, pré-remplie sur l’année en cours.',
            },
            {
              n: 3,
              selecteur: 'colonne=HORAIRES',
              cote: 'gauche',
              element: 'Colonne « HORAIRES »',
              role: 'Les créneaux de la journée, communs à toute la classe.',
            },
            {
              n: 4,
              selecteur: 'contient=RÉCRÉATION',
              cote: 'droite',
              element: 'Ligne « RÉCRÉATION »',
              role: 'Les pauses, signalées sur toute la largeur de la semaine.',
            },
          ],
          procedure: [
            'Ouvrez « Emploi du Temps » dans le menu.',
            'Sélectionnez l’enfant concerné dans la barre d’onglets.',
            'Lisez la colonne du jour voulu.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Chaque créneau affiche la matière puis le mot « Enseignant », sans nom. C’est que l’école n’a pas encore rattaché d’enseignant à ces créneaux : dès qu’elle le fait, le nom du maître s’affiche à cet endroit. Vous n’avez rien à faire de votre côté.',
            },
            {
              type: 'savoir',
              texte:
                'Un emploi du temps entièrement vide signifie que l’école ne l’a pas encore saisi pour cette classe. Il se remplira sans que vous ayez à faire quoi que ce soit.',
            },
          ],
        },
        {
          ecran: 'resultats',
          titre: 'Résultats et bulletins',
          chapeau:
            'Les notes de votre enfant, composition par composition, avec son rang dans la classe et sa moyenne annuelle. L’écran le plus consulté de l’Espace Famille.',
          fiche: {
            menu: 'Suivi scolaire › Résultats & Bulletins',
            adresse: '/app/parent/grades',
            profil: 'Parent',
            prerequis: 'L’enseignant doit avoir saisi les notes de la composition.',
            resultat: 'Le détail des notes, le rang, la mention et la moyenne annuelle.',
          },
          paragraphe:
            'Trois indicateurs situent votre enfant par rapport à sa classe. En dessous, le détail matière par matière, puis la moyenne de l’année.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Composition',
              cote: 'bas',
              element: 'Liste « Composition »',
              role: 'L’épreuve dont vous consultez les résultats, avec sa date. Changez-en pour comparer les compositions entre elles.',
            },
            {
              n: 2,
              selecteur: 'bloc=Moyenne de la classe',
              cote: 'bas',
              element: 'Moyenne de la classe',
              role: 'La moyenne obtenue par l’ensemble de la classe. C’est le point de comparaison qui donne son sens à la note de votre enfant.',
            },
            {
              n: 3,
              selecteur: 'contient=Rang de Yannick',
              cote: 'bas',
              element: 'Rang de votre enfant',
              role: 'Sa place dans le classement de la classe pour cette composition.',
            },
            {
              n: 4,
              selecteur: 'contient=total ÷ 10 → /10',
              cote: 'droite',
              element: 'Rappel du mode de calcul',
              role: 'Comment la moyenne est obtenue : le total des notes divisé par un diviseur fixé par l’école. Le total et le diviseur figurent sur la carte de l’élève.',
            },
            {
              n: 5,
              selecteur: 'contient=Admission à partir de 5/10 · insuffisant en dessous de 4/10.',
              cote: 'bas',
              element: 'Rappel des seuils',
              role: 'Les moyennes à partir desquelles l’enfant est admis, et en dessous desquelles le résultat est jugé insuffisant.',
            },
            {
              n: 6,
              selecteur: 'contient=EXP TEXTE /30',
              cote: 'gauche',
              element: 'Détail par matière',
              role: 'La note de votre enfant dans chaque matière, avec le barème. « 29,50 » sur un barème de 30 se lit comme un excellent résultat.',
            },
            {
              n: 7,
              selecteur: 'bloc=MOYENNE ANNUELLE',
              cote: 'gauche',
              element: 'Bloc « Moyenne annuelle »',
              role: 'La moyenne de l’enfant sur toutes les compositions déjà publiées. C’est elle qui comptera pour le passage en classe supérieure.',
            },
          ],
          procedure: [
            'Ouvrez « Résultats & Bulletins » dans le menu.',
            'Vérifiez l’enfant sélectionné dans la barre d’onglets.',
            'Choisissez la composition à consulter.',
            'Comparez la moyenne de votre enfant à celle de la classe.',
            'Lisez le détail par matière pour repérer les points forts et les difficultés.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Une composition absente de la liste n’a pas encore été saisie par l’enseignant. Un résultat n’est jamais « perdu » : il apparaît dès que la saisie est faite.',
            },
            {
              type: 'astuce',
              texte:
                'Ne lisez jamais une moyenne seule. Une note de 6/10 dans une classe dont la moyenne est 4,5 vaut mieux qu’un 6/10 dans une classe à 8. Les trois indicateurs du haut sont là pour cela.',
            },
            {
              type: 'savoir',
              texte:
                'La moyenne annuelle est la moyenne des compositions déjà publiées, et non de toutes celles prévues dans l’année. Elle évolue donc à chaque nouvelle composition saisie.',
            },
          ],
        },
      ],
    },
  ],
};
