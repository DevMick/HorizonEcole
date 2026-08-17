# Reconnaissance — profil admin

## Se connecter à l'application  `connexion`

- Adresse : http://localhost:5173/app/login
- Menu : 
- Titres : H1 « HorizonEcole »
- Boutons : « Thème actuel : Mode clair. Cliquer pour changer. » · « HE » · « Se connecter »
- Champs : « Email » (input) · « Mot de passe » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
HE
HorizonEcole

Connectez-vous à votre espace de gestion

Email
Mot de passe
Se connecter

Votre école n'est pas encore enregistrée ? Configurer un établissement

Gestion scolaire · Primaire, Collège et Lycée
```

</details>

## Le tableau de bord  `tableau-de-bord`

- Adresse : http://localhost:5173/app/dashboard
- Menu : 
- Titres : H1 « Tableau de bord »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Élèves » · « Inscriptions » · « Emploi du temps » · « Enseignants »
- Champs : « Rechercher dans l'application » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Tableau de bord

Vue d'ensemble de l'établissement.

Élèves actifs
36
Total élèves
36
Enseignants
6
Classes
6

RACCOURCIS

Élèves
Inscriptions
Emploi du temps
Enseignants
Nouveaux élèves
5
SD
Sekou Doumbia
2026-0036
08/08/2026
NG
Nadège Gbagbo
2026-0035
08/08/2026
IC
Ismaël Coulibaly
2026-0034
08/08/2026
FS
Fatim Sylla
2026-0033
08/08/2026
YK
Yao Kouamé
2026-0032
08/08/2026
Notes récentes
0

Les dernières notes saisies apparaîtront ici.
```

</details>

## La liste des élèves  `eleves-liste`

- Adresse : http://localhost:5173/app/people/students
- Menu : 
- Titres : H1 « Élèves »
- Onglets : «  » (actif) · «  »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Nouvel élève » · « Grille » · « Liste » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Précédent » · « Suivant »
- Champs : « Rechercher dans l'application » (input) · « Nom, matricule, contact… » (input) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select)
- Hauteur du document : 982 px

<details><summary>Texte visible</summary>

```
Élèves

30 élèves enregistrés.

Nouvel élève
Inscrits — 2025-2026
30
Classes actives — 2025-2026
1
Rechercher
Année scolaire
2025-2026 (en cours)
Classe
Toutes
DB
Bakayoko Divine
CE1
JZ
Zadi Junior
CE1
KE
Ehui Kadiatou
CE1
IK
Kanga Ibrahim
CE1
EC
Cisse Estelle
CE1
BK
Kouame Boubacar
CE1
RO
Ouattara Rachel
CE1
AD
Diaby Ali
CE1
SB
Brou Sarah
CE1
AA
Assi Adama
CE1
Par page
10
Précédent
Page 1 / 3
Suivant
```

</details>

## Le formulaire d'un nouvel élève  `eleves-nouveau`

- Adresse : http://localhost:5173/app/people/students
- Menu : 
- Titres : H1 « Nouvel élève »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Sélectionner les fichiers » · « Annuler » · « Enregistrer »
- Champs : « Rechercher dans l'application » (input) · « Nom » (input) · « Prénom » (input) · « Genre » (div.ant-select) · « Né le » (input) · « Lieu de naissance » (input) · « Résidence (optionnel) » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Nouvel élève

Renseignez les informations pour inscrire un nouvel élève.

Nom
Prénom
Genre
Sélectionner
Né le
Lieu de naissance
Résidence (optionnel)
Pièces jointes (optionnel)
Sélectionner les fichiers
Formats acceptés : PDF, DOC, DOCX, JPG, PNG (10MB max par fichier)
Nouvelle fiche élève
Annuler
Enregistrer
```

</details>

## La fiche d'un élève  `eleves-fiche`

- Adresse : http://localhost:5173/app/people/students/27eab46a-345c-40c1-8f27-b1a8602c658a
- Menu : 
- Titres : H1 « Bakayoko Divine »
- Onglets : « Profil » (actif) · « Parents (1) » · « Pièces jointes » · « Paiements »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Profil » · « Parents (1) » · « Pièces jointes » · « Paiements »
- Champs : « Rechercher dans l'application » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
DB
Bakayoko Divine

2026-0030

Profil
Parents (1)
Pièces jointes
Paiements
Matricule
2026-0030
Nom
Bakayoko
Prénom
Divine
Genre
Féminin
Né(e) le
03/06/2019
Lieu de naissance
Korhogo
Statut
ACTIVE
Contact
—
Email
—
Résidence
—
Affecté de l'État
Non
```

