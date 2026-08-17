# Guides utilisateur HorizonEcole — chaîne de production

Sept documents Word illustrés, régénérables en une commande, pour deux
établissements de types différents.

**École primaire — « Groupe Scolaire les Palmiers »**

| Profil de contenu | Document | Écrans | Pages |
|---|---|---|---|
| `admin` | Guide de l’administrateur | 30 | 56 |
| `enseignant` | Guide de l’enseignant | 10 | 23 |
| `parent` | Guide du parent | 5 | 12 |

**Lycée (6ème → Terminale) — « Lycée Moderne de Cocody »**

| Profil de contenu | Document | Écrans | Pages |
|---|---|---|---|
| `lycee-admin` | Guide de l’administrateur | 32 | 57 |
| `lycee-enseignant` | Guide de l’enseignant | 10 | 22 |
| `lycee-parent` | Guide du parent | 6 | 14 |
| `lycee-eleve` | Guide de l’élève | 6 | 15 |
| `lycee-owner` | Guide du propriétaire | 8 | 21 |

Le guide du propriétaire vaut pour **tout type d’établissement** : le menu de
l’espace de pilotage ne dépend pas du cycle. Seule différence, l’écran
« Assiduité » n’existe pas dans une école primaire, où l’appel par séance n’a
pas cours.

Le menu du secondaire est plus fourni : il ajoute le groupe « Pédagogie »
(classes, matières, affectations, coefficients, conduite, moyennes complètes),
les salles de classe et le suivi de l’assiduité séance par séance. Le module
« École Primaire » y disparaît, et réciproquement.

## Régénérer un guide

L'application doit tourner en local (`pnpm dev` à la racine du dépôt, puis
`http://localhost:5173/app/`), et une session doit exister pour le profil visé.

```bash
node scripts/tout.js admin          # chaîne complète
node scripts/tout.js admin --sans-recon   # si l'application n'a pas changé
```

`tout.js` enchaîne : reconnaissance → captures annotées → Word → sommaire et PDF
calculés par Microsoft Word → contrôles automatiques → aperçus de pages.

## Créer et peupler l’établissement de démonstration

Le lycée de démonstration a été créé par l’écran public de l’application, puis
peuplé par script. Pour le recréer de zéro sur une base vide :

```bash
node scripts/0-creer-lycee.js            # aperçu du formulaire, sans rien créer
node scripts/0-creer-lycee.js --creer    # crée l'établissement et son compte admin
node scripts/0-peupler-lycee.js          # année, classe de 6ème, 25 élèves, notes…
node scripts/0-peupler-lycee-suite.js    # notes des 3 trimestres, appels, conduite
node scripts/0-peupler-lycee-bulletins.js # publie les bulletins des 2 premiers trimestres
```

Aucun mot de passe n’est saisi : l’application génère celui de l’administrateur
et l’affiche une seule fois ; les comptes créés par script reçoivent des mots de
passe tirés au hasard, consignés dans `sessions/lycee-comptes.json`. Ces scripts
sont **idempotents** : relancés, ils complètent au lieu de dupliquer.

## Les sessions

Aucun script ne saisit de mot de passe. Deux façons d'ouvrir une session :

```bash
# 1. Interactive : ouvre un Chrome visible, vous vous connectez vous-même.
node scripts/1-session.js admin

# 2. Locale : signe un jeton avec le secret du .env, sans mot de passe.
#    Réservé au poste de développement — jamais sur un serveur distant.
node scripts/1-session-locale.js admin --email groupescolairepalmiers@gmail.com
node scripts/1-session-locale.js enseignant --email drissa.kone@palmiers.edu.ci
node scripts/1-session-locale.js parent
```

Les jetons valent 12 heures. Passé ce délai, relancez la commande.

## Les scripts, dans l'ordre de la chaîne

