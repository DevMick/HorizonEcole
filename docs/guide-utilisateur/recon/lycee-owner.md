# Reconnaissance — profil lycee-owner

## Se connecter  `connexion`

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

## La vue d’ensemble  `vue-ensemble`

- Adresse : http://localhost:5173/app/owner?y=8539a0e6-8fbc-4edb-a4a1-ccb68aca947f
- Menu : 
- Titres : H1 « Vue d'ensemble »
- Boutons : « Vue d'ensemble » · « Effectifs » · « Assiduité » · « Résultats » · « Enseignants » · « Finance » · « Ressources » · « SK Séraphin Kouassi Propriétaire » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « SK » · « Finance »
- Champs : « Rechercher dans l'application » (input) · « Année scolaire » (div.ant-select)
- Hauteur du document : 1072 px

<details><summary>Texte visible</summary>

```
Vue d'ensemble

Lycée Moderne de Cocody — Lycée — 2025-2026

Élèves inscrits
25
EFF-01
Nouveaux élèves
25
EFF-08
Taux de réinscription
—
EFF-10
Enseignants
8
ENS-01
Taux de recouvrement
79 %
FIN-04
Impayés
1 800 000 FCFA
FIN-03
Chiffre d'affaires facturé
8 750 000 FCFA
FIN-01
Taux de réussite
72 %
SEC-11
Taux de présence
94 %
ASS-01
Effectifs sur 5 ans
Inscrits et nouveaux élèves, par année.

Une seule mesure disponible (2025-2026) : l’évolution apparaîtra dès la période suivante.

Encaissements mensuels
De septembre à août, avec l'année de comparaison en surimpression.
0
1275000
2550000
septembre
octobre
novembre
décembre
janvier
février
mars
avril
mai
juin
juillet
août
Encaissé
Année de comparaison
Points d'attention
Ce qui mérite un regard — chaque ligne mène à l'écran où vérifier.
1 800 000 FCFA restent à recouvrer
Finance
```

</details>

## Les effectifs  `effectifs`

- Adresse : http://localhost:5173/app/owner/effectifs?y=8539a0e6-8fbc-4edb-a4a1-ccb68aca947f
- Menu : 
- Titres : H1 « Effectifs »
- Boutons : « Vue d'ensemble » · « Effectifs » · « Assiduité » · « Résultats » · « Enseignants » · « Finance » · « Ressources » · « SK Séraphin Kouassi Propriétaire » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « SK »
- Champs : « Rechercher dans l'application » (input) · « Année scolaire » (div.ant-select) · « Filtrer par niveau » (div.ant-select) · « Filtrer par classe » (div.ant-select) · « Filtrer par sexe » (div.ant-select)
- Tableau (1 lignes) : CLASSE | NIVEAU | EFFECTIF | Δ N-1 | F / G | ÂGE MOYEN | OCCUPATION | STATUT
- Hauteur du document : 1610 px

<details><summary>Texte visible</summary>

```
Effectifs

Inscriptions, répartition et fidélisation — 2025-2026

NIVEAU
Tous
CLASSE
Toutes
SEXE
Tous
Inscrits
25
Nouveaux
25
Départs
—
Effectif moyen / classe
25
Effectif par niveau
Le filet sous chaque barre situe l'année de comparaison.
6EME
25
Répartition par sexe
Part des filles et des garçons inscrits.
25
inscrits
F
52 %
13
M
48 %
12
Nouveaux et réinscrits par niveau
La part sombre représente les élèves déjà présents l'an dernier.
6EME
N 25 · R 0
Détail par classe
Effectif, parité, âge moyen et remplissage, classe par classe.
Occupation moyenne 83 %
CLASSE	NIVEAU	EFFECTIF	Δ N-1	F / G	ÂGE MOYEN	OCCUPATION	STATUT
6ème A	6EME	25		13 / 12	11,7 ans	83,3 %	
Équilibrée
Évolution sur 5 ans
Inscrits et nouveaux élèves, par année scolaire.

Une seule mesure disponible (2025-2026) : l’évolution apparaîtra dès la période suivante.

Pyramide des âges
Âge atteint dans l'année de début du cycle scolaire.
11
12

âge

Statuts et fidélisation
Ce que deviennent les élèves inscrits, et ce que l'école retient d'une année sur l'autre.
25
élèves
ACTIVE
100 %
25
Taux de réinscription
—
Taux d'abandon
0 %
Affectés par l'État
20 %
```