</details>

## La liste des parents  `parents-liste`

- Adresse : http://localhost:5173/app/people/parents
- Menu : 
- Titres : H1 « Parents »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Nouveau parent » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Voir la fiche » · « Modifier » · « Supprimer » · « Précédent » · « Suivant »
- Champs : « Rechercher dans l'application » (input) · « Nom, contact… » (input) · « div.ant-select » (div.ant-select)
- Hauteur du document : 982 px

<details><summary>Texte visible</summary>

```
Parents

20 parents enregistrés.

Nouveau parent
Total parents
20
Rechercher
MB
Bakayoko Mariam
MZ
Zadi Marc
GE
Ehui Grace
IK
Kanga Ismael
CC
Cisse Chloe
JK
Kouame Jean
MO
Ouattara Marie
YD
Diaby Yannick
DB
Brou Divine
JA
Assi Junior
Par page
10
Précédent
Page 1 / 2
Suivant
```

</details>

## Le formulaire d'un nouveau parent  `parents-nouveau`

- Adresse : http://localhost:5173/app/people/parents
- Menu : 
- Titres : H1 « Nouveau parent »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Annuler » · « Enregistrer »
- Champs : « Rechercher dans l'application » (input) · « Nom » (input) · « Prénom » (input) · « Contact » (input) · « Adresse email (optionnel) » (input) · « Relation » (div.ant-select) · « div.ant-select » (div.ant-select)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Nouveau parent

Renseignez les informations pour ajouter un nouveau parent.

Nom
Prénom
Contact
Adresse email (optionnel)
Relation
Sélectionner

Élèves rattachés

Sélectionnez les élèves dont ce parent s'occupe (optionnel).

Ajouter des élèves
Rechercher un élève…
Nouvelle fiche parent
Annuler
Enregistrer
```

</details>

## La fiche d'un parent  `parents-fiche`

- Adresse : http://localhost:5173/app/people/parents/c0489196-c5a0-4648-8502-06dbbc9213d2
- Menu : 
- Titres : H1 « Bakayoko Mariam »
- Onglets : « Profil » (actif) · « Compte » · « Élèves rattachés (1) »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Profil » · « Compte » · « Élèves rattachés (1) »
- Champs : « Rechercher dans l'application » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
MB
Bakayoko Mariam

Mère

Profil
Compte
Élèves rattachés (1)
Nom
Bakayoko
Prénom
Mariam
Relation
Mère
Contact
070191945
Email
parent.bakayoko19@example.com
Profession
Enseignant
```

</details>

## La liste des enseignants  `enseignants-liste`

- Adresse : http://localhost:5173/app/people/teachers
- Menu : 
- Titres : H1 « Enseignants »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Nouvel enseignant » · « Modifier » · « Supprimer » · « Modifier » · « Supprimer » · « Modifier » · « Supprimer » · « Modifier » · « Supprimer » · « Modifier » · « Supprimer »
- Champs : « Rechercher dans l'application » (input) · « Rechercher par nom, email, spécialité… » (input) · « div.ant-select » (div.ant-select)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Enseignants

Gestion du personnel enseignant.

+
Nouvel enseignant
Rechercher
Contrat
Tous
Ouattara Aïssatou
aissatou.ouattara@palmiers.edu.ci
CDI
CM2
Diabaté Souleymane
souleymane.diabate@palmiers.edu.ci
CDI
CM1
Touré Mariam
mariam.toure@palmiers.edu.ci
CDD
CE2
Koné Drissa
drissa.kone@palmiers.edu.ci
CDI
CE1
Bamba Rokia
rokia.bamba@palmiers.edu.ci
CDI
CP2
```

</details>

## Le formulaire d'un nouvel enseignant  `enseignants-nouveau`

- Adresse : http://localhost:5173/app/people/teachers
- Menu : 
- Titres : H1 « Nouvel enseignant »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Sélectionner les fichiers » · « Annuler » · « Enregistrer »
- Champs : « Rechercher dans l'application » (input) · « Nom » (input) · « Prénom » (input) · « Adresse email » (input) · « Contact (optionnel) » (input) · « Type de contrat » (div.ant-select) · « Classe affectée » (div.ant-select) · « Classe affectée » (input.ant-select)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Nouvel enseignant

Renseignez les informations pour ajouter un nouvel enseignant.

Nom
Prénom
Adresse email
Contact (optionnel)
Type de contrat
Sélectionner
Classe affectée
Sélectionner une classe
Pièces jointes (optionnel)
Sélectionner les fichiers
Formats acceptés : PDF, DOC, DOCX, JPG, PNG (10MB max par fichier)
Nouvelle fiche enseignant
Annuler
Enregistrer
```

