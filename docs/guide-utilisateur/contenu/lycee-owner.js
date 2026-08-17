/**
 * Contenu rédigé du Guide du propriétaire — espace de pilotage.
 *
 * Ce guide vaut pour **tout type d'établissement** : le menu du propriétaire ne
 * dépend pas du cycle, seul le contenu des écrans s'y adapte. Une école
 * primaire n'a pas d'écran Assiduité — l'appel par séance est un mécanisme du
 * secondaire — et c'est la seule différence.
 *
 * Le ton diffère des autres guides : le lecteur n'exécute pas une procédure, il
 * lit des chiffres pour décider. Chaque écran est donc présenté par la question
 * à laquelle il répond, et chaque encart dit ce qu'il faut faire quand
 * l'indicateur dérape.
 */

module.exports = {
  meta: {
    titre: 'Guide du propriétaire',
    sousTitre: 'HorizonEcole — Espace de pilotage',
    etablissement: 'Lycée Moderne de Cocody',
    profil: 'Propriétaire',
    version: '1.0',
    adresse: 'http://localhost:5173/app',
    avertissement:
      'Ce guide décrit l’espace Propriétaire, identique quel que soit le type d’établissement. ' +
      'Les copies d’écran proviennent du « Lycée Moderne de Cocody », un établissement de ' +
      'démonstration : les élèves, les familles et les montants qui y figurent sont fictifs.',
  },

  introduction: {
    titre: 'À quoi sert cet espace',
    paragraphes: [
      'L’espace Propriétaire réunit, en six écrans, ce qu’il faut savoir pour piloter un établissement : les effectifs, l’assiduité, les résultats, le corps enseignant et la trésorerie.',
      'Il est **en lecture seule**, et c’est délibéré. Aucun bouton n’y modifie quoi que ce soit : pas d’élève à inscrire, pas de note à corriger, pas de paiement à saisir. Vous regardez, vous décidez, et l’exécution revient à l’administration. Cette séparation vous protège autant qu’elle protège les données.',
      'Deux réglages commandent tout ce que vous lisez. L’**année scolaire**, en haut de chaque écran, se place d’elle-même sur l’année en cours. L’**année de comparaison**, facultative, fait apparaître les écarts : c’est elle qui donne un sens aux petites flèches vertes et rouges.',
      'Les écrans ne montrent que ce qu’ils ont à montrer. Un bloc absent n’est pas un bloc en panne : c’est un bloc sans données. L’évolution pluriannuelle, par exemple, n’apparaît qu’à partir de la deuxième année scolaire enregistrée.',
      'Chaque copie d’écran porte des pastilles numérotées en rouge, expliquées dans le tableau qui suit l’image.',
    ],
    reperes: [
      ['Attention', 'Ce qu’un chiffre ne dit pas, et qui pourrait vous faire décider à tort.'],
      ['Astuce', 'La lecture croisée qui fait gagner du temps.'],
      ['À savoir', 'Comment l’indicateur est calculé — ce qui explique sa valeur.'],
    ],
  },

  chapitres: [
    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'Prise en main',
      chapeau:
        'Entrer dans l’espace, et lire la page qui résume l’établissement en neuf chiffres.',
      sections: [
        {
          ecran: 'connexion',
          titre: 'Se connecter',
          chapeau:
            'Votre compte est de type « Propriétaire ». Il vous conduit directement au pilotage : aucun écran de gestion n’est monté pour vous, y compris en saisissant son adresse à la main.',
          fiche: {
            menu: '—',
            adresse: '/app/login',
            profil: 'Propriétaire',
            prerequis: 'Un compte créé par l’administration de l’établissement.',
            resultat: 'Vous arrivez sur la vue d’ensemble.',
          },
          paragraphe:
            'L’écran ne demande que deux informations. Le texte grisé dans les cases est un exemple : il disparaît dès que vous tapez.',
          legendes: [
            { n: 1, selecteur: 'champ=Email', element: 'Champ « Email »', role: 'L’adresse de votre compte. C’est elle qui identifie l’établissement dont vous voyez les chiffres.' },
            { n: 2, selecteur: 'champ=Mot de passe', element: 'Champ « Mot de passe »', role: 'Votre mot de passe. L’icône d’œil barré l’affiche en clair, le temps de vérifier une faute de frappe.' },
            { n: 3, selecteur: 'texte=Se connecter', cote: 'droite', element: 'Bouton « Se connecter »', role: 'Valide la connexion et ouvre la vue d’ensemble.' },
            { n: 4, selecteur: 'texte=Configurer un établissement', cote: 'bas', element: 'Lien « Configurer un établissement »', role: 'Ne vous concerne pas : il sert à enregistrer une école qui n’existe pas encore. Ne cliquez pas dessus.' },
          ],
          procedure: [
            'Ouvrez votre navigateur à l’adresse de l’application.',
            'Saisissez l’adresse e-mail de votre compte.',
            'Saisissez votre mot de passe.',
            'Cliquez sur « Se connecter ».',
          ],
          encarts: [
            {
              type: 'savoir',
              texte:
                'Votre compte ne peut rien écrire, et l’application le garantit à plusieurs niveaux : les écrans de gestion ne sont pas chargés, et le serveur refuse toute requête autre qu’une lecture. Même une manipulation volontaire ne modifierait rien.',
            },
          ],
        },
        {
          ecran: 'vue-ensemble',
          titre: 'La vue d’ensemble',
          chapeau:
            'Neuf chiffres, deux courbes et une liste de points d’attention. C’est l’écran à ouvrir chaque lundi matin.',
          fiche: {
            menu: 'Vue d’ensemble',
            adresse: '/app/owner',
            profil: 'Propriétaire',
            prerequis: 'Une année scolaire avec des inscriptions.',
            resultat: 'L’état de l’établissement et les écrans où creuser.',
          },
          paragraphe:
            'Les cartes du haut ne sont pas un résumé approximatif : ce sont exactement les mêmes indicateurs que les écrans de détail, produits par le même calcul. Un chiffre lu ici et un chiffre lu là-bas ne peuvent pas diverger.',
          legendes: [
            { n: 1, selecteur: 'bloc=Élèves inscrits', element: 'Cartes d’indicateurs', role: 'Les neuf chiffres clés : effectifs, enseignants, recouvrement, impayés, chiffre d’affaires, réussite et présence.' },
            { n: 2, selecteur: 'contient=EFF-01', cote: 'droite', element: 'Code de l’indicateur', role: 'Le code technique du chiffre — EFF pour effectifs, FIN pour finance, SEC pour résultats du secondaire. Il permet de citer un indicateur sans ambiguïté auprès de l’administration.' },
            { n: 3, selecteur: 'contient=Taux de réinscription', cote: 'bas', element: 'Un indicateur à « — »', role: 'Le tiret signale une donnée qui n’existe pas, et non une valeur nulle. Le taux de réinscription exige une année précédente : il apparaîtra l’an prochain.' },
            { n: 4, selecteur: 'contient=Une seule mesure disponible', cote: 'droite', element: 'Message d’évolution', role: 'Une courbe suppose deux mesures. Avec une seule année enregistrée, l’application le dit plutôt que d’afficher un point isolé.' },
            { n: 5, selecteur: 'contient=Encaissements mensuels', cote: 'droite', element: 'Encaissements mensuels', role: 'La trésorerie mois par mois, de septembre à août. Survolez la courbe : l’infobulle donne le montant encaissé et celui de l’année de comparaison.' },
          ],
          procedure: [
            'Connectez-vous : la vue d’ensemble s’ouvre automatiquement.',
            'Parcourez les neuf cartes du haut.',
            'Survolez les courbes pour obtenir les valeurs précises.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un tiret et un zéro ne veulent pas dire la même chose. « — » signifie que l’application ne peut pas calculer l’indicateur — donnée absente, année de référence manquante. « 0 » est une mesure. Ne concluez jamais d’un tiret que la valeur est nulle.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'Pilotage',
      chapeau:
        'Quatre écrans, quatre questions : combien d’élèves, viennent-ils en cours, réussissent-ils, et qui les enseigne. C’est le cœur de votre lecture.',
      sections: [
        {
          ecran: 'effectifs',
          titre: 'Les effectifs',
          chapeau:
            'Combien d’élèves, dans quelles classes, et l’école les garde-t-elle d’une année sur l’autre ?',
          fiche: {
            menu: 'Pilotage › Effectifs',
            adresse: '/app/owner/effectifs',
            profil: 'Propriétaire',
            prerequis: 'Des élèves inscrits pour l’année observée.',
            resultat: 'Répartition, remplissage et fidélisation.',
          },
          paragraphe:
            'Trois filtres en haut — niveau, classe, sexe — s’appliquent à tout l’écran. Le tableau du milieu est le plus utile : il donne le remplissage classe par classe.',
          legendes: [
            { n: 1, selecteur: 'contient=NIVEAU', cote: 'bas', element: 'Barre de filtres', role: 'Niveau, classe et sexe. Ils s’appliquent à tous les blocs de l’écran, y compris aux compteurs du haut.' },
            { n: 2, selecteur: 'bloc=Inscrits', cote: 'bas', element: 'Compteurs d’effectif', role: 'Inscrits, nouveaux, départs et effectif moyen par classe. Les nouveaux se comptent par rapport à l’année précédente, jamais par rapport à l’année de comparaison.' },
            { n: 3, selecteur: 'contient=Détail par classe', cote: 'droite', element: 'Tableau « Détail par classe »', role: 'Effectif, parité, âge moyen et taux de remplissage, classe par classe. Le tableau à sortir avant d’ouvrir ou de fermer une division.' },
            { n: 4, selecteur: 'contient=Occupation moyenne', cote: 'gauche', element: 'Occupation moyenne', role: 'Le remplissage moyen des classes rapporté à leur capacité. En dessous de 60 %, une fusion de classes se discute ; au-dessus de 95 %, il faut ouvrir.' },
            { n: 5, selecteur: 'contient=Pyramide des âges', cote: 'droite', element: 'Pyramide des âges', role: 'La distribution des âges. Survolez une colonne : l’infobulle donne l’effectif et sa part. Un décalage marqué signale des redoublements ou des entrées tardives.' },
            { n: 6, selecteur: 'contient=Taux d\'abandon', cote: 'gauche', element: 'Statuts et fidélisation', role: 'Ce que deviennent les élèves : réinscrits, partis, affectés par l’État. Le taux de réinscription est l’indicateur commercial le plus important de l’école.' },
          ],
          procedure: [
            'Ouvrez Pilotage › Effectifs.',
            'Lisez les quatre compteurs du haut.',
            'Parcourez le tableau « Détail par classe » et repérez les taux de remplissage extrêmes.',
            'Filtrez sur un niveau pour comparer les classes entre elles.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Le taux de réinscription est vide la première année : il se calcule en comparant deux rentrées. Ne le lisez comme un signal qu’à partir de la deuxième année d’utilisation de l’application.',
            },
            {
              type: 'astuce',
              texte:
                'Une classe très au-dessus de sa capacité et une autre très en dessous, c’est un rééquilibrage à instruire avant la rentrée plutôt qu’en cours d’année.',
            },
          ],
        },
        {
          ecran: 'assiduite',
          titre: 'L’assiduité',
          chapeau:
            'Les élèves viennent-ils en cours, et les enseignants font-ils l’appel ? La seconde question conditionne la première.',
          fiche: {
            menu: 'Pilotage › Assiduité',
            adresse: '/app/owner/assiduite',
            profil: 'Propriétaire',
            prerequis: 'Un établissement du secondaire, avec des appels saisis.',
            resultat: 'Taux de présence, absences par matière et fiabilité des appels.',
          },
          paragraphe:
            'Cet écran n’existe pas dans une école primaire : l’appel par séance est un mécanisme du secondaire. Le bloc « Couverture de l’appel » est le plus important, car il dit si les autres chiffres sont dignes de foi.',
          legendes: [
            { n: 1, selecteur: 'bloc=Taux de présence', cote: 'bas', element: 'Compteurs d’assiduité', role: 'Présence, absence, retard et part des absences justifiées, sur l’année observée.' },
            { n: 2, selecteur: 'contient=Absences par matière', cote: 'droite', element: 'Absences par matière', role: 'Les matières les plus désertées, en heures cumulées. Un écart marqué désigne un créneau ou un enseignant à regarder de près.' },
            { n: 3, selecteur: 'contient=Couverture de l\'appel', cote: 'droite', element: 'Couverture de l’appel', role: 'Les séances réellement appelées, rapportées aux créneaux de l’emploi du temps. C’est le degré de confiance à accorder à tout le reste de l’écran.' },
            { n: 4, selecteur: 'colonne=COUVERTURE', cote: 'haut', element: 'Couverture par enseignant', role: 'Le taux d’appel de chaque enseignant, désigné par ses initiales. Le pilotage n’exige pas de nommer : la conversation, elle, se tiendra avec l’administration.' },
            { n: 5, selecteur: 'contient=Note de base 20', cote: 'droite', element: 'Bloc « Conduite »', role: 'La note de conduite se déduit des absences : 20 au départ, un point par tranche de deux heures manquées. Elle compte ensuite dans la moyenne générale.' },
          ],
          procedure: [
            'Ouvrez Pilotage › Assiduité.',
            'Regardez d’abord la couverture de l’appel.',
            'Si elle est basse, tenez les autres chiffres pour indicatifs et demandez à l’administration de relancer les enseignants.',
            'Si elle est élevée, lisez les absences par matière et par classe.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Un taux de présence flatteur peut cacher un appel non fait',
              texte:
                'Une séance non appelée ne compte aucune absence : les élèves absents ce jour-là sont réputés présents. Une école dont la couverture d’appel est de 40 % affichera mécaniquement un excellent taux de présence. Lisez toujours les deux ensemble.',
            },
            {
              type: 'savoir',
              texte:
                'Les enseignants apparaissent par leurs initiales. Ce n’est pas un oubli : un écran de pilotage sert à repérer un phénomène, pas à instruire un dossier individuel. L’administration dispose des noms.',
            },
          ],
        },
        {
          ecran: 'resultats',
          titre: 'Les résultats',
          chapeau:
            'Le niveau de l’établissement, matière par matière et classe par classe — et surtout, comment il évolue.',
          fiche: {
            menu: 'Pilotage › Résultats',
            adresse: '/app/owner/resultats',
            profil: 'Propriétaire',
            prerequis: 'Des notes saisies par les enseignants.',
            resultat: 'Moyennes, réussite, classements et trajectoires par matière.',
          },
          paragraphe:
            'Quatre filtres — trimestre, niveau, classe, matière — s’appliquent à l’écran entier. Le bloc « Évolution par matière » est celui qui répond à la vraie question : quelle matière décroche, et depuis quand.',
          legendes: [
            { n: 1, selecteur: 'bloc=Moyenne générale', cote: 'bas', element: 'Compteurs de résultats', role: 'Moyenne générale, taux de réussite, écart-type et part des bulletins publiés. L’écart-type mesure l’homogénéité : élevé, il signale une classe qui se creuse.' },
            { n: 2, selecteur: 'contient=Moyenne par matière', cote: 'droite', element: 'Moyenne par matière', role: 'Toutes les matières, triées. Les notes sont ramenées sur 20 : un barème sur 10 compte à demi-poids, ce qui rend les matières comparables.' },
            { n: 3, selecteur: 'contient=Évolution par matière', cote: 'droite', element: 'Évolution par matière', role: 'La trajectoire de chaque matière, trimestre après trimestre. Sans filtre, l’écran retient les cinq matières dont la moyenne a le plus bougé — celles qui portent l’information.' },
            { n: 4, selecteur: 'contient=Évolution par trimestre', cote: 'droite', element: 'Évolution par trimestre', role: 'La moyenne générale de l’établissement, trimestre après trimestre. À lire avant l’évolution par matière : elle dit s’il y a un mouvement d’ensemble.' },
            { n: 5, selecteur: 'contient=Classement des classes', cote: 'droite', element: 'Classement des classes', role: 'Les classes ordonnées par moyenne, avec leur taux de réussite et leur écart-type. Les classes à égalité partagent leur rang.' },
            { n: 6, selecteur: 'contient=Distribution des moyennes', cote: 'droite', element: 'Distribution des moyennes', role: 'La répartition des moyennes générales par tranche d’un point. Survolez une colonne : l’infobulle donne l’effectif et sa part. Une distribution à deux bosses signale une classe qui se coupe en deux.' },
          ],
          procedure: [
            'Ouvrez Pilotage › Résultats.',
            'Lisez la moyenne générale et l’écart-type.',
            'Regardez « Évolution par trimestre » : y a-t-il un mouvement d’ensemble ?',
            'Puis « Évolution par matière » : quelle discipline explique ce mouvement ?',
            'Filtrez sur cette matière pour isoler sa trajectoire, puis sur une classe pour savoir où.',
          ],
          encarts: [
            {
              type: 'astuce',
              titre: 'La lecture en trois temps',
              texte:
                'Moyenne générale, puis évolution par trimestre, puis évolution par matière. Ces trois blocs, dans cet ordre, transforment « les résultats baissent » en « les mathématiques ont perdu un point entre le premier et le deuxième trimestre en 6ème A » — une phrase sur laquelle on peut agir.',
            },
            {
              type: 'attention',
              texte:
                'Le taux de bulletins publiés indique la part des bulletins réellement édités par l’administration. S’il est bas en fin de trimestre, les familles n’ont pas encore reçu leurs résultats — c’est un sujet de relance, pas un problème pédagogique.',
            },
          ],
        },
        {
          ecran: 'enseignants',
          titre: 'Les enseignants',
          chapeau:
            'Combien sont-ils, que coûtent-ils, et toutes les matières sont-elles pourvues ?',
          fiche: {
            menu: 'Pilotage › Enseignants',
            adresse: '/app/owner/enseignants',
            profil: 'Propriétaire',
            prerequis: 'Des enseignants enregistrés et affectés.',
            resultat: 'Effectif, contrats, charge horaire et couverture des matières.',
          },
          paragraphe:
            'Un avertissement figure en tête de l’écran, et il compte : seuls les enseignants sont modélisés. Le personnel administratif et de service n’y figure pas.',
          legendes: [
            { n: 1, selecteur: 'contient=Le schéma ne modélise que le corps enseignant', cote: 'bas', element: 'Avertissement de périmètre', role: 'L’écran ne couvre pas le personnel administratif ni de service. Une décision de masse salariale prise sur ce seul écran porterait sur un périmètre incomplet.' },
            { n: 2, selecteur: 'contient=Ancienneté moyenne', cote: 'bas', element: 'Ancienneté moyenne', role: 'Calculée au 1er septembre de l’année observée, et non à la date du jour : consulter une année passée ne doit pas vieillir l’équipe.' },
            { n: 3, selecteur: 'contient=Types de contrat', cote: 'droite', element: 'Types de contrat', role: 'La répartition entre CDI, CDD et vacataires. Une part élevée de vacataires est une souplesse et une fragilité à la fois.' },
            { n: 4, selecteur: 'contient=Couverture des affectations', cote: 'droite', element: 'Couverture des affectations', role: 'Matières pourvues, classes avec professeur principal, comptes applicatifs actifs, créneaux sans enseignant. Quatre chiffres qui doivent tous être à 100 % à la rentrée.' },
            { n: 5, selecteur: 'contient=Contrats arrivant à échéance', cote: 'droite', element: 'Contrats arrivant à échéance', role: 'Les CDD dont le terme tombe dans l’année observée. Le bloc à consulter avant de préparer la rentrée suivante.' },
            { n: 6, selecteur: 'colonne=HEURES / SEMAINE', cote: 'haut', element: 'Charge horaire par enseignant', role: 'Les heures d’emploi du temps de chacun. Sans bande cible déclarée, la surcharge n’est pas mesurable — l’écran le dit plutôt que d’afficher un écart imaginaire.' },
          ],
          procedure: [
            'Ouvrez Pilotage › Enseignants.',
            'Vérifiez que la couverture des matières est à 100 %.',
            'Consultez les contrats arrivant à échéance.',
            'Parcourez la charge horaire pour repérer les déséquilibres.',
          ],
          encarts: [
            {
              type: 'attention',
              texte:
                'Un créneau sans enseignant est un cours qui n’aura pas lieu. Ce chiffre doit être à zéro dès la rentrée ; s’il ne l’est pas, l’emploi du temps promet des heures que personne n’assurera.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      titre: 'La finance',
      chapeau:
        'L’argent. L’écran qui décide de la viabilité de l’établissement autant que les résultats.',
      sections: [
        {
          ecran: 'finance',
          titre: 'La finance',
          chapeau:
            'Ce qui est facturé, ce qui est encaissé, et ce qui manque — avec l’ancienneté de ce qui manque.',
          fiche: {
            menu: 'Finance',
            adresse: '/app/owner/finance',
            profil: 'Propriétaire',
            prerequis: 'Des factures émises et des échéanciers affectés aux classes.',
            resultat: 'Recouvrement, créance, recettes et dépenses.',
          },
          paragraphe:
            'Le taux de recouvrement brut ne suffit pas en cours d’année : à mi-parcours, il est normal qu’une partie de la scolarité ne soit pas encore exigible. C’est le recouvrement à échéance qu’il faut lire.',
          legendes: [
            { n: 1, selecteur: 'bloc=Facturé', cote: 'bas', element: 'Compteurs financiers', role: 'Facturé, encaissé, impayés et taux de recouvrement. Les quatre chiffres qui résument la trésorerie de l’année.' },
            { n: 2, selecteur: 'contient=Recouvrement à échéance', cote: 'droite', element: 'Recouvrement à échéance', role: 'L’encaissé rapporté à ce qui était réellement exigible à ce jour. C’est le taux à lire en cours d’année : le recouvrement brut pénalise les échéances non encore arrivées.' },
            { n: 3, selecteur: 'contient=Vieillissement de la créance', cote: 'droite', element: 'Vieillissement de la créance', role: 'L’ancienneté des impayés, par tranche. Une créance de trente jours se recouvre ; une créance de plus de quatre-vingt-dix jours est en général perdue.' },
            { n: 4, selecteur: 'contient=Retards de paiement', cote: 'droite', element: 'Retards de paiement', role: 'Les tranches échues non soldées, le retard moyen et la part des élèves à jour. Le bloc à sortir avant une campagne de relance.' },
            { n: 5, selecteur: 'contient=Encaissé par mode de paiement', cote: 'droite', element: 'Modes de paiement', role: 'La répartition entre espèces, chèque, virement et mobile money. Survolez une part : l’infobulle donne le montant et le pourcentage.' },
            { n: 6, selecteur: 'contient=Saisonnalité des encaissements', cote: 'droite', element: 'Saisonnalité des encaissements', role: 'La trésorerie mois par mois, de septembre à août. C’est ce graphique qui anticipe les mois creux.' },
          ],
          procedure: [
            'Ouvrez Finance.',
            'Lisez le recouvrement à échéance plutôt que le recouvrement brut.',
            'Consultez le vieillissement de la créance : concentrez la relance sur les tranches de 31 à 90 jours.',
            'Regardez la saisonnalité pour anticiper les mois creux.',
          ],
          encarts: [
            {
              type: 'attention',
              titre: 'Deux taux qui ne disent pas la même chose',
              texte:
                'Le recouvrement **brut** rapporte l’encaissé au total facturé de l’année — il est mécaniquement faible en novembre. Le recouvrement **à échéance** rapporte l’encaissé à ce qui était dû à ce jour : c’est lui qui mesure la discipline de paiement des familles.',
            },
            {
              type: 'astuce',
              texte:
                'Une créance récente se recouvre, une créance ancienne se provisionne. Le vieillissement vous dit laquelle des deux actions engager, et sur quel montant.',
            },
          ],
        },
      ],
    },
  ],
};