</details>

## L’assiduité  `assiduite`

- Adresse : http://localhost:5173/app/owner/assiduite?y=8539a0e6-8fbc-4edb-a4a1-ccb68aca947f
- Menu : 
- Titres : H1 « Assiduité »
- Boutons : « Vue d'ensemble » · « Effectifs » · « Assiduité » · « Résultats » · « Enseignants » · « Finance » · « Ressources » · « SK Séraphin Kouassi Propriétaire » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « SK »
- Champs : « Rechercher dans l'application » (input) · « Année scolaire » (div.ant-select) · « Filtrer par classe » (div.ant-select) · « Filtrer par matière » (div.ant-select)
- Tableau (8 lignes) : ENSEIGNANT | TENUES | NON TENUES | COUVERTURE
- Hauteur du document : 2255 px

<details><summary>Texte visible</summary>

```
Assiduité

Présence, absences et vie scolaire — 2025-2026

CLASSE
Toutes
MATIÈRE
Toutes
Taux de présence
94 %
Taux d'absence
4 %
Taux de retard
2 %
Absences justifiées
54 %
Absences par classe
Part des relevés « absent » ou « excusé », classe par classe.
6ème A
4,1 %
Absences par matière
Les matières les plus désertées, en heures cumulées.
Mathématiques
93 h
Physique-Chimie
48 h
Éducation Physique et Sportive
32 h
Histoire-Géographie
29 h
Anglais
22 h
Sciences de la Vie et de la Terre
20 h
Éducation Civique et Morale
18 h
Français
10 h
Couverture de l'appel
Séances tenues rapportées aux créneaux de l'emploi du temps.
20 % de couverture
Séances tenues
264
Séances non tenues
1 089
Taux de couverture
20 %
ENSEIGNANT	TENUES	NON TENUES	COUVERTURE
N. Y.	16	66	19,5 %
K. N.	56	231	19,5 %
J. A.	24	99	19,5 %
M. C.	32	132	19,5 %
S. B.	40	165	19,5 %
F. D.	24	99	19,5 %
I. O.	16	66	19,5 %
A. S.	56	231	19,5 %

Enseignants désignés par leurs initiales : le pilotage n'exige pas de nommer.

Conduite
Note de base 20, moins un point par tranche de 2 h d'absence.
Note moyenne
18,45
Pénalité moyenne
1,55
Élèves sous 10
0 %
Corrections manuelles
0
0–2
2–4
4–6
6–8
8–10
10–12
12–14
14–16
16–18
18–20

note de conduite

Incidents disciplinaires
Volume par gravité.
Aucun incident enregistré
Le registre disciplinaire n'a pas d'écran de saisie monté : il peut rester vide.
Absences des enseignants
Heures déclarées et part couverte par un motif.
Aucune absence enseignant déclarée
L'écran de saisie des absences enseignants n'est pas déployé : la table peut rester vide, ce qui n'est pas la même chose que zéro heure d'absence.
Assiduité demi-journée
Relevé historique, conservé comme repli de l'appel par séance.
Aucun appel demi-journée enregistré.
```

</details>

## Les résultats  `resultats`