</details>

## La fiche d'un enseignant  `enseignants-fiche`

- Adresse : http://localhost:5173/app/people/teachers/b9bd6a2a-5c25-48c9-8f8a-90ded808dff0
- Menu : 
- Titres : H1 « Ouattara Aïssatou »
- Onglets : « Profil » (actif) · « Compte » · « Classes & Matières » · « Pièces jointes »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Profil » · « Compte » · « Classes & Matières » · « Pièces jointes »
- Champs : « Rechercher dans l'application » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
AO
Ouattara Aïssatou

aissatou.ouattara@palmiers.edu.ci

Profil
Compte
Classes & Matières
Pièces jointes
Nom
Ouattara
Prénom
Aïssatou
Email
aissatou.ouattara@palmiers.edu.ci
Contact
+225 07 00 00 00 04
Type de contrat
CDI
Date d'embauche
08/08/2026
Matières
—
```

</details>

## Les années scolaires  `annees-scolaires`

- Adresse : http://localhost:5173/app/academic/years
- Menu : 
- Titres : H1 « Années scolaires »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Nouvelle année » · « Voir les trimestres » · « Nouveau trimestre » · « Supprimer »
- Champs : « Rechercher dans l'application » (input) · « Rechercher par nom… » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Années scolaires

Année en cours : 2025-2026.

+
Nouvelle année
Rechercher
2025-2026
En cours
0 trimestre
```

</details>

## Les trimestres d'une année  `annee-detail`

- Adresse : http://localhost:5173/app/academic/years
- Menu : 
- Titres : H1 « Années scolaires »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Nouvelle année » · « Voir les trimestres » · « Nouveau trimestre » · « Supprimer » · « Fermer » · « Fermer » · « Nouveau trimestre »
- Champs : « Rechercher dans l'application » (input) · « Rechercher par nom… » (input)
- Fenêtre « Trimestres — 2025-2026 » : Trimestres — 2025-2026 Aucun trimestre pour cette année. Fermer Nouveau trimestre
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Années scolaires

Année en cours : 2025-2026.

+
Nouvelle année
Rechercher
2025-2026
En cours
0 trimestre
```

</details>

## Inscrire des élèves dans une classe  `inscriptions`

- Adresse : http://localhost:5173/app/academic/inscriptions
- Menu : 
- Titres : H1 « Inscriptions »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Réinitialiser » · « Inscrire »
- Champs : « Rechercher dans l'application » (input) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select) · « Classe * Sélectionner une classe » (input.ant-select)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Inscriptions

Inscrivez un ou plusieurs élèves dans une classe pour l'année 2025-2026 (en cours).

Élève *
Rechercher un ou plusieurs élèves…
Classe *
Sélectionner une classe
Nouvelle inscription
Réinitialiser
Inscrire
```

</details>

## L'emploi du temps — écran d'accueil  `emploi-du-temps`

- Adresse : http://localhost:5173/app/academic/timetable
- Menu : 
- Titres : H1 « Emploi du temps »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA »
- Champs : « Rechercher dans l'application » (input) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Emploi du temps

Configurez les activités journalières de chaque classe.

Année scolaire
2025-2026
Classe
Sélectionner…

Sélectionnez une année et une classe

Choisissez une année scolaire et une classe pour gérer son emploi du temps.
```

</details>

## L'emploi du temps d'une classe  `emploi-du-temps-classe`

- Adresse : http://localhost:5173/app/academic/timetable
- Menu : 
- Titres : H1 « Emploi du temps »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Enregistrer » · « Retirer ce créneau » · « Ajouter un créneau horaire » · « Ajouter une activité » · « Enregistrer les 1 activité » · « Définir une récréation / pause » · « Exporter en PDF »
- Champs : « Rechercher dans l'application » (input) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select) · « Enseignant(e) Sélectionner… » (input.ant-select) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select) · « Activité Sélectionner… » (input.ant-select)
- Tableau (10 lignes) : HORAIRES | LUNDI | MARDI | JEUDI | VENDREDI
- Hauteur du document : 1466 px

<details><summary>Texte visible</summary>

```
Emploi du temps

