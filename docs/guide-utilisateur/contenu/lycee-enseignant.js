/**
 * Contenu rédigé du Guide de l'enseignant — collège et lycée.
 *
 * Au secondaire, l'enseignant assure une matière dans plusieurs classes.
 * Son quotidien tient en deux gestes : faire l'appel à chaque séance, et
 * saisir ses notes. Tout le reste — coefficients, bulletins, conduite — est
 * réglé par l'administration.
 */

module.exports = {
  meta: {
    titre: 'Guide de l’enseignant',
    sousTitre: 'HorizonEcole — Collège et Lycée',
    etablissement: 'Lycée Moderne de Cocody',
    profil: 'Enseignant',
    version: '1.0',
    adresse: 'http://localhost:5173/app',
    avertissement:
      'Ce guide décrit l’application telle qu’elle se présente à un enseignant du secondaire. ' +
      'Les copies d’écran proviennent du « Lycée Moderne de Cocody », un établissement de ' +
      'démonstration : les élèves qui y figurent sont fictifs.',
  },

  introduction: {
    titre: 'À qui s’adresse ce guide',
    paragraphes: [
      'Ce guide s’adresse aux professeurs d’un collège ou d’un lycée. Il n’exige aucune compétence informatique : si vous savez tenir un cahier de textes et un carnet de notes, ces écrans ne vous surprendront pas.',
      'Votre espace est cadré par vos affectations. Vous ne voyez que les classes où vous intervenez, et que la matière que vous y enseignez. Vous n’avez ni coefficients à régler, ni bulletins à éditer : cela relève de l’administration.',
      'Deux gestes font l’essentiel de votre travail dans l’application. **Faire l’appel** à chaque séance : c’est de là que sortent l’assiduité et la note de conduite de vos élèves. **Saisir vos notes** : c’est de là que sortent les moyennes et les classements.',
      'Chaque copie d’écran porte des pastilles numérotées en rouge, expliquées dans le tableau qui suit l’image.',
    ],
    reperes: [
      ['Attention', 'Ce qui casse, ou ce qui ne se rattrape pas facilement.'],
      ['Astuce', 'Le raccourci de ceux qui utilisent l’application tous les jours.'],
      ['À savoir', 'Ce que fait l’application en coulisse, et qui explique un comportement.'],
    ],
  },

  chapitres: [
    {
      titre: 'Prise en main',
      chapeau: 'Entrer dans l’application, et voir en un coup d’œil ce qui vous attend aujourd’hui.',
      sections: [
        {
          ecran: 'connexion',
          titre: 'Se connecter',
          chapeau: 'Vos identifiants vous ont été remis par l’administration. C’est votre adresse e-mail qui vous identifie.',
          fiche: {
            menu: '—',
            adresse: '/app/login',
            profil: 'Enseignant',
            prerequis: 'Un compte créé par l’administration.',
            resultat: 'Vous arrivez sur votre tableau de bord.',
          },
          paragraphe: 'L’écran ne demande que deux informations. Le texte grisé est un exemple : il disparaît dès que vous tapez.',
          legendes: [
            { n: 1, selecteur: 'champ=Email', element: 'Champ « Email »', role: 'L’adresse enregistrée sur votre fiche. Si vous en changez, prévenez le secrétariat : c’est elle qui vous ouvre l’application.' },
            { n: 2, selecteur: 'champ=Mot de passe', element: 'Champ « Mot de passe »', role: 'Votre mot de passe. L’icône d’œil barré l’affiche en clair, le temps de vérifier une faute de frappe.' },
            { n: 3, selecteur: 'texte=Se connecter', cote: 'droite', element: 'Bouton « Se connecter »', role: 'Valide la connexion et vous conduit à vos classes.' },
            { n: 4, selecteur: 'texte=Configurer un établissement', cote: 'bas', element: 'Lien « Configurer un établissement »', role: 'Ne vous concerne pas : il sert à enregistrer un établissement entier. Ne cliquez jamais dessus.' },
          ],
          procedure: [
            'Ouvrez votre navigateur à l’adresse de l’application.',
            'Saisissez l’adresse e-mail communiquée par l’établissement.',
            'Saisissez votre mot de passe.',
            'Cliquez sur « Se connecter ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Il n’existe pas de lien « Mot de passe oublié ». Seul le secrétariat peut vous attribuer un nouveau mot de passe.',
            },
            {
              type: 'astuce',
              texte:
                'En salle des professeurs, déconnectez-vous par le menu de votre nom en bas de la barre latérale. Fermer l’onglet ne suffit pas.',
            },
          ],
        },
        {
          ecran: 'tableau-de-bord',
          titre: 'Le tableau de bord',
          chapeau: 'Votre page d’accueil répond à deux questions : quels cours ai-je aujourd’hui, et quelles sont mes classes.',
          fiche: {
            menu: 'Tableau de bord',
            adresse: '/app/dashboard',
            profil: 'Enseignant',
            prerequis: 'Être affecté à au moins une classe.',
            resultat: 'Vos cours du jour et l’accès direct à l’appel et aux notes.',
          },
          paragraphe:
            'Les quatre raccourcis du haut mènent aux écrans que vous utiliserez le plus. En dessous, vos cours du jour, puis vos classes.',
          legendes: [
            { n: 1, selecteur: 'contient=Bonjour, Koffi N’Guessan', cote: 'bas', element: 'Salutation et date', role: 'Votre nom et la date du jour. C’est cette date qui détermine les cours affichés en dessous.' },
            { n: 2, selecteur: 'texte=Faire l\'appel', cote: 'bas', element: 'Raccourci « Faire l’appel »', role: 'Ouvre directement l’écran d’appel, sur la journée en cours. Le geste le plus fréquent de votre journée.' },
            { n: 3, selecteur: 'texte=Saisir des notes', cote: 'bas', element: 'Raccourci « Saisir des notes »', role: 'Ouvre la grille de saisie des notes, à filtrer ensuite par classe et par matière.' },
            { n: 4, selecteur: 'bloc=Mes cours du jour', cote: 'droite', element: 'Bloc « Mes cours du jour »', role: 'Les séances que vous avez aujourd’hui, tirées de votre emploi du temps. Hors période scolaire, il est normalement vide.' },
            { n: 5, selecteur: 'bloc=Mes classes', cote: 'droite', element: 'Bloc « Mes classes »', role: 'Les classes où vous intervenez, avec la matière que vous y assurez. Si une classe manque, c’est une affectation qui manque.' },
          ],
          procedure: [
            'Connectez-vous : le tableau de bord s’ouvre automatiquement.',
            'Lisez « Mes cours du jour » pour connaître vos séances.',
            'Cliquez sur « Faire l’appel » avant ou pendant le cours.',
            'Cliquez sur « Saisir des notes » après une évaluation.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Hors période scolaire — pendant les vacances ou après la fin de l’année —, le bloc « Mes cours du jour » affiche « Aucun cours programmé aujourd’hui ». Ce n’est pas une panne : votre emploi du temps ne prévoit simplement rien ce jour-là.',
            },
            {
              type: 'attention',
              texte:
                'Si le bloc « Mes classes » est vide, l’administration ne vous a affecté à aucune classe pour l’année en cours. Vous ne pourrez ni faire l’appel, ni saisir de notes : signalez-le au secrétariat.',
            },
          ],
        },
      ],
    },

    {
      titre: 'Mon planning',
      chapeau:
        'Vos classes, votre semaine, et l’appel. C’est la partie de l’application que vous ouvrirez chaque jour.',
      sections: [
        {
          ecran: 'mes-classes',
          titre: 'Mes classes',
          chapeau: 'La liste de vos affectations : où vous intervenez, et dans quelle matière.',
          fiche: {
            menu: 'Mon Planning › Mes Classes',
            adresse: '/app/teacher/my-classes',
            profil: 'Enseignant',
            prerequis: 'Être affecté à au moins une classe.',
            resultat: 'La liste de vos classes et matières pour l’année.',
          },
          paragraphe: 'Chaque ligne associe une classe et une matière. Un même professeur peut apparaître plusieurs fois s’il enseigne deux matières.',
          legendes: [
            { n: 1, selecteur: 'contient=Vos classes et matières — 2025-2026.', cote: 'bas', element: 'Sous-titre de l’écran', role: 'Rappelle l’année scolaire concernée. Vos affectations sont propres à une année.' },
            { n: 2, selecteur: 'champ=Rechercher', element: 'Case « Rechercher »', role: 'Filtre vos classes par leur nom. Utile quand on en a une dizaine.' },
            { n: 3, selecteur: 'contient=6ème A', cote: 'droite', element: 'Une classe et sa matière', role: 'La classe où vous intervenez et la matière que vous y assurez. C’est ce couple qui ouvre la saisie des notes.' },
          ],
          procedure: [
            'Ouvrez Mon Planning › Mes Classes.',
            'Vérifiez que toutes vos affectations y figurent.',
            'Signalez au secrétariat toute classe manquante.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Cet écran est le miroir de vos affectations. S’il ne montre pas une classe où vous enseignez réellement, vous ne pourrez ni y faire l’appel ni y saisir de notes. C’est le premier écran à vérifier à la rentrée.',
            },
          ],
        },
        {
          ecran: 'mon-emploi-du-temps',
          titre: 'Mon emploi du temps',
          chapeau: 'Votre semaine, telle que l’administration l’a bâtie. C’est elle qui commande vos appels.',
          fiche: {
            menu: 'Mon Planning › Mon Emploi du Temps',
            adresse: '/app/teacher/my-timetable',
            profil: 'Enseignant',
            prerequis: 'Un emploi du temps saisi par l’administration.',
            resultat: 'Vos cours de la semaine, avec classe et salle.',
          },
          paragraphe: 'Chaque case donne la matière, la salle et la classe. Les créneaux sans cours portent un tiret.',
          legendes: [
            { n: 1, selecteur: 'champ=Année scolaire', cote: 'bas', element: 'Liste « Année scolaire »', role: 'L’année affichée, pré-remplie sur l’année en cours.' },
            { n: 2, selecteur: 'colonne=HORAIRES', cote: 'gauche', element: 'Colonne « Horaires »', role: 'Les créneaux de la journée, communs à tout l’établissement.' },
            { n: 3, selecteur: 'colonne=LUNDI', cote: 'haut', element: 'Colonnes des jours', role: 'Un jour par colonne. Chaque case porte la matière, la salle et la classe concernée.' },
          ],
          procedure: [
            'Ouvrez Mon Planning › Mon Emploi du Temps.',
            'Repérez vos créneaux de la semaine.',
            'Notez les salles : elles figurent sous le nom de la matière.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Vous ne pouvez pas modifier cet emploi du temps : il est bâti par l’administration. Une erreur — une salle occupée, un créneau impossible — se signale au secrétariat, qui seul peut le corriger.',
            },
          ],
        },
        {
          ecran: 'liste-presence',
          titre: 'Faire l’appel',
          chapeau:
            'L’appel est adossé à votre emploi du temps : l’application vous propose les séances du jour, et vous n’avez qu’à pointer.',
          fiche: {
            menu: 'Mon Planning › Liste de Présence',
            adresse: '/app/teacher/attendance',
            profil: 'Enseignant',
            prerequis: 'Une séance à votre emploi du temps ce jour-là.',
            resultat: 'Les présences enregistrées, et la conduite des élèves mise à jour.',
          },
          paragraphe:
            'L’écran s’ouvre sur la journée en cours. Les flèches « Jour précédent » et « Jour suivant » permettent de rattraper un appel oublié.',
          legendes: [
            { n: 1, selecteur: 'texte=Faire l\'appel', cote: 'bas', element: 'Onglet « Faire l’appel »', role: 'La journée en cours et ses séances. C’est ici que se fait le pointage.' },
            { n: 2, selecteur: 'texte=Historique', cote: 'bas', element: 'Onglet « Historique »', role: 'Tous les appels déjà faits, séance par séance. À consulter pour vérifier ou corriger.' },
            { n: 3, selecteur: 'texte=Jour précédent', cote: 'bas', element: 'Boutons de navigation', role: 'Changent la journée affichée. Le moyen de rattraper un appel non fait la veille.' },
            { n: 4, selecteur: 'contient=Aucun cours ce jour', cote: 'droite', element: 'Message « Aucun cours ce jour »', role: 'Il n’y a pas de séance à appeler à cette date. Ce n’est pas une panne : votre emploi du temps ne prévoit rien ce jour-là.' },
          ],
          procedure: [
            'Ouvrez Mon Planning › Liste de Présence.',
            'Vérifiez la date affichée ; au besoin, reculez d’un jour.',
            'Sélectionnez la séance concernée.',
            'Pointez chaque élève : présent, en retard ou absent.',
            'Enregistrez avant de quitter l’écran.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Un appel non fait fausse la conduite',
              texte:
                'La note de conduite de vos élèves est calculée à partir des heures manquées. Une séance non appelée ne compte aucune absence : les élèves absents ce jour-là sont crédités d’une présence qu’ils n’ont pas eue. Vos séances non appelées apparaissent d’ailleurs à l’administration, dans « Séances non tenues ».',
            },
          ],
        },
        {
          ecran: 'presence-historique',
          titre: 'L’historique des appels',
          chapeau:
            'Tous vos appels, séance par séance, avec le décompte des présents, des retards et des absents.',
          fiche: {
            menu: 'Mon Planning › Liste de Présence › Historique',
            adresse: '/app/teacher/attendance',
            profil: 'Enseignant',
            prerequis: 'Des appels déjà saisis.',
            resultat: 'La liste de vos séances appelées, filtrable et consultable.',
          },
          paragraphe:
            'Le tableau est trié du plus récent au plus ancien. Le bouton « Voir » rouvre le détail d’une séance.',
          legendes: [
            { n: 1, selecteur: 'champ=Classe', cote: 'bas', element: 'Filtre « Classe »', role: 'Restreint l’historique à une classe.' },
            { n: 2, selecteur: 'colonne=DATE', cote: 'haut', element: 'Colonne « Date »', role: 'La date de la séance appelée.' },
            { n: 3, selecteur: 'colonne=PRÉSENTS', cote: 'haut', element: 'Colonnes de décompte', role: 'Présents, retards et absents relevés lors de la séance. Un total inférieur à l’effectif signale un appel incomplet.' },
            { n: 4, selecteur: 'texte=Voir', cote: 'gauche', element: 'Bouton « Voir »', role: 'Rouvre le détail de la séance, élève par élève, pour vérifier ou corriger un pointage.' },
          ],
          procedure: [
            'Ouvrez Mon Planning › Liste de Présence, puis l’onglet « Historique ».',
            'Filtrez au besoin sur une classe ou une matière.',
            'Repérez la séance à vérifier.',
            'Cliquez sur « Voir » pour en consulter le détail.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'Avant un conseil de classe, parcourez cet historique : il vous donne, en une page, la matière où la classe est la plus absente.',
            },
          ],
        },
        {
          ecran: 'rattrapage',
          titre: 'Rattrapage et déplacement de cours',
          chapeau:
            'Deux besoins dans un seul écran : reprogrammer une séance qui n’a pas eu lieu, ou demander à déplacer un cours à venir.',
          fiche: {
            menu: 'Mon Planning › Rattrapage',
            adresse: '/app/teacher/makeup',
            profil: 'Enseignant',
            prerequis: 'Un emploi du temps saisi.',
            resultat: 'Une séance reprogrammée, ou une demande de déplacement soumise à l’administration.',
          },
          paragraphe:
            'L’onglet « À rattraper » liste vos séances sans appel. Le nombre entre parenthèses en donne l’ampleur.',
          legendes: [
            { n: 1, selecteur: 'texte=À rattraper', cote: 'bas', element: 'Onglet « À rattraper »', role: 'Les séances prévues à votre emploi du temps pour lesquelles aucun appel n’a été fait.' },
            { n: 2, selecteur: 'texte=Cours à venir', cote: 'bas', element: 'Onglet « Cours à venir »', role: 'Vos prochaines séances, pour en demander le déplacement.' },
            { n: 3, selecteur: 'texte=Décisions', cote: 'bas', element: 'Onglet « Décisions »', role: 'Les suites données par l’administration à vos demandes de déplacement.' },
            { n: 4, selecteur: 'texte=Programmer', cote: 'gauche', element: 'Bouton « Programmer »', role: 'Fixe une date de rattrapage pour la séance. Elle réapparaîtra alors dans vos appels à cette date.' },
            { n: 5, selecteur: 'texte=Écarter', cote: 'gauche', element: 'Bouton « Écarter »', role: 'Retire la séance de la liste sans la rattraper — pour un jour férié ou une sortie scolaire.' },
          ],
          procedure: [
            'Ouvrez Mon Planning › Rattrapage.',
            'Parcourez l’onglet « À rattraper ».',
            'Cliquez sur « Programmer » pour fixer une date de rattrapage, ou sur « Écarter » si la séance n’a pas lieu d’être.',
            'Pour déplacer un cours à venir, passez par l’onglet « Cours à venir » et attendez la validation de l’administration.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un nombre élevé de séances « à rattraper » en début d’usage vient souvent de l’emploi du temps, pas de vous : toute séance inscrite à la grille et jamais assurée y figure. Signalez-le plutôt que de les écarter une par une.',
            },
          ],
        },
      ],
    },

    {
      titre: 'Les évaluations',
      chapeau:
        'D’abord définir ses types d’évaluation, ensuite saisir les notes, enfin lire les classements. Cet ordre n’est pas facultatif : sans type d’évaluation, la grille de saisie n’a aucune colonne.',
      sections: [
        {
          ecran: 'types-evaluation',
          titre: 'Les types d’évaluation',
          chapeau:
            'Un type d’évaluation, c’est une colonne de votre carnet de notes : « Devoir 1 », « Composition ». Chacun porte son propre coefficient.',
          fiche: {
            menu: 'Évaluations › Types d’Évaluation',
            adresse: '/app/evaluations/types',
            profil: 'Enseignant',
            prerequis: 'Être affecté à la classe et à la matière.',
            resultat: 'Les colonnes de votre grille de saisie, pour cette classe et cette matière.',
          },
          paragraphe:
            'Les types sont propres au couple classe + matière : vos devoirs de 6ème A en français ne sont pas ceux de la 5ème B.',
          legendes: [
            { n: 1, selecteur: 'champ=Classe', cote: 'bas', element: 'Liste « Classe »', role: 'La classe concernée. Seules vos classes sont proposées.' },
            { n: 2, selecteur: 'champ=Matière', cote: 'bas', element: 'Liste « Matière »', role: 'La matière concernée. Tant que classe et matière ne sont pas choisies, l’écran reste vide.' },
            { n: 3, selecteur: 'texte=Nouveau type', cote: 'gauche', element: 'Bouton « Nouveau type »', role: 'Ajoute une colonne à votre carnet : son nom, son numéro, sa note maximale et son coefficient.' },
            { n: 4, selecteur: 'contient=Coefficientée ×2', cote: 'droite', element: 'Coefficient du type', role: 'Le poids de cette évaluation dans la moyenne de la matière. Une composition à ×2 pèse deux fois plus qu’un devoir ordinaire.' },
            { n: 5, selecteur: 'contient=Note sur 20', cote: 'droite', element: 'Note maximale', role: 'Le barème de l’évaluation. La saisie refusera toute note supérieure.' },
          ],
          procedure: [
            'Ouvrez Évaluations › Types d’Évaluation.',
            'Choisissez la classe puis la matière.',
            'Cliquez sur « Nouveau type ».',
            'Renseignez le nom, le numéro, la note maximale et le coefficient.',
            'Répétez pour chaque évaluation prévue au trimestre.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Sans type d’évaluation, pas de saisie',
              texte:
                'La grille de saisie des notes a une colonne par type d’évaluation. Tant que vous n’en avez créé aucun, elle est vide et vous ne pouvez rien saisir. C’est le premier geste du trimestre.',
            },
            {
              type: 'savoir',
              texte:
                'Deux coefficients coexistent, et il ne faut pas les confondre. Celui-ci pondère vos évaluations **entre elles**, à l’intérieur de la matière. Le coefficient de la matière, réglé par l’administration, pondère les matières entre elles dans la moyenne générale.',
            },
          ],
        },
        {
          ecran: 'notes-classements',
          titre: 'Saisir les notes',
          chapeau:
            'Vos élèves en lignes, vos évaluations en colonnes. La moyenne se recalcule à mesure que vous tapez.',
          fiche: {
            menu: 'Évaluations › Notes & Classements',
            adresse: '/app/evaluations/grades',
            profil: 'Enseignant',
            prerequis: 'Des types d’évaluation créés pour la classe et la matière.',
            resultat: 'Les notes enregistrées et les moyennes calculées.',
          },
          paragraphe:
            'Saisissez directement dans la cellule ; la touche Entrée passe à l’élève suivant. Le bandeau du haut rappelle le trimestre actif.',
          legendes: [
            { n: 1, selecteur: 'contient=Trimestre actif', cote: 'bas', element: 'Rappel du trimestre actif', role: 'Le trimestre proposé par défaut, déduit de la date du jour. Vérifiez-le avant de saisir : une note portée au mauvais trimestre est invisible dans le bon.' },
            { n: 2, selecteur: 'champ=Trimestre', cote: 'bas', element: 'Filtre « Trimestre »', role: 'Le trimestre de saisie. Un trimestre terminé passe en lecture seule.' },
            { n: 3, selecteur: 'champ=Matière', cote: 'bas', element: 'Filtres « Classe » et « Matière »', role: 'Le couple qui détermine la grille. En changer recharge tout le tableau.' },
            { n: 4, selecteur: 'colonne=MOY. /20', cote: 'haut', element: 'Colonne « Moy. »', role: 'La moyenne de l’élève dans la matière, pondérée par les coefficients de vos évaluations. Elle se recalcule en direct.' },
            { n: 5, selecteur: 'aria=Note Devoir 1 N°1', cote: 'haut', element: 'Cellule de note', role: 'La note d’un élève pour une évaluation. Une valeur supérieure au barème est refusée.' },
          ],
          procedure: [
            'Ouvrez Évaluations › Notes & Classements.',
            'Vérifiez le trimestre, puis choisissez la classe et la matière.',
            'Saisissez les notes colonne par colonne, en validant par Entrée.',
            'Contrôlez la colonne « Moy. » : une valeur aberrante trahit une faute de frappe.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'L’application se place d’elle-même sur le trimestre en cours à la date du jour. En période de vacances ou en fin d’année, ce n’est pas forcément le trimestre que vous voulez saisir. Regardez le bandeau avant de commencer.',
            },
            {
              type: 'astuce',
              texte:
                'Saisissez évaluation par évaluation — une colonne entière — plutôt qu’élève par élève. Vous corrigez vos copies dans cet ordre, et l’œil repère bien plus vite une case oubliée dans une colonne.',
            },
          ],
        },
        {
          ecran: 'moyennes-trimestre',
          titre: 'Les moyennes et le classement',
          chapeau:
            'Le résultat de votre saisie : vos élèves classés par moyenne, dans votre matière, pour le trimestre choisi.',
          fiche: {
            menu: 'Évaluations › Moyennes par Trimestre',
            adresse: '/app/evaluations/averages',
            profil: 'Enseignant',
            prerequis: 'Des notes saisies dans la matière.',
            resultat: 'Le classement de la classe dans votre matière.',
          },
          paragraphe:
            'Le tableau est trié par moyenne décroissante. La colonne « Notes » rappelle le détail de chaque évaluation.',
          legendes: [
            { n: 1, selecteur: 'champ=Trimestre', cote: 'bas', element: 'Filtre « Trimestre »', role: 'Le trimestre observé. Permet de comparer la progression d’un trimestre à l’autre.' },
            { n: 2, selecteur: 'colonne=RANG', cote: 'haut', element: 'Colonne « Rang »', role: 'La place de l’élève dans la classe, pour votre matière seulement. Ce n’est pas son rang général.' },
            { n: 3, selecteur: 'colonne=NOTES', cote: 'haut', element: 'Colonne « Notes »', role: 'Le détail des notes qui composent la moyenne. Utile pour expliquer un résultat à un élève.' },
            { n: 4, selecteur: 'colonne=MOY.', cote: 'haut', element: 'Colonne « Moy. »', role: 'La moyenne de l’élève dans votre matière, pondérée par les coefficients de vos évaluations.' },
          ],
          procedure: [
            'Ouvrez Évaluations › Moyennes par Trimestre.',
            'Choisissez le trimestre, la classe et la matière.',
            'Lisez le classement et repérez les élèves en difficulté.',
            'Comparez avec le trimestre précédent pour mesurer la progression.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Ce rang est celui de votre matière. Le rang général de l’élève, tous coefficients confondus, se lit sur son bulletin — édité par l’administration.',
            },
            {
              type: 'astuce',
              texte:
                'Contrôlez d’abord les extrêmes : le premier et le dernier. Une erreur de saisie s’y voit immédiatement, bien plus vite qu’au milieu du tableau.',
            },
          ],
        },
      ],
    },
  ],
};