- Adresse : http://localhost:5173/app/owner/resultats?y=8539a0e6-8fbc-4edb-a4a1-ccb68aca947f
- Menu : 
- Titres : H1 « Résultats »
- Boutons : « Vue d'ensemble » · « Effectifs » · « Assiduité » · « Résultats » · « Enseignants » · « Finance » · « Ressources » · « SK Séraphin Kouassi Propriétaire » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « SK »
- Champs : « Rechercher dans l'application » (input) · « Année scolaire » (div.ant-select) · « Filtrer par trimestre » (div.ant-select) · « Filtrer par niveau » (div.ant-select) · « Filtrer par classe » (div.ant-select) · « Filtrer par matière » (div.ant-select)
- Tableau (1 lignes) : # | CLASSE | NIVEAU | MOYENNE | Δ N-1 | RÉUSSITE | ÉCART-TYPE | ÉLÈVES
- Hauteur du document : 2624 px

<details><summary>Texte visible</summary>

```
Résultats

Moyennes, réussite et classements — 2025-2026

TRIMESTRE
Tous
NIVEAU
Tous
CLASSE
Toutes
MATIÈRE
Toutes
Moyenne générale
11,44
Taux de réussite
72 %
Écart-type
1,98
Bulletins publiés
67 %
Moyenne par matière
Notes ramenées sur 20 ; un barème sur 10 compte à demi-poids.
Anglais
11,56
Physique-Chimie
11,52
Français
11,5
Mathématiques
11,48
Éducation Physique et Sportive
11,45
Éducation Civique et Morale
11,4
Sciences de la Vie et de la Terre
11,38
Histoire-Géographie
11,15
Distribution des moyennes
Répartition des moyennes générales, par tranche d'un point.
0
2
4
6
8
10
12
14
16
18

moyenne générale

Évolution par trimestre
Moyenne générale, trimestre après trimestre.
0
6
12
1er Trimestre
2e Trimestre
3e Trimestre
Année observée
Comparaison
Évolution pluriannuelle
Moyenne générale de l'établissement.

Une seule mesure disponible (2025-2026) : l’évolution apparaîtra dès la période suivante.

Évolution par matière
Les cinq matières dont la moyenne a le plus bougé entre le premier et le dernier trimestre.
0
6
12
1er Trimestre
2e Trimestre
3e Trimestre
Mathématiques
Physique-Chimie
Éducation Physique et Sportive
Anglais
Français

Mathématiques

+1

Physique-Chimie

+0,5

Éducation Physique et Sportive

+0,3

Anglais

+0,3

Français

−0,1
Classement des classes
Les classes à égalité partagent leur rang.
#	CLASSE	NIVEAU	MOYENNE	Δ N-1	RÉUSSITE	ÉCART-TYPE	ÉLÈVES
1	6ème A	6EME	11,44		72 %	1,98	25
Mentions
Répartition des moyennes générales par mention.
élèves notés
Passable
32 %
8
Assez Bien
32 %
8
Insuffisant
28 %
7
Bien
8 %
2
Poids des matières
Part de chaque matière dans la décision de passage, coefficients à l'appui.
Français
22,2 %
Mathématiques
22,2 %
Anglais
11,1 %
Histoire-Géographie
11,1 %
Sciences de la Vie et de la Terre
11,1 %
Physique-Chimie
11,1 %
Éducation Civique et Morale
5,6 %
Éducation Physique et Sportive
5,6 %
Types d'évaluation
Ce que recouvrent les notes saisies.
1 800
notes
Devoir 2
33,3 %
75
Composition
33,3 %
75
Devoir 1
33,3 %
75
Distribution des notes
Toutes notes confondues, ramenées sur 20, par tranche de deux points.
0–2
2–4
4–6
6–8
8–10
10–12
12–14
14–16
16–18
18–20

note sur 20
```

</details>

## Les enseignants  `enseignants`

- Adresse : http://localhost:5173/app/owner/enseignants?y=8539a0e6-8fbc-4edb-a4a1-ccb68aca947f
- Menu : 
- Titres : H1 « Enseignants »
- Boutons : « Vue d'ensemble » · « Effectifs » · « Assiduité » · « Résultats » · « Enseignants » · « Finance » · « Ressources » · « SK Séraphin Kouassi Propriétaire » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « SK »
- Champs : « Rechercher dans l'application » (input) · « Année scolaire » (div.ant-select)
- Tableau (8 lignes) : ENSEIGNANT | HEURES / SEMAINE | CIBLE | ÉCART
- Hauteur du document : 1903 px