Configurez les activités journalières de chaque classe.

Année scolaire
2025-2026
Classe
CP1
CP1

Enseignant(e) titulaire

Enseignant(e)
Sélectionner…
Enregistrer

Activités à ajouter (1)

Jour
Lundi
Horaire(s)
Sélectionner…
Activité
Sélectionner…
Ajouter une activité
Enregistrer les 1 activité

Emploi du temps de la classe

Définir une récréation / pause
Exporter en PDF
HORAIRES	LUNDI	MARDI	JEUDI	VENDREDI
07:30 - 08:20	
—
	
—
	
—
	
—

08:20 - 09:10	
—
	
—
	
—
	
—

09:10 - 10:00	
—
	
—
	
—
	
—

10:00 - 10:15	RÉCRÉATION
10:15 - 11:05	
—
	
—
	
—
	
—

11:05 - 11:55	
—
	
—
	
—
	
—

11:55 - 14:00	APRÈS-MIDI
14:00 - 14:50	
—
	
—
	
—
	
—

14:50 - 15:40	
—
	
—
	
—
	
—

15:40 - 16:30	
—
	
—
	
—
	
—
```

</details>

## Les classes du primaire  `primaire-classes`

- Adresse : http://localhost:5173/app/primary/classes
- Menu : 
- Titres : H1 « Classes du primaire »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Nouvelle classe » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils »
- Champs : « Rechercher dans l'application » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Classes du primaire

Grilles de matières, barèmes, seuils et titulaires des classes CP1 à CM2.

+
Nouvelle classe
CP1
CP1
7 matières
CP2
CP2
7 matières
CE1
CE1
4 matières
CE2
CE2
4 matières
CM1
CM1
4 matières
CM2
CM2
4 matières
```

</details>

## La grille de matières et les seuils d'une classe  `primaire-classe-config`

- Adresse : http://localhost:5173/app/primary/classes
- Menu : 
- Titres : H1 « Classes du primaire »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Nouvelle classe » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Voir le détail du paramétrage » · « Configurer la grille et les seuils » · « Fermer » · « Annuler » · « Enregistrer »
- Champs : « Rechercher dans l'application » (input) · « input » (input) · « input » (input) · « input » (input) · « input » (input) · « input » (input) · « input » (input) · « input » (input) · « div.ant-select » (div.ant-select) · « Moyenne d'admission » (input) · « Seuil de redoublement » (input)
- Fenêtre « Grille — CP1 » : Grille — CP1 COPIE sur EXP ECRIT sur DICTEE sur MATH sur LECT sur DESS sur CHANT sur Échelle de la moyenne sur 10 Moyenne d'admission Seuil de redoublement Total des barèmes : 70 — moyenne = total ÷ 7 → /10 Le diviseur se déduit des barèmes : il n'est jamais saisi à la main. Annuler Enregistrer
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Classes du primaire

Grilles de matières, barèmes, seuils et titulaires des classes CP1 à CM2.

+
Nouvelle classe
CP1
CP1
7 matières
CP2
CP2
7 matières
CE1
CE1
4 matières
CE2
CE2
4 matières
CM1
CM1
4 matières
CM2
CM2
4 matières
```

</details>

## Le calendrier des compositions  `primaire-compositions`

- Adresse : http://localhost:5173/app/primary/evaluations
- Menu : 
- Titres : H1 « Compositions du primaire »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Créer une composition » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Voir les compositions de la classe »
- Champs : « Rechercher dans l'application » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Compositions du primaire

Calendrier des compositions par classe : ce que le niveau prévoit, ce qui reste à créer.

+
Créer une composition
CP1
Cours Préparatoire 1
0/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CP2
Cours Préparatoire 2
3/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CE1
Cours Élémentaire 1
4/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CE2
Cours Élémentaire 2
0/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CM1
Cours Moyen 1
0/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CM2
Cours Moyen 2 (CEPE)
0/4 compositions
Comp. 1
Comp. 2
Ex. blanc 1
Ex. blanc 2
```

</details>

## Créer une composition  `primaire-composition-creer`