| Script | Rôle |
|---|---|
| `config.js` | adresse de l'application, fenêtre de référence, dossiers, attente de stabilité |
| `ecrans.js` | catalogue des écrans par profil : chemin, action préalable, cadrage |
| `1-session.js` | session par connexion manuelle (Chrome visible) |
| `1-session-locale.js` | session par jeton signé localement, sans mot de passe |
| `2-recon.js` | relevé automatique : titres, champs, boutons, colonnes, modales |
| `annotation.js` | moteur de pastilles : résolution des cibles, placement, flèches |
| `3-captures.js` | captures brutes puis annotées, en un seul passage |
| `5-word.js` | assemblage du document Word |
| `word-pdf.ps1` | Word recalcule sommaire et pagination, exporte le PDF |
| `docx-lecture.js` | lecture du `.docx` sans dépendance, pour les contrôles |
| `6-verifier.js` | contrôles automatiques de cohérence |
| `pdf-en-images.js` | rend des pages du PDF en PNG, pour les regarder |
| `tout.js` | enchaîne tout ce qui précède |

## Modifier le texte

Tout le texte vit dans `contenu/<profil>.js`, jamais dans les scripts. Un
chapitre est une liste de sections ; une section porte son chapeau, sa fiche
repère, ses légendes, sa procédure et ses encarts.

Les légendes servent deux fois : elles alimentent le tableau du document **et**
disent où poser les pastilles. Le champ `selecteur` accepte :

| Forme | Désigne |
|---|---|
| `texte=Nouvel élève` | un bouton ou un lien par son libellé (ou son `aria-label`) |
| `champ=Nom` | le bloc « étiquette + saisie » d'un formulaire |
| `aria=Voir la fiche` | un élément par son `aria-label` ou son `title` |
| `menu=Inscriptions` | une entrée du menu latéral |
| `groupe=ÉCOLE PRIMAIRE` | un intitulé de section du menu latéral |
| `bloc=Élèves actifs` | la carte contenant ce texte |
| `contient=Statut` | le plus petit élément contenant ce texte |
| `colonne=Montant (CFA)` | un en-tête de colonne |
| `#id`, `.classe` | un sélecteur CSS, en dernier recours |

La casse et les accents sont ignorés. Ajoutez `cote: 'gauche' | 'droite' |
'haut' | 'bas'` pour suggérer un côté ; le moteur en changera de lui-même si la
pastille sortait de l'image, recouvrait une autre pastille ou masquait un
élément commenté par une autre légende.

## Cadrage des écrans très hauts

Une liste de trente élèves donne une image que la réduction à la largeur d'une
page rend illisible. Deux réglages, dans `ecrans.js` :

- `hauteurMax: 1500` — ne montrer que le haut de l'écran ;
- `cadrage: 'bas'` — cadrer la fin de la page (utile pour un bouton
  « Enregistrer » situé sous le dernier élève).

Sans l'un de ces réglages, un dépassement est signalé comme anomalie par
`6-verifier.js` : une troncature doit être un choix, pas un accident.

## Ce que vérifie `6-verifier.js`

- une capture annotée par écran documenté, et aucune image orpheline ;
- toute pastille de l'image a sa ligne de légende, et réciproquement ;
- aucune pastille posée hors du cadre de la capture ;
- numérotation des légendes continue, de 1 à N ;
- fiche repère et procédure présentes sur chaque section ;
- dans le `.docx` : nombre d'images, de titres 1 et 2, de tableaux, sommaire
  non vide, images dans la colonne de texte, texte des légendes réellement
  présent.

## Livrables

```
build/                    les trois .docx, leurs PDF de contrôle et les aperçus
captures-brutes/<profil>/ les captures sans annotation
captures-annotees/<profil>/ les captures avec pastilles et flèches
contenu/<profil>.js       le texte rédigé
recon/<profil>.md         le relevé de l'application, écran par écran
sessions/                 les sessions de travail (à ne pas versionner)
```

## Données personnelles

Les captures contiennent de vrais noms d'élèves, de parents et d'enseignants,
ainsi que des adresses e-mail et des numéros de téléphone. Les trois guides
portent un encart « Diffusion » en page de couverture. **Anonymisez avant toute
diffusion hors de l'école.**
