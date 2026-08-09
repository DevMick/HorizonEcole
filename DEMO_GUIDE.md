# 🎬 HorizonEcole — Script de Démonstration Vidéo
## Module École Primaire · Guide de Présentation Commerciale

---

> **Note au présentateur**
> Ce document est un script de narration voix-off, destiné à accompagner un enregistrement d'écran de l'application.
> Chaque section indique l'écran à afficher `[ÉCRAN]`, l'action à réaliser `[ACTION]` et le texte à lire.
> Les passages en **gras** sont à mettre en valeur vocalement.
>
> **Comptes utilisés pour la démo :**
> - Administrateur : `groupescolairepalmiers@gmail.com` / `wFtxDVnYfeXD2B`
> - Enseignant : *(utiliser un compte enseignant existant de l'école)*
> - Parent : *(utiliser un compte parent existant rattaché à un élève)*
>
> **Durée estimée totale : 25 à 35 minutes de vidéo**

---

---

# 🎯 PARTIE 0 — INTRODUCTION GÉNÉRALE
### ⏱ Durée estimée : 2 minutes

---

## Scène 0.1 — Écran titre / Présentation

`[ÉCRAN : Fond sobre avec logo HorizonEcole ou page d'accueil]`

---

Bienvenue dans cette démonstration de **HorizonEcole** — la solution de gestion scolaire moderne, pensée pour les établissements d'enseignement africains et francophones.

Dans un contexte où la numérisation des écoles devient une nécessité, **HorizonEcole** centralise en une seule plateforme tout ce qu'un établissement scolaire a besoin de gérer au quotidien : les élèves, les enseignants, les notes, les bulletins, les paiements, et bien plus encore.

La solution s'adresse aussi bien aux **directeurs et administrateurs** qui pilotent leur établissement, qu'aux **enseignants** qui gèrent leur classe, et aux **parents** qui souhaitent suivre la scolarité de leurs enfants en temps réel.

Ce que vous allez découvrir dans les prochaines minutes, c'est une plateforme **complète, intuitive et professionnelle**, construite avec les meilleures technologies du moment, et adaptée aux réalités du terrain.

---

## Scène 0.2 — La page de connexion

`[ÉCRAN : localhost:5173/login]`

`[ACTION : Naviguer vers la page de connexion et la laisser affichée]`

---

Voici le **point d'entrée** de l'application : la page de connexion.

Elle est épurée, rapide, et sécurisée. Chaque utilisateur — qu'il soit administrateur, enseignant ou parent — se connecte avec ses propres identifiants et accède **uniquement** à l'espace qui lui est destiné.

La plateforme gère en toute transparence la séparation des rôles : un parent ne verra jamais les données d'administration, et un enseignant n'a accès qu'à sa propre classe.

---

## Scène 0.3 — La plateforme multi-établissements

`[ÉCRAN : localhost:5173/creer-etablissement]`

`[ACTION : Naviguer vers la page de création d'établissement]`

---

Avant de nous connecter, attardons-nous un instant sur cette page : **la création d'un nouvel établissement**.

C'est ici que réside l'une des forces majeures de HorizonEcole : sa **architecture multi-tenant**.

Concrètement, cela signifie que la plateforme est **mutualisée** : chaque école, chaque groupe scolaire, chaque réseau d'établissements dispose de son propre espace complètement isolé et sécurisé. Les données d'un établissement ne sont jamais accessibles à un autre.

HorizonEcole prend en charge **plusieurs types d'établissements** :
- Les **écoles primaires** — CP1 jusqu'au CM2
- Les **collèges** — de la 6ème à la 3ème
- Les **lycées** — de la 2nde jusqu'en Terminale
- Et les **groupes scolaires** qui combinent plusieurs niveaux

Pour cette démonstration, nous allons travailler avec un **groupe scolaire** : le **Groupe Scolaire les Palmiers**, qui illustre parfaitement la richesse de la plateforme dans sa configuration primaire.

---

---

# 🏫 PARTIE 1 — ESPACE ADMINISTRATEUR
### ⏱ Durée estimée : 12 à 15 minutes

---

## Scène 1.1 — Connexion administrateur

`[ÉCRAN : localhost:5173/login]`

`[ACTION : Saisir l'email groupescolairepalmiers@gmail.com, saisir le mot de passe, cliquer sur "Se connecter"]`

---

Connectons-nous maintenant en tant qu'**administrateur du Groupe Scolaire les Palmiers**.

L'identifiant et le mot de passe sont saisis — la connexion est **instantanée**. Aucun temps de chargement excessif, l'application est rapide et réactive.

---

## Scène 1.2 — Tableau de bord administrateur

`[ÉCRAN : /dashboard]`

`[ACTION : Observer le tableau de bord après connexion]`

---

Voici le **tableau de bord de l'administrateur**.

Dès la connexion, l'administrateur a une **vue d'ensemble** de son établissement : indicateurs clés, activités récentes, alertes éventuelles.

C'est le point de départ de toute la gestion scolaire. Tout est accessible depuis le menu latéral, organisé en grandes catégories logiques.

Remarquez la **barre de navigation latérale** à gauche : elle regroupe tous les modules disponibles, structurés de manière à aller naturellement de la gestion des personnes vers la pédagogie, les notes et la finance.

---

## Scène 1.3 — Gestion des Élèves

`[ÉCRAN : /people/students]`

`[ACTION : Cliquer sur "Gestion des Personnes" > "Élèves"]`

---

Commençons par les **élèves**.

Cette page liste l'ensemble des élèves de l'établissement. L'administrateur peut **rechercher**, **filtrer**, et accéder au profil complet de chaque élève en un clic.

`[ACTION : Cliquer sur un élève pour ouvrir son profil]`

Le profil d'un élève centralise toutes ses informations : **données personnelles**, **classe d'appartenance**, **historique des inscriptions**, **contacts des parents** et **informations médicales éventuelles**.

Tout est consigné au même endroit — plus besoin de registres papier dispersés dans plusieurs tiroirs.

`[ACTION : Revenir à la liste des élèves]`

---

## Scène 1.4 — Gestion des Parents

`[ÉCRAN : /people/parents]`

`[ACTION : Cliquer sur "Parents" dans le menu]`

---

Passons à la gestion des **parents et tuteurs**.

Chaque parent référencé dans la plateforme peut être rattaché à un ou plusieurs enfants. L'administrateur peut créer des comptes parents, ce qui leur permettra ensuite de **suivre la scolarité de leur enfant** depuis leur propre espace.

C'est le lien essentiel entre l'école et la famille — numérique, immédiat et traçable.

---

## Scène 1.5 — Gestion des Enseignants

`[ÉCRAN : /people/teachers]`

`[ACTION : Cliquer sur "Enseignants" dans le menu]`

---

Voici la liste des **enseignants** de l'établissement.

L'administrateur peut ici gérer les fiches de chaque enseignant, consulter ses classes affectées, et lui attribuer un compte utilisateur pour accéder à l'application.

`[ACTION : Cliquer sur un enseignant pour voir son profil]`

Le profil enseignant regroupe ses informations professionnelles et sa situation dans l'établissement. C'est depuis cette interface que l'administrateur désigne un enseignant comme **titulaire d'une classe primaire**.

`[ACTION : Revenir à la liste]`

---

## Scène 1.6 — Années Scolaires

`[ÉCRAN : /academic/years]`

`[ACTION : Cliquer sur "Année Académique" > "Années Scolaires"]`

---

Le socle de toute l'organisation pédagogique, c'est l'**année scolaire**.

HorizonEcole permet de gérer plusieurs années scolaires en parallèle : une année **en cours**, et des archives. Cela permet de consulter les résultats des années précédentes sans jamais les écraser.

`[ACTION : Cliquer sur l'année scolaire en cours pour voir son détail]`

Le détail d'une année scolaire montre sa période, son statut, et les classes et compositions associées. Tout l'historique scolaire de l'établissement est ainsi **préservé et consultable** à tout moment.

`[ACTION : Revenir au menu]`

---

## Scène 1.7 — Inscriptions

`[ÉCRAN : /academic/inscriptions]`

`[ACTION : Cliquer sur "Inscriptions"]`

---

La gestion des **inscriptions** permet à l'administrateur de rattacher les élèves à une classe pour une année scolaire donnée.

C'est ici que se fait le passage d'une année à l'autre : les élèves promus sont réinscrits dans leur nouvelle classe, les admissions nouvelles sont saisies.

Un processus qui était autrefois une montagne de paperasse devient ici une simple sélection en quelques clics.

---

## Scène 1.8 — Emploi du Temps

`[ÉCRAN : /academic/timetable]`

`[ACTION : Cliquer sur "Emploi du Temps"]`

---

La plateforme intègre un module de **gestion des emplois du temps**.

L'administrateur peut saisir et organiser les créneaux horaires par classe, par salle et par enseignant. Une fois publiés, les emplois du temps sont **visibles directement** par les enseignants et les parents dans leurs espaces respectifs.

---

## Scène 1.9 — Module École Primaire : Les Classes

`[ÉCRAN : /primary/classes]`

`[ACTION : Cliquer sur "École Primaire" > "Classes"]`

---

Entrons maintenant dans le cœur du sujet : le **module École Primaire**.

Cette page liste toutes les classes primaires de l'établissement, du **CP1** jusqu'au **CM2**. Chaque classe affiche son niveau, le nombre d'élèves inscrits, l'enseignant titulaire et l'état de sa configuration pédagogique.

`[ACTION : Cliquer sur une classe pour voir sa fiche]`

La fiche d'une classe primaire est très riche. On y trouve :
- La **grille de matières** avec les barèmes associés — Expression Écrite, Dictée, Mathématiques, Sciences, et toutes les matières du programme
- Le **diviseur** et l'**échelle de moyenne** qui définissent comment la moyenne est calculée
- La liste des **élèves inscrits** dans cette classe
- Et le **titulaire** responsable de la classe

C'est ce paramétrage qui rend les bulletins parfaitement conformes aux exigences officielles du programme primaire.

`[ACTION : Revenir à la liste des classes]`

---

## Scène 1.10 — Module École Primaire : Les Compositions

`[ÉCRAN : /primary/evaluations]`

`[ACTION : Cliquer sur "Compositions"]`

---

Les **compositions** sont les évaluations officielles du cycle primaire : Composition 1, Composition 2, Composition 3, Examen Blanc 1, Examen Blanc 2 — chaque niveau a son propre calendrier, défini selon le référentiel pédagogique.

Sur cette page, l'administrateur peut voir toutes les compositions organisées par classe et par année scolaire. Il peut **créer** une nouvelle composition, **modifier** sa date, ou **verrouiller** une composition pour empêcher toute modification des notes une fois le conseil de classe passé.

Ce verrouillage est une garantie d'**intégrité des données** : une note validée ne peut plus être effacée accidentellement.

---

## Scène 1.11 — Module École Primaire : Résultats & Bulletins

`[ÉCRAN : /primary/grades]`

`[ACTION : Cliquer sur "Résultats & Bulletins"]`

---

Voici la page de **Résultats et Bulletins** — l'une des pages les plus puissantes de la plateforme.

En quelques filtres — année scolaire, classe, composition — l'administrateur accède immédiatement aux résultats complets de toute une classe.

`[ACTION : Sélectionner une classe et une composition pour afficher les résultats]`

Pour chaque élève, on voit **toutes ses notes par matière**, son **total**, sa **moyenne** et son **rang dans la classe**. La plateforme calcule automatiquement le classement.

La mention **Admis**, **À examiner** ou **Insuffisant** est attribuée selon les seuils officiels — tout est paramétré et automatique.

`[ACTION : Cliquer sur "Fiche de classement (PDF)"]`

En un clic, l'administrateur génère la **fiche de classement officielle** en PDF, prête à être imprimée et affichée. Plus besoin de saisir manuellement des tableaux dans un traitement de texte.

`[ACTION : Cliquer sur "Bulletins de la classe"]`

Et ici, c'est la **génération en bloc** de tous les bulletins de la classe. En quelques secondes, l'établissement dispose de tous les bulletins individuels, mis en page professionnellement, prêts à distribuer aux familles.

`[ACTION : Cliquer sur "Bilan annuel (PDF)"]`

Le **bilan annuel** synthétise les performances de chaque élève sur l'ensemble de l'année scolaire, avec la moyenne générale annuelle calculée selon la formule officielle. Un document de référence pour les décisions de passage ou de redoublement.

---

## Scène 1.12 — Finance : Échéanciers

`[ÉCRAN : /finance/payment-conditions]`

`[ACTION : Cliquer sur "Finance" > "Échéanciers"]`

---

HorizonEcole intègre également un module **Finance**.

Les **échéanciers** permettent à l'établissement de définir ses conditions de paiement : frais d'inscription, frais de scolarité par trimestre, modalités de versement. Chaque plan tarifaire peut être personnalisé selon le niveau ou la classe.

C'est la base qui permet de suivre ensuite les paiements élève par élève.

---

## Scène 1.13 — Finance : Paiements

`[ÉCRAN : /finance/payments]`

`[ACTION : Cliquer sur "Paiements"]`

---

La gestion des **paiements** donne à l'administration une visibilité complète sur la situation financière de chaque élève.

Qui a payé ? Qui est en retard ? Quel montant reste dû ? Toutes ces informations sont centralisées et disponibles en temps réel — un outil précieux pour le suivi des recettes et la relance des familles.

---

## Scène 1.14 — Administration : Rôles et Utilisateurs

`[ÉCRAN : /people/roles]`

`[ACTION : Cliquer sur "Administration" > "Rôles"]`

---

HorizonEcole propose un système de **gestion des rôles** très flexible.

Au-delà des rôles prédéfinis — Administrateur, Enseignant, Parent — il est possible de créer des **rôles personnalisés** avec des droits d'accès sur mesure. Par exemple, un rôle "Comptable" qui n'aurait accès qu'au module Finance, ou un rôle "Directeur pédagogique" qui verrait les notes sans pouvoir les modifier.

`[ACTION : Cliquer sur "Utilisateurs"]`

La gestion des **utilisateurs** permet de créer et gérer tous les comptes d'accès à l'application. Chaque utilisateur est rattaché à un rôle et dispose d'identifiants uniques.

---

## Scène 1.15 — Profil de l'Établissement

`[ÉCRAN : /etablissement]`

`[ACTION : Cliquer sur "Établissement"]`

---

Enfin, le **profil de l'établissement** centralise toutes les informations institutionnelles : nom, type, adresse, logo, coordonnées, direction régionale et secteur pédagogique.

Ces informations s'affichent automatiquement sur tous les documents générés — bulletins, fiches de classement, bilans annuels. **Aucune ressaisie n'est nécessaire** : ce qui est configuré ici se répercute partout.

C'est ici également que l'établissement peut mettre à jour son logo, qui apparaîtra en en-tête de tous ses documents officiels.

---

---

# 👨‍🏫 PARTIE 2 — ESPACE ENSEIGNANT (Titulaire Primaire)
### ⏱ Durée estimée : 8 à 10 minutes

---

## Scène 2.1 — Connexion enseignant

`[ÉCRAN : localhost:5173/login]`

`[ACTION : Se déconnecter du compte admin, puis se connecter avec un compte enseignant titulaire de classe primaire]`

---

Voyons maintenant la plateforme depuis le point de vue de **l'enseignant**.

Nous nous connectons ici avec le compte d'un enseignant titulaire d'une classe primaire.

Dès la connexion, remarquez que **le menu est différent** de celui de l'administrateur. L'enseignant n'a accès qu'aux fonctionnalités qui le concernent directement — sa classe, ses élèves, ses notes. L'application adapte automatiquement l'interface au rôle de chaque utilisateur.

---

## Scène 2.2 — Tableau de bord enseignant

`[ÉCRAN : /dashboard]`

`[ACTION : Observer le tableau de bord enseignant]`

---

Le **tableau de bord de l'enseignant** lui donne un aperçu rapide de sa situation : sa classe, le nombre d'élèves, les compositions à venir.

C'est une entrée en matière claire et ciblée, sans information superflue.

---

## Scène 2.3 — Ma Classe

`[ÉCRAN : /primary/my-class]`

`[ACTION : Cliquer sur "Ma Classe" dans le menu]`

---

L'enseignant accède d'abord à la fiche de **sa propre classe**.

Il voit ici toutes les informations pédagogiques de son niveau : la grille de matières avec les barèmes, le diviseur de calcul des moyennes, et la configuration des compositions prévues pour l'année.

C'est sa **référence pédagogique permanente**, accessible en un clic, sans avoir à demander à l'administration.

---

## Scène 2.4 — Mes Élèves

`[ÉCRAN : /primary/my-students]`

`[ACTION : Cliquer sur "Élèves" dans le menu]`

---

La page **Élèves** donne à l'enseignant la liste complète des élèves de sa classe.

Il peut voir les informations essentielles de chaque élève, consulter son profil, et avoir un aperçu de sa situation dans la classe.

C'est aussi depuis cet écran que l'enseignant peut prendre des notes sur ses élèves ou vérifier leurs coordonnées en cas de besoin.

---

## Scène 2.5 — Saisie de Notes ⭐

`[ÉCRAN : /primary/saisie]`

`[ACTION : Cliquer sur "Saisie de Notes" dans le menu]`

---

Et voici **la fonctionnalité phare pour l'enseignant** : la **Saisie des Notes**.

Cette page a été spécialement conçue pour être rapide, claire et agréable à utiliser — même sur téléphone.

`[ACTION : Sélectionner une composition dans le filtre]`

En sélectionnant simplement la composition souhaitée, la **grille de saisie** s'affiche immédiatement avec :
- La liste de tous les élèves de la classe
- Une **colonne par matière**, avec le barème affiché en sous-titre
- Des **champs de saisie numériques** directement dans le tableau

`[ACTION : Saisir quelques notes dans les cellules]`

L'enseignant saisit les notes directement dans le tableau. À mesure qu'il entre les valeurs, la **moyenne se calcule en temps réel** dans la dernière colonne — sans attendre d'enregistrer.

`[ACTION : Cocher la case "Absent" pour un élève]`

Pour un élève absent à la composition, un simple **clic sur la case "Absent"** désactive toute sa ligne. L'élève sera automatiquement exclu du classement, comme le veulent les règles officielles.

En bas du tableau, l'indicateur de modifications non enregistrées signale qu'il y a des changements à sauvegarder.

`[ACTION : Cliquer sur "Enregistrer"]`

Un clic sur **"Enregistrer"** et toutes les notes sont transmises et sauvegardées de manière sécurisée. La confirmation apparaît immédiatement.

Plus de feuilles de notes volantes, plus de saisie double dans un fichier Excel séparé — **tout est fait en un seul endroit**, directement dans la plateforme.

---

## Scène 2.6 — Résultats & Bulletins (vue enseignant)

`[ÉCRAN : /primary/grades]`

`[ACTION : Cliquer sur "Résultats & Bulletins"]`

---

L'enseignant accède également à la page **Résultats & Bulletins** — mais dans une version adaptée à son périmètre : **uniquement sa classe**.

Il voit les résultats de ses élèves pour chaque composition, peut consulter les moyennes calculées automatiquement, et générer les **bulletins individuels** de ses élèves.

`[ACTION : Sélectionner une composition et observer les résultats]`

Les résultats s'affichent avec le rang de chaque élève, sa mention, et son statut d'admission. L'enseignant dispose en un regard de tous les éléments pour son conseil de classe.

`[ACTION : Cliquer sur "Bulletin" d'un élève spécifique]`

En un clic, il génère le bulletin d'un élève précis — un document PDF soigné, avec l'en-tête de l'établissement, les notes par matière, la moyenne, le rang et la signature.

---

## Scène 2.7 — Bilan Annuel

`[ÉCRAN : /primary/annual-report]`

`[ACTION : Cliquer sur "Bilan Annuel"]`

---

En fin d'année, l'enseignant accède au **Bilan Annuel** de sa classe.

Ce tableau de synthèse regroupe les performances de chaque élève sur toutes les compositions de l'année. La **Moyenne Générale Annuelle** est calculée automatiquement selon la formule officielle — avec les coefficients de pondération réglementaires pour les examens blancs en CM2.

C'est le document de référence pour les décisions de passage en classe supérieure, de redoublement ou d'orientation. Il peut lui aussi être généré en PDF en un clic.

---

## Scène 2.8 — Profil Enseignant

`[ÉCRAN : /primary/profile]`

`[ACTION : Cliquer sur "Profil"]`

---

Enfin, l'enseignant accède à son **profil personnel** : ses informations, ses coordonnées, et la possibilité de modifier son mot de passe.

Un espace simple et fonctionnel, qui lui appartient.

---

---

# 👪 PARTIE 3 — ESPACE PARENT (Suivi Famille)
### ⏱ Durée estimée : 4 à 5 minutes

---

## Scène 3.1 — Connexion parent

`[ÉCRAN : localhost:5173/login]`

`[ACTION : Se déconnecter du compte enseignant, puis se connecter avec un compte parent]`

---

Découvrons maintenant le troisième pilier de HorizonEcole : **l'Espace Parent**.

Les familles sont souvent tenues à l'écart de la vie scolaire quotidienne — elles attendent le bulletin de fin de trimestre pour avoir des nouvelles de leurs enfants.

HorizonEcole change complètement cette dynamique.

---

## Scène 3.2 — Accueil de l'Espace Famille

`[ÉCRAN : /parent]`

`[ACTION : Observer la page d'accueil parent après connexion]`

---

Dès la connexion, le parent accède à son **Espace Famille**.

La page d'accueil lui donne un résumé immédiat de la situation de ses enfants. Un design pensé pour être **simple, lisible et rassurant** — le parent n'a pas besoin d'être initié à un logiciel complexe.

---

## Scène 3.3 — Mes Enfants

`[ÉCRAN : /parent/children]`

`[ACTION : Cliquer sur "Ma famille" > "Mes enfants"]`

---

Dans la section **Mes enfants**, le parent retrouve la fiche de chacun de ses enfants inscrits dans l'établissement.

Si plusieurs enfants sont scolarisés dans le même établissement, ils apparaissent tous ici, dans un seul espace. **Un seul compte, une vue complète**.

---

## Scène 3.4 — Emploi du Temps

`[ÉCRAN : /parent/timetable]`

`[ACTION : Cliquer sur "Suivi scolaire" > "Emploi du Temps"]`

---

Le parent peut consulter **l'emploi du temps** de son enfant directement depuis son téléphone ou son ordinateur.

Plus besoin d'appeler l'école pour savoir à quelle heure finissent les cours le jeudi — l'information est disponible en permanence, à jour, et accessible en quelques secondes.

---

## Scène 3.5 — Résultats & Bulletins (vue parent)

`[ÉCRAN : /parent/grades]`

`[ACTION : Cliquer sur "Résultats & Bulletins"]`

---

Et voici **la page que les parents attendaient** : les Résultats et Bulletins.

Le parent accède ici aux résultats scolaires de son enfant. Les notes par matière, les moyennes, le classement, les bulletins imprimables — tout est disponible **en temps réel**, dès que l'enseignant a enregistré les notes.

Fini le délai de plusieurs semaines entre la composition et la réception du bulletin papier. La famille est informée **immédiatement**, ce qui renforce la confiance et permet d'agir rapidement en cas de difficulté.

C'est cette transparence qui crée une véritable **communauté éducative** entre l'école, l'enseignant et la famille.

---

---

# 🎯 CONCLUSION GÉNÉRALE
### ⏱ Durée estimée : 2 minutes

---

## Scène 4.1 — Synthèse et valorisation

`[ÉCRAN : Revenir sur le tableau de bord admin ou l'écran titre]`

---

Voilà ce que **HorizonEcole** offre à votre établissement.

En quelques minutes, nous avons parcouru **trois espaces complémentaires** qui forment un écosystème complet :

- L'**administrateur** pilote son établissement, gère ses ressources humaines, organise les compositions, génère les bulletins et suit les paiements — le tout depuis une interface unique.

- L'**enseignant** saisit ses notes rapidement, consulte ses résultats, et produit des documents officiels sans jamais toucher à un tableur.

- Le **parent** suit la scolarité de son enfant en temps réel, depuis son téléphone, à tout moment.

Ce que nous avons vu aujourd'hui, c'est l'**École Primaire** dans sa totalité : de la création des classes jusqu'au bulletin final, en passant par la saisie des notes composition par composition.

Mais HorizonEcole ne s'arrête pas là.

---

## Scène 4.2 — Ouverture sur les autres modules

`[ÉCRAN : Page de création d'établissement ou tableau de bord]`

---

La même plateforme prend également en charge les **Collèges** et les **Lycées**, avec des fonctionnalités adaptées à ces niveaux :

- Gestion des **coefficients par matière**
- Calcul des **moyennes trimestrielles**
- **Conduite et comportement**
- **Emplois du temps** sophistiqués avec gestion des salles
- **Évaluations** de différents types avec pondération personnalisée

Quelle que soit la taille de votre réseau scolaire — une petite école de quartier ou un grand groupe multi-niveaux — **HorizonEcole s'adapte à votre réalité**.

---

## Scène 4.3 — Appel à l'action

`[ÉCRAN : Page de connexion ou logo HorizonEcole]`

---

**HorizonEcole**, c'est la certitude de :
- ✅ **Zéro données perdues** — tout est sauvegardé et sécurisé dans le cloud
- ✅ **Zéro double saisie** — une information entrée une seule fois, utilisée partout
- ✅ **Zéro délai** — les bulletins, les résultats et les communications sont instantanés
- ✅ **Une image professionnelle** pour votre établissement, à travers des documents soignés et cohérents

Nous sommes convaincus qu'une école bien gérée, c'est une école qui peut se concentrer sur l'essentiel : **enseigner et accompagner les élèves**.

C'est exactement ce que HorizonEcole vous permet de faire.

---

*Merci de votre attention — et n'hésitez pas à nous contacter pour une démonstration personnalisée ou pour démarrer votre propre établissement sur la plateforme.*

---

---

## 📋 ANNEXE — Checklist de préparation avant l'enregistrement

Avant de lancer l'enregistrement vidéo, vérifiez les points suivants :

- [ ] Le serveur backend (API) est démarré et fonctionnel
- [ ] Le serveur frontend est démarré sur `localhost:5173`
- [ ] Le compte admin `groupescolairepalmiers@gmail.com` est opérationnel
- [ ] Un compte **enseignant** titulaire d'une classe primaire est disponible (noter ses identifiants)
- [ ] Un compte **parent** rattaché à au moins un élève est disponible (noter ses identifiants)
- [ ] Des données de démonstration existent (au moins une composition avec quelques notes saisies)
- [ ] Le navigateur est en plein écran (F11) et le zoom est à 100 %
- [ ] Désactiver les notifications système pendant l'enregistrement
- [ ] Vider le cache du navigateur pour un affichage propre
- [ ] Préparer un PDF de bulletin à montrer si la génération est lente

---

## 📐 STRUCTURE RECOMMANDÉE POUR LE MONTAGE VIDÉO

| Partie | Contenu | Durée |
|---|---|---|
| 0 | Introduction + Multi-tenant | 2 min |
| 1 | Espace Administrateur (15 écrans) | 12–15 min |
| 2 | Espace Enseignant (7 écrans) | 8–10 min |
| 3 | Espace Parent (4 écrans) | 4–5 min |
| 4 | Conclusion + Ouverture | 2 min |
| **Total** | | **28–34 min** |

---

*Document généré pour la présentation commerciale de HorizonEcole · Module École Primaire*