- Adresse : http://localhost:5173/app/primary/evaluations
- Menu : 
- Titres : H1 « Compositions du primaire »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Créer une composition » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Voir les compositions de la classe » · « Fermer » · « Prévues » · « Toutes » · « Aucune » · « Annuler » · « Créer »
- Champs : « Rechercher dans l'application » (input) · « div.ant-select » (div.ant-select) · « Composition Ex : COMPOSITION 1 Au CM2, « EXAMEN BLANC 1 » et « EXAMEN BLANC 2 » ajoutent l'EPS à la grille. » (input.ant-select) · « div.ant-picker » (div.ant-picker) · « Sélectionner une date » (input) · « CP1 » (input) · « CP2 » (input) · « CE1 » (input) · « CE2 » (input) · « CM1 » (input) · « CM2 » (input)
- Fenêtre « Nouvelle composition » : Nouvelle composition Composition Ex : COMPOSITION 1 Au CM2, « EXAMEN BLANC 1 » et « EXAMEN BLANC 2 » ajoutent l'EPS à la grille. Date Classes concernées 0 / 6 Prévues Toutes Aucune CP1 CP2 CE1 CE2 CM1 CM2 Annuler Créer
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Compositions du primaire

Calendrier des compositions par classe : ce que le niveau prévoit, ce qui reste à créer.

+
Créer une composition
CP1
Cours Préparatoire 1
0/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CP2
Cours Préparatoire 2
3/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CE1
Cours Élémentaire 1
4/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CE2
Cours Élémentaire 2
0/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CM1
Cours Moyen 1
0/4 compositions
Comp. 1
Comp. 2
Comp. 3
Passage
CM2
Cours Moyen 2 (CEPE)
0/4 compositions
Comp. 1
Comp. 2
Ex. blanc 1
Ex. blanc 2
```

</details>

## Les résultats d’une composition  `primaire-resultats`

- Adresse : http://localhost:5173/app/primary/grades
- Menu : 
- Titres : H1 « Résultats & Bulletins »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Saisir les notes » · « Fiche de classement (PDF) » · « Bulletins de la classe » · « Bilan annuel (PDF) » · « Bulletin » · « Bulletin » · « Bulletin » · « Bulletin » · « Bulletin » · « Bulletin » · « ‹ » · « › »
- Champs : « Rechercher dans l'application » (input) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select)
- Hauteur du document : 1372 px

<details><summary>Texte visible</summary>

```
Résultats & Bulletins

Fiches de classement, bulletins individuels et synthèse annuelle par composition.

Année scolaire
2025-2026 (En cours)
Classe
CP2
Composition
COMPOSITION 1 — 20/11/2025
Saisir les notes
Fiche de classement (PDF)
Bulletins de la classe
Bilan annuel (PDF)
Moyenne de la classe
6,80/10
Ont composé
6/6
Taux de réussite
100,00%
Plus forte moyenne
7,19
CP2 — COMPOSITION 1
total ÷ 8 → /10

Admission à partir de 5/10 · insuffisant en dessous de 4/10. Une matière non saisie compte 0 ; un élève absent n'est pas classé.

