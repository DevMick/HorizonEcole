/**
 * Contenu rédigé du Guide du parent — Espace Famille, collège et lycée.
 *
 * L'espace du parent est en lecture seule. La difficulté du guide n'est donc
 * pas technique : elle est d'expliquer à une famille comment lire une moyenne
 * pondérée, un taux de présence et un bulletin, sans jargon.
 */

module.exports = {
  meta: {
    titre: 'Guide du parent',
    sousTitre: 'HorizonEcole — Espace Famille',
    etablissement: 'Lycée Moderne de Cocody',
    profil: 'Parent',
    version: '1.0',
    adresse: 'http://localhost:5173/app',
    avertissement:
      'Ce guide décrit l’Espace Famille tel qu’il se présente au parent d’un ou plusieurs ' +
      'élèves d’un collège ou d’un lycée. Les copies d’écran proviennent du « Lycée Moderne ' +
      'de Cocody », un établissement de démonstration : les élèves qui y figurent sont fictifs.',
  },

  introduction: {
    titre: 'Bienvenue dans l’Espace Famille',
    paragraphes: [
      'L’Espace Famille vous permet de suivre la scolarité de vos enfants depuis un téléphone ou un ordinateur : leur emploi du temps, leur assiduité séance par séance, leurs notes et leurs bulletins.',
      'Votre espace est en lecture seule. Vous consultez, vous n’enregistrez rien. Toute correction — une date de naissance, un numéro de téléphone, une note, une absence — passe par le secrétariat ou par l’enseignant concerné.',
      'Si vous avez plusieurs enfants dans l’établissement, une barre d’onglets en haut de chaque écran permet de passer de l’un à l’autre. Vérifiez toujours quel enfant est sélectionné avant de lire un résultat.',
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
      chapeau: 'Se connecter, et comprendre la page d’accueil qui résume la scolarité de votre enfant.',
      sections: [
        {
          ecran: 'connexion',
          titre: 'Se connecter',
          chapeau: 'L’établissement vous a remis une adresse e-mail et un mot de passe.',
          fiche: {
            menu: '—',
            adresse: '/app/login',
            profil: 'Parent',
            prerequis: 'Un compte ouvert par l’établissement, et vos enfants rattachés à ce compte.',
            resultat: 'Vous arrivez sur votre Espace Famille.',
          },
          paragraphe: 'L’écran ne demande que deux informations. Le texte grisé est un exemple : il disparaît dès que vous tapez.',
          legendes: [
            { n: 1, selecteur: 'champ=Email', element: 'Champ « Email »', role: 'L’adresse que vous avez communiquée à l’établissement. C’est elle qui relie votre compte à vos enfants.' },
            { n: 2, selecteur: 'champ=Mot de passe', element: 'Champ « Mot de passe »', role: 'Votre mot de passe. L’icône d’œil barré l’affiche en clair, le temps de vérifier votre saisie.' },
            { n: 3, selecteur: 'texte=Se connecter', cote: 'droite', element: 'Bouton « Se connecter »', role: 'Valide la connexion. En cas d’erreur, vérifiez d’abord l’adresse e-mail : c’est la source d’erreur la plus fréquente.' },
            { n: 4, selecteur: 'texte=Configurer un établissement', cote: 'bas', element: 'Lien « Configurer un établissement »', role: 'Ne vous concerne pas : il sert à enregistrer un établissement entier. Ne cliquez pas dessus.' },
          ],
          procedure: [
            'Ouvrez votre navigateur à l’adresse indiquée par l’établissement.',
            'Saisissez votre adresse e-mail.',
            'Saisissez votre mot de passe.',
            'Cliquez sur « Se connecter ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Il n’y a pas de lien « Mot de passe oublié ». Contactez le secrétariat : lui seul peut vous attribuer un nouveau mot de passe.',
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
            'Le résumé de la scolarité : assiduité, derniers appels, dernières notes. Tout y concerne l’enfant sélectionné en haut de l’écran.',
          fiche: {
            menu: 'Espace Famille',
            adresse: '/app/parent',
            profil: 'Parent',
            prerequis: 'Au moins un enfant rattaché à votre compte.',
            resultat: 'Vue d’ensemble de la scolarité de l’enfant choisi.',
          },
          paragraphe:
            'La barre d’onglets du haut porte le nom de chacun de vos enfants. L’onglet actif décide de tout ce qui s’affiche en dessous.',
          legendes: [
            { n: 1, selecteur: 'contient=ENFANT', cote: 'droite', element: 'Barre de sélection de l’enfant', role: 'Un onglet par enfant, avec sa classe. Cliquez sur un nom pour basculer tout l’écran sur cet enfant.' },
            { n: 2, selecteur: 'bloc=Taux de présence', cote: 'bas', element: 'Indicateurs d’assiduité', role: 'Taux de présence, séances suivies, retards et absences, cumulés sur l’année. Le premier indicateur à regarder.' },
            { n: 3, selecteur: 'bloc=Derniers appels', cote: 'droite', element: 'Bloc « Derniers appels »', role: 'Les appels les plus récents faits par les enseignants, avec la matière et la date. « Tout voir » ouvre l’historique complet.' },
            { n: 4, selecteur: 'contient=RACCOURCIS', cote: 'droite', element: 'Barre « Raccourcis »', role: 'Quatre boutons vers les écrans les plus consultés. Ils font la même chose que les entrées du menu.' },
            { n: 5, selecteur: 'contient=Aucun cours programmé aujourd\'hui.', cote: 'droite', element: 'Cours du jour', role: 'Les cours de votre enfant aujourd’hui. Vide pendant les vacances ou le week-end : ce n’est pas une panne.' },
          ],
          procedure: [
            'Connectez-vous : l’Espace Famille s’ouvre automatiquement.',
            'Vérifiez le nom de l’enfant sélectionné dans la barre d’onglets.',
            'Lisez le taux de présence et le nombre d’absences.',
            'Utilisez les raccourcis pour ouvrir les notes ou les bulletins.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Vérifiez toujours quel enfant est affiché',
              texte:
                'Si vous avez plusieurs enfants dans l’établissement, l’application en affiche un seul à la fois. Une moyenne excellente lue en croyant qu’il s’agit de l’aîné alors qu’elle concerne le cadet est vite arrivée. Le nom de l’enfant est rappelé dans le titre de chaque écran.',
            },
            {
              type: 'savoir',
              texte:
                'Contrairement au primaire, l’assiduité du secondaire est relevée **séance par séance** : chaque professeur fait l’appel à chacun de ses cours. C’est ce qui permet un taux de présence aussi précis — et une note de conduite qui en découle.',
            },
          ],
        },
      ],
    },

    {
      titre: 'Suivre mon enfant',
      chapeau:
        'Quatre écrans : la fiche de vos enfants, leur semaine de cours, leur assiduité et leurs résultats. Tous se lisent enfant par enfant.',
      sections: [
        {
          ecran: 'mes-enfants',
          titre: 'Mes enfants',
          chapeau: 'La liste de vos enfants scolarisés dans l’établissement, avec un accès direct à leur suivi.',
          fiche: {
            menu: 'Ma famille › Mes enfants',
            adresse: '/app/parent/children',
            profil: 'Parent',
            prerequis: 'Vos enfants doivent être rattachés à votre compte.',
            resultat: 'La fiche de chaque enfant et les liens vers son suivi.',
          },
          paragraphe: 'Chaque carte reprend l’identité de l’enfant telle que l’établissement l’a enregistrée, et trois boutons vers ses écrans de suivi.',
          legendes: [
            { n: 1, selecteur: 'contient=2026-0001', cote: 'droite', element: 'Matricule de l’enfant', role: 'Son identifiant unique dans l’établissement. À citer dans tout échange avec le secrétariat.' },
            { n: 2, selecteur: 'contient=Inscrit', cote: 'droite', element: 'Étiquette « Inscrit »', role: 'Confirme que l’enfant est bien inscrit dans une classe pour l’année en cours. Sans cette mention, ses résultats n’apparaîtraient pas.' },
            { n: 3, selecteur: 'contient=Lien de parenté', cote: 'gauche', element: 'Ligne « Lien de parenté »', role: 'Le lien enregistré entre vous et l’enfant : père, mère ou tuteur.' },
            { n: 4, selecteur: 'texte=Présences', cote: 'gauche', element: 'Bouton « Présences »', role: 'Ouvre directement l’assiduité de cet enfant, sans passer par la barre d’onglets.' },
            { n: 5, selecteur: 'texte=Bulletins', cote: 'gauche', element: 'Bouton « Bulletins »', role: 'Ouvre directement les résultats et les bulletins de cet enfant.' },
          ],
          procedure: [
            'Ouvrez « Mes enfants » dans le menu.',
            'Vérifiez que tous vos enfants scolarisés y figurent.',
            'Contrôlez la date de naissance et le lien de parenté.',
            'Cliquez sur « Bulletins » ou « Présences » pour ouvrir le suivi.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Si l’un de vos enfants manque à cette liste, ou si une information est fausse, signalez-le au secrétariat. Vous ne pouvez rien corriger depuis votre espace.',
            },
          ],
        },
        {
          ecran: 'emploi-du-temps',
          titre: 'L’emploi du temps',
          chapeau: 'La semaine de votre enfant, heure par heure, avec la matière, la salle et le professeur.',
          fiche: {
            menu: 'Suivi scolaire › Emploi du Temps',
            adresse: '/app/parent/timetable',
            profil: 'Parent',
            prerequis: 'L’établissement doit avoir saisi l’emploi du temps de la classe.',
            resultat: 'La grille hebdomadaire de la classe de votre enfant.',
          },
          paragraphe: 'Chaque case donne la matière, la salle et le nom du professeur. Les créneaux vides portent un tiret.',
          legendes: [
            { n: 1, selecteur: 'contient=ENFANT', cote: 'droite', element: 'Barre de sélection de l’enfant', role: 'Chaque enfant a l’emploi du temps de sa classe. Vérifiez l’onglet actif avant de lire la grille.' },
            { n: 2, selecteur: 'champ=Année scolaire', cote: 'bas', element: 'Liste « Année scolaire »', role: 'L’année consultée, pré-remplie sur l’année en cours.' },
            { n: 3, selecteur: 'colonne=HORAIRES', cote: 'gauche', element: 'Colonne « Horaires »', role: 'Les créneaux de la journée, communs à toute la classe.' },
            { n: 4, selecteur: 'colonne=LUNDI', cote: 'haut', element: 'Colonnes des jours', role: 'Un jour par colonne. Chaque case porte la matière, la salle et le professeur.' },
          ],
          procedure: [
            'Ouvrez « Emploi du Temps » dans le menu.',
            'Sélectionnez l’enfant concerné dans la barre d’onglets.',
            'Lisez la colonne du jour voulu.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'La salle figure sous le nom de la matière : c’est l’information utile un jour de rendez-vous ou de retard.',
            },
          ],
        },
        {
          ecran: 'presences',
          titre: 'Les présences et l’assiduité',
          chapeau:
            'Chaque appel fait en classe, séance par séance. C’est l’écran le plus précis de votre espace — et celui qui explique la note de conduite.',
          fiche: {
            menu: 'Suivi scolaire › Présences',
            adresse: '/app/parent/attendance',
            profil: 'Parent',
            prerequis: 'Des appels saisis par les enseignants.',
            resultat: 'Le taux d’assiduité et l’historique séance par séance.',
          },
          paragraphe:
            'Quatre indicateurs résument l’année, puis l’historique détaille chaque séance. Les filtres permettent de cibler un trimestre ou une matière.',
          legendes: [
            { n: 1, selecteur: 'contient=Assiduité satisfaisante', cote: 'bas', element: 'Appréciation d’assiduité', role: 'Le jugement porté par l’application sur le taux de présence. Il n’a pas de valeur disciplinaire : il attire l’attention.' },
            { n: 2, selecteur: 'contient=Retards', cote: 'bas', element: 'Compteur « Retards »', role: 'Le nombre de retards relevés sur la période. Un retard n’est pas une absence et ne pénalise pas la conduite de la même façon.' },
            { n: 3, selecteur: 'contient=Absences non justifiées', cote: 'bas', element: 'Compteur « Absences non justifiées »', role: 'Les absences sans justificatif. Ce sont elles qui font baisser la note de conduite.' },
            { n: 4, selecteur: 'champ=Trimestre', cote: 'bas', element: 'Filtre « Trimestre »', role: 'Restreint le relevé à un trimestre. Utile pour comprendre une note de conduite trimestrielle.' },
            { n: 5, selecteur: 'champ=Matière', cote: 'bas', element: 'Filtre « Matière »', role: 'Restreint à une discipline : le moyen de voir si les absences se concentrent sur un cours précis.' },
          ],
          procedure: [
            'Ouvrez « Présences » dans le menu.',
            'Vérifiez l’enfant sélectionné.',
            'Lisez les quatre indicateurs du haut.',
            'Filtrez par trimestre ou par matière pour comprendre une note de conduite.',
            'Contactez le secrétariat pour justifier une absence.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Une absence portée à tort se corrige auprès de l’établissement, sur présentation d’un justificatif. Vous ne pouvez pas la modifier vous-même — et l’enseignant non plus au-delà d’un certain délai.',
            },
            {
              type: 'savoir',
              titre: 'D’où vient la note de conduite',
              texte:
                'L’élève part de 20 sur 20 et perd un point par tranche pleine de deux heures de cours manquées sans justificatif. Cette note compte ensuite dans la moyenne générale, comme une matière. C’est pourquoi une absence non justifiée coûte deux fois : en assiduité et en moyenne.',
            },
          ],
        },
        {
          ecran: 'resultats',
          titre: 'Résultats et bulletins',
          chapeau:
            'Les notes de votre enfant, matière par matière, avec les coefficients et la moyenne. Et, en bas, les bulletins de chaque trimestre.',
          fiche: {
            menu: 'Suivi scolaire › Résultats & Bulletins',
            adresse: '/app/parent/grades',
            profil: 'Parent',
            prerequis: 'Des notes saisies par les enseignants.',
            resultat: 'Le détail des notes et les bulletins publiés.',
          },
          paragraphe:
            'Chaque matière indique son coefficient, son nombre de notes et sa moyenne. Le coefficient dit le poids de la matière dans la moyenne générale.',
          legendes: [
            { n: 1, selecteur: 'contient=Moyenne de l\'année', cote: 'bas', element: 'Moyenne de l’année', role: 'La moyenne générale de votre enfant sur la période choisie, coefficients compris.' },
            { n: 2, selecteur: 'contient=Notes reçues', cote: 'bas', element: 'Compteur « Notes reçues »', role: 'Le nombre de notes saisies. Un chiffre faible en fin de trimestre signale des évaluations non encore saisies.' },
            { n: 3, selecteur: 'champ=Trimestre', cote: 'bas', element: 'Filtre « Trimestre »', role: 'Restreint à un trimestre. « Toute l’année » cumule les trois.' },
            { n: 4, selecteur: 'contient=Coef. 2 · 9 notes', cote: 'droite', element: 'Ligne d’une matière', role: 'Le coefficient de la matière, le nombre de notes et la moyenne obtenue. Cliquez pour déplier le détail note par note.' },
            { n: 5, selecteur: 'contient=ENFANT', cote: 'droite', element: 'Barre de sélection de l’enfant', role: 'Rappelez-vous de vérifier l’enfant affiché : les moyennes de deux enfants se ressemblent vite.' },
          ],
          procedure: [
            'Ouvrez « Résultats & Bulletins » dans le menu.',
            'Vérifiez l’enfant sélectionné.',
            'Choisissez le trimestre à consulter.',
            'Dépliez une matière pour voir le détail de ses notes.',
            'Consultez le bulletin du trimestre lorsqu’il est disponible.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Un bulletin « En préparation » n’est pas une erreur',
              texte:
                'Les bulletins ne deviennent visibles qu’une fois édités par l’administration, après le conseil de classe. Tant que ce n’est pas fait, le trimestre affiche « En préparation ». Les notes, elles, sont visibles au fil de leur saisie.',
            },
            {
              type: 'astuce',
              texte:
                'Ne lisez pas une moyenne isolément : regardez le coefficient. Un 8 sur 20 en mathématiques coefficient 4 pèse bien plus lourd qu’un 8 en éducation musicale coefficient 1.',
            },
          ],
        },
      ],
    },
  ],
};