<details><summary>Texte visible</summary>

```
Enseignants

Effectif, charge et couverture des matières — 2025-2026

Effectif enseignant
8
Ancienneté moyenne (années)
0
Charge hebdomadaire moyenne
3,42 h
Couverture des matières
100 %

Le schéma ne modélise que le corps enseignant : le personnel administratif et de service n'y figure pas, et n'est donc pas compté ici.

Types de contrat
CDI, CDD et vacataires.
8
enseignants
CDI
62,5 %
5
CDD
25 %
2
VACATAIRE
12,5 %
1
Polyvalence
Nombre de matières enseignées, enseignant par enseignant.
1 matière

matières par enseignant

Couverture des affectations
Matières pourvues, professeurs principaux et comptes applicatifs.
Matières pourvues
100 %
Classes avec professeur principal
100 %
Comptes applicatifs actifs
100 %
Créneaux sans enseignant
0
Affectations formalisées
8
Contrats arrivant à échéance
CDD dont le terme tombe dans l'année scolaire observée.
Aucun contrat n'arrive à échéance cette année.
Charge horaire hebdomadaire
Heures d'emploi du temps par enseignant, comparées à la bande cible déclarée.
Aucune bande cible déclarée
Sans heures hebdomadaires de référence, la surcharge n'est pas mesurable : elle n'est pas nulle.
ENSEIGNANT	HEURES / SEMAINE	CIBLE	ÉCART
K. N.	5,81 h	—	—
A. S.	5,81 h	—	—
S. B.	4,15 h	—	—
M. C.	3,32 h	—	—
J. A.	2,49 h	—	—
F. D.	2,49 h	—	—
N. Y.	1,66 h	—	—
I. O.	1,66 h	—	—
Masse salariale
Brut, net, charges et coût par élève sur l'année scolaire.
Aucun bulletin de paie
Le module de paie n'est pas alimenté pour cette année : les montants restent vides plutôt que d'être affichés à zéro.
```

</details>

## La finance  `finance`

- Adresse : http://localhost:5173/app/owner/finance?y=8539a0e6-8fbc-4edb-a4a1-ccb68aca947f
- Menu : 
- Titres : H1 « Finance »
- Boutons : « Vue d'ensemble » · « Effectifs » · « Assiduité » · « Résultats » · « Enseignants » · « Finance » · « Ressources » · « SK Séraphin Kouassi Propriétaire » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « SK »
- Champs : « Rechercher dans l'application » (input) · « Année scolaire » (div.ant-select) · « Filtrer par niveau » (div.ant-select) · « Filtrer par classe » (div.ant-select) · « Filtrer par type de frais » (div.ant-select)
- Tableau (1 lignes) : ÉCHÉANCIER | TRANCHES | ÉTALEMENT
- Hauteur du document : 3022 px

<details><summary>Texte visible</summary>

