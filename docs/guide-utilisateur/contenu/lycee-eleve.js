/**
 * Contenu rédigé du Guide de l'élève — espace « Ma Scolarité ».
 *
 * Le guide s'adresse à un collégien ou un lycéen. Le ton reste le vouvoiement,
 * mais les phrases sont plus courtes encore que dans les autres guides, et
 * chaque écran répond à une question que l'élève se pose vraiment : où est mon
 * cours, combien d'absences ai-je, quelle est ma moyenne.
 */

module.exports = {
  meta: {
    titre: 'Guide de l’élève',
    sousTitre: 'HorizonEcole — Ma Scolarité',
    etablissement: 'Lycée Moderne de Cocody',
    profil: 'Élève',
    version: '1.0',
    adresse: 'http://localhost:5173/app',
    avertissement:
      'Ce guide décrit l’espace « Ma Scolarité » tel qu’il se présente à un élève du secondaire. ' +
      'Les copies d’écran proviennent du « Lycée Moderne de Cocody », un établissement de ' +
      'démonstration : les élèves qui y figurent sont fictifs.',
  },

  introduction: {
    titre: 'Bienvenue dans votre espace',
    paragraphes: [
      '« Ma Scolarité » vous permet de consulter votre emploi du temps, vos notes, vos absences et vos bulletins, depuis un téléphone ou un ordinateur.',
      'Votre espace est en lecture seule : vous consultez, vous ne modifiez rien. Une note qui vous semble fausse se signale à votre professeur ; une absence portée à tort, à la vie scolaire.',
      'Deux chiffres résument votre année et se retrouvent partout : votre **moyenne générale**, qui tient compte des coefficients de chaque matière, et votre **taux de présence**, calculé sur les appels faits en cours.',
      'Chaque copie d’écran porte des pastilles numérotées en rouge, expliquées dans le tableau qui suit l’image.',
    ],
    reperes: [
      ['Attention', 'Ce qu’il ne faut pas mal interpréter.'],
      ['Astuce', 'Le raccourci qui fait gagner du temps.'],
      ['À savoir', 'Ce que fait l’application en coulisse, et qui explique un affichage.'],
    ],
  },

  chapitres: [
    {
      titre: 'Prise en main',
      chapeau: 'Se connecter, et lire la page d’accueil qui résume votre scolarité.',
      sections: [
        {
          ecran: 'connexion',
          titre: 'Se connecter',
          chapeau: 'Vos identifiants vous ont été remis par l’établissement.',
          fiche: {
            menu: '—',
            adresse: '/app/login',
            profil: 'Élève',
            prerequis: 'Un compte ouvert par l’établissement.',
            resultat: 'Vous arrivez sur votre espace « Ma Scolarité ».',
          },
          paragraphe: 'L’écran ne demande que deux informations. Le texte grisé est un exemple : il disparaît dès que vous tapez.',
          legendes: [
            { n: 1, selecteur: 'champ=Email', element: 'Champ « Email »', role: 'L’identifiant que l’établissement vous a communiqué. Il est parfois long : recopiez-le exactement.' },
            { n: 2, selecteur: 'champ=Mot de passe', element: 'Champ « Mot de passe »', role: 'Votre mot de passe. L’icône d’œil barré l’affiche en clair, le temps de vérifier votre saisie.' },
            { n: 3, selecteur: 'texte=Se connecter', cote: 'droite', element: 'Bouton « Se connecter »', role: 'Valide la connexion et ouvre votre espace.' },
            { n: 4, selecteur: 'texte=Configurer un établissement', cote: 'bas', element: 'Lien « Configurer un établissement »', role: 'Ne vous concerne pas : il sert à enregistrer un établissement entier. Ne cliquez pas dessus.' },
          ],
          procedure: [
            'Ouvrez votre navigateur à l’adresse indiquée par l’établissement.',
            'Saisissez votre identifiant.',
            'Saisissez votre mot de passe.',
            'Cliquez sur « Se connecter ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Il n’y a pas de lien « Mot de passe oublié ». Adressez-vous à la vie scolaire, qui vous en attribuera un nouveau.',
            },
            {
              type: 'astuce',
              texte:
                'Sur un poste partagé — CDI, salle informatique —, déconnectez-vous par le menu de votre nom en bas de la barre latérale. Fermer l’onglet ne suffit pas.',
            },
          ],
        },
        {
          ecran: 'ma-scolarite',
          titre: 'Ma Scolarité',
          chapeau:
            'Votre page d’accueil : votre classe, votre moyenne, votre taux de présence, et vos cours du jour.',
          fiche: {
            menu: 'Ma Scolarité',
            adresse: '/app/student',
            profil: 'Élève',
            prerequis: 'Être inscrit dans une classe pour l’année en cours.',
            resultat: 'Vue d’ensemble de votre scolarité.',
          },
          paragraphe:
            'Les quatre raccourcis mènent aux écrans que vous consulterez le plus. En dessous, vos deux chiffres clés, puis vos cours du jour.',
          legendes: [
            { n: 1, selecteur: 'contient=MA CLASSE', cote: 'droite', element: 'Bloc « Ma classe »', role: 'Votre classe, votre matricule et votre état d’inscription. Le matricule est à citer dans tout échange avec le secrétariat.' },
            { n: 2, selecteur: 'contient=RACCOURCIS', cote: 'droite', element: 'Barre « Raccourcis »', role: 'Quatre boutons vers l’emploi du temps, les notes, les présences et les bulletins.' },
            { n: 3, selecteur: 'contient=Ma moyenne de l\'année', cote: 'bas', element: 'Ma moyenne de l’année', role: 'Votre moyenne générale, coefficients compris, sur l’ensemble de l’année.' },
            { n: 4, selecteur: 'contient=Mon taux de présence', cote: 'bas', element: 'Mon taux de présence', role: 'La part des séances où vous avez été noté présent. Il se calcule sur les appels faits par vos professeurs.' },
            { n: 5, selecteur: 'contient=Mes cours aujourd\'hui', cote: 'droite', element: 'Bloc « Mes cours aujourd’hui »', role: 'Vos cours du jour, tirés de votre emploi du temps. Vide le week-end et pendant les vacances.' },
          ],
          procedure: [
            'Connectez-vous : « Ma Scolarité » s’ouvre automatiquement.',
            'Vérifiez votre classe et votre matricule.',
            'Lisez votre moyenne et votre taux de présence.',
            'Utilisez les raccourcis pour ouvrir le détail.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Votre moyenne générale n’est pas la moyenne de vos notes. Chaque matière a un coefficient : les mathématiques coefficient 4 pèsent quatre fois plus que l’éducation musicale coefficient 1. La conduite entre aussi dans ce calcul.',
            },
          ],
        },
      ],
    },

    {
      titre: 'Mon suivi',
      chapeau:
        'Quatre écrans : votre semaine, vos absences, vos notes et vos bulletins. Ils répondent chacun à une question précise.',
      sections: [
        {
          ecran: 'mon-emploi-du-temps',
          titre: 'Mon emploi du temps',
          chapeau: 'Votre semaine de cours, avec la matière, la salle et le professeur.',
          fiche: {
            menu: 'Mon suivi › Mon Emploi du Temps',
            adresse: '/app/student/timetable',
            profil: 'Élève',
            prerequis: 'Un emploi du temps saisi pour votre classe.',
            resultat: 'La grille hebdomadaire de votre classe.',
          },
          paragraphe: 'Chaque case donne la matière, la salle et le nom du professeur. Les créneaux libres portent un tiret.',
          legendes: [
            { n: 1, selecteur: 'contient=Ma semaine de cours — classe de 6ème A.', cote: 'bas', element: 'Sous-titre de l’écran', role: 'Rappelle votre classe. L’emploi du temps est celui de la classe entière, pas le vôtre en propre.' },
            { n: 2, selecteur: 'champ=Année scolaire', cote: 'bas', element: 'Liste « Année scolaire »', role: 'L’année consultée, pré-remplie sur l’année en cours.' },
            { n: 3, selecteur: 'colonne=HORAIRES', cote: 'gauche', element: 'Colonne « Horaires »', role: 'Les créneaux de la journée. Les récréations et la pause du midi y figurent aussi.' },
            { n: 4, selecteur: 'colonne=LUNDI', cote: 'haut', element: 'Colonnes des jours', role: 'Un jour par colonne. Chaque case porte la matière, la salle et le professeur.' },
          ],
          procedure: [
            'Ouvrez « Mon Emploi du Temps ».',
            'Repérez la colonne du jour.',
            'Notez la salle, indiquée sous le nom de la matière.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un cours déplacé par un professeur n’apparaît pas forcément ici tant que la vie scolaire ne l’a pas validé. En cas de doute, fiez-vous à l’affichage de l’établissement.',
            },
          ],
        },
        {
          ecran: 'mes-presences',
          titre: 'Mes présences',
          chapeau:
            'Chaque appel fait en cours, séance par séance. C’est ici que vous vérifiez une absence que vous croyez injustifiée.',
          fiche: {
            menu: 'Mon suivi › Mes Présences',
            adresse: '/app/student/attendance',
            profil: 'Élève',
            prerequis: 'Des appels saisis par vos professeurs.',
            resultat: 'Votre taux d’assiduité et l’historique de vos séances.',
          },
          paragraphe:
            'Quatre indicateurs résument la période, puis l’historique détaille chaque séance, de la plus récente à la plus ancienne.',
          legendes: [
            { n: 1, selecteur: 'contient=Assiduité satisfaisante', cote: 'bas', element: 'Appréciation d’assiduité', role: 'Le jugement porté par l’application sur votre taux de présence.' },
            { n: 2, selecteur: 'contient=Absences non justifiées', cote: 'bas', element: 'Compteur « Absences non justifiées »', role: 'Les absences sans justificatif. Ce sont elles qui font baisser votre note de conduite.' },
            { n: 3, selecteur: 'champ=Matière', cote: 'bas', element: 'Filtre « Matière »', role: 'Restreint le relevé à une matière. Utile pour vérifier une absence contestée dans un cours précis.' },
            { n: 4, selecteur: 'contient=Historique des séances', cote: 'droite', element: 'Historique des séances', role: 'Chaque séance appelée, avec sa date, son horaire, sa matière et votre statut ce jour-là.' },
            { n: 5, selecteur: 'aria=Nombre de séances par page', cote: 'gauche', element: 'Nombre de séances par page', role: 'Règle la longueur de la liste. Augmentez-le pour parcourir tout un trimestre d’un coup.' },
          ],
          procedure: [
            'Ouvrez « Mes Présences ».',
            'Lisez les quatre indicateurs du haut.',
            'Filtrez par trimestre ou par matière si nécessaire.',
            'Repérez la séance contestée dans l’historique.',
            'Présentez votre justificatif à la vie scolaire.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Une absence non justifiée coûte deux fois',
              texte:
                'Vous partez de 20 sur 20 en conduite et perdez un point par tranche pleine de deux heures manquées sans justificatif. Cette note de conduite compte ensuite dans votre moyenne générale, comme une matière. Une absence non régularisée pèse donc sur votre assiduité **et** sur votre moyenne.',
            },
            {
              type: 'astuce',
              texte:
                'Un retard n’est pas une absence : il est compté à part et ne pénalise pas la conduite de la même façon. Si un retard a été saisi comme une absence, signalez-le.',
            },
          ],
        },
        {
          ecran: 'mes-notes',
          titre: 'Mes notes',
          chapeau:
            'Toutes vos notes, matière par matière, avec le type d’évaluation et le coefficient. L’écran qui explique votre moyenne.',
          fiche: {
            menu: 'Mon suivi › Mes Notes',
            adresse: '/app/student/grades',
            profil: 'Élève',
            prerequis: 'Des notes saisies par vos professeurs.',
            resultat: 'Le détail de vos notes et vos moyennes par matière.',
          },
          paragraphe:
            'Chaque matière indique son coefficient, son nombre de notes et votre moyenne. Dépliez une matière pour voir chaque note et son type.',
          legendes: [
            { n: 1, selecteur: 'contient=Moyenne de l\'année', cote: 'bas', element: 'Moyenne de l’année', role: 'Votre moyenne générale sur la période choisie, coefficients compris.' },
            { n: 2, selecteur: 'contient=Notes reçues', cote: 'bas', element: 'Compteur « Notes reçues »', role: 'Le nombre de notes déjà saisies. Une évaluation rendue mais absente d’ici n’a pas encore été saisie par le professeur.' },
            { n: 3, selecteur: 'champ=Trimestre', cote: 'bas', element: 'Filtre « Trimestre »', role: 'Restreint à un trimestre. « Toute l’année » cumule les trois.' },
            { n: 4, selecteur: 'contient=Coef. 2 · 9 notes', cote: 'droite', element: 'Ligne d’une matière', role: 'Le coefficient de la matière, le nombre de notes et votre moyenne. Cliquez pour déplier le détail.' },
            { n: 5, selecteur: 'contient=Composition n°3', cote: 'droite', element: 'Détail d’une note', role: 'Le type d’évaluation, son coefficient propre et sa date. Une composition pèse souvent plus qu’un devoir ordinaire.' },
          ],
          procedure: [
            'Ouvrez « Mes Notes ».',
            'Choisissez le trimestre à consulter.',
            'Repérez les matières où votre moyenne est la plus basse.',
            'Dépliez-les pour voir quelles évaluations ont pesé.',
          ],
          encarts: [
            {
              type: 'savoir',
              titre: 'Deux coefficients, deux effets',
              texte:
                'Le coefficient d’une **évaluation** pondère vos notes entre elles à l’intérieur d’une matière : une composition ×2 compte double face à un devoir ×1. Le coefficient d’une **matière** pondère les matières entre elles dans votre moyenne générale. Les deux se cumulent.',
            },
            {
              type: 'astuce',
              texte:
                'Pour progresser, regardez d’abord les matières à fort coefficient. Un point gagné en mathématiques coefficient 4 vaut quatre points gagnés dans une matière coefficient 1.',
            },
          ],
        },
        {
          ecran: 'mes-bulletins',
          titre: 'Mes bulletins',
          chapeau:
            'Vos résultats trimestre par trimestre. Un bulletin n’apparaît qu’une fois édité par l’administration.',
          fiche: {
            menu: 'Mon suivi › Mes Bulletins',
            adresse: '/app/student/bulletins',
            profil: 'Élève',
            prerequis: 'Un bulletin édité par l’administration.',
            resultat: 'Vos moyennes générales trimestrielles et leur détail.',
          },
          paragraphe:
            'Chaque trimestre occupe un bloc. Deux états possibles : « Disponible », avec la moyenne et la date d’édition, ou « En préparation ».',
          legendes: [
            { n: 1, selecteur: 'contient=Bulletin édité le 19 décembre 2025', cote: 'droite', element: 'Date d’édition', role: 'La date à laquelle l’administration a édité le bulletin. Elle est imprimée sur le document officiel.' },
            { n: 2, selecteur: 'contient=MOYENNE GÉNÉRALE', cote: 'gauche', element: 'Moyenne générale du trimestre', role: 'Votre moyenne du trimestre, coefficients et conduite compris, avec son appréciation.' },
            { n: 3, selecteur: 'texte=Voir le détail par matière', cote: 'gauche', element: 'Bouton « Voir le détail par matière »', role: 'Déplie la moyenne obtenue dans chaque matière pour ce trimestre.' },
            { n: 4, selecteur: 'contient=En préparation', cote: 'droite', element: 'État « En préparation »', role: 'Le bulletin n’a pas encore été édité par l’administration. Vos notes du trimestre restent visibles depuis « Mes Notes ».' },
          ],
          procedure: [
            'Ouvrez « Mes Bulletins ».',
            'Repérez le trimestre voulu.',
            'Cliquez sur « Voir le détail par matière » pour déplier vos moyennes.',
            'Si le trimestre affiche « En préparation », consultez « Mes Notes » en attendant.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                '« En préparation » ne signifie pas que vos notes sont perdues. Le bulletin est un document que l’administration édite après le conseil de classe : il devient visible à ce moment-là, et pas avant.',
            },
            {
              type: 'savoir',
              texte:
                'La moyenne du bulletin peut différer légèrement de celle affichée dans « Mes Notes » si une note a été corrigée après l’édition. C’est le bulletin, avec sa date, qui fait foi.',
            },
          ],
        },
      ],
    },
  ],
};
