/**
 * Contenu rédigé du Guide de l'enseignant — école primaire.
 *
 * Le titulaire du primaire enseigne toutes les matières d'une seule classe :
 * son parcours n'a rien de celui d'un professeur du secondaire. Le menu est à
 * plat, sans arborescence à déplier, et tout ce qu'il voit est cadré par la
 * classe dont l'administration l'a désigné titulaire.
 */

module.exports = {
  meta: {
    titre: 'Guide de l’enseignant',
    sousTitre: 'HorizonEcole — École primaire',
    etablissement: 'Groupe Scolaire les Palmiers',
    profil: 'Enseignant',
    version: '1.0',
    adresse: 'http://localhost:5173/app',
    avertissement:
      'Ce guide décrit l’application telle qu’elle se présente à un enseignant titulaire ' +
      'd’une classe du primaire. Les copies d’écran proviennent de la classe de CE1 de ' +
      '« Groupe Scolaire les Palmiers » et contiennent des noms réels d’élèves : à anonymiser ' +
      'avant toute diffusion hors de l’école.',
  },

  introduction: {
    titre: 'À qui s’adresse ce guide',
    paragraphes: [
      'Ce guide s’adresse à l’enseignant titulaire d’une classe du primaire. Il n’exige aucune compétence informatique : si vous savez remplir un carnet de notes, vous saurez utiliser ces écrans.',
      'Votre espace est entièrement cadré par votre classe. Vous ne voyez que vos élèves, vos compositions et vos matières. Vous n’avez rien à choisir ni à configurer : l’administration a déjà fixé la grille de matières, les barèmes et le calendrier des compositions. Votre travail commence à la saisie des notes.',
      'Le menu est volontairement à plat — sept destinations, aucune arborescence — parce que beaucoup d’enseignants consultent l’application depuis un téléphone.',
      'Chaque copie d’écran porte des pastilles numérotées en rouge, expliquées dans le tableau qui suit l’image. La procédure numérotée donne ensuite l’enchaînement des gestes.',
    ],
    reperes: [
      ['Attention', 'Ce qui casse, ou ce qui ne se rattrape pas facilement.'],
      ['Astuce', 'Le raccourci de ceux qui utilisent l’application tous les jours.'],
      ['À savoir', 'Ce que l’application fait en coulisse, et qui explique un comportement.'],
    ],
  },

  chapitres: [
    {
      titre: 'Prise en main',
      chapeau:
        'Entrer dans l’application, et comprendre en un coup d’œil où en est votre classe.',
      sections: [
        {
          ecran: 'connexion',
          titre: 'Se connecter',
          chapeau:
            'Vos identifiants vous ont été remis par l’administration de l’école. C’est votre adresse e-mail qui vous identifie.',
          fiche: {
            menu: '—',
            adresse: '/app/login',
            profil: 'Tous',
            prerequis: 'Un compte créé par l’administration.',
            resultat: 'Vous arrivez sur votre tableau de bord d’enseignant.',
          },
          paragraphe:
            'L’écran ne demande que deux informations. Le texte grisé dans les cases est un exemple : il disparaît dès que vous tapez.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Email',
              element: 'Champ « Email »',
              role: 'L’adresse e-mail que l’école a enregistrée sur votre fiche. Si vous en changez, prévenez le secrétariat : c’est elle qui vous ouvre l’application.',
            },
            {
              n: 2,
              selecteur: 'champ=Mot de passe',
              element: 'Champ « Mot de passe »',
              role: 'Votre mot de passe. L’icône d’œil barré l’affiche en clair, le temps de vérifier une faute de frappe.',
            },
            {
              n: 3,
              selecteur: 'texte=Se connecter',
              cote: 'droite',
              element: 'Bouton « Se connecter »',
              role: 'Valide la connexion et vous conduit directement à votre classe.',
            },
            {
              n: 4,
              selecteur: 'texte=Configurer un établissement',
              cote: 'bas',
              element: 'Lien « Configurer un établissement »',
              role: 'Ne vous concerne pas : il sert à enregistrer une école entière. Ne cliquez jamais dessus.',
            },
          ],
          procedure: [
            'Ouvrez votre navigateur à l’adresse de l’application.',
            'Saisissez l’adresse e-mail que l’école vous a communiquée.',
            'Saisissez votre mot de passe.',
            'Cliquez sur « Se connecter ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Il n’existe pas de lien « Mot de passe oublié ». Si vous perdez votre mot de passe, seul le secrétariat peut vous en attribuer un nouveau.',
            },
            {
              type: 'astuce',
              texte:
                'Sur un poste partagé — la salle des maîtres, par exemple —, pensez à vous déconnecter par le menu de votre nom, en bas de la barre latérale. Fermer l’onglet ne suffit pas.',
            },
          ],
        },
        {
          ecran: 'tableau-de-bord',
          titre: 'Le tableau de bord',
          chapeau:
            'Votre page d’accueil répond à trois questions : quelle est ma classe, quelle composition dois-je saisir, et où en suis-je.',
          fiche: {
            menu: 'Tableau de bord',
            adresse: '/app/dashboard',
            profil: 'Enseignant',
            prerequis: 'Être désigné titulaire d’une classe pour l’année en cours.',
            resultat: 'Vue d’ensemble de votre classe et accès direct à la saisie.',
          },
          paragraphe:
            'Tout ce que montre cet écran ne concerne que votre classe et l’année en cours. Le rappel figure d’ailleurs tout en bas de la page.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Bonjour, Drissa',
              cote: 'bas',
              element: 'Salutation et date',
              role: 'Votre prénom, la date du jour et l’année scolaire de travail. Si l’année affichée n’est pas la bonne, signalez-le au secrétariat.',
            },
            {
              n: 2,
              selecteur: 'bloc=Ma classe — CE1',
              cote: 'bas',
              element: 'Bandeau « Ma classe »',
              role: 'La classe dont vous êtes titulaire, son effectif et le nombre de matières que vous notez. C’est le cadre de tout le reste de l’application.',
            },
            {
              n: 3,
              selecteur: 'texte=Voir ma classe',
              cote: 'gauche',
              element: 'Bouton « Voir ma classe »',
              role: 'Ouvre le détail de votre classe : barèmes, compositions et liste des élèves.',
            },
            {
              n: 4,
              selecteur: 'contient=Saisies ouvertes',
              cote: 'bas',
              element: 'Compteur « Saisies ouvertes »',
              role: 'Le nombre de compositions dont la saisie est encore possible. Une saisie fermée ne se modifie plus.',
            },
            {
              n: 5,
              selecteur: 'bloc=Prochaine composition à saisir',
              cote: 'bas',
              element: 'Bloc « Prochaine composition à saisir »',
              role: 'La composition que l’application vous propose de traiter, avec sa date et le nombre de notes déjà enregistrées. C’est votre point de départ quotidien.',
            },
            {
              n: 6,
              selecteur: 'texte=Saisir les notes',
              cote: 'gauche',
              element: 'Bouton « Saisir les notes »',
              role: 'Ouvre directement la grille de saisie de cette composition, sans passer par le menu.',
            },
            {
              n: 7,
              selecteur: 'bloc=Les matières que je note',
              cote: 'droite',
              element: 'Bloc « Les matières que je note »',
              role: 'Vos matières et leur barème. Ces valeurs sont fixées par l’administration : vous ne pouvez pas les modifier, mais vous devez les connaître pour ne pas saisir une note hors barème.',
            },
            {
              n: 8,
              selecteur: 'contient=Moyenne = total des notes ÷ 10 → sur 10. Barèmes fixés par l\'administration.',
              cote: 'haut',
              element: 'Rappel du calcul de la moyenne',
              role: 'Comment la moyenne de vos élèves est obtenue. Le diviseur découle des barèmes : il n’est jamais saisi à la main.',
            },
          ],
          procedure: [
            'Connectez-vous : le tableau de bord s’ouvre automatiquement.',
            'Vérifiez le bandeau « Ma classe » : effectif et nombre de matières.',
            'Lisez le bloc « Prochaine composition à saisir ».',
            'Cliquez sur « Saisir les notes » pour ouvrir la grille correspondante.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Si aucune classe ne vous est attribuée',
              texte:
                'Tant que l’administration ne vous a pas désigné titulaire d’une classe pour l’année en cours, tous vos écrans affichent le même message : « Aucune classe ne vous est attribuée ». Ce n’est pas une panne, et rien de ce que vous ferez n’y changera quoi que ce soit : c’est au secrétariat de faire l’affectation.',
            },
            {
              type: 'savoir',
              texte:
                'Le nombre de notes annoncé — « 120 note(s) déjà saisie(s) » — compte les notes de tous les élèves et de toutes les matières. Trente élèves multipliés par quatre matières font bien cent vingt notes pour une composition complète.',
            },
          ],
        },
      ],
    },

    {
      titre: 'Ma classe',
      chapeau:
        'Deux écrans en lecture seule : la fiche d’identité de votre classe, et la liste de vos élèves. Vous n’y modifiez rien — l’inscription des enfants relève de l’administration — mais vous y vérifiez que tout est en ordre avant de noter.',
      sections: [
        {
          ecran: 'ma-classe',
          titre: 'La fiche de ma classe',
          chapeau:
            'Tout ce qui encadre votre travail de notation : les barèmes, les seuils, les compositions de l’année et vos élèves.',
          fiche: {
            menu: 'Ma Classe',
            adresse: '/app/primary/my-class',
            profil: 'Enseignant',
            prerequis: 'Être titulaire d’une classe.',
            resultat: 'Connaissance exacte des barèmes et du calendrier des compositions.',
          },
          paragraphe:
            'C’est l’écran à consulter avant la première composition de l’année : il vous dit sur quoi vous notez, et à partir de quelle moyenne un élève est admis.',
          legendes: [
            {
              n: 1,
              selecteur: 'bloc=Barèmes de la classe',
              cote: 'droite',
              element: 'Bloc « Barèmes de la classe »',
              role: 'Chaque matière et sa note maximale. Une note supérieure au barème sera refusée à la saisie.',
            },
            {
              n: 2,
              selecteur: 'contient=Total des barèmes',
              cote: 'gauche',
              element: 'Ligne « Total des barèmes »',
              role: 'La somme des barèmes de toutes vos matières. Elle détermine le diviseur de la moyenne.',
            },
            {
              n: 3,
              selecteur: 'contient=Calcul de la moyenne',
              cote: 'gauche',
              element: 'Ligne « Calcul de la moyenne »',
              role: 'Le diviseur appliqué et l’échelle obtenue. Ici : le total des notes divisé par 10 donne une moyenne sur 10.',
            },
            {
              n: 4,
              selecteur: 'contient=Moyenne d\'admission',
              cote: 'gauche',
              element: 'Seuils d’admission et de redoublement',
              role: 'Les deux moyennes qui décident du sort d’un élève. Elles sont fixées par l’administration, niveau par niveau.',
            },
            {
              n: 5,
              selecteur: 'bloc=Compositions de l\'année',
              cote: 'droite',
              element: 'Bloc « Compositions de l’année »',
              role: 'Le calendrier de vos compositions, avec pour chacune sa date, le nombre de notes saisies et son état — ouverte ou fermée.',
            },
            {
              n: 6,
              selecteur: 'texte=Fiche de classement',
              cote: 'gauche',
              element: 'Bouton « Fiche de classement »',
              role: 'Produit le classement de la classe pour cette composition, en PDF.',
            },
            {
              n: 7,
              selecteur: 'bloc=Mes élèves',
              cote: 'droite',
              element: 'Bloc « Mes élèves »',
              role: 'Un aperçu des premiers élèves de la classe. « Tout voir » ouvre la liste complète.',
            },
          ],
          procedure: [
            'Ouvrez « Ma Classe » dans le menu.',
            'Notez les barèmes de vos matières et le total.',
            'Vérifiez la moyenne d’admission et le seuil de redoublement.',
            'Parcourez le calendrier des compositions pour repérer celles qui restent à saisir.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Si un barème vous paraît faux — une matière sur 30 alors que vous notez sur 20 —, ne compensez pas en trichant sur les notes. Signalez-le au secrétariat : corriger le barème recalcule proprement toutes les moyennes.',
            },
            {
              type: 'savoir',
              texte:
                'Une composition « ouverte » accepte encore vos notes. Une fois fermée par l’administration, la grille passe en lecture seule : les bulletins déjà remis aux familles ne peuvent plus bouger.',
            },
          ],
        },
        {
          ecran: 'eleves',
          titre: 'La liste de mes élèves',
          chapeau:
            'Votre effectif, tel que l’administration l’a enregistré. C’est la liste de référence pour l’appel et pour la saisie.',
          fiche: {
            menu: 'Élèves',
            adresse: '/app/primary/my-students',
            profil: 'Enseignant',
            prerequis: 'Être titulaire d’une classe où des élèves sont inscrits.',
            resultat: 'La liste complète de la classe, avec les dates de naissance.',
          },
          paragraphe:
            'La liste est triée par ordre alphabétique. Les compteurs du haut donnent la répartition garçons / filles, utile pour les statistiques de rentrée.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Les élèves inscrits dans votre classe, tels que l\'administration les a enregistrés.',
              cote: 'bas',
              element: 'Sous-titre de l’écran',
              role: 'Rappelle que cette liste est en lecture seule : vous ne pouvez ni ajouter ni retirer un élève.',
            },
            {
              n: 2,
              selecteur: 'bloc=Effectif de la classe',
              cote: 'bas',
              element: 'Compteurs d’effectif',
              role: 'L’effectif total et sa répartition entre garçons et filles.',
            },
            {
              n: 3,
              selecteur: 'champ=Sexe',
              cote: 'bas',
              element: 'Filtre « Sexe »',
              role: 'Restreint la liste aux garçons ou aux filles.',
            },
            {
              n: 4,
              selecteur: 'champ=Rechercher',
              cote: 'bas',
              element: 'Case « Rechercher »',
              role: 'Trouve un élève par son nom ou son matricule, sans faire défiler toute la liste.',
            },
            {
              n: 5,
              selecteur: 'contient=2026-0016',
              cote: 'droite',
              element: 'Matricule d’un élève',
              role: 'L’identifiant unique de l’enfant dans l’école. À citer dans tout échange avec le secrétariat : deux élèves peuvent porter le même nom.',
            },
          ],
          procedure: [
            'Ouvrez « Élèves » dans le menu.',
            'Vérifiez que l’effectif correspond à votre classe réelle.',
            'Utilisez la case « Rechercher » pour retrouver un élève précis.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un élève présent dans votre classe mais absent de cette liste n’est pas inscrit dans l’application : il n’apparaîtra ni dans la grille de saisie, ni dans les bulletins. Signalez-le immédiatement au secrétariat, avant la composition.',
            },
          ],
        },
      ],
    },

    {
      titre: 'Les notes',
      chapeau:
        'Le cœur de votre travail. Saisir, vérifier, puis éditer les bulletins. Trois écrans qui se suivent dans cet ordre.',
      sections: [
        {
          ecran: 'saisie-notes',
          titre: 'Choisir la composition à saisir',
          chapeau:
            'L’écran s’ouvre volontairement vide : il attend que vous lui disiez de quelle composition vous voulez parler.',
          fiche: {
            menu: 'Saisie de Notes',
            adresse: '/app/primary/saisie',
            profil: 'Enseignant',
            prerequis: 'Une composition créée par l’administration pour votre classe.',
            resultat: 'La grille de saisie de la composition choisie.',
          },
          paragraphe:
            'Le message affiché n’est pas une erreur : il indique simplement qu’il manque le choix d’une composition.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Année scolaire',
              cote: 'bas',
              element: 'Liste « Année scolaire »',
              role: 'L’année de travail, pré-remplie sur l’année en cours.',
            },
            {
              n: 2,
              selecteur: 'champ=Composition',
              cote: 'bas',
              element: 'Liste « Composition »',
              role: 'La composition à saisir. La liste ne propose que celles créées pour votre classe.',
            },
            {
              n: 3,
              selecteur: 'contient=Choisissez une composition dans les filtres ci-dessus pour ouvrir la grille de saisie.',
              cote: 'bas',
              element: 'Message d’attente',
              role: 'Rappelle ce qui manque pour afficher la grille.',
            },
          ],
          procedure: [
            'Ouvrez « Saisie de Notes » dans le menu.',
            'Vérifiez l’année scolaire.',
            'Choisissez la composition : la grille apparaît aussitôt.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Si la liste « Composition » est vide, c’est que l’administration n’a créé aucune composition pour votre classe. Vous ne pouvez pas en créer vous-même : demandez-le au secrétariat.',
            },
          ],
        },
        {
          ecran: 'saisie-notes-grille',
          titre: 'Saisir les notes',
          chapeau:
            'La grille reprend vos élèves en lignes et vos matières en colonnes. C’est le seul écran de l’application où vous écrivez.',
          fiche: {
            menu: 'Saisie de Notes › choisir une composition',
            adresse: '/app/primary/saisie',
            profil: 'Enseignant',
            prerequis: 'Une composition ouverte pour votre classe.',
            resultat: 'Les notes enregistrées, les moyennes et le classement calculés.',
          },
          paragraphe:
            'Chaque case attend une note comprise entre zéro et le barème de la matière. Une case laissée vide n’est pas neutre : au calcul, elle compte pour zéro.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Composition',
              cote: 'bas',
              element: 'Liste « Composition »',
              role: 'La composition en cours de saisie. En changer recharge toute la grille : enregistrez avant.',
            },
            {
              n: 2,
              selecteur: 'aria=Note EXP TEXTE pour Aka Aicha',
              cote: 'haut',
              element: 'Case de note',
              role: 'La note d’un élève dans une matière. Le barème est rappelé en tête de colonne ; une valeur supérieure est refusée.',
            },
            {
              n: 3,
              selecteur: 'aria=Marquer Aka Aicha absent',
              cote: 'droite',
              element: 'Case « Absent »',
              role: 'Déclare l’élève absent à la composition. Il n’est alors pas classé — ce qui n’est pas la même chose qu’une note de zéro.',
            },
            {
              n: 4,
              selecteur: 'contient=Moyenne',
              cote: 'gauche',
              element: 'Colonne « Moyenne »',
              role: 'La moyenne se recalcule à mesure que vous saisissez. Une valeur anormalement basse en fin de ligne signale presque toujours une case oubliée.',
            },
          ],
          procedure: [
            'Choisissez la composition dans la liste du haut.',
            'Saisissez les notes élève par élève, en suivant les lignes.',
            'Cochez « Absent » pour les élèves qui n’ont pas composé.',
            'Vérifiez qu’aucune case n’est restée vide par oubli.',
            'Descendez au bas de la grille et cliquez sur « Enregistrer » (voir l’écran suivant).',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Une case vide compte zéro',
              texte:
                'L’application ne fait pas la différence entre « pas encore saisi » et « zéro ». Une matière oubliée fait chuter la moyenne de l’élève et fausse son rang. Relisez la grille ligne par ligne avant d’enregistrer.',
            },
            {
              type: 'astuce',
              texte:
                'Saisissez matière par matière plutôt qu’élève par élève : vous corrigez vos copies dans cet ordre, et l’œil repère bien plus vite une case oubliée dans une colonne que dans une ligne.',
            },
            {
              type: 'savoir',
              texte:
                'Cocher « Absent » retire l’élève du classement sans lui attribuer de note. Sa moyenne annuelle sera calculée sur les seules compositions qu’il a réellement composées.',
            },
          ],
        },
        {
          ecran: 'saisie-notes-enregistrer',
          titre: 'Enregistrer la saisie',
          chapeau:
            'Le bouton qui conserve votre travail ne se trouve pas en haut de l’écran, mais tout en bas de la grille, sous le dernier élève. Cette copie d’écran montre la fin de la page.',
          fiche: {
            menu: 'Saisie de Notes › bas de la grille',
            adresse: '/app/primary/saisie',
            profil: 'Enseignant',
            prerequis: 'Des notes saisies dans la grille.',
            resultat: 'Les notes sont conservées et les moyennes recalculées.',
          },
          paragraphe:
            'Avec trente élèves, il faut faire défiler la page jusqu’en bas pour atteindre ce bouton. Tant que vous ne l’avez pas cliqué, tout ce que vous avez tapé n’existe que dans votre navigateur.',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Enregistrer',
              cote: 'gauche',
              element: 'Bouton « Enregistrer »',
              role: 'Enregistre toutes les notes de la grille d’un seul coup. C’est le seul geste qui conserve votre travail.',
            },
          ],
          procedure: [
            'Après avoir saisi vos notes, faites défiler la page jusqu’en bas.',
            'Cliquez sur « Enregistrer ».',
            'Attendez le message de confirmation avant de quitter l’écran.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Ne fermez pas l’onglet et ne changez pas de composition avant d’avoir enregistré : une saisie non enregistrée est perdue sans avertissement.',
            },
            {
              type: 'astuce',
              texte:
                'La touche « Fin » de votre clavier vous amène directement au bas de la page, sans faire défiler à la souris.',
            },
          ],
        },
        {
          ecran: 'resultats',
          titre: 'Les résultats d’une composition',
          chapeau:
            'Le résultat de votre saisie : moyennes, rangs, mentions et bulletins. C’est ici que vous vérifiez votre travail avant de le remettre aux familles.',
          fiche: {
            menu: 'Résultats & Bulletins',
            adresse: '/app/primary/grades',
            profil: 'Enseignant',
            prerequis: 'Des notes saisies pour la composition.',
            resultat: 'Classement de la classe et bulletins en PDF.',
          },
          paragraphe:
            'Les quatre indicateurs du haut résument l’épreuve. En dessous, chaque élève apparaît avec le détail de ses notes, dans l’ordre du classement.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Composition',
              cote: 'bas',
              element: 'Liste « Composition »',
              role: 'L’épreuve dont on affiche les résultats. Changer de composition recharge tout l’écran.',
            },
            {
              n: 2,
              selecteur: 'bloc=Moyenne de la classe',
              cote: 'bas',
              element: 'Indicateurs de la composition',
              role: 'Moyenne de la classe, nombre d’élèves ayant composé, taux de réussite et meilleure moyenne. De quoi juger l’épreuve d’un coup d’œil.',
            },
            {
              n: 3,
              selecteur: 'contient=Ont composé',
              cote: 'bas',
              element: 'Indicateur « Ont composé »',
              role: 'Compare le nombre d’élèves notés à l’effectif. S’il affiche 29/30 sans absent déclaré, une saisie manque.',
            },
            {
              n: 4,
              selecteur: 'contient=Admission à partir de 5/10 · insuffisant en dessous de 4/10. Une matière non saisie compte 0 ; un élève absent n\'est pas classé.',
              cote: 'bas',
              element: 'Rappel des règles',
              role: 'Les seuils appliqués et le traitement des cas particuliers. La phrase la plus importante de l’écran.',
            },
            {
              n: 5,
              selecteur: 'texte=Fiche de classement (PDF)',
              cote: 'haut',
              element: 'Bouton « Fiche de classement (PDF) »',
              role: 'Produit le classement de la classe en un document, à afficher ou à archiver.',
            },
            {
              n: 6,
              selecteur: 'texte=Bulletins de la classe',
              cote: 'haut',
              element: 'Bouton « Bulletins de la classe »',
              role: 'Édite en une fois les bulletins de tous vos élèves. C’est le bouton à utiliser pour une remise groupée.',
            },
            {
              n: 7,
              selecteur: 'texte=Bulletin',
              cote: 'gauche',
              element: 'Bouton « Bulletin » d’un élève',
              role: 'Édite le bulletin d’un seul enfant, pour un duplicata demandé par une famille.',
            },
          ],
          procedure: [
            'Ouvrez « Résultats & Bulletins ».',
            'Choisissez la composition.',
            'Vérifiez que « Ont composé » correspond à votre effectif, absents déclarés compris.',
            'Parcourez les premières cartes : un rang manifestement faux trahit une note mal saisie.',
            'Cliquez sur « Bulletins de la classe » pour éditer les bulletins.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'Contrôlez d’abord les extrêmes : le premier et le dernier du classement. Une erreur de saisie s’y voit immédiatement, bien plus vite qu’au milieu du tableau.',
            },
          ],
        },
        {
          ecran: 'bilan-annuel',
          titre: 'Le bilan annuel',
          chapeau:
            'La synthèse de l’année, composition par composition, avec la moyenne annuelle, la mention et la décision de fin d’année. C’est le document du conseil des maîtres.',
          fiche: {
            menu: 'Bilan Annuel',
            adresse: '/app/primary/annual-report',
            profil: 'Enseignant',
            prerequis: 'Au moins une composition saisie dans l’année.',
            resultat: 'Le classement annuel et les décisions de passage.',
          },
          paragraphe:
            'Le tableau reprend chaque élève avec ses moyennes à chaque composition, sa moyenne annuelle, sa mention et sa décision. Les ex æquo sont signalés comme tels.',
          legendes: [
            {
              n: 1,
              selecteur: 'bloc=Décisions de fin d\'année',
              cote: 'bas',
              element: 'Bloc « Décisions de fin d’année »',
              role: 'Le décompte des admis, des cas à examiner et des redoublements. Le premier chiffre à donner au conseil des maîtres.',
            },
            {
              n: 2,
              selecteur: 'contient=Admission à partir de 5,00/10 · redoublement en dessous de 4,00/10 · moyenne annuelle = moyenne des compositions composées.',
              cote: 'bas',
              element: 'Rappel des règles annuelles',
              role: 'Les seuils appliqués et le mode de calcul de la moyenne annuelle : la moyenne des compositions réellement composées, pas de toutes celles de l’année.',
            },
            {
              n: 3,
              selecteur: 'colonne=MOY. ANNUELLE',
              cote: 'haut',
              element: 'Colonne « MOY. ANNUELLE »',
              role: 'La moyenne de l’élève sur l’ensemble de l’année. C’est elle qui décide de la mention et de la décision.',
            },
            {
              n: 4,
              selecteur: 'colonne=DÉCISION',
              cote: 'haut',
              element: 'Colonne « DÉCISION »',
              role: 'Admis, à examiner ou redouble, selon les deux seuils du niveau.',
            },
            {
              n: 5,
              selecteur: 'texte=Bilan (PDF)',
              cote: 'gauche',
              element: 'Bouton « Bilan (PDF) »',
              role: 'Produit le bilan complet en PDF, à imprimer pour le conseil des maîtres.',
            },
          ],
          procedure: [
            'Ouvrez « Bilan Annuel ».',
            'Vérifiez l’effectif et le nombre d’admis.',
            'Parcourez la colonne « DÉCISION » et repérez les cas à examiner.',
            'Cliquez sur « Bilan (PDF) » pour disposer du document en séance.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'La moyenne annuelle ne tient compte que des compositions réellement composées. Un élève absent à trois épreuves sur quatre aura donc une moyenne calculée sur une seule note : lisez la ligne complète avant de conclure.',
            },
            {
              type: 'savoir',
              texte:
                'La décision proposée par l’application est un calcul, pas un jugement. Le conseil des maîtres reste souverain : le document sert à éclairer la discussion, pas à la remplacer.',
            },
          ],
        },
      ],
    },

    {
      titre: 'Mon compte',
      chapeau:
        'Ce que l’application sait de vous, et ce que vous pouvez y changer vous-même.',
      sections: [
        {
          ecran: 'profil',
          titre: 'Mon profil',
          chapeau:
            'Vos informations personnelles et votre affectation, telles que l’administration les a enregistrées.',
          fiche: {
            menu: 'Profil',
            adresse: '/app/primary/profile',
            profil: 'Enseignant',
            prerequis: 'Être connecté.',
            resultat: 'Consultation de vos informations et changement de mot de passe.',
          },
          paragraphe:
            'Cet écran est en lecture seule, à une exception près : votre mot de passe. Tout le reste est tenu par le secrétariat.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Titulaire CE1',
              cote: 'bas',
              element: 'Étiquette d’affectation',
              role: 'La classe dont vous êtes titulaire. Si elle est fausse, aucun de vos écrans ne montrera les bons élèves.',
            },
            {
              n: 2,
              selecteur: 'texte=Mot de passe',
              cote: 'gauche',
              element: 'Bouton « Mot de passe »',
              role: 'Le seul élément que vous pouvez modifier vous-même. À utiliser dès votre première connexion.',
            },
            {
              n: 3,
              selecteur: 'bloc=Mon affectation',
              cote: 'droite',
              element: 'Bloc « Mon affectation »',
              role: 'Votre classe, son effectif, l’établissement et l’année scolaire en cours. Le résumé de votre périmètre de travail.',
            },
            {
              n: 4,
              selecteur: 'contient=Vos informations personnelles et votre affectation sont tenues par l\'administration de l\'établissement. Pour toute correction, adressez-vous au secrétariat.',
              cote: 'haut',
              element: 'Mention « Informations gérées par l’école »',
              role: 'Rappelle qui corrige quoi : pour un numéro de téléphone erroné ou une affectation à changer, passez par le secrétariat.',
            },
          ],
          procedure: [
            'Ouvrez « Profil » dans le menu.',
            'Vérifiez votre affectation et vos coordonnées.',
            'Cliquez sur « Mot de passe » pour choisir un mot de passe personnel.',
            'Signalez au secrétariat toute information erronée.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'Changez votre mot de passe dès la première connexion : celui qui vous a été remis par le secrétariat a pu circuler par écrit.',
            },
          ],
        },
      ],
    },
  ],
};