```
Finance

Facturation, recouvrement et dépenses — 2025-2026

NIVEAU
Tous
CLASSE
Toutes
TYPE DE FRAIS
Tous
Facturé
8 750 000 FCFA
Encaissé
6 950 000 FCFA
Impayés
1 800 000 FCFA
Recouvrement
79 %
Recouvrement à échéance
L'encaissé rapporté à ce qui était exigible à ce jour — le taux à lire en cours d'année.
Recouvrement brut
79 %
Recouvrement à échéance
79 %
Taux de facturation
100 %
Attendu échu
8 750 000 FCFA
Recette moyenne / élève
350 000 FCFA
Vieillissement de la créance
Une créance de six millions ne dit rien tant qu'on ignore son ancienneté.
0 à 30 jours
0 FCFA
0 %
31 à 60 jours
0 FCFA
0 %
61 à 90 jours
0 FCFA
0 %
plus de 90 jours
1 800 000 FCFA
100 %
Retards de paiement
Tranches échues non soldées, par numéro de tranche.
Retard moyen 211 j
Tranches en retard
16
Montant en retard
1 800 000 FCFA
Élèves à jour
72 %
Tranche 1
600 000 FCFA
Tranche 2
500 000 FCFA
Tranche 3
700 000 FCFA
Recettes par type de frais
Ce que recouvre le montant facturé.
8 750 000 FCFA
facturé
Frais d’inscription
42,9 %
3 750 000 FCFA
Scolarité — 2e versement
28,6 %
2 500 000 FCFA
Scolarité — 3e versement
28,6 %
2 500 000 FCFA
Encaissé par mode de paiement
Espèces, chèque, virement, mobile money.
encaissé
Mobile Money
32,4 %
2 250 000 FCFA
Espèces
28,8 %
2 000 000 FCFA
Chèque
24,5 %
1 700 000 FCFA
Virement
14,4 %
1 000 000 FCFA
Saisonnalité des encaissements
Douze mois, de septembre à août, avec l'année de comparaison en surimpression.
0
1275000
2550000
septembre
octobre
novembre
décembre
janvier
février
mars
avril
mai
juin
juillet
août
Encaissé
Année de comparaison
Dépenses
Créance par classe
Agrégée par classe — un impayé ne désigne jamais une famille.
3 classes concentrent 100 %
6ème A
1 800 000 FCFA
Recettes par niveau
Facturé par niveau de classe.
6EME
8 750 000 FCFA
Grille tarifaire et écarts
Tarif de référence par niveau, et écart avec le montant réellement facturé.
Aucune grille tarifaire
Sans tarif de référence, l'écart entre tarif et facturé n'est pas calculable.
Structure des échéanciers
Nombre de tranches et étalement, par condition de paiement.
ÉCHÉANCIER	TRANCHES	ÉTALEMENT
Scolarité 6ème — 3 versements	3	0 j
Dépenses et marge
Charges approuvées, exécution budgétaire et résultat d'exploitation.
Modules non alimentés
Aucune donnée pour : paie, budgets. Ces écrans de saisie ne sont pas encore déployés — les montants restent vides plutôt que d'être affichés à zéro.
Dépenses
8 752 000 FCFA
En attente d'approbation
0 FCFA
Marge
—
Poids de la masse salariale
—

La marge exige que les dépenses et la paie soient alimentées : sans les deux, un résultat calculé serait flatteur et faux.

dépenses
SALAIRES
84,6 %
7 400 000 FCFA
FOURNITURES
3,7 %
320 000 FCFA
ENERGIE
3,5 %
307 000 FCFA
ASSURANCES
2,7 %
240 000 FCFA
MAINTENANCE
2,4 %
210 000 FCFA
ACTIVITES
2,1 %
180 000 FCFA
TRANSPORT
1,1 %
95 000 FCFA
Évolution pluriannuelle
Facturé et encaissé sur les cinq dernières années.

Une seule mesure disponible (2025-2026) : l’évolution apparaîtra dès la période suivante.
```

</details>

## Les ressources  `ressources`

- Adresse : http://localhost:5173/app/owner/ressources?y=8539a0e6-8fbc-4edb-a4a1-ccb68aca947f
- Menu : 
- Titres : H1 « Ressources »
- Boutons : « Vue d'ensemble » · « Effectifs » · « Assiduité » · « Résultats » · « Enseignants » · « Finance » · « Ressources » · « SK Séraphin Kouassi Propriétaire » · « Thème actuel : Mode clair. Cliquer pour changer. » · « Notifications » · « SK »
- Champs : « Rechercher dans l'application » (input) · « Année scolaire » (div.ant-select) · « Filtrer par classe » (div.ant-select)
- Tableau (6 lignes) :  | 07:30–08:20 | 08:20–09:10 | 09:10–10:00 | 10:15–11:05 | 11:05–11:55 | 14:00–14:50 | 14:50–15:40
- Tableau (1 lignes) : SALLE | CLASSE | ÉLÈVES | PLACES | OCCUPATION
- Tableau (5 lignes) : JOUR | DÉBUT | FIN
- Tableau (8 lignes) : CLASSE ET MATIÈRE | PRÉVU | RÉEL | ÉCART
- Hauteur du document : 2918 px