Kouamé Yao
2026-0032
· 1er
· Bien
7,19/10
Admis(e)
COPIE /10
7,50
EXP ECRIT /10
9,00
DICTEE /10
5,50
MATH /20
13,00
LECT /10
8,00
DESS /10
9,00
CHANT /10
5,50
Total /80
57,50
Bulletin
Doumbia Sekou
2026-0036
· 2e
· Bien
7,13/10
Admis(e)
COPIE /10
6,50
EXP ECRIT /10
7,50
DICTEE /10
9,00
MATH /20
10,50
LECT /10
6,50
DESS /10
8,00
CHANT /10
9,00
Total /80
57,00
Bulletin
Cissé Awa
2026-0031
· 3e
· Assez Bien
6,88/10
Admis(e)
COPIE /10
5,00
EXP ECRIT /10
6,00
DICTEE /10
7,50
MATH /20
17,50
LECT /10
5,00
DESS /10
6,50
CHANT /10
7,50
Total /80
55,00
Bulletin
Sylla Fatim
2026-0033
· 4e
· Assez Bien
6,63/10
Admis(e)
COPIE /10
8,50
EXP ECRIT /10
4,50
DICTEE /10
6,00
MATH /20
14,50
LECT /10
8,50
DESS /10
5,00
CHANT /10
6,00
Total /80
53,00
Bulletin
Gbagbo Nadège
2026-0035
· 5e
· Assez Bien
6,56/10
Admis(e)
COPIE /10
7,00
EXP ECRIT /10
8,50
DICTEE /10
4,50
MATH /20
12,00
LECT /10
7,00
DESS /10
8,50
CHANT /10
5,00
Total /80
52,50
Bulletin
Coulibaly Ismaël
2026-0034
· 6e
· Assez Bien
6,38/10
Admis(e)
COPIE /10
5,50
EXP ECRIT /10
7,00
DICTEE /10
8,00
MATH /20
9,00
LECT /10
6,00
DESS /10
7,00
CHANT /10
8,50
Total /80
51,00
Bulletin
1–6 sur 6 élève(s)
10 par page
‹
1 / 1
›
```

</details>

## Les échéanciers de paiement  `finance-echeanciers`

- Adresse : http://localhost:5173/app/finance/payment-conditions
- Menu : 
- Titres : H1 « Conditions de Paiement »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Nouvelle condition » · « Voir les versements » · « Affecter aux classes » · « Modifier » · « Supprimer »
- Champs : « Rechercher dans l'application » (input) · « Rechercher une condition… » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Conditions de Paiement

Définissez des gabarits de versements réutilisables et affectez-les aux classes.

+
Nouvelle condition
Rechercher
Échéancier CE1 - 3 Versements Trimestriels
3 versements
1 classe
```

</details>

## Créer un échéancier  `finance-echeancier-nouveau`

- Adresse : http://localhost:5173/app/finance/payment-conditions
- Menu : 
- Titres : H1 « Nouvel échéancier »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Ajouter un versement » · « Annuler » · « Enregistrer »
- Champs : « Rechercher dans l'application » (input) · « Nom de l'échéancier » (input) · « ex : 1er versement » (input) · « 75 000 » (input) · « div.ant-picker » (div.ant-picker) · « JJ/MM/AAAA » (input)
- Tableau (1 lignes) : # | Libellé du versement | Montant (CFA) | Date d'échéance | 
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Nouvel échéancier

Définissez les versements avec leur montant fixe et leur date d'échéance.

Nom de l'échéancier

Versements *

Saisissez le montant fixe et la date d'échéance de chaque versement.

#	Libellé du versement	Montant (CFA)	Date d'échéance	
1	
	
	
	
Ajouter un versement
Nouvel échéancier
Annuler
Enregistrer
```

</details>

## Le suivi des paiements  `finance-paiements`

- Adresse : http://localhost:5173/app/finance/payments
- Menu : 
- Titres : H1 « Paiements »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA »
- Champs : « Rechercher dans l'application » (input) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Paiements

Suivez et enregistrez les paiements des élèves par classe et année scolaire.

Année scolaire
2025-2026
Classe
Sélectionner une classe…

Sélectionnez une classe

Choisissez une année scolaire et une classe pour voir la liste des élèves.
```

</details>

## Les paiements d'une classe  `finance-paiements-classe`

- Adresse : http://localhost:5173/app/finance/payments
- Menu : 
- Titres : H1 « Paiements »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA »
- Champs : « Rechercher dans l'application » (input) · « div.ant-select » (div.ant-select) · « div.ant-select » (div.ant-select)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Paiements

Suivez et enregistrez les paiements des élèves par classe et année scolaire.

Année scolaire
2025-2026
Classe
CP1
CP1

Aucun élève inscrit

Aucune inscription trouvée pour cette classe et cette année scolaire.
```

</details>

## Les rôles  `roles`

- Adresse : http://localhost:5173/app/people/roles
- Menu : 
- Titres : H1 « Rôles »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Nouveau rôle » · « Modifier » · « Modifier »
- Champs : « Rechercher dans l'application » (input) · « Rechercher un rôle… » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Rôles

Définissez les profils du personnel et les menus qui leur sont accessibles.

+
Nouveau rôle
Rechercher
Administrateur
Accès complet à l'ensemble des menus de l'application.
20 menu(s)
1 utilisateur(s)
Propriétaire
Accès en lecture seule aux tableaux de bord analytiques de l'établissement.
6 menu(s)
1 utilisateur(s)
```

</details>

## Créer un rôle et choisir ses menus  `roles-nouveau`

