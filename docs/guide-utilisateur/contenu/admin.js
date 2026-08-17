/**
 * Contenu rédigé du Guide Administrateur — école primaire.
 *
 * Tout le texte du guide vit ici, en données structurées : c'est ce qui permet
 * de régénérer le Word (ou un autre format) après une correction, sans jamais
 * retoucher la mise en page. Les scripts de capture lisent les `legendes` pour
 * savoir où poser les pastilles : une légende et sa pastille ne peuvent donc
 * pas diverger.
 *
 * Champ `selecteur` d'une légende — voir scripts/annotation.js :
 *   texte=…     bouton ou lien portant ce libellé, dans la zone de travail
 *   champ=…     bloc « étiquette + saisie » d'un formulaire
 *   aria=…      élément portant cet aria-label ou ce title
 *   menu=…      entrée du menu latéral
 *   groupe=…    intitulé de section du menu latéral
 *   bloc=…      carte contenant ce texte
 *   contient=…  plus petit élément contenant ce texte
 *   colonne=…   en-tête de colonne
 *   #id .classe sélecteur CSS
 */

module.exports = {
  meta: {
    titre: 'Guide de l’administrateur',
    sousTitre: 'HorizonEcole — École primaire',
    etablissement: 'Groupe Scolaire les Palmiers',
    profil: 'Administrateur',
    version: '1.0',
    adresse: 'http://localhost:5173/app',
    avertissement:
      'Ce guide décrit l’application telle qu’elle se présente à un compte Administrateur ' +
      'dans une école primaire. Les copies d’écran proviennent de « Groupe Scolaire les Palmiers » ' +
      'et contiennent des noms réels : à anonymiser avant toute diffusion hors de l’école.',
  },

  introduction: {
    titre: 'À qui s’adresse ce guide',
    paragraphes: [
      'Ce guide s’adresse au personnel administratif d’une école primaire : direction, secrétariat, comptabilité. Il ne suppose aucune connaissance informatique particulière. Chaque écran y est expliqué dans l’ordre où vous le rencontrerez au fil de l’année scolaire.',
      'HorizonEcole s’adapte au type de votre école. Dans une école primaire, l’application masque tout ce qui ne concerne que le collège et le lycée : il n’y a ni coefficients, ni conduite trimestrielle, ni liste de présence par séance. Si un écran décrit dans un autre document ne figure pas dans votre menu, c’est normal — il appartient au secondaire.',
      'Une règle de lecture : chaque copie d’écran porte des pastilles numérotées en rouge. Le tableau qui suit immédiatement l’image explique, ligne par ligne, à quoi correspond chaque numéro. La procédure numérotée qui vient ensuite vous donne l’enchaînement des gestes.',
    ],
    reperes: [
      ['Attention', 'Ce qui casse, ou ce qui ne se rattrape pas facilement.'],
      ['Astuce', 'Le raccourci que connaissent ceux qui utilisent l’application tous les jours.'],
      ['À savoir', 'Ce que l’application fait en coulisse, et qui explique un comportement.'],
    ],
  },

  chapitres: [
    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'Prise en main',
      chapeau:
        'Avant toute chose : entrer dans l’application, et comprendre comment elle est organisée. Les deux écrans de ce chapitre vous serviront tous les jours.',
      sections: [
        {
          ecran: 'connexion',
          titre: 'Se connecter',
          chapeau:
            'C’est la porte d’entrée. Votre compte détermine ce que vous verrez ensuite : un administrateur, un enseignant et un parent qui se connectent au même endroit n’arrivent pas sur le même écran et n’ont pas le même menu.',
          fiche: {
            menu: '—',
            adresse: '/app/login',
            profil: 'Tous',
            prerequis: 'Disposer d’une adresse e-mail et d’un mot de passe créés par l’administrateur de l’école.',
            resultat: 'Vous arrivez sur le tableau de bord de votre établissement.',
          },
          paragraphe:
            'L’écran ne demande que deux informations. Le texte grisé dans les cases est un exemple, pas une valeur : il disparaît dès que vous tapez.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Email',
              element: 'Champ « Email »',
              role: 'L’adresse e-mail de votre compte. C’est elle qui identifie l’école à laquelle vous appartenez : vous n’avez jamais à choisir votre établissement.',
            },
            {
              n: 2,
              selecteur: 'champ=Mot de passe',
              element: 'Champ « Mot de passe »',
              role: 'Votre mot de passe. L’icône d’œil barré, à droite de la case, affiche le mot de passe en clair le temps de vérifier une faute de frappe.',
            },
            {
              n: 3,
              selecteur: 'texte=Se connecter',
              cote: 'droite',
              element: 'Bouton « Se connecter »',
              role: 'Valide la connexion. En cas d’erreur, un message rouge apparaît sous la carte ; l’adresse et le mot de passe sont vérifiés ensemble, l’application ne dit jamais lequel des deux est faux.',
            },
            {
              n: 4,
              selecteur: 'texte=Configurer un établissement',
              cote: 'bas',
              element: 'Lien « Configurer un établissement »',
              role: 'Sert à créer une école qui n’existe pas encore dans l’application. Vous n’en aurez pas l’usage : votre école est déjà enregistrée. Ne l’utilisez pas pour « recommencer » — vous créeriez un second établissement, vide et séparé du vôtre.',
            },
            {
              n: 5,
              selecteur: 'aria=Thème actuel : Mode clair. Cliquer pour changer.',
              cote: 'gauche',
              element: 'Bouton de thème',
              role: 'Bascule entre l’affichage clair et l’affichage sombre. C’est un confort personnel : cela ne change rien aux données ni aux droits.',
            },
          ],
          procedure: [
            'Ouvrez votre navigateur et saisissez l’adresse de l’application.',
            'Cliquez dans la case « Email » et saisissez l’adresse de votre compte.',
            'Saisissez votre mot de passe dans la case suivante.',
            'Cliquez sur « Se connecter ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Il n’y a pas de lien « Mot de passe oublié » sur cet écran. Si vous perdez votre mot de passe, seul un administrateur peut vous en attribuer un nouveau depuis Administration › Utilisateurs. Prévoyez donc toujours au moins deux comptes administrateurs dans l’école.',
            },
            {
              type: 'savoir',
              texte:
                'Votre connexion reste active plusieurs heures, même si vous fermez l’onglet. Sur un poste partagé — secrétariat, salle des maîtres —, utilisez le menu de votre nom en bas de la barre latérale pour vous déconnecter réellement.',
            },
          ],
        },
        {
          ecran: 'tableau-de-bord',
          titre: 'Le tableau de bord et la barre latérale',
          chapeau:
            'Le tableau de bord donne l’état de l’école en un coup d’œil. Surtout, il vous présente la barre latérale : c’est par elle que vous atteindrez tous les écrans du guide.',
          fiche: {
            menu: 'Tableau de bord',
            adresse: '/app/dashboard',
            profil: 'Administrateur',
            prerequis: 'Être connecté.',
            resultat: 'Vue d’ensemble des effectifs et accès à tous les modules.',
          },
          paragraphe:
            'La barre latérale est organisée en cinq groupes, du plus quotidien au plus rare : les personnes, l’année académique, l’école primaire, la finance, l’administration. Cet ordre correspond à peu près à celui d’une année scolaire.',
          legendes: [
            {
              n: 1,
              selecteur: '.ds-brand',
              cote: 'bas',
              element: 'Bandeau de marque',
              role: 'Le nom de l’application, et en dessous celui de votre école. Si le nom affiché n’est pas le vôtre, vous n’êtes pas sur le bon compte.',
            },
            {
              n: 2,
              selecteur: 'groupe=GESTION DES PERSONNES',
              element: 'Groupe « Gestion des Personnes »',
              role: 'Les fiches d’identité : élèves, parents, enseignants. On y crée les personnes, on ne les affecte pas encore à une classe.',
            },
            {
              n: 3,
              selecteur: 'groupe=ÉCOLE PRIMAIRE',
              element: 'Groupe « École Primaire »',
              role: 'Le cœur pédagogique de votre école : les six niveaux CP1 à CM2, le calendrier des compositions et les bulletins. Ce groupe n’apparaît que dans les écoles primaires.',
            },
            {
              n: 4,
              selecteur: 'input[placeholder*="Rechercher un élève"]',
              cote: 'bas',
              element: 'Recherche générale',
              role: 'Cherche un élève ou une classe dans toute l’application, sans passer par les menus. Le moyen le plus rapide d’ouvrir une fiche quand on connaît le nom.',
            },
            {
              n: 5,
              selecteur: 'bloc=Élèves actifs',
              element: 'Compteurs d’effectifs',
              role: 'Le nombre total d’élèves, d’enseignants et de classes de l’école. Ces compteurs portent sur l’établissement entier, toutes années confondues.',
            },
            {
              n: 6,
              selecteur: 'contient=RACCOURCIS',
              cote: 'droite',
              element: 'Barre « Raccourcis »',
              role: 'Quatre boutons vers les écrans les plus utilisés. Ils font exactement la même chose que les entrées du menu correspondantes.',
            },
            {
              n: 7,
              selecteur: 'bloc=Nouveaux élèves',
              cote: 'droite',
              element: 'Panneau « Nouveaux élèves »',
              role: 'Les cinq dernières fiches élèves créées, avec leur matricule et leur date d’enregistrement. Pratique pour retrouver une fiche que l’on vient de saisir.',
            },
            {
              n: 8,
              selecteur: '.ds-sidebar-footer',
              cote: 'droite',
              element: 'Votre compte',
              role: 'Votre nom et votre rôle. En cliquant dessus, vous accédez au changement de mot de passe et à la déconnexion.',
            },
          ],
          procedure: [
            'Repérez le nom de votre école sous « HorizonEcole », en haut à gauche.',
            'Parcourez les cinq groupes de la barre latérale pour situer les modules.',
            'Cliquez sur une entrée de menu pour ouvrir l’écran correspondant ; la barre latérale reste toujours visible.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Deux comptages différents, deux réponses différentes',
              texte:
                'Le tableau de bord annonce ici 36 élèves, alors que l’écran « Élèves » en annonce 30. Ce n’est pas une erreur : le tableau de bord compte toutes les fiches élèves de l’école, tandis que l’écran « Élèves » ne montre par défaut que les élèves inscrits dans l’année en cours. L’écart, ce sont les élèves créés mais pas encore inscrits.',
            },
            {
              type: 'astuce',
              texte:
                'La recherche du haut est le chemin le plus court vers une fiche : tapez trois lettres du nom, sans passer par le menu Élèves ni par les filtres.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'Les élèves',
      chapeau:
        'Une fiche élève est une identité : un nom, une date de naissance, un matricule. Elle ne dit pas dans quelle classe l’enfant travaille — cela, c’est l’inscription qui s’en charge, au chapitre suivant. Retenir cette séparation évite la plupart des malentendus.',
      sections: [
        {
          ecran: 'eleves-liste',
          titre: 'La liste des élèves',
          chapeau:
            'L’écran d’où part tout ce qui concerne les enfants : consulter une fiche, la corriger, en créer une nouvelle.',
          fiche: {
            menu: 'Gestion des Personnes › Élèves',
            adresse: '/app/people/students',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des élèves inscrits dans l’année sélectionnée.',
          },
          paragraphe:
            'Chaque élève occupe une carte portant son nom, sa classe et trois petites icônes. Le nombre annoncé sous le titre suit les filtres : il change quand vous changez d’année ou de classe.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=30 élèves enregistrés.',
              cote: 'bas',
              element: 'Compteur sous le titre',
              role: 'Le nombre d’élèves correspondant aux filtres actifs — pas le nombre total de l’école.',
            },
            {
              n: 2,
              selecteur: 'texte=Nouvel élève',
              cote: 'gauche',
              element: 'Bouton « Nouvel élève »',
              role: 'Ouvre le formulaire de création d’une fiche élève. Cette action crée une identité, pas une inscription.',
            },
            {
              n: 3,
              selecteur: 'bloc=Inscrits — 2025-2026',
              cote: 'bas',
              element: 'Compteur « Inscrits »',
              role: 'Le nombre d’élèves réellement inscrits dans une classe pour l’année affichée. C’est le chiffre à donner quand on vous demande l’effectif de l’école.',
            },
            {
              n: 4,
              selecteur: 'champ=Rechercher',
              element: 'Case « Rechercher »',
              role: 'Filtre la liste sur le nom, le matricule ou le contact. La recherche s’applique dès la troisième lettre, sans valider.',
            },
            {
              n: 5,
              selecteur: 'champ=Année scolaire',
              cote: 'bas',
              element: 'Filtre « Année scolaire »',
              role: 'Change l’année observée. L’application se place d’elle-même sur l’année en cours à l’ouverture de l’écran.',
            },
            {
              n: 6,
              selecteur: 'champ=Classe',
              cote: 'bas',
              element: 'Filtre « Classe »',
              role: 'Restreint la liste à une seule classe. Combiné à l’année, c’est ainsi qu’on obtient la liste d’une classe à une date donnée.',
            },
            {
              n: 7,
              selecteur: 'aria=Voir la fiche',
              cote: 'bas',
              element: 'Icône œil « Voir la fiche »',
              role: 'Ouvre la fiche complète de l’élève, en lecture. C’est là que se trouvent les parents rattachés, les pièces jointes et les paiements.',
            },
            {
              n: 8,
              selecteur: 'aria=Modifier',
              cote: 'bas',
              element: 'Icône crayon « Modifier »',
              role: 'Rouvre le formulaire pour corriger l’identité de l’élève : orthographe du nom, date de naissance, résidence.',
            },
            {
              n: 9,
              selecteur: 'aria=Supprimer',
              cote: 'bas',
              element: 'Icône corbeille « Supprimer »',
              role: 'Supprime définitivement la fiche. Une confirmation est demandée.',
            },
          ],
          procedure: [
            'Ouvrez Gestion des Personnes › Élèves.',
            'Vérifiez l’année scolaire affichée dans le filtre : c’est elle qui détermine la liste.',
            'Pour trouver un élève, tapez son nom dans la case « Rechercher », ou choisissez sa classe dans le filtre « Classe ».',
            'Cliquez sur l’icône en forme d’œil pour ouvrir sa fiche.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'La corbeille supprime la fiche de l’élève, et avec elle son historique. Pour un enfant qui quitte simplement l’école, ne supprimez pas sa fiche : il suffit de ne pas le réinscrire l’année suivante. Vous conserverez ainsi ses bulletins.',
            },
            {
              type: 'astuce',
              texte:
                'Les deux petits boutons à droite des filtres basculent entre l’affichage en cartes et l’affichage en tableau. Le tableau montre davantage d’élèves à l’écran : c’est le plus commode pour pointer une liste.',
            },
          ],
        },
        {
          ecran: 'eleves-nouveau',
          titre: 'Créer une fiche élève',
          chapeau:
            'Ce formulaire crée l’identité de l’enfant dans l’école. Il ne demande volontairement aucune classe : un élève peut être enregistré en juillet et inscrit en septembre.',
          fiche: {
            menu: 'Gestion des Personnes › Élèves › Nouvel élève',
            adresse: '/app/people/students',
            profil: 'Administrateur',
            prerequis: 'Disposer de l’extrait de naissance ou d’une pièce d’identité de l’enfant.',
            resultat: 'Une fiche élève avec un matricule attribué automatiquement.',
          },
          paragraphe:
            'Six informations suffisent. Les pièces jointes sont facultatives, mais c’est le bon endroit pour ranger l’extrait de naissance : vous le retrouverez sur la fiche de l’élève, et non dans un classeur.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Nom',
              element: 'Champ « Nom »',
              role: 'Le nom de famille. Il apparaîtra tel quel sur les bulletins et les listes : soignez les accents dès la saisie.',
            },
            {
              n: 2,
              selecteur: 'champ=Prénom',
              element: 'Champ « Prénom »',
              role: 'Le prénom de l’enfant. L’application affiche partout « Nom Prénom » dans cet ordre.',
            },
            {
              n: 3,
              selecteur: 'champ=Genre',
              element: 'Liste « Genre »',
              role: 'Masculin ou Féminin. Ce choix alimente la répartition garçons / filles des bilans de classe : ne le laissez pas au hasard.',
            },
            {
              n: 4,
              selecteur: 'champ=Né le',
              element: 'Champ « Né le »',
              role: 'La date de naissance. Elle sert aux statistiques d’âge et figure sur les documents officiels.',
            },
            {
              n: 5,
              selecteur: 'champ=Lieu de naissance',
              element: 'Champ « Lieu de naissance »',
              role: 'La ville de naissance, telle qu’elle figure sur l’extrait de naissance.',
            },
            {
              n: 6,
              selecteur: 'texte=Sélectionner les fichiers',
              cote: 'droite',
              element: 'Bouton « Sélectionner les fichiers »',
              role: 'Joint des documents à la fiche : extrait de naissance, certificat, photo. Formats PDF, DOC, DOCX, JPG et PNG, 10 Mo maximum par fichier.',
            },
            {
              n: 7,
              selecteur: 'texte=Enregistrer',
              cote: 'gauche',
              element: 'Bouton « Enregistrer »',
              role: 'Crée la fiche et attribue le matricule. Tant que vous n’avez pas cliqué ici, rien n’est enregistré.',
            },
            {
              n: 8,
              selecteur: 'texte=Retour à la liste',
              cote: 'bas',
              element: 'Bouton « Retour à la liste »',
              role: 'Abandonne la saisie et revient à la liste. Les informations tapées sont perdues.',
            },
          ],
          procedure: [
            'Depuis la liste des élèves, cliquez sur « Nouvel élève ».',
            'Saisissez le nom, le prénom, le genre, la date et le lieu de naissance.',
            'Si vous disposez de l’extrait de naissance sous forme de fichier, joignez-le avec « Sélectionner les fichiers ».',
            'Cliquez sur « Enregistrer ».',
            'Rendez-vous ensuite dans Année Académique › Inscriptions pour placer l’élève dans une classe.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Créer n’est pas inscrire',
              texte:
                'À la fin de ce formulaire, l’élève existe dans l’école mais n’appartient à aucune classe. Il n’apparaîtra ni dans les listes de classe, ni dans les compositions, ni dans les bulletins tant que vous ne l’aurez pas inscrit. C’est la cause la plus fréquente d’un « élève introuvable ».',
            },
            {
              type: 'savoir',
              texte:
                'Le matricule n’est pas saisi : l’application le fabrique elle-même à partir de l’année et d’un numéro d’ordre — par exemple 2026-0031. Il est unique et ne change plus.',
            },
          ],
        },
        {
          ecran: 'eleves-fiche',
          titre: 'La fiche d’un élève',
          chapeau:
            'Tout ce que l’école sait d’un enfant, réuni en quatre onglets. C’est l’écran à ouvrir quand un parent appelle.',
          fiche: {
            menu: 'Gestion des Personnes › Élèves › icône œil',
            adresse: '/app/people/students/(identifiant)',
            profil: 'Administrateur',
            prerequis: 'La fiche de l’élève doit exister.',
            resultat: 'Consultation de l’identité, des parents, des documents et des paiements.',
          },
          paragraphe:
            'L’onglet « Profil » est ouvert par défaut. Les trois autres se remplissent au fil de l’année, à mesure que vous rattachez des parents, joignez des documents et enregistrez des versements.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=2026-0030',
              cote: 'droite',
              element: 'Matricule, sous le nom',
              role: 'L’identifiant unique de l’élève dans l’école. À citer dans tout échange administratif : deux enfants peuvent porter le même nom, jamais le même matricule.',
            },
            {
              n: 2,
              selecteur: 'texte=Profil',
              cote: 'haut',
              element: 'Onglet « Profil »',
              role: 'L’identité de l’élève : matricule, nom, prénom, genre, naissance, statut et coordonnées.',
            },
            {
              n: 3,
              selecteur: 'texte=Parents',
              cote: 'haut',
              element: 'Onglet « Parents »',
              role: 'Les parents rattachés à cet enfant, avec leur numéro de téléphone. Le chiffre entre parenthèses indique combien il y en a : s’il affiche zéro, personne ne pourra suivre cet élève depuis l’Espace Famille.',
            },
            {
              n: 4,
              selecteur: 'texte=Pièces jointes',
              cote: 'haut',
              element: 'Onglet « Pièces jointes »',
              role: 'Les documents rangés sur la fiche : extrait de naissance, certificats, photo.',
            },
            {
              n: 5,
              selecteur: 'texte=Paiements',
              cote: 'haut',
              element: 'Onglet « Paiements »',
              role: 'Les versements déjà enregistrés pour cet élève et ce qu’il reste à régler.',
            },
            {
              n: 6,
              selecteur: 'contient=Statut',
              cote: 'gauche',
              element: 'Ligne « Statut »',
              role: 'L’état de la fiche. Un élève actif est un élève dont la scolarité est en cours dans l’école.',
            },
            {
              n: 7,
              selecteur: 'contient=Affecté de l\'État',
              cote: 'gauche',
              element: 'Ligne « Affecté de l’État »',
              role: 'Indique si l’élève est un affecté de l’État. Cette mention conditionne le traitement de sa scolarité et de ses frais.',
            },
          ],
          procedure: [
            'Ouvrez la liste des élèves et cliquez sur l’icône en forme d’œil de l’enfant concerné.',
            'Lisez l’onglet « Profil » pour vérifier l’identité.',
            'Cliquez sur « Parents » pour retrouver le contact d’un responsable.',
            'Cliquez sur « Paiements » pour connaître la situation financière de l’élève.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'La ligne « Statut » affiche la valeur technique ACTIVE, en anglais et en majuscules, alors que le reste de l’écran est en français. Lisez-la simplement comme « élève actif ». Ce libellé est signalé pour correction.',
            },
            {
              type: 'astuce',
              texte:
                'L’onglet « Parents » est le moyen le plus rapide de retrouver un numéro de téléphone en cas d’urgence : inutile de passer par le menu Parents et de chercher le nom de famille, qui n’est pas toujours celui de l’enfant.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'Les parents',
      chapeau:
        'Un parent enregistré, c’est un contact en cas d’urgence — et, s’il dispose d’un compte, un accès à l’Espace Famille où il suivra les résultats de son enfant sans passer par le secrétariat.',
      sections: [
        {
          ecran: 'parents-liste',
          titre: 'La liste des parents',
          chapeau: 'Le répertoire des responsables des élèves de l’école.',
          fiche: {
            menu: 'Gestion des Personnes › Parents',
            adresse: '/app/people/parents',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des parents enregistrés.',
          },
          paragraphe:
            'L’écran fonctionne comme celui des élèves : des cartes, une recherche, et les trois mêmes icônes sur chaque carte.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=20 parents enregistrés.',
              cote: 'bas',
              element: 'Compteur sous le titre',
              role: 'Le nombre de parents enregistrés dans l’école.',
            },
            {
              n: 2,
              selecteur: 'texte=Nouveau parent',
              cote: 'gauche',
              element: 'Bouton « Nouveau parent »',
              role: 'Ouvre le formulaire de création d’un parent, où l’on peut aussi le rattacher à ses enfants.',
            },
            {
              n: 3,
              selecteur: 'champ=Rechercher',
              element: 'Case « Rechercher »',
              role: 'Filtre sur le nom ou le numéro de téléphone.',
            },
            {
              n: 4,
              selecteur: 'aria=Voir la fiche',
              cote: 'bas',
              element: 'Icône œil « Voir la fiche »',
              role: 'Ouvre la fiche du parent : ses coordonnées, son compte d’accès et les enfants qui lui sont rattachés.',
            },
          ],
          procedure: [
            'Ouvrez Gestion des Personnes › Parents.',
            'Tapez le nom du parent recherché dans la case « Rechercher ».',
            'Cliquez sur l’icône en forme d’œil pour ouvrir sa fiche.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Un même parent peut être rattaché à plusieurs enfants de l’école. Créez-le une seule fois, puis ajoutez ses enfants sur sa fiche : vous éviterez les doublons qui compliquent ensuite l’envoi des accès à l’Espace Famille.',
            },
          ],
        },
        {
          ecran: 'parents-nouveau',
          titre: 'Créer une fiche parent',
          chapeau:
            'Le formulaire réunit en une fois l’identité du parent et le lien avec ses enfants — c’est le seul endroit où l’on établit ce lien au moment de la création.',
          fiche: {
            menu: 'Gestion des Personnes › Parents › Nouveau parent',
            adresse: '/app/people/parents',
            profil: 'Administrateur',
            prerequis: 'Les fiches des enfants doivent déjà exister pour pouvoir les rattacher.',
            resultat: 'Une fiche parent, éventuellement rattachée à un ou plusieurs élèves.',
          },
          paragraphe:
            'Le contact est l’information la plus utile de cet écran : c’est le numéro que l’école composera en cas d’incident.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Nom',
              element: 'Champ « Nom »',
              role: 'Le nom de famille du parent. Il peut différer de celui de l’enfant : ce n’est pas une erreur.',
            },
            {
              n: 2,
              selecteur: 'champ=Contact',
              element: 'Champ « Contact »',
              role: 'Le numéro de téléphone. C’est le champ le plus important de la fiche : sans lui, l’école ne peut pas joindre la famille.',
            },
            {
              n: 3,
              selecteur: 'champ=Adresse email (optionnel)',
              element: 'Champ « Adresse email »',
              role: 'Facultatif ici, mais indispensable si vous souhaitez ouvrir plus tard un accès à l’Espace Famille : c’est cette adresse qui servira d’identifiant de connexion.',
            },
            {
              n: 4,
              selecteur: 'champ=Relation',
              element: 'Liste « Relation »',
              role: 'Le lien avec l’enfant : Père, Mère, Tuteur… Cette mention apparaît sur la fiche du parent et aide à savoir qui appeler en premier.',
            },
            {
              n: 5,
              selecteur: 'contient=Sélectionnez les élèves dont ce parent s\'occupe (optionnel).',
              cote: 'bas',
              element: 'Section « Élèves rattachés »',
              role: 'Recherchez ici les enfants de ce parent et ajoutez-les. C’est ce rattachement qui fera apparaître les résultats de l’enfant dans l’Espace Famille du parent.',
            },
            {
              n: 6,
              selecteur: 'texte=Enregistrer',
              cote: 'gauche',
              element: 'Bouton « Enregistrer »',
              role: 'Crée la fiche parent et les rattachements choisis.',
            },
          ],
          procedure: [
            'Depuis la liste des parents, cliquez sur « Nouveau parent ».',
            'Saisissez le nom, le prénom et surtout le numéro de contact.',
            'Renseignez l’adresse e-mail si le parent doit accéder à l’Espace Famille.',
            'Choisissez la relation avec l’enfant.',
            'Dans « Élèves rattachés », recherchez chaque enfant et ajoutez-le.',
            'Cliquez sur « Enregistrer ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un parent sans enfant rattaché est un contact orphelin : il n’apparaîtra sur la fiche d’aucun élève, et son Espace Famille sera vide. Le rattachement n’est pas facultatif dans les faits, même si l’application l’indique comme tel.',
            },
          ],
        },
        {
          ecran: 'parents-fiche',
          titre: 'La fiche d’un parent',
          chapeau:
            'Les coordonnées du parent, son compte d’accès et la liste de ses enfants dans l’école.',
          fiche: {
            menu: 'Gestion des Personnes › Parents › icône œil',
            adresse: '/app/people/parents/(identifiant)',
            profil: 'Administrateur',
            prerequis: 'La fiche du parent doit exister.',
            resultat: 'Consultation des coordonnées et gestion de l’accès à l’Espace Famille.',
          },
          paragraphe:
            'L’onglet « Compte » est celui qui intéresse les familles : c’est de là que se pilote leur accès à l’application.',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Profil',
              cote: 'haut',
              element: 'Onglet « Profil »',
              role: 'Nom, prénom, relation, contact, e-mail et profession du parent.',
            },
            {
              n: 2,
              selecteur: 'texte=Compte',
              cote: 'haut',
              element: 'Onglet « Compte »',
              role: 'L’accès du parent à l’Espace Famille : existence du compte et identifiant de connexion.',
            },
            {
              n: 3,
              selecteur: 'texte=Élèves rattachés',
              cote: 'haut',
              element: 'Onglet « Élèves rattachés »',
              role: 'Les enfants suivis par ce parent. Le chiffre entre parenthèses en donne le nombre.',
            },
            {
              n: 4,
              selecteur: 'contient=Contact',
              cote: 'gauche',
              element: 'Ligne « Contact »',
              role: 'Le numéro de téléphone du parent, à composer en cas d’urgence.',
            },
          ],
          procedure: [
            'Ouvrez la liste des parents et cliquez sur l’icône en forme d’œil.',
            'Vérifiez le contact dans l’onglet « Profil ».',
            'Ouvrez l’onglet « Compte » pour savoir si le parent dispose déjà d’un accès.',
            'Ouvrez « Élèves rattachés » pour vérifier que tous ses enfants sont bien liés.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Ce que le parent verra de son côté est décrit dans le « Guide du parent ». Son espace est en lecture seule : il consulte, il ne modifie jamais rien.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'Les enseignants',
      chapeau:
        'Dans une école primaire, un enseignant est titulaire d’une classe et y enseigne toutes les matières. C’est la classe affectée qui décide de ce qu’il verra dans son propre espace.',
      sections: [
        {
          ecran: 'enseignants-liste',
          titre: 'La liste des enseignants',
          chapeau: 'Le personnel enseignant de l’école, avec son contrat et sa classe.',
          fiche: {
            menu: 'Gestion des Personnes › Enseignants',
            adresse: '/app/people/teachers',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des enseignants et leur classe d’affectation.',
          },
          paragraphe:
            'Chaque carte porte le nom, l’adresse e-mail, le type de contrat et la classe dont l’enseignant est titulaire.',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Nouvel enseignant',
              cote: 'gauche',
              element: 'Bouton « Nouvel enseignant »',
              role: 'Ouvre le formulaire de création. C’est là que se fait l’affectation à une classe.',
            },
            {
              n: 2,
              selecteur: 'champ=Rechercher',
              element: 'Case « Rechercher »',
              role: 'Filtre sur le nom, l’e-mail ou la spécialité.',
            },
            {
              n: 3,
              selecteur: 'champ=Contrat',
              cote: 'bas',
              element: 'Filtre « Contrat »',
              role: 'Restreint la liste aux CDI ou aux CDD.',
            },
            {
              n: 4,
              selecteur: '.ds-entity-card',
              cote: 'droite',
              element: 'Carte d’un enseignant',
              role: 'Cliquez n’importe où sur la carte pour ouvrir la fiche complète de l’enseignant. Les icônes de droite servent seulement à modifier ou supprimer.',
            },
          ],
          procedure: [
            'Ouvrez Gestion des Personnes › Enseignants.',
            'Repérez l’enseignant, au besoin avec la recherche ou le filtre « Contrat ».',
            'Cliquez sur sa carte pour ouvrir sa fiche.',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'La classe indiquée sur la carte est celle dont l’enseignant est titulaire. Un rapide coup d’œil à cette liste vous dit si l’un des six niveaux est resté sans maître.',
            },
          ],
        },
        {
          ecran: 'enseignants-nouveau',
          titre: 'Créer une fiche enseignant',
          chapeau:
            'Ce formulaire fait deux choses à la fois : il enregistre l’enseignant et lui attribue sa classe.',
          fiche: {
            menu: 'Gestion des Personnes › Enseignants › Nouvel enseignant',
            adresse: '/app/people/teachers',
            profil: 'Administrateur',
            prerequis: 'Les classes du primaire doivent exister (voir le chapitre « L’école primaire »).',
            resultat: 'Un enseignant enregistré et titulaire d’une classe.',
          },
          paragraphe:
            'L’adresse e-mail est obligatoire : elle identifiera l’enseignant quand il se connectera à son espace.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Nom',
              element: 'Champ « Nom »',
              role: 'Le nom de l’enseignant, tel qu’il apparaîtra sur les emplois du temps et les bulletins.',
            },
            {
              n: 2,
              selecteur: 'champ=Adresse email',
              element: 'Champ « Adresse email »',
              role: 'Obligatoire. C’est l’identifiant de connexion de l’enseignant à son espace.',
            },
            {
              n: 3,
              selecteur: 'champ=Type de contrat',
              element: 'Liste « Type de contrat »',
              role: 'CDI ou CDD. Sert au suivi du personnel et au filtre de la liste.',
            },
            {
              n: 4,
              selecteur: 'champ=Classe affectée',
              element: 'Liste « Classe affectée »',
              role: 'La classe dont l’enseignant devient titulaire. C’est ce choix qui décide des élèves qu’il verra et des notes qu’il pourra saisir.',
            },
            {
              n: 5,
              selecteur: 'texte=Sélectionner les fichiers',
              cote: 'droite',
              element: 'Bouton « Sélectionner les fichiers »',
              role: 'Joint les documents du dossier : contrat, diplômes, pièce d’identité.',
            },
            {
              n: 6,
              selecteur: 'texte=Enregistrer',
              cote: 'gauche',
              element: 'Bouton « Enregistrer »',
              role: 'Crée la fiche de l’enseignant avec son affectation.',
            },
          ],
          procedure: [
            'Depuis la liste des enseignants, cliquez sur « Nouvel enseignant ».',
            'Saisissez le nom, le prénom et l’adresse e-mail.',
            'Choisissez le type de contrat.',
            'Choisissez la classe affectée dans la liste « Classe affectée ».',
            'Joignez éventuellement les pièces du dossier.',
            'Cliquez sur « Enregistrer ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Sans classe affectée, l’enseignant se connectera à un espace vide : ni élèves, ni saisie de notes. Si un enseignant vous signale qu’il « ne voit rien », vérifiez d’abord ce champ.',
            },
            {
              type: 'savoir',
              texte:
                'Créer la fiche d’un enseignant ne lui donne pas encore de mot de passe. La création du compte de connexion se fait séparément — voir « Créer un compte utilisateur ».',
            },
          ],
        },
        {
          ecran: 'enseignants-fiche',
          titre: 'La fiche d’un enseignant',
          chapeau: 'Le dossier de l’enseignant : identité, compte, classe et documents.',
          fiche: {
            menu: 'Gestion des Personnes › Enseignants › cliquer la carte',
            adresse: '/app/people/teachers/(identifiant)',
            profil: 'Administrateur',
            prerequis: 'La fiche de l’enseignant doit exister.',
            resultat: 'Consultation du dossier complet.',
          },
          paragraphe:
            'Quatre onglets, sur le modèle de la fiche élève. « Classes & Matières » est celui qui renseigne sur la charge de l’enseignant.',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Profil',
              cote: 'haut',
              element: 'Onglet « Profil »',
              role: 'Identité, contact, type de contrat et date d’embauche.',
            },
            {
              n: 2,
              selecteur: 'texte=Compte',
              cote: 'haut',
              element: 'Onglet « Compte »',
              role: 'L’accès de l’enseignant à l’application : existence du compte et identifiant.',
            },
            {
              n: 3,
              selecteur: 'texte=Classes & Matières',
              cote: 'haut',
              element: 'Onglet « Classes & Matières »',
              role: 'La classe dont il est titulaire et les matières qu’il enseigne.',
            },
            {
              n: 4,
              selecteur: 'texte=Pièces jointes',
              cote: 'haut',
              element: 'Onglet « Pièces jointes »',
              role: 'Les documents du dossier administratif.',
            },
          ],
          procedure: [
            'Ouvrez la liste des enseignants et cliquez sur la carte voulue.',
            'Vérifiez l’identité et le contrat dans « Profil ».',
            'Ouvrez « Classes & Matières » pour connaître son affectation.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'La date d’embauche affichée peut être postérieure à la date du jour si la fiche a été importée automatiquement. Corrigez-la depuis l’icône « Modifier » de la liste si elle doit servir à un document officiel.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'L’année scolaire',
      chapeau:
        'C’est le squelette de tout le reste. L’année scolaire porte les inscriptions, les inscriptions portent les compositions, les compositions portent les notes. Une année mal ouverte, et rien ne fonctionne en aval.',
      sections: [
        {
          ecran: 'annees-scolaires',
          titre: 'Les années scolaires',
          chapeau:
            'Une année scolaire, c’est la période sur laquelle porte tout le travail de l’application. Une seule est « en cours » à la fois.',
          fiche: {
            menu: 'Année Académique › Années Scolaires',
            adresse: '/app/academic/years',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des années, avec celle qui est en cours.',
          },
          paragraphe:
            'La mention sous le titre rappelle en permanence quelle année est active. C’est elle que tous les autres écrans utilisent par défaut.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Année en cours : 2025-2026.',
              cote: 'bas',
              element: 'Rappel de l’année en cours',
              role: 'L’année sur laquelle travaille l’application par défaut, partout ailleurs.',
            },
            {
              n: 2,
              selecteur: 'texte=Nouvelle année',
              cote: 'gauche',
              element: 'Bouton « Nouvelle année »',
              role: 'Crée l’année suivante. À faire une fois par an, avant les inscriptions de la rentrée.',
            },
            {
              n: 3,
              selecteur: 'contient=En cours',
              cote: 'droite',
              element: 'Étiquette « En cours »',
              role: 'Marque l’année active. Une seule année peut la porter.',
            },
            {
              n: 4,
              selecteur: 'contient=0 trimestre',
              cote: 'droite',
              element: 'Compteur de trimestres',
              role: 'Le nombre de trimestres définis pour cette année. Ici zéro : aucun trimestre n’a encore été créé.',
            },
            {
              n: 5,
              selecteur: 'texte=Voir les trimestres',
              cote: 'gauche',
              element: 'Bouton « Voir les trimestres »',
              role: 'Ouvre la fenêtre de gestion des trimestres de l’année.',
            },
          ],
          procedure: [
            'Ouvrez Année Académique › Années Scolaires.',
            'Vérifiez que l’année portant l’étiquette « En cours » est bien l’année de travail.',
            'Pour préparer la rentrée suivante, cliquez sur « Nouvelle année ».',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Ne créez pas une nouvelle année en cours d’année scolaire pour « repartir de zéro ». Les inscriptions, les compositions et les notes sont attachées à une année précise : en changer déplacerait tout votre travail hors de portée des écrans de résultats.',
            },
          ],
        },
        {
          ecran: 'annee-detail',
          titre: 'Les trimestres d’une année',
          chapeau:
            'Les trimestres découpent l’année. Cette fenêtre est actuellement vide pour l’année en cours : c’est l’état d’une école qui n’a pas encore défini son calendrier.',
          fiche: {
            menu: 'Année Académique › Années Scolaires › Voir les trimestres',
            adresse: '/app/academic/years',
            profil: 'Administrateur',
            prerequis: 'Une année scolaire doit exister.',
            resultat: 'La liste des trimestres de l’année, ou un message indiquant qu’il n’y en a aucun.',
          },
          paragraphe:
            'La fenêtre s’ouvre par-dessus la liste, qui reste visible en arrière-plan grisé. Elle indique ici « Aucun trimestre pour cette année ».',
          legendes: [
            {
              n: 1,
              selecteur: '.ds-modal-title',
              cote: 'droite',
              element: 'Titre de la fenêtre',
              role: 'Rappelle l’année concernée : les trimestres appartiennent à une année précise, jamais à l’école en général.',
            },
            {
              n: 2,
              selecteur: 'contient=Aucun trimestre pour cette année.',
              cote: 'bas',
              element: 'Message d’état vide',
              role: 'Aucun trimestre n’est défini. Les écrans qui raisonnent par trimestre resteront donc vides.',
            },
            {
              n: 3,
              selecteur: 'texte=Nouveau trimestre',
              cote: 'gauche',
              element: 'Bouton « Nouveau trimestre »',
              role: 'Ajoute un trimestre à l’année, avec sa date de début et sa date de fin.',
            },
            {
              n: 4,
              selecteur: 'texte=Fermer',
              cote: 'gauche',
              element: 'Bouton « Fermer »',
              role: 'Referme la fenêtre et revient à la liste des années.',
            },
          ],
          procedure: [
            'Depuis la liste des années, cliquez sur « Voir les trimestres ».',
            'Cliquez sur « Nouveau trimestre ».',
            'Renseignez le libellé et les dates de début et de fin.',
            'Répétez l’opération pour chaque trimestre de l’année, puis cliquez sur « Fermer ».',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Dans une école primaire, le rythme des évaluations est porté par les compositions (chapitre « L’école primaire ») davantage que par les trimestres. Une école primaire peut donc travailler avec cette fenêtre vide sans que les bulletins en souffrent.',
            },
          ],
        },
        {
          ecran: 'inscriptions',
          titre: 'Inscrire des élèves dans une classe',
          chapeau:
            'L’acte central de la rentrée. C’est ici — et nulle part ailleurs — qu’un enfant entre dans une classe pour une année donnée.',
          fiche: {
            menu: 'Année Académique › Inscriptions',
            adresse: '/app/academic/inscriptions',
            profil: 'Administrateur',
            prerequis: 'Les fiches élèves et les classes doivent exister.',
            resultat: 'Les élèves apparaissent dans la classe, les listes, les compositions et les bulletins.',
          },
          paragraphe:
            'L’écran tient en deux champs. Le premier accepte plusieurs élèves à la fois : vous pouvez inscrire toute une classe en une seule opération.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Inscrivez un ou plusieurs élèves dans une classe pour l\'année 2025-2026 (en cours).',
              cote: 'bas',
              element: 'Rappel de l’année visée',
              role: 'L’année dans laquelle l’inscription sera enregistrée. Vérifiez-la : c’est l’erreur la plus coûteuse de cet écran.',
            },
            {
              n: 2,
              selecteur: 'champ=Élève',
              element: 'Champ « Élève »',
              role: 'Recherchez les élèves par leur nom et ajoutez-les un à un. Le champ en accepte plusieurs.',
            },
            {
              n: 3,
              selecteur: 'champ=Classe',
              element: 'Champ « Classe »',
              role: 'La classe d’accueil, parmi les six niveaux du primaire. Tous les élèves sélectionnés y seront inscrits ensemble.',
            },
            {
              n: 4,
              selecteur: 'texte=Inscrire',
              cote: 'gauche',
              element: 'Bouton « Inscrire »',
              role: 'Enregistre les inscriptions. À partir de cet instant, les élèves appartiennent à la classe pour toute l’année.',
            },
            {
              n: 5,
              selecteur: 'texte=Réinitialiser',
              cote: 'haut',
              element: 'Bouton « Réinitialiser »',
              role: 'Vide les deux champs sans rien enregistrer, pour repartir sur une autre classe.',
            },
          ],
          procedure: [
            'Ouvrez Année Académique › Inscriptions.',
            'Lisez la phrase sous le titre et vérifiez l’année indiquée.',
            'Dans « Élève », tapez le nom d’un enfant et sélectionnez-le ; répétez pour chaque élève de la classe.',
            'Dans « Classe », choisissez le niveau d’accueil.',
            'Cliquez sur « Inscrire ».',
            'Contrôlez le résultat dans Gestion des Personnes › Élèves, en filtrant sur la classe.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Trois notions de « classe » à ne pas confondre',
              texte:
                'La classe du primaire (CP1 à CM2) est un niveau doté d’une grille de matières. L’inscription rattache un élève à ce niveau pour une année. Le filtre « Classe » des autres écrans, lui, ne fait que restreindre l’affichage. Seule l’inscription modifie réellement la situation de l’enfant.',
            },
            {
              type: 'astuce',
              texte:
                'À la rentrée, procédez classe par classe : sélectionnez tous les élèves d’un même niveau, choisissez la classe, puis « Inscrire ». Six opérations suffisent pour toute l’école.',
            },
          ],
        },
        {
          ecran: 'emploi-du-temps',
          titre: 'L’emploi du temps — écran d’accueil',
          chapeau:
            'L’écran s’ouvre volontairement vide : il attend que vous lui disiez de quelle classe vous voulez parler.',
          fiche: {
            menu: 'Année Académique › Emploi du Temps',
            adresse: '/app/academic/timetable',
            profil: 'Administrateur',
            prerequis: 'Une année scolaire et au moins une classe.',
            resultat: 'La grille horaire de la classe choisie.',
          },
          paragraphe:
            'Deux listes déroulantes, et un message qui explique ce qu’il attend. C’est le comportement normal de l’écran, pas une panne.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Année scolaire',
              cote: 'bas',
              element: 'Liste « Année scolaire »',
              role: 'L’année dont on veut voir l’emploi du temps. Elle est pré-remplie sur l’année en cours.',
            },
            {
              n: 2,
              selecteur: 'champ=Classe',
              cote: 'bas',
              element: 'Liste « Classe »',
              role: 'La classe à afficher. Tant qu’aucune classe n’est choisie, la grille reste masquée.',
            },
            {
              n: 3,
              selecteur: 'contient=Choisissez une année scolaire et une classe pour gérer son emploi du temps.',
              cote: 'bas',
              element: 'Message d’attente',
              role: 'Rappelle ce qu’il manque pour afficher la grille. Ce n’est pas un message d’erreur.',
            },
          ],
          procedure: [
            'Ouvrez Année Académique › Emploi du Temps.',
            'Vérifiez l’année scolaire proposée.',
            'Choisissez une classe dans la seconde liste : la grille apparaît aussitôt.',
          ],
          encarts: [],
        },
        {
          ecran: 'emploi-du-temps-classe',
          titre: 'La grille horaire d’une classe',
          chapeau:
            'La semaine de la classe, du lundi au vendredi. On y déclare le titulaire, les activités de chaque créneau et les récréations.',
          fiche: {
            menu: 'Année Académique › Emploi du Temps › choisir une classe',
            adresse: '/app/academic/timetable',
            profil: 'Administrateur',
            prerequis: 'Une classe et un enseignant titulaire.',
            resultat: 'Un emploi du temps consultable par l’enseignant et par les familles.',
          },
          paragraphe:
            'L’écran se lit de haut en bas : d’abord qui enseigne, ensuite ce qu’on ajoute, enfin la grille obtenue. Les créneaux vides portent un tiret.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Enseignant(e) titulaire',
              cote: 'droite',
              element: 'Bloc « Enseignant(e) titulaire »',
              role: 'Désigne le maître de la classe. C’est cette désignation qui donne à l’enseignant l’accès à ses élèves et à la saisie des notes.',
            },
            {
              n: 2,
              selecteur: 'contient=Activités à ajouter',
              cote: 'droite',
              element: 'Bloc « Activités à ajouter »',
              role: 'La zone de préparation : on y compose une ou plusieurs activités avant de les enregistrer d’un bloc.',
            },
            {
              n: 3,
              selecteur: 'texte=Ajouter une activité',
              cote: 'droite',
              element: 'Bouton « Ajouter une activité »',
              role: 'Ajoute une ligne de préparation supplémentaire. Rien n’est encore inscrit dans la grille à ce stade.',
            },
            {
              n: 4,
              selecteur: 'texte=Définir une récréation / pause',
              cote: 'gauche',
              element: 'Bouton « Définir une récréation / pause »',
              role: 'Déclare un créneau de pause qui traverse toute la semaine — la récréation de 10 h 00, la coupure du midi.',
            },
            {
              n: 5,
              selecteur: 'colonne=HORAIRES',
              cote: 'gauche',
              element: 'Colonne « HORAIRES »',
              role: 'Les créneaux de la journée. Ils sont communs à toute la classe et se règlent avec « Ajouter un créneau horaire ».',
            },
            {
              n: 6,
              selecteur: 'texte=Exporter en PDF',
              cote: 'gauche',
              element: 'Bouton « Exporter en PDF »',
              role: 'Produit l’emploi du temps en PDF, à imprimer ou à remettre aux familles.',
            },
          ],
          procedure: [
            'Choisissez la classe dans la liste du haut.',
            'Désignez l’enseignant titulaire, puis cliquez sur « Enregistrer » dans ce bloc.',
            'Dans « Activités à ajouter », choisissez le jour, le ou les horaires, et l’activité.',
            'Cliquez sur « Ajouter une activité » pour préparer les autres créneaux.',
            'Cliquez sur le bouton « Enregistrer les … activité(s) » pour inscrire le tout dans la grille.',
            'Déclarez les récréations avec « Définir une récréation / pause ».',
            'Cliquez sur « Exporter en PDF » pour l’affichage en classe.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'La grille de cet écran présente quatre jours — lundi, mardi, jeudi et vendredi — alors que l’emploi du temps consulté par les familles en affiche six, du lundi au samedi. Les deux écrans ne montrent donc pas la même semaine. Vérifiez le résultat côté famille après avoir saisi les activités ; cette différence a été signalée pour correction.',
            },
            {
              type: 'astuce',
              texte:
                'Préparez plusieurs activités avant d’enregistrer : le bouton d’enregistrement indique combien d’activités seront inscrites d’un seul coup. C’est bien plus rapide que créneau par créneau.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'L’école primaire',
      chapeau:
        'Le module propre au primaire. La moyenne n’y est pas calculée par coefficients comme au collège, mais par une addition simple : le total des notes divisé par un diviseur déduit des barèmes. Ce chapitre explique comment ce mécanisme se met en place.',
      sections: [
        {
          ecran: 'primaire-classes',
          titre: 'Les six classes du primaire',
          chapeau:
            'CP1, CP2, CE1, CE2, CM1, CM2. Chaque niveau a sa propre grille de matières et ses propres seuils de passage.',
          fiche: {
            menu: 'École Primaire › Classes',
            adresse: '/app/primary/classes',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'Les six niveaux et le nombre de matières de chacun.',
          },
          paragraphe:
            'Une carte par niveau. L’étiquette verte indique combien de matières composent la grille : c’est le premier réglage à vérifier en début d’année.',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Nouvelle classe',
              cote: 'gauche',
              element: 'Bouton « Nouvelle classe »',
              role: 'Ajoute un niveau. Les six niveaux habituels existant déjà, vous n’en aurez presque jamais besoin.',
            },
            {
              n: 2,
              selecteur: 'contient=7 matières',
              cote: 'droite',
              element: 'Étiquette « … matières »',
              role: 'Le nombre de matières de la grille du niveau. Il détermine le diviseur de la moyenne : une matière ajoutée change les moyennes de toute la classe.',
            },
            {
              n: 3,
              selecteur: 'aria=Voir le détail du paramétrage',
              cote: 'bas',
              element: 'Icône œil « Voir le détail du paramétrage »',
              role: 'Affiche la grille du niveau en lecture, sans risque de la modifier.',
            },
            {
              n: 4,
              selecteur: 'aria=Configurer la grille et les seuils',
              cote: 'bas',
              element: 'Icône « Configurer la grille et les seuils »',
              role: 'Ouvre la fenêtre de réglage des matières, des barèmes et des seuils d’admission.',
            },
          ],
          procedure: [
            'Ouvrez École Primaire › Classes.',
            'Vérifiez, niveau par niveau, le nombre de matières annoncé.',
            'Cliquez sur l’icône de configuration du niveau à régler.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Les niveaux n’ont pas tous le même nombre de matières : ici CP1 et CP2 en comptent sept, les autres quatre. Un écart de ce genre est normal au CP, mais vérifiez qu’il correspond bien au programme de votre école avant les premières compositions.',
            },
          ],
        },
        {
          ecran: 'primaire-classe-config',
          titre: 'La grille de matières et les seuils',
          chapeau:
            'La fenêtre la plus importante du module. Tout le calcul des moyennes du niveau se décide ici.',
          fiche: {
            menu: 'École Primaire › Classes › Configurer la grille et les seuils',
            adresse: '/app/primary/classes',
            profil: 'Administrateur',
            prerequis: 'Le niveau doit exister.',
            resultat: 'Les matières, leurs barèmes et les seuils d’admission du niveau.',
          },
          paragraphe:
            'Chaque matière porte un barème — la note maximale possible. L’application additionne ces barèmes et en déduit seule le diviseur de la moyenne. Vous ne saisissez jamais ce diviseur.',
          legendes: [
            {
              n: 1,
              selecteur: '.ds-modal-title',
              cote: 'droite',
              element: 'Titre « Grille — CP1 »',
              role: 'Rappelle le niveau réglé. Chaque niveau a sa grille : modifier CP1 ne touche pas au CP2.',
            },
            {
              n: 2,
              selecteur: 'contient=COPIE',
              cote: 'gauche',
              element: 'Liste des matières',
              role: 'Les matières du niveau, avec leur barème à droite. Ce sont ces intitulés qui apparaîtront sur les bulletins.',
            },
            {
              n: 3,
              selecteur: 'champ=Échelle de la moyenne',
              cote: 'bas',
              element: 'Liste « Échelle de la moyenne »',
              role: 'La note sur laquelle la moyenne est exprimée — ici sur 10. C’est ce qui apparaît dans les bulletins et les classements.',
            },
            {
              n: 4,
              selecteur: 'champ=Moyenne d\'admission',
              cote: 'bas',
              element: 'Champ « Moyenne d’admission »',
              role: 'La moyenne à partir de laquelle un élève est admis. En dessous de ce seuil, l’élève n’est pas déclaré admis.',
            },
            {
              n: 5,
              selecteur: 'champ=Seuil de redoublement',
              cote: 'bas',
              element: 'Champ « Seuil de redoublement »',
              role: 'La moyenne en dessous de laquelle le résultat est jugé insuffisant. Entre les deux seuils, la situation est intermédiaire.',
            },
            {
              n: 6,
              selecteur: 'contient=Le diviseur se déduit des barèmes : il n\'est jamais saisi à la main.',
              cote: 'haut',
              element: 'Rappel du calcul',
              role: 'L’application affiche le total des barèmes et le diviseur qu’elle en tire. Vérifiez cette ligne après chaque modification : c’est le contrôle le plus sûr.',
            },
            {
              n: 7,
              selecteur: 'texte=Enregistrer',
              cote: 'haut',
              element: 'Bouton « Enregistrer »',
              role: 'Applique la grille au niveau. Les moyennes déjà calculées sont recalculées avec les nouveaux barèmes.',
            },
          ],
          procedure: [
            'Depuis la liste des classes, cliquez sur l’icône de configuration du niveau.',
            'Vérifiez la liste des matières et le barème de chacune.',
            'Choisissez l’échelle de la moyenne (sur 10 ou sur 20).',
            'Saisissez la moyenne d’admission et le seuil de redoublement.',
            'Lisez la ligne « Total des barèmes » et vérifiez que le diviseur annoncé correspond à ce que vous attendez.',
            'Cliquez sur « Enregistrer ».',
          ],
          encarts: [
            {
              type: 'savoir',
              titre: 'Comment la moyenne est calculée',
              texte:
                'L’application additionne les notes de toutes les matières, puis divise ce total par le diviseur — lui-même égal au total des barèmes divisé par l’échelle. Au CP1, sept matières sur 10 donnent un total de 70, donc un diviseur de 7 et une moyenne sur 10. Au CP2, où les mathématiques comptent sur 20, le total atteint 80 et le diviseur devient 8.',
            },
            {
              type: 'attention',
              texte:
                'Modifier une grille en cours d’année recalcule les moyennes déjà publiées. Si des bulletins ont été remis aux familles, ils ne correspondront plus à ce qu’affiche l’application. Réglez les grilles avant la première composition.',
            },
          ],
        },
        {
          ecran: 'primaire-compositions',
          titre: 'Le calendrier des compositions',
          chapeau:
            'Une composition est un devoir commun à toute une classe, à une date donnée. Cet écran montre, pour chaque niveau, ce que le programme prévoit et ce qui reste à créer.',
          fiche: {
            menu: 'École Primaire › Compositions',
            adresse: '/app/primary/evaluations',
            profil: 'Administrateur',
            prerequis: 'Les classes du primaire doivent être configurées.',
            resultat: 'L’état d’avancement des compositions de chaque niveau.',
          },
          paragraphe:
            'Chaque carte affiche un compteur du type « 3/4 compositions » puis la liste des compositions attendues. Celles qui restent à créer apparaissent en grisé.',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Créer une composition',
              cote: 'gauche',
              element: 'Bouton « Créer une composition »',
              role: 'Ouvre la fenêtre de création. Une même composition peut être créée pour plusieurs classes d’un coup.',
            },
            {
              n: 2,
              selecteur: 'contient=0/4 compositions',
              cote: 'droite',
              element: 'Compteur d’avancement',
              role: 'Combien de compositions prévues ont déjà été créées pour ce niveau. « 0/4 » signifie qu’aucune n’existe encore.',
            },
            {
              n: 3,
              selecteur: 'contient=Cours Moyen 2 (CEPE)',
              cote: 'droite',
              element: 'Intitulé du niveau CM2',
              role: 'Le CM2 est signalé comme classe d’examen : son calendrier comporte des examens blancs à la place de certaines compositions.',
            },
            {
              n: 4,
              selecteur: 'texte=Voir les compositions de la classe',
              cote: 'gauche',
              element: 'Bouton « Voir les compositions de la classe »',
              role: 'Ouvre le détail des compositions du niveau, avec leurs dates.',
            },
          ],
          procedure: [
            'Ouvrez École Primaire › Compositions.',
            'Repérez les niveaux dont le compteur n’est pas complet.',
            'Cliquez sur « Créer une composition » pour ajouter celles qui manquent.',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Le CM2 prépare le CEPE : son calendrier comporte deux compositions puis deux examens blancs, là où les autres niveaux comptent trois compositions et une épreuve de passage. L’application applique cette différence d’elle-même.',
            },
          ],
        },
        {
          ecran: 'primaire-composition-creer',
          titre: 'Créer une composition',
          chapeau:
            'Une composition, une date, et les classes concernées. La même épreuve peut être ouverte pour plusieurs niveaux en une seule opération.',
          fiche: {
            menu: 'École Primaire › Compositions › Créer une composition',
            adresse: '/app/primary/evaluations',
            profil: 'Administrateur',
            prerequis: 'Les classes doivent avoir une grille de matières.',
            resultat: 'Une composition ouverte à la saisie des notes pour les classes cochées.',
          },
          paragraphe:
            'Le champ « Composition » propose les intitulés attendus par le programme ; la date est celle de l’épreuve. Les cases du bas décident des classes concernées.',
          legendes: [
            {
              n: 1,
              selecteur: '.ds-modal-title',
              cote: 'droite',
              element: 'Titre « Nouvelle composition »',
              role: 'La fenêtre de création, ouverte par-dessus le calendrier.',
            },
            {
              n: 2,
              selecteur: 'champ=Composition',
              cote: 'bas',
              element: 'Champ « Composition »',
              role: 'L’intitulé de l’épreuve — par exemple COMPOSITION 1. Au CM2, choisir « EXAMEN BLANC 1 » ou « EXAMEN BLANC 2 » ajoute l’EPS à la grille des matières évaluées.',
            },
            {
              n: 3,
              selecteur: 'champ=Date',
              cote: 'bas',
              element: 'Champ « Date »',
              role: 'La date de l’épreuve. Elle apparaîtra sur les bulletins et sert à ordonner les compositions dans l’année.',
            },
            {
              n: 4,
              selecteur: 'contient=Classes concernées',
              cote: 'gauche',
              element: 'Section « Classes concernées »',
              role: 'Les niveaux pour lesquels la composition sera créée. Le compteur « 0 / 6 » indique combien sont cochés.',
            },
            {
              n: 5,
              selecteur: 'texte=Prévues',
              cote: 'haut',
              element: 'Bouton « Prévues »',
              role: 'Coche automatiquement les classes pour lesquelles cette composition est prévue au programme et n’existe pas encore. Le choix le plus sûr.',
            },
            {
              n: 6,
              selecteur: 'texte=Créer',
              cote: 'gauche',
              element: 'Bouton « Créer »',
              role: 'Crée la composition pour chaque classe cochée. Elle devient aussitôt disponible à la saisie des notes.',
            },
          ],
          procedure: [
            'Depuis le calendrier des compositions, cliquez sur « Créer une composition ».',
            'Choisissez l’intitulé dans le champ « Composition ».',
            'Indiquez la date de l’épreuve.',
            'Cliquez sur « Prévues » pour cocher les classes qui l’attendent, ou cochez-les à la main.',
            'Vérifiez le compteur de classes sélectionnées.',
            'Cliquez sur « Créer ».',
          ],
          encarts: [
            {
              type: 'astuce',
              texte:
                'Le bouton « Prévues » évite l’erreur la plus courante : créer une composition en double pour une classe qui l’a déjà. Préférez-le à « Toutes ».',
            },
            {
              type: 'attention',
              texte:
                'Sans composition créée, l’enseignant n’a rien à saisir : son écran de saisie de notes reste vide. Créez les compositions avant les dates d’épreuve, pas après.',
            },
          ],
        },
        {
          ecran: 'primaire-resultats',
          titre: 'Résultats et bulletins d’une composition',
          chapeau:
            'L’aboutissement de la chaîne : les notes saisies deviennent des moyennes, un classement, des mentions et des bulletins imprimables.',
          fiche: {
            menu: 'École Primaire › Résultats & Bulletins',
            adresse: '/app/primary/grades',
            profil: 'Administrateur',
            prerequis: 'Une composition créée et des notes saisies.',
            resultat: 'Classement de la classe, statistiques et bulletins en PDF.',
          },
          paragraphe:
            'Trois listes en haut choisissent ce que l’on regarde ; quatre boutons produisent les documents ; les cartes du bas donnent le détail élève par élève, dans l’ordre du classement.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Composition',
              cote: 'bas',
              element: 'Liste « Composition »',
              role: 'L’épreuve dont on affiche les résultats, avec sa date. Changer de composition change tout l’écran.',
            },
            {
              n: 2,
              selecteur: 'texte=Saisir les notes',
              cote: 'haut',
              element: 'Bouton « Saisir les notes »',
              role: 'Ouvre la grille de saisie des notes de la classe pour cette composition. C’est habituellement l’enseignant qui l’utilise.',
            },
            {
              n: 3,
              selecteur: 'texte=Fiche de classement (PDF)',
              cote: 'haut',
              element: 'Bouton « Fiche de classement (PDF) »',
              role: 'Produit le classement de la classe en un seul document, à afficher ou à archiver.',
            },
            {
              n: 4,
              selecteur: 'texte=Bulletins de la classe',
              cote: 'haut',
              element: 'Bouton « Bulletins de la classe »',
              role: 'Produit en une fois les bulletins de tous les élèves de la classe. À privilégier pour une remise groupée.',
            },
            {
              n: 5,
              selecteur: 'bloc=Moyenne de la classe',
              cote: 'bas',
              element: 'Indicateurs de la composition',
              role: 'Moyenne de la classe, nombre d’élèves ayant composé, taux de réussite et meilleure moyenne. De quoi juger l’épreuve d’un coup d’œil.',
            },
            {
              n: 6,
              selecteur: 'contient=total ÷ 8 → /10',
              cote: 'droite',
              element: 'Rappel du mode de calcul',
              role: 'Le diviseur appliqué et l’échelle de la moyenne, hérités de la grille du niveau. Utile pour expliquer un résultat à un parent.',
            },
            {
              n: 7,
              selecteur: 'contient=Admission à partir de 5/10 · insuffisant en dessous de 4/10. Une matière non saisie compte 0 ; un élève absent n\'est pas classé.',
              cote: 'bas',
              element: 'Rappel des règles',
              role: 'Les seuils appliqués et le traitement des cas particuliers. La phrase la plus importante de l’écran : une matière oubliée compte zéro et fait chuter la moyenne.',
            },
            {
              n: 8,
              selecteur: 'texte=Bulletin',
              cote: 'gauche',
              element: 'Bouton « Bulletin »',
              role: 'Produit le bulletin PDF d’un seul élève. À utiliser pour un duplicata demandé par une famille.',
            },
          ],
          procedure: [
            'Ouvrez École Primaire › Résultats & Bulletins.',
            'Choisissez l’année, la classe puis la composition.',
            'Lisez les quatre indicateurs pour juger l’ensemble de l’épreuve.',
            'Vérifiez que le nombre d’élèves ayant composé correspond à l’effectif de la classe.',
            'Cliquez sur « Bulletins de la classe » pour éditer tous les bulletins.',
            'Pour un seul élève, cliquez sur le bouton « Bulletin » de sa carte.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Une matière non saisie compte zéro',
              texte:
                'Si l’enseignant oublie une matière, l’application ne la considère pas comme absente : elle la compte pour zéro et la moyenne s’effondre. Avant d’éditer les bulletins, vérifiez que chaque carte élève affiche bien toutes les matières de la grille.',
            },
            {
              type: 'astuce',
              texte:
                'L’indicateur « Ont composé » compare le nombre d’élèves notés à l’effectif inscrit. S’il affiche 5/6 alors que personne n’était absent, c’est qu’une saisie manque.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'La finance',
      chapeau:
        'Deux écrans complémentaires : l’un définit ce que les familles doivent et quand, l’autre enregistre ce qu’elles ont versé. Le premier se règle une fois par an, le second s’utilise tous les jours.',
      sections: [
        {
          ecran: 'finance-echeanciers',
          titre: 'Les échéanciers',
          chapeau:
            'Un échéancier est un modèle de versements : trois tranches trimestrielles, par exemple. On le définit une fois, puis on l’affecte aux classes concernées.',
          fiche: {
            menu: 'Finance › Échéanciers',
            adresse: '/app/finance/payment-conditions',
            profil: 'Administrateur',
            prerequis: 'Les classes doivent exister.',
            resultat: 'Des échéanciers réutilisables, affectés à des classes.',
          },
          paragraphe:
            'Chaque carte indique le nombre de versements du modèle et le nombre de classes auxquelles il s’applique.',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Nouvelle condition',
              cote: 'gauche',
              element: 'Bouton « Nouvelle condition »',
              role: 'Crée un échéancier : son nom, ses versements, leurs montants et leurs dates.',
            },
            {
              n: 2,
              selecteur: 'contient=3 versements',
              cote: 'droite',
              element: 'Étiquette « … versements »',
              role: 'Le nombre de tranches prévues par ce modèle.',
            },
            {
              n: 3,
              selecteur: 'contient=1 classe',
              cote: 'droite',
              element: 'Étiquette « … classe »',
              role: 'Le nombre de classes auxquelles l’échéancier est affecté. À zéro, le modèle existe mais ne s’applique à personne.',
            },
            {
              n: 4,
              selecteur: 'texte=Affecter aux classes',
              cote: 'gauche',
              element: 'Bouton « Affecter aux classes »',
              role: 'Applique l’échéancier à un ou plusieurs niveaux. Sans cette étape, aucun élève n’est concerné.',
            },
            {
              n: 5,
              selecteur: 'texte=Voir les versements',
              cote: 'gauche',
              element: 'Bouton « Voir les versements »',
              role: 'Affiche le détail des tranches : libellé, montant et date d’échéance.',
            },
          ],
          procedure: [
            'Ouvrez Finance › Échéanciers.',
            'Cliquez sur « Nouvelle condition » pour créer un modèle de versements.',
            'Une fois le modèle enregistré, cliquez sur « Affecter aux classes ».',
            'Cochez les niveaux concernés et validez.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un échéancier créé mais non affecté ne produit aucun effet : l’écran Paiements n’attendra rien des élèves. Vérifiez toujours que l’étiquette « … classe » n’affiche pas zéro.',
            },
          ],
        },
        {
          ecran: 'finance-echeancier-nouveau',
          titre: 'Créer un échéancier',
          chapeau:
            'Le formulaire liste les versements ligne par ligne : un libellé, un montant fixe, une date d’échéance.',
          fiche: {
            menu: 'Finance › Échéanciers › Nouvelle condition',
            adresse: '/app/finance/payment-conditions',
            profil: 'Administrateur',
            prerequis: 'Connaître le montant et le calendrier des frais de scolarité.',
            resultat: 'Un échéancier prêt à être affecté à des classes.',
          },
          paragraphe:
            'Commencez par nommer l’échéancier de façon parlante : ce nom est ce que vous retrouverez dans la liste, souvent des mois plus tard.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Nom de l\'échéancier',
              element: 'Champ « Nom de l’échéancier »',
              role: 'Le nom du modèle. Un intitulé explicite — « CE1 — 3 versements trimestriels » — vaut mieux qu’un numéro.',
            },
            {
              n: 2,
              selecteur: 'colonne=Libellé du versement',
              cote: 'haut',
              element: 'Colonne « Libellé du versement »',
              role: 'Le nom de la tranche, tel qu’il apparaîtra sur le suivi des paiements : « 1er versement », « Inscription »…',
            },
            {
              n: 3,
              selecteur: 'colonne=Montant (CFA)',
              cote: 'haut',
              element: 'Colonne « Montant (CFA) »',
              role: 'Le montant fixe de la tranche, en francs CFA.',
            },
            {
              n: 4,
              selecteur: 'colonne=Date d\'échéance',
              cote: 'haut',
              element: 'Colonne « Date d’échéance »',
              role: 'La date à laquelle le versement est attendu. C’est elle qui déclenche le repérage des retards.',
            },
            {
              n: 5,
              selecteur: 'texte=Ajouter un versement',
              cote: 'droite',
              element: 'Bouton « Ajouter un versement »',
              role: 'Ajoute une ligne au tableau, pour une tranche supplémentaire.',
            },
            {
              n: 6,
              selecteur: 'texte=Enregistrer',
              cote: 'gauche',
              element: 'Bouton « Enregistrer »',
              role: 'Crée l’échéancier. Il faudra encore l’affecter aux classes depuis la liste.',
            },
          ],
          procedure: [
            'Depuis la liste des échéanciers, cliquez sur « Nouvelle condition ».',
            'Nommez l’échéancier.',
            'Sur la première ligne, saisissez le libellé, le montant et la date d’échéance du premier versement.',
            'Cliquez sur « Ajouter un versement » et répétez pour chaque tranche.',
            'Cliquez sur « Enregistrer ».',
            'Revenez à la liste et cliquez sur « Affecter aux classes ».',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Les montants sont fixes et identiques pour tous les élèves de la classe. Les situations particulières — bourses, remises — se traitent au moment de l’enregistrement du paiement, pas dans l’échéancier.',
            },
          ],
        },
        {
          ecran: 'finance-paiements',
          titre: 'Le suivi des paiements',
          chapeau:
            'L’écran quotidien de la comptabilité. Comme l’emploi du temps, il attend qu’on lui désigne une classe.',
          fiche: {
            menu: 'Finance › Paiements',
            adresse: '/app/finance/payments',
            profil: 'Administrateur',
            prerequis: 'Une classe avec des élèves inscrits et un échéancier affecté.',
            resultat: 'La situation de paiement de chaque élève de la classe.',
          },
          paragraphe:
            'Le message affiché n’est pas une erreur : il indique simplement qu’il manque le choix d’une classe.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Année scolaire',
              cote: 'bas',
              element: 'Liste « Année scolaire »',
              role: 'L’année dont on suit les paiements.',
            },
            {
              n: 2,
              selecteur: 'champ=Classe',
              cote: 'bas',
              element: 'Liste « Classe »',
              role: 'La classe à afficher. Le suivi se fait toujours classe par classe.',
            },
            {
              n: 3,
              selecteur: 'contient=Choisissez une année scolaire et une classe pour voir la liste des élèves.',
              cote: 'bas',
              element: 'Message d’attente',
              role: 'Rappelle ce qui manque pour afficher la liste.',
            },
          ],
          procedure: [
            'Ouvrez Finance › Paiements.',
            'Vérifiez l’année scolaire.',
            'Choisissez la classe : la liste des élèves et leur situation apparaissent.',
          ],
          encarts: [],
        },
        {
          ecran: 'finance-paiements-classe',
          titre: 'Les paiements d’une classe',
          chapeau:
            'Une fois la classe choisie, l’écran liste ses élèves et l’état de leurs versements.',
          fiche: {
            menu: 'Finance › Paiements › choisir une classe',
            adresse: '/app/finance/payments',
            profil: 'Administrateur',
            prerequis: 'Des élèves inscrits dans la classe et un échéancier affecté.',
            resultat: 'La situation de chaque élève et l’enregistrement des versements reçus.',
          },
          paragraphe:
            'Chaque élève apparaît avec ce qu’il doit et ce qu’il a réglé. C’est ici que l’on enregistre un versement lorsqu’un parent se présente au secrétariat.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Classe',
              cote: 'bas',
              element: 'Liste « Classe »',
              role: 'La classe affichée. En changer recharge entièrement la liste.',
            },
            {
              n: 2,
              selecteur: 'main',
              cote: 'droite',
              element: 'Liste des élèves de la classe',
              role: 'Les élèves inscrits, avec le détail des versements attendus et reçus.',
            },
          ],
          procedure: [
            'Choisissez l’année et la classe.',
            'Repérez l’élève concerné dans la liste.',
            'Enregistrez le versement reçu sur la ligne correspondante.',
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
      titre: 'Administration',
      chapeau:
        'Qui a le droit de faire quoi, avec quel compte, et sous quelle identité d’établissement. Ces trois écrans se règlent rarement, mais une erreur s’y paie cher.',
      sections: [
        {
          ecran: 'roles',
          titre: 'Les rôles',
          chapeau:
            'Un rôle décide des menus visibles dans la barre latérale des comptes qui le portent. C’est le seul mécanisme de droits de l’application.',
          fiche: {
            menu: 'Administration › Rôles',
            adresse: '/app/people/roles',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'La liste des rôles et le nombre de comptes qui les portent.',
          },
          paragraphe:
            'Deux rôles existent d’office : « Administrateur », qui voit tout, et « Propriétaire », réservé aux tableaux de bord de pilotage.',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Nouveau rôle',
              cote: 'gauche',
              element: 'Bouton « Nouveau rôle »',
              role: 'Crée un profil sur mesure — un rôle « Secrétariat » limité aux élèves et aux inscriptions, par exemple.',
            },
            {
              n: 2,
              selecteur: 'contient=Accès complet aux menus d\'un établissement de type école primaire.',
              cote: 'droite',
              element: 'Rôle « Administrateur »',
              role: 'Le rôle qui voit tous les menus ouverts par votre type d’établissement. C’est celui de votre compte.',
            },
            {
              n: 3,
              selecteur: 'contient=20 menu(s)',
              cote: 'droite',
              element: 'Compteur de menus',
              role: 'Le nombre de menus cochés sur ce rôle. Il peut dépasser ce que vous voyez : les menus réservés au collège sont comptés mais restent masqués dans une école primaire.',
            },
            {
              n: 4,
              selecteur: 'contient=1 utilisateur(s)',
              cote: 'droite',
              element: 'Compteur d’utilisateurs',
              role: 'Le nombre de comptes portant ce rôle. Un rôle à zéro utilisateur ne sert à rien.',
            },
            {
              n: 5,
              selecteur: 'aria=Modifier',
              cote: 'bas',
              element: 'Icône crayon « Modifier »',
              role: 'Rouvre le rôle pour ajuster les menus qui lui sont accordés.',
            },
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
                'Décocher des menus sur le rôle « Administrateur » les retire aussi de votre propre barre latérale. Le menu « Rôles » reste toujours visible — c’est le garde-fou qui vous permet de revenir en arrière.',
            },
          ],
        },
        {
          ecran: 'roles-nouveau',
          titre: 'Créer un rôle',
          chapeau:
            'Un nom, une description, et des cases à cocher. Chaque case correspond exactement à une entrée de la barre latérale.',
          fiche: {
            menu: 'Administration › Rôles › Nouveau rôle',
            adresse: '/app/people/roles',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'Un rôle attribuable aux comptes du personnel.',
          },
          paragraphe:
            'Les menus sont regroupés comme dans la barre latérale. Chaque groupe porte un compteur et deux raccourcis « Tout » et « Aucune ».',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Nom du rôle',
              element: 'Champ « Nom du rôle »',
              role: 'Le nom du profil, tel qu’il apparaîtra au moment de créer un compte : « Secrétariat », « Comptabilité »…',
            },
            {
              n: 2,
              selecteur: 'champ=Description (optionnel)',
              element: 'Champ « Description »',
              role: 'Une phrase qui rappelle à quoi sert le rôle. Elle s’affiche dans la liste des rôles.',
            },
            {
              n: 3,
              selecteur: 'contient=Gestion des Personnes',
              cote: 'gauche',
              element: 'Groupe de menus',
              role: 'Les menus sont présentés par groupe, dans l’ordre de la barre latérale. Le compteur indique combien sont cochés dans le groupe.',
            },
            {
              n: 4,
              selecteur: 'texte=Tout',
              cote: 'haut',
              element: 'Boutons « Tout » et « Aucune »',
              role: 'Cochent ou décochent d’un coup tous les menus du groupe.',
            },
            {
              n: 5,
              selecteur: 'contient=0 menu(s) sélectionné(s)',
              cote: 'haut',
              element: 'Compteur général',
              role: 'Le total des menus accordés au rôle. À zéro, le compte n’aurait aucune navigation.',
            },
            {
              n: 6,
              selecteur: 'texte=Enregistrer',
              cote: 'gauche',
              element: 'Bouton « Enregistrer »',
              role: 'Crée le rôle. Il devient aussitôt proposé dans le formulaire de création d’un compte.',
            },
          ],
          procedure: [
            'Depuis la liste des rôles, cliquez sur « Nouveau rôle ».',
            'Nommez le rôle et décrivez-le en une phrase.',
            'Cochez les menus que ce profil doit voir, groupe par groupe.',
            'Vérifiez le compteur « … menu(s) sélectionné(s) ».',
            'Cliquez sur « Enregistrer ».',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Deux menus à ne pas cocher dans une école primaire',
              texte:
                'Le groupe « Année Académique » propose « Liste de Présence » et « Séances non tenues ». Ces deux écrans n’existent que dans le secondaire : les cocher n’ajoutera rien à la barre latérale de vos comptes. Cette anomalie a été signalée pour correction.',
            },
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
          chapeau:
            'La liste des personnes qui peuvent se connecter à l’application côté administration. Un compte, une adresse e-mail, un rôle.',
          fiche: {
            menu: 'Administration › Utilisateurs',
            adresse: '/app/people/users',
            profil: 'Administrateur',
            prerequis: 'Les rôles doivent être définis.',
            resultat: 'La liste des comptes, leur rôle et leur état.',
          },
          paragraphe:
            'Chaque ligne indique le nom, l’adresse e-mail, le rôle et l’état du compte. Le compte administrateur principal porte une mention « Protégé ».',
          legendes: [
            {
              n: 1,
              selecteur: 'texte=Nouvel utilisateur',
              cote: 'gauche',
              element: 'Bouton « Nouvel utilisateur »',
              role: 'Crée un compte de connexion pour un membre du personnel.',
            },
            {
              n: 2,
              selecteur: 'contient=Protégé',
              cote: 'gauche',
              element: 'Mention « Protégé »',
              role: 'Ce compte administrateur ne peut pas être supprimé. C’est ce qui empêche l’école de se retrouver sans aucun accès d’administration.',
            },
            {
              n: 3,
              selecteur: 'contient=Actif',
              cote: 'droite',
              element: 'État du compte',
              role: 'Un compte inactif existe encore mais ne peut plus se connecter. C’est la bonne manière de suspendre un accès sans effacer l’historique.',
            },
            {
              n: 4,
              selecteur: 'aria=Modifier',
              cote: 'bas',
              element: 'Icône crayon « Modifier »',
              role: 'Permet de changer le rôle d’un compte, de le désactiver ou de lui attribuer un nouveau mot de passe.',
            },
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
                'Quand quelqu’un quitte l’école, désactivez son compte plutôt que de le supprimer : les actions qu’il a réalisées restent rattachées à son nom dans l’historique.',
            },
          ],
        },
        {
          ecran: 'utilisateurs-nouveau',
          titre: 'Créer un compte utilisateur',
          chapeau:
            'C’est ici que se donne l’accès à l’application — y compris à un enseignant, dont la fiche seule ne suffit pas à ouvrir un compte.',
          fiche: {
            menu: 'Administration › Utilisateurs › Nouvel utilisateur',
            adresse: '/app/people/users',
            profil: 'Administrateur',
            prerequis: 'Le rôle à attribuer doit exister.',
            resultat: 'Un compte capable de se connecter avec son adresse e-mail et son mot de passe.',
          },
          paragraphe:
            'Le mot de passe est saisi par vous et communiqué à la personne. Elle pourra le changer ensuite depuis le menu de son nom.',
          legendes: [
            {
              n: 1,
              selecteur: 'champ=Nom',
              element: 'Champ « Nom »',
              role: 'Le nom de la personne, affiché en bas de sa barre latérale.',
            },
            {
              n: 2,
              selecteur: 'champ=Adresse email',
              element: 'Champ « Adresse email »',
              role: 'L’identifiant de connexion. Il doit être unique dans l’école et rester valide : c’est par lui que la personne entre dans l’application.',
            },
            {
              n: 3,
              selecteur: 'champ=Rôle',
              element: 'Liste « Rôle »',
              role: 'Le profil de droits attribué au compte. Il décide des menus visibles.',
            },
            {
              n: 4,
              selecteur: 'contient=Compte actif',
              cote: 'droite',
              element: 'Interrupteur « Compte actif »',
              role: 'Autorise ou bloque la connexion. Un compte préparé à l’avance peut être créé inactif, puis activé le jour de la prise de poste.',
            },
            {
              n: 5,
              selecteur: 'champ=Mot de passe',
              element: 'Champ « Mot de passe »',
              role: 'Le mot de passe initial, que vous communiquerez à la personne. Elle pourra le modifier depuis son compte.',
            },
            {
              n: 6,
              selecteur: 'texte=Enregistrer',
              cote: 'gauche',
              element: 'Bouton « Enregistrer »',
              role: 'Crée le compte. La personne peut se connecter immédiatement si le compte est actif.',
            },
          ],
          procedure: [
            'Ouvrez Administration › Utilisateurs et cliquez sur « Nouvel utilisateur ».',
            'Saisissez le nom, le prénom et l’adresse e-mail.',
            'Choisissez le rôle correspondant au poste.',
            'Vérifiez que « Compte actif » est bien activé.',
            'Saisissez un mot de passe initial.',
            'Cliquez sur « Enregistrer », puis transmettez les identifiants à la personne.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Transmettez le mot de passe initial de vive voix ou par un canal sûr, et demandez à la personne de le changer à sa première connexion. Un mot de passe envoyé par message reste lisible longtemps après.',
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
          chapeau:
            'L’identité de l’école : son nom, ses coordonnées, son logo. Ces informations apparaissent sur les documents produits par l’application.',
          fiche: {
            menu: 'Administration › Établissement',
            adresse: '/app/etablissement',
            profil: 'Administrateur',
            prerequis: 'Aucun.',
            resultat: 'Les coordonnées et le logo de l’école, à jour.',
          },
          paragraphe:
            'Le type d’école — ici « École primaire » — n’est pas un simple libellé : c’est lui qui décide des menus affichés dans toute l’application.',
          legendes: [
            {
              n: 1,
              selecteur: 'contient=Groupe Scolaire les Palmiers',
              cote: 'bas',
              element: 'Nom de l’établissement',
              role: 'Le nom officiel de l’école. Il figure sous la marque, dans la barre latérale, et sur les documents édités.',
            },
            {
              n: 2,
              selecteur: 'contient=École primaire',
              cote: 'bas',
              element: 'Type d’école',
              role: 'Le cycle de l’établissement. C’est ce réglage qui masque les menus du collège et fait apparaître le groupe « École Primaire ».',
            },
            {
              n: 3,
              selecteur: 'texte=Remplacer',
              cote: 'droite',
              element: 'Bouton « Remplacer » (logo)',
              role: 'Charge le logo de l’école — image JPG, PNG ou WEBP, 2 Mo au maximum. Sans logo, l’application affiche un sigle générique.',
            },
            {
              n: 4,
              selecteur: 'texte=Modifier',
              cote: 'gauche',
              element: 'Bouton « Modifier »',
              role: 'Ouvre les coordonnées en saisie : nom, e-mail, téléphone, ville, adresse, direction régionale et secteur pédagogique.',
            },
            {
              n: 5,
              selecteur: 'contient=Identifiant',
              cote: 'gauche',
              element: 'Ligne « Identifiant »',
              role: 'Le code technique de l’école, dérivé de son nom. Il ne se modifie pas et sert aux échanges entre l’application et ses services.',
            },
          ],
          procedure: [
            'Ouvrez Administration › Établissement.',
            'Vérifiez le nom, le type d’école et les coordonnées.',
            'Cliquez sur « Modifier » pour corriger une information.',
            'Cliquez sur « Remplacer » pour charger le logo de l’école.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Ne changez pas le type d’école en cours d’année. Passer de « École primaire » à un autre cycle réorganiserait entièrement les menus et rendrait inaccessibles les écrans du primaire où se trouvent vos compositions.',
            },
            {
              type: 'astuce',
              texte:
                'Chargez le logo dès la mise en service : il apparaît sur la page de connexion et dans la barre latérale, et les familles reconnaissent immédiatement leur école.',
            },
          ],
        },
      ],
    },
  ],
};