<details><summary>Texte visible</summary>

```
Ressources

Salles, volumes horaires et conflits — 2025-2026

CLASSE
Toutes
Salles par classe
1
Créneaux sans salle
0
Conflits détectés
0
Salles sous-utilisées
0
Occupation des salles
Créneaux occupés rapportés aux créneaux ouvrables de la semaine.
Salle 12
78,6 %
Quand les salles sont-elles occupées ?
Nombre de salles occupées, jour par jour et créneau par créneau.
	07:30–08:20	08:20–09:10	09:10–10:00	10:15–11:05	11:05–11:55	14:00–14:50	14:50–15:40
LUNDI	1	1	1	1	1	1	1
MARDI	1	1	1	1	1	1	1
MERCREDI	1	1	1	1	1		
JEUDI	1	1	1	1	1	1	1
VENDREDI	1	1	1	1	1	1	1
SAMEDI							
Salles sous-utilisées
En deçà de 25 % d'occupation — un actif immobilisé qui ne sert pas.
Aucune salle sous le seuil.
Occupation en places assises
Effectif de la classe rapporté à la capacité de sa salle principale.
SALLE	CLASSE	ÉLÈVES	PLACES	OCCUPATION
Salle 12	6ème A	25	35	71,4 %
Volume horaire par matière
Heures hebdomadaires enseignées.
Français
5,81 h
Mathématiques
5,81 h
Anglais
4,15 h
Histoire-Géographie
3,32 h
Sciences de la Vie et de la Terre
2,49 h
Physique-Chimie
2,49 h
Éducation Physique et Sportive
1,66 h
Éducation Civique et Morale
1,66 h
Volume horaire par classe
Charge hebdomadaire, classe par classe.
6ème A
27,39 h
Charge par jour de la semaine
Du lundi au samedi.
lundi
5,81 h
mardi
5,81 h
mercredi
4,15 h
jeudi
5,81 h
vendredi
5,81 h
Amplitude horaire
Premier et dernier créneau réellement occupés, jour par jour.
JOUR	DÉBUT	FIN
lundi	07:30	15:40
mardi	07:30	15:40
mercredi	07:30	11:55
jeudi	07:30	15:40
vendredi	07:30	15:40
Écart entre volume réel et volume prévu
Heures d'emploi du temps comparées aux heures déclarées dans la grille des matières.
CLASSE ET MATIÈRE	PRÉVU	RÉEL	ÉCART
6ème A — Éducation Physique et Sportive	2 h	1,66 h	-0,34 h
6ème A — Anglais	4 h	4,15 h	+0,15 h
6ème A — Histoire-Géographie	3 h	3,32 h	+0,32 h
6ème A — Sciences de la Vie et de la Terre	2 h	2,49 h	+0,49 h
6ème A — Physique-Chimie	2 h	2,49 h	+0,49 h
6ème A — Éducation Civique et Morale	1 h	1,66 h	+0,66 h
6ème A — Français	5 h	5,81 h	+0,81 h
6ème A — Mathématiques	5 h	5,81 h	+0,81 h
Densité d'emploi du temps
Créneaux occupés sur créneaux disponibles, classe par classe.
6ème A
78,6 %
Conflits d'enseignant
Un enseignant attendu dans deux classes au même moment.
Aucun conflit détecté.
Conflits de salle
Deux classes dans la même salle au même créneau.
Aucun conflit détecté.
Référentiel horaire
Créneaux déclarés par l'établissement, par type.
PAUSE
1
COURS
7
RECREATION
1
```

</details>