- Adresse : http://localhost:5173/app/people/roles
- Menu : 
- Titres : H1 « Nouveau rôle »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Tout » · « Aucune » · « Tout » · « Aucune » · « Tout » · « Aucune » · « Tout » · « Aucune » · « Tout » · « Aucune » · « Annuler » · « Enregistrer »
- Champs : « Rechercher dans l'application » (input) · « Nom du rôle » (input) · « Description (optionnel) » (textarea)
- Hauteur du document : 1291 px

<details><summary>Texte visible</summary>

```
Nouveau rôle

Choisissez les menus visibles dans le sidebar pour les comptes ayant ce rôle.

Nom du rôle
Description (optionnel)
Tableau de bord
0 / 1
Tout
Aucune
Tableau de bord
Gestion des Personnes
0 / 5
Tout
Aucune
Élèves
Parents
Enseignants
Rôles
Utilisateurs
Année Académique
0 / 5
Tout
Aucune
Années Scolaires
Inscriptions
Emploi du Temps
Liste de Présence
Séances non tenues
École Primaire
0 / 3
Tout
Aucune
Classes
Compositions
Résultats & Bulletins
Finance
0 / 2
Tout
Aucune
Échéanciers
Paiements
0 menu(s) sélectionné(s)
Annuler
Enregistrer
```

</details>

## Les comptes du personnel  `utilisateurs`

- Adresse : http://localhost:5173/app/people/users
- Menu : 
- Titres : H1 « Utilisateurs »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « + Nouvel utilisateur » · « Modifier » · « Supprimer » · « Modifier » · « Ce compte administrateur est protégé et ne peut pas être supprimé. »
- Champs : « Rechercher dans l'application » (input) · « Rechercher par nom, email… » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Utilisateurs

Comptes du personnel utilisant l'application (secrétariat, comptabilité…).

+
Nouvel utilisateur
Rechercher
ANDJUI ASSALE ANGE MICKAEL
prestgo112@gmail.com
Propriétaire
Actif
Ange Mickael
groupescolairepalmiers@gmail.com
Administrateur
Actif
Protégé
```

</details>

## Créer un compte utilisateur  `utilisateurs-nouveau`

- Adresse : http://localhost:5173/app/people/users
- Menu : 
- Titres : H1 « Nouvel utilisateur »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour à la liste » · « Annuler » · « Enregistrer »
- Champs : « Rechercher dans l'application » (input) · « Nom » (input) · « Prénom » (input) · « Adresse email » (input) · « Téléphone (optionnel) » (input) · « Rôle » (div.ant-select) · « Rôle » (input.ant-select) · « Mot de passe » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Nouvel utilisateur

Créez un compte pour un membre du personnel.

Nom
Prénom
Adresse email
Téléphone (optionnel)
Rôle
Sélectionner un rôle
Compte actif
Mot de passe
Nouveau compte personnel
Annuler
Enregistrer
```

</details>

## La fiche de l'établissement  `etablissement`

- Adresse : http://localhost:5173/app/etablissement
- Menu : 
- Titres : H1 « Profil de l'établissement » · H2 « Groupe Scolaire les Palmiers »
- Boutons : « Tableau de bord » · « Élèves » · « Parents » · « Enseignants » · « Années Scolaires » · « Inscriptions » · « Emploi du Temps » · « Classes » · « Compositions » · « Résultats & Bulletins » · « Échéanciers » · « Paiements » · « Rôles » · « Utilisateurs » · « Établissement » · « MA Mickael Ange Administrateur » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « MA » · « Retour » · « Modifier » · « Remplacer » · « Retirer »
- Champs : « Rechercher dans l'application » (input)
- Hauteur du document : 950 px

<details><summary>Texte visible</summary>

```
Profil de l'établissement

Coordonnées et logo de votre école

Groupe Scolaire les Palmiers

groupe-scolaire-les-palmiers · École primaire

Modifier
Logo — image (JPG, PNG, WEBP), 2 Mo max.
Remplacer
Retirer
Nom
Groupe Scolaire les Palmiers
Identifiant
groupe-scolaire-les-palmiers
Type d'école
École primaire
Email
groupescolairepalmiers@gmail.com
Téléphone
0555664337
Ville
Abidjan
Adresse
abidjan
Direction Régionale
Abidjan 4
Secteur Pédagogique
Yopougon 1
```

</details>
