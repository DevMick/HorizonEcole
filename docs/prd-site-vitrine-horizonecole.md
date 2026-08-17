# PRD — Site vitrine & marketing HorizonEcole

**Document** : Product Requirements Document
**Produit** : `horizonecole.com` — site public de présentation et d'acquisition
**Version** : 1.0
**Date** : 14 août 2026
**Auteur** : équipe produit HorizonEcole
**Statut** : à valider
**Documents liés** :
- `docs/grille_tarifaire_horizonecole.pdf` (source des tarifs — générée par `docs/grille_tarifaire_generate.py`)
- `docs/inventaire-fonctionnalites.md` (périmètre fonctionnel réel de l'application)
- `docs/design-system-horizonecole.md` (design system « Encre & Craie »)
- `nginx/horizonecole.conf` (configuration de service actuelle)

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Contexte et état actuel](#2-contexte-et-état-actuel)
3. [Objectifs et indicateurs de succès](#3-objectifs-et-indicateurs-de-succès)
4. [Cibles et personas](#4-cibles-et-personas)
5. [Positionnement et proposition de valeur](#5-positionnement-et-proposition-de-valeur)
6. [Périmètre](#6-périmètre)
7. [Architecture de l'information](#7-architecture-de-linformation)
8. [Spécification page par page](#8-spécification-page-par-page)
9. [Module tarifs et simulateur de devis](#9-module-tarifs-et-simulateur-de-devis)
10. [Design system du site vitrine](#10-design-system-du-site-vitrine)
11. [Ligne éditoriale et contenus](#11-ligne-éditoriale-et-contenus)
12. [Parcours de conversion et formulaires](#12-parcours-de-conversion-et-formulaires)
13. [Architecture technique et bascule de l'application vers `/app/login`](#13-architecture-technique-et-bascule-de-lapplication-vers-applogin)
14. [SEO, performance, accessibilité](#14-seo-performance-accessibilité)
15. [Analytics et mesure](#15-analytics-et-mesure)
16. [Conformité, mentions légales et données personnelles](#16-conformité-mentions-légales-et-données-personnelles)
17. [Lots de livraison et planning](#17-lots-de-livraison-et-planning)
18. [Critères d'acceptation](#18-critères-dacceptation)
19. [Risques et points ouverts](#19-risques-et-points-ouverts)
20. [Annexes — données tarifaires de référence](#20-annexes--données-tarifaires-de-référence)

---

## 1. Résumé exécutif

HorizonEcole est une application web de gestion scolaire déjà développée et déployée (React 18 + Vite, Express + Prisma + PostgreSQL), couvrant les cycles **primaire, collège et lycée** du marché ivoirien : élèves, inscriptions, notes et bulletins, présences, emploi du temps, frais de scolarité, paie et budget, avec des espaces dédiés Administration, Enseignant, Élève et Parent.

Aujourd'hui, `horizonecole.com` sert **directement l'application** : un visiteur qui découvre le produit tombe sur un écran de connexion. Il n'existe aucune surface commerciale : ni présentation des fonctionnalités, ni tarifs publics, ni demande de démonstration.

Ce document spécifie la création d'un **site vitrine et marketing** servi à la racine du domaine, et la **relocalisation de l'application sous `/app/`**, sa page de connexion devenant `/app/login`.

**En une phrase** : transformer `horizonecole.com` d'un portail de connexion en un canal d'acquisition qui explique, chiffre et déclenche la prise de contact, sans toucher au périmètre fonctionnel de l'application.

**Trois décisions structurantes portées par ce PRD :**

| Décision | Choix retenu | Justification |
|---|---|---|
| Séparation vitrine / application | Deux applications distinctes, un seul domaine, un seul nginx | Le site vitrine doit être statique et indexable ; l'application est une SPA authentifiée. Les mélanger dégraderait le SEO et le temps de chargement. |
| Emplacement de l'application | `/app/*`, connexion sur `/app/login` | Racine libérée pour le marketing ; frontière lisible entre public et privé ; redirections 301 depuis les anciennes URL. |
| Traitement des tarifs | Publication complète + simulateur interactif | Sur ce marché, l'opacité tarifaire fait perdre le lead au profit du concurrent qui affiche ses prix. La grille existe déjà et est cohérente : autant en faire un outil de qualification. |

---

## 2. Contexte et état actuel

### 2.1 L'application existante

| Couche | Technologie constatée dans le code |
|---|---|
| Monorepo | pnpm workspaces — `apps/api`, `apps/web`, `packages/{types,config,database}` |
| Frontend | React 18, Vite 5, Ant Design 5, Tailwind 3, React Router 6, Zustand, TanStack Query |
| Backend | Node.js, Express 4, TypeScript — `apps/api/src/index.ts`, port 4001 |
| Base de données | PostgreSQL via Prisma 5 |
| Authentification | JWT (access token en `localStorage`) + refresh token en base |
| Génération documentaire | PDFKit, Puppeteer, docxtemplater (bulletins, reçus, états) |
| Service | nginx — SPA servie depuis `/var/www/horizonecole/apps/web/dist`, proxy vers `localhost:4001` pour `/api`, `/auth`, `/uploads`, `/api-docs` |

Le périmètre fonctionnel réel, tel qu'inventorié dans `docs/inventaire-fonctionnalites.md` et lisible dans `apps/api/src/routes/` (plus de 55 routeurs REST), couvre :

- **Scolarité** : élèves, parents, inscriptions, années scolaires, trimestres et semestres, classes, matières, coefficients, salles, affectations enseignant↔classe, professeurs principaux.
- **Pédagogie** : types d'évaluation, saisie de notes, moyennes pondérées, bulletins PDF, bilans de période, notes de conduite, module primaire dédié (compositions, bilan annuel, passage de classe).
- **Vie scolaire** : appel et sessions de présence, absences élèves et enseignants, rattrapages, discipline et sanctions, emploi du temps et exceptions.
- **Finance** : frais de scolarité, échéanciers, conditions et types de paiement, encaissements et reçus, factures, revenus et dépenses, lignes budgétaires et transactions.
- **RH et paie** : personnel, salaires, heures effectuées des enseignants, rémunération, contrats.
- **Transverse** : utilisateurs, rôles et droits, journal d'audit, paramètres d'établissement, tableau de bord, documents joints.

**Quatre espaces utilisateurs** sont implémentés : Administration, Enseignant, Élève, Parent — chacun avec sa navigation et son accent de couleur propre.

### 2.2 Ce qui manque

1. **Aucune surface publique.** `horizonecole.com` affiche `LoginPage`. Un directeur d'école qui reçoit le lien ne voit rien du produit.
2. **Aucun tarif public.** La grille tarifaire existe sous forme de PDF commercial, transmis manuellement. Elle n'est ni consultable ni simulable en ligne.
3. **Aucun contenu de réassurance.** Rien sur l'hébergement, la sécurité, la propriété des données, la réversibilité — précisément les objections d'un établissement qui confie ses dossiers d'élèves à un tiers.
4. **Aucun canal de captation.** Pas de formulaire de démonstration, pas de demande de devis, pas de contenu indexable.
5. **Une porte d'entrée publique mal cadrée** : `/creer-etablissement` est accessible sans authentification (c'est nécessaire — c'est par elle qu'un établissement entre dans l'application) mais elle n'est reliée à aucun parcours commercial.

### 2.3 Contraintes reprises telles quelles

- Le site vitrine et l'application partagent **un domaine unique** et **un seul certificat TLS**.
- L'API reste servie sur les mêmes préfixes (`/api`, `/auth`, `/uploads`, `/api-docs`) : **aucune modification côté `apps/api`** n'est requise par ce projet.
- La bascule vers `/app/` ne doit **casser aucun lien existant** : les utilisateurs actuels ont `horizonecole.com/login` et des pages profondes en favori.
- L'identité visuelle du site vitrine dérive du design system « Encre & Craie » déjà en place : le prospect qui voit une démonstration doit reconnaître le produit.

---

## 3. Objectifs et indicateurs de succès

### 3.1 Objectifs produit

| # | Objectif | Description |
|---|---|---|
| O1 | **Expliquer** | Un directeur d'établissement doit comprendre en moins de 90 secondes ce que fait HorizonEcole et si cela s'applique à son cycle. |
| O2 | **Chiffrer** | Il doit obtenir un ordre de prix pour son établissement sans parler à personne. |
| O3 | **Rassurer** | Il doit trouver des réponses explicites sur l'hébergement, la sécurité, la propriété et la réversibilité de ses données. |
| O4 | **Convertir** | Il doit pouvoir demander une démonstration ou un devis en moins de 60 secondes. |
| O5 | **Servir les utilisateurs existants** | Un utilisateur connu doit atteindre sa page de connexion en un clic depuis n'importe quelle page. |
| O6 | **Être trouvable** | Le site doit ressortir sur les requêtes « logiciel gestion scolaire Côte d'Ivoire », « logiciel bulletins scolaires », « gestion des frais de scolarité école privée ». |

### 3.2 Indicateurs

| Indicateur | Cible à 3 mois | Cible à 12 mois | Mesure |
|---|---|---|---|
| Visiteurs uniques mensuels | 800 | 4 000 | Analytics |
| Taux de conversion visiteur → lead qualifié | 2,5 % | 4 % | Formulaires soumis / visiteurs |
| Demandes de démonstration par mois | 20 | 90 | CRM |
| Utilisation du simulateur tarifaire | 25 % des visiteurs de `/tarifs` | 40 % | Événement analytics |
| Simulateur → demande de devis | 15 % | 25 % | Entonnoir |
| Position moyenne sur les 3 requêtes cibles | top 20 | top 5 | Search Console |
| LCP mobile (4G, Abidjan) | < 2,5 s | < 2,0 s | Lighthouse / CrUX |
| Taux de rebond page d'accueil | < 60 % | < 45 % | Analytics |
| Erreurs 404 sur anciennes URL applicatives | 0 | 0 | Logs nginx |

---

## 4. Cibles et personas

### 4.1 Marché adressé

Établissements scolaires **privés et confessionnels de Côte d'Ivoire** (Abidjan en priorité, puis Bouaké, Yamoussoukro, San-Pédro, Daloa, Korhogo), des trois cycles :

- **Primaire** : CP1 à CM2
- **Collège** : 6ᵉ à 3ᵉ, préparation BEPC
- **Lycée** : 2nde à Terminale, séries A, C et D, préparation BAC

Cible secondaire : **groupes scolaires multi-sites** et **établissements publics, confessionnels et associatifs** (éligibles au tarif solidaire).

### 4.2 Personas

#### P1 — Le Fondateur / Promoteur *(décideur économique)*

- **Profil** : propriétaire d'un ou plusieurs établissements privés, 300 à 1 500 élèves. Souvent non technicien.
- **Douleurs** : ne sait pas en temps réel combien de frais de scolarité restent impayés ; découvre les trous de trésorerie trop tard ; les bulletins mobilisent l'équipe pendant deux semaines par trimestre.
- **Questions** : « Combien ça coûte ? », « Est-ce que mes données sont chez moi ou chez vous ? », « Combien de temps pour être opérationnel ? »
- **Ce que le site doit lui donner** : un prix, une preuve de sérieux, une trajectoire de mise en service.
- **Pages prioritaires** : Accueil → Tarifs → Simulateur → Devis.

#### P2 — Le Directeur / Chef d'établissement *(décideur opérationnel)*

- **Profil** : pilote le quotidien pédagogique, arbitre les outils, forme les équipes.
- **Douleurs** : registres papier, tableurs incohérents entre secrétariat et enseignants ; calcul manuel des moyennes et des rangs ; parents non informés des absences.
- **Questions** : « Est-ce que mes enseignants sauront s'en servir ? », « Les coefficients par série sont-ils gérés ? », « Le bulletin ressemble-t-il au nôtre ? »
- **Ce que le site doit lui donner** : des captures d'écran réelles, le détail par espace, la promesse de formation.
- **Pages prioritaires** : Fonctionnalités → Espace Enseignant → Démonstration.

#### P3 — L'Économe / Responsable financier

- **Profil** : suit les encaissements, relance les familles, prépare le budget.
- **Douleurs** : échéanciers tenus sur cahier ; reçus manuscrits ; aucune vision consolidée du recouvrement.
- **Questions** : « Gère-t-il les échéanciers personnalisés ? », « Peut-on éditer un reçu ? », « Orange Money et Wave sont-ils pris en compte ? »
- **Ce que le site doit lui donner** : la page Finance & Scolarité, avec captures.
- **Pages prioritaires** : Fonctionnalités > Finance → Tarifs.

#### P4 — Le Responsable informatique *(prescripteur technique, présent surtout dans les grands groupes)*

- **Profil** : gère le parc et le serveur local, parfois prestataire externe.
- **Douleurs** : dépendance à un fournisseur, absence de sauvegardes, données non exportables.
- **Questions** : « Quels prérequis serveur ? », « Comment sont faites les sauvegardes ? », « Puis-je exporter la base ? »
- **Ce que le site doit lui donner** : la page Déploiement & Sécurité, les prérequis techniques explicites, l'engagement de réversibilité.
- **Pages prioritaires** : Déploiement → Sécurité → FAQ technique.

#### P5 — Le Parent / l'Élève *(utilisateur final, non décideur)*

- **Profil** : arrive sur le site parce que son école lui a donné le lien.
- **Besoin unique** : **se connecter**.
- **Ce que le site doit lui donner** : un bouton « Se connecter » visible sur toutes les pages, menant à `/app/login`, sans jamais devoir lire une page marketing.

---

## 5. Positionnement et proposition de valeur

### 5.1 Positionnement

> **HorizonEcole — le logiciel de gestion scolaire pensé pour les établissements ivoiriens.**
> Du CP1 à la Terminale : inscriptions, notes, bulletins, présences et frais de scolarité dans un seul outil. Hébergé par nous ou installé sur votre serveur — vos données restent les vôtres.

### 5.2 Ce qui nous différencie *(à traduire en blocs de page d'accueil)*

| Différenciateur | Formulation publique | Preuve à afficher |
|---|---|---|
| **Conçu pour le système ivoirien** | Compositions, moyennes et rangs, coefficients par série A/C/D, conseil de classe, préparation BEPC et BAC | Capture d'un bulletin réel, nomenclature des classes |
| **Les trois cycles, un seul outil** | Un groupe scolaire pilote primaire, collège et lycée depuis la même direction | Page Modules par cycle + remise multi-cycles |
| **Vous choisissez où vivent vos données** | Notre cloud, ou votre serveur dans votre établissement | Comparatif des deux modes, prérequis techniques |
| **Les parents suivent en temps réel** | Notes, absences, bulletins et situation de paiement, depuis un téléphone | Capture de l'espace parent en mobile |
| **La scolarité et la caisse au même endroit** | Échéanciers, encaissements, reçus, relances — sans tableur parallèle | Capture du suivi de recouvrement |
| **Prix affichés** | Grille publique en FCFA, simulateur en ligne | Page Tarifs complète |
| **Réversibilité garantie** | Export complet SQL et PDF, à tout moment, sans frais | Engagement écrit sur la page Sécurité |
| **Accompagnement sur site** | Installation, reprise de données, formation des équipes à Abidjan | Détail des frais de mise en service |

### 5.3 Messages clés par persona

| Persona | Accroche |
|---|---|
| Fondateur | « Sachez, chaque matin, combien il reste à encaisser. » |
| Directeur | « Les bulletins du trimestre en une après-midi, pas en deux semaines. » |
| Économe | « Chaque échéance suivie, chaque reçu édité, chaque relance tracée. » |
| Responsable IT | « Sur notre cloud ou sur votre serveur. Vos données restent exportables. » |
| Parent | « Les notes et les absences de votre enfant, dans votre poche. » |

### 5.4 Objections à traiter explicitement

| Objection | Où elle est traitée |
|---|---|
| « C'est trop cher pour mon école. » | Repères coût par élève (< 1 500 FCFA/élève/an) + tarif solidaire + simulateur |
| « Nos enseignants ne sont pas informatisés. » | Page Accompagnement : journées de formation incluses, support renforcé la 1ʳᵉ année |
| « Et si Internet tombe ? » | Mode serveur local, fonctionnement sur réseau interne |
| « Nos données vont-elles nous échapper ? » | Page Sécurité : propriété, cloisonnement, export |
| « Et si vous disparaissez ? » | Réversibilité, export SQL, absence d'enfermement propriétaire |
| « On a déjà des fichiers Excel. » | Reprise des données incluse dans la mise en service |

---

## 6. Périmètre

### 6.1 Dans le périmètre

- Site vitrine public multi-pages, servi à la racine de `horizonecole.com`.
- Simulateur tarifaire interactif entièrement côté client.
- Formulaires de demande de démonstration, de devis et de contact, avec envoi par e-mail.
- Section ressources / blog (moteur de contenu Markdown, sans back-office).
- Pages légales.
- **Relocalisation de l'application sous `/app/`**, connexion sur `/app/login`, avec redirections 301 des anciennes URL.
- Adaptation de la configuration nginx et du pipeline de déploiement.

### 6.2 Hors périmètre

- Toute modification fonctionnelle de l'application (aucun changement de routeur API, de modèle Prisma ou de règle métier).
- Refonte du design system applicatif.
- Espace client / portail de facturation en self-service.
- Paiement en ligne de l'abonnement.
- Création de compte établissement en autonomie depuis le site vitrine — la page `/creer-etablissement` existante reste sous `/app/` et n'est pas exposée dans la navigation publique (elle reste accessible par lien direct, transmis après signature).
- Multilingue (anglais) — prévu en évolution, structuré dès la conception mais non livré en v1.
- CMS avec interface d'administration.

### 6.3 Hypothèses

- Le domaine `horizonecole.com` est actif, avec certificat Let's Encrypt en place.
- Une adresse e-mail de réception des demandes commerciales existe (à confirmer : `commercial@horizonecole.com`).
- Des captures d'écran de l'application avec **données de démonstration anonymisées** peuvent être produites (jamais de données d'élèves réels).
- Aucun établissement client ne peut être cité nommément sans autorisation écrite : la v1 part **sans témoignages nominatifs**.

---

## 7. Architecture de l'information

### 7.1 Arborescence

```
horizonecole.com/
│
├── /                              Accueil
│
├── /fonctionnalites               Vue d'ensemble des fonctionnalités
│   ├── /administration            Espace Administration
│   ├── /enseignants               Espace Enseignant
│   ├── /eleves-parents            Espace Élève & Parent
│   ├── /scolarite-finances        Frais, échéanciers, encaissements, budget
│   ├── /bulletins-notes           Évaluations, moyennes, bulletins
│   ├── /presences-vie-scolaire    Appel, absences, discipline, emploi du temps
│   └── /paie-personnel            Paie & RH (module optionnel)
│
├── /cycles                        Les trois modules
│   ├── /primaire                  Module École primaire — CP1 à CM2
│   ├── /college                   Module Collège — 6ᵉ à 3ᵉ
│   └── /lycee                     Module Lycée — 2nde à Terminale
│
├── /tarifs                        Grille tarifaire + simulateur
│   ├── /tarifs/simulateur         Simulateur plein écran (ancre profonde)
│   └── /tarifs/conditions         Conditions commerciales détaillées
│
├── /deploiement                   Cloud HorizonEcole vs serveur local
├── /securite                      Sécurité, données, réversibilité
├── /accompagnement                Mise en service, formation, assistance
│
├── /demonstration                 Demande de démonstration (formulaire)
├── /devis                         Demande de devis (formulaire, pré-rempli par le simulateur)
├── /contact                       Contact général
│
├── /ressources                    Index des ressources
│   ├── /ressources/guides         Guides pratiques
│   ├── /ressources/blog           Articles
│   └── /ressources/faq            Questions fréquentes
│
├── /a-propos                      L'entreprise, l'équipe, la démarche
│
├── /mentions-legales
├── /confidentialite               Politique de protection des données
├── /cgv                           Conditions générales de vente
│
└── /app/                          ══ APPLICATION (SPA existante) ══
    ├── /app/login                 Connexion  ← cible de tous les CTA « Se connecter »
    ├── /app/creer-etablissement   Création d'établissement (non listée publiquement)
    └── /app/*                     Toutes les routes applicatives existantes
```

### 7.2 Navigation principale

```
[Logo HorizonEcole]   Fonctionnalités ▾   Cycles ▾   Tarifs   Déploiement   Ressources ▾
                                                        [ Se connecter ]  [ Demander une démo ]
```

- **Fonctionnalités ▾** — méga-menu à trois colonnes : *Par espace* (Administration, Enseignants, Élèves & Parents) · *Par domaine* (Scolarité & finances, Bulletins & notes, Présences & vie scolaire, Paie & personnel) · *Encart* « Voir l'application en démonstration ».
- **Cycles ▾** — menu simple : Primaire · Collège · Lycée.
- **`Se connecter`** — bouton secondaire (contour), pointe vers `/app/login`. **Présent sur 100 % des pages, en en-tête et en pied de page.** C'est le chemin des utilisateurs existants : il ne doit jamais être relégué dans un menu déroulant.
- **`Demander une démo`** — bouton primaire, pointe vers `/demonstration`.
- **Mobile** : menu en tiroir plein écran ; les deux boutons restent visibles dans la barre supérieure (`Se connecter` en icône + libellé court).

### 7.3 Pied de page

Quatre colonnes + bandeau légal :

| Produit | Cycles | Ressources | Entreprise |
|---|---|---|---|
| Fonctionnalités | Primaire | Guides | À propos |
| Tarifs | Collège | Blog | Contact |
| Déploiement | Lycée | FAQ | Demander une démo |
| Sécurité | | | **Se connecter** |
| Accompagnement | | | |

Bandeau : logo · « Logiciel de gestion scolaire — Abidjan, Côte d'Ivoire » · téléphone · e-mail · WhatsApp · Mentions légales · Confidentialité · CGV · © 2026.

---

## 8. Spécification page par page

Convention de lecture : chaque bloc est décrit par son **objectif**, son **contenu** et ses **règles**. Les textes entre guillemets sont des propositions de copie, à valider éditorialement.

---

### 8.1 Accueil — `/`

**Objectif** : qualifier le visiteur en moins de 10 secondes et l'orienter vers Tarifs, Fonctionnalités ou Connexion.

| # | Bloc | Contenu |
|---|---|---|
| 1 | **Héros** | H1 : « Le logiciel de gestion scolaire pensé pour les établissements ivoiriens ». Sous-titre : « Du CP1 à la Terminale : inscriptions, notes, bulletins, présences et frais de scolarité dans un seul outil. Hébergé par nous ou installé sur votre serveur. » CTA primaire `Demander une démonstration`, CTA secondaire `Voir les tarifs`. Visuel : capture du tableau de bord Administration, en cadre navigateur, avec données de démonstration. |
| 2 | **Bandeau de réassurance** | Quatre repères chiffrés : « 3 cycles couverts » · « 4 espaces utilisateurs » · « Moins de 1 500 FCFA / élève / an » · « Vos données exportables à tout moment ». |
| 3 | **Le problème** | Trois constats en cartes : registres papier et tableurs dispersés · bulletins calculés à la main · impayés découverts trop tard. Ton factuel, sans dramatisation. |
| 4 | **Les quatre espaces** | Grille 2×2 — Administration (bleu-encre), Enseignant (vert-tableau), Élève, Parent. Chaque carte : icône, titre, 3 puces, lien « En savoir plus ». |
| 5 | **Fonctionnalités phares** | Six cartes : Inscriptions & dossiers · Notes & bulletins PDF · Appel & absences · Emploi du temps · Frais de scolarité & reçus · Rôles, droits & journal d'audit. |
| 6 | **Choisissez votre hébergement** | Comparatif à deux colonnes, repris de la grille tarifaire : *Cloud HorizonEcole* vs *Serveur local de l'établissement*. Lien vers `/deploiement`. |
| 7 | **Aperçu tarifaire** | Trois cartes de repère par élève (École primaire 300 élèves · Collège 450 élèves · Lycée 800 élèves) avec les deux montants FCFA/élève/an. CTA `Simuler mon tarif`. |
| 8 | **Par cycle** | Trois vignettes Primaire / Collège / Lycée, avec la spécificité de chacun. |
| 9 | **Accompagnement** | « Nous ne livrons pas un logiciel, nous mettons une école en service. » Trois étapes : Paramétrage & reprise des données → Formation des équipes → Accompagnement du premier trimestre. |
| 10 | **FAQ courte** | Cinq questions, repliables, avec lien vers la FAQ complète. |
| 11 | **CTA final** | « Voyons ensemble ce que cela donnerait dans votre établissement. » Deux CTA : `Demander une démonstration` · `Obtenir un devis`. Mention : « Réponse sous 48 h ouvrées. » |

**Règles** :
- Le premier écran doit être lisible et interactif **sans JavaScript**.
- Le visuel du héros est servi en AVIF/WebP avec `width`/`height` explicites (pas de décalage de mise en page).
- Aucun chiffre de vanité inventé (« 200 écoles nous font confiance ») tant qu'il n'est pas vrai.

---

### 8.2 Fonctionnalités — `/fonctionnalites`

**Objectif** : prouver la profondeur fonctionnelle et distribuer vers les pages de détail.

- **Héros** : « Tout ce que gère une école, dans un seul outil. »
- **Sélecteur de vue** : bascule *Par espace* / *Par domaine*.
- **Vue par espace** : trois sections (Administration, Enseignant, Élève & Parent) reprenant les listes exactes de la grille tarifaire :
  - *Administration* : élèves et parents · inscriptions · classes et matières · années scolaires et périodes · emploi du temps et salles · absences et discipline · frais de scolarité, échéanciers et reçus · bulletins PDF · utilisateurs, rôles et droits · journal d'audit · tableau de bord.
  - *Enseignant* : saisie des notes par évaluation · coefficients et moyennes pondérées · appel et feuille de présence · notes de conduite · suivi de classe et professeur principal · bilan de période · emploi du temps personnel · documents pédagogiques.
  - *Élève & Parent* : notes et moyennes en temps réel · bulletins en ligne · absences et retards · emploi du temps de la classe · situation des paiements · comptes sécurisés individuels.
- **Vue par domaine** : cartes vers les 7 sous-pages.
- **Tableau récapitulatif** : fonctionnalité × inclusion (Inclus dans l'abonnement / Module optionnel), pour lever toute ambiguïté sur Paie et Budget.

**Sous-pages (structure commune)** : héros contextualisé → 3 à 5 blocs « capture + explication » en alternance gauche/droite → encart « Ce que cela change au quotidien » → liens croisés → CTA démonstration.

Détail des sous-pages :

| Page | Contenu central |
|---|---|
| `/fonctionnalites/administration` | Dossier élève complet, inscriptions et réinscriptions, année scolaire et périodes, classes et effectifs, rôles et droits fins, journal d'audit, paramètres d'établissement |
| `/fonctionnalites/enseignants` | Saisie de notes en rafale (clavier/tactile), coefficients, moyennes et rangs, appel, conduite, emploi du temps personnel, bilan de période |
| `/fonctionnalites/eleves-parents` | Consultation des notes, bulletins en ligne, absences, emploi du temps, situation de paiement — vue mobile mise en avant |
| `/fonctionnalites/scolarite-finances` | Grille de frais, échéanciers standards et personnalisés, encaissements, reçus, factures, revenus/dépenses, lignes budgétaires, tableau de trésorerie |
| `/fonctionnalites/bulletins-notes` | Types d'évaluation, coefficients par matière et par série, moyennes pondérées, rangs, bulletins PDF, bilans de période et annuel, passage en classe supérieure |
| `/fonctionnalites/presences-vie-scolaire` | Sessions d'appel, absences et retards, sessions non appelées, rattrapages, discipline et sanctions, emploi du temps et exceptions |
| `/fonctionnalites/paie-personnel` | Personnel, contrats, barème d'ancienneté, heures effectuées, acomptes et prorata, bulletins de paie — **signalé comme module optionnel à 200 000 FCFA/an** |

---

### 8.3 Cycles — `/cycles/{primaire|college|lycee}`

**Objectif** : montrer que le produit parle la langue du cycle, et amener au tarif correspondant.

Structure commune :

1. **Héros** — « HorizonEcole pour l'école primaire » / « pour le collège » / « pour le lycée ».
2. **Ce qui est spécifique au cycle** :
   - *Primaire* : CP1 à CM2 · compositions · moyennes et rangs · bilan annuel · passage en classe supérieure · interface enseignant simplifiée (classe unique).
   - *Collège* : 6ᵉ à 3ᵉ · notes trimestrielles · coefficients par matière · conseil de classe · préparation BEPC.
   - *Lycée* : 2nde à Terminale · séries A, C et D · coefficients par série · orientation · préparation BAC.
3. **Captures d'écran** du parcours emblématique du cycle.
4. **Tableau tarifaire du cycle** — les 4 tranches, colonnes Cloud et Serveur local, prix 1ʳᵉ année et années suivantes (données en annexe §20).
5. **Encart multi-cycles** : « Vous gérez plusieurs cycles ? Remise de 15 % à 25 % et un seul hébergement. » → `/tarifs`.
6. **CTA** : `Demander une démonstration adaptée à mon cycle` (le cycle est passé en paramètre au formulaire).

---

### 8.4 Tarifs — `/tarifs`

**Objectif** : la page la plus importante du site après l'accueil. Elle doit produire un chiffre et une intention.

| # | Bloc | Contenu |
|---|---|---|
| 1 | **Héros** | « Nos tarifs, en clair. » Sous-titre : « Prix en FCFA (XOF) hors taxes. Abonnement annuel, résiliable à la fin de chaque année scolaire. Mises à jour, support et évolutions inclus. » |
| 2 | **Simulateur** | Composant central — spécifié en §9. Placé **au-dessus** des tableaux : le visiteur veut son prix, pas la grille entière. |
| 3 | **Ce que comprend l'abonnement** | Les trois colonnes Administration / Enseignant / Élève & Parent, identiques à la grille PDF. |
| 4 | **Deux modes de déploiement** | Comparatif Cloud / Serveur local, avec inclus et à-charge-du-client. Lien vers `/deploiement`. |
| 5 | **Repères par élève** | Trois cartes chiffrées. Mention : « Le budget logiciel reste inférieur à 1 % des frais de scolarité encaissés par un établissement privé ivoirien. » |
| 6 | **Tableaux par module** | Trois tableaux (Primaire, Collège, Lycée), 4 tranches chacun, colonnes *Hébergement HorizonEcole* et *Serveur local du client*, avec pour chaque : **prix 1ʳᵉ année** (grand) et **abonnement des années suivantes** (petit). Sur mobile : transformation en cartes empilables, jamais de scroll horizontal. |
| 7 | **Formules d'hébergement Cloud** | Tableau des 5 formules (Mutualisé, Dédié S/M/L/XL) avec ressources, capacité et part hébergement. Bloc repliable — c'est un détail technique. |
| 8 | **Frais de mise en service** | Tableau des 4 tranches × 2 modes, avec les prestations comprises. Mention : « Déjà compris dans le prix de 1ʳᵉ année affiché ci-dessus. » |
| 9 | **Packs multi-cycles** | Tableau des 4 configurations avec remises et exemples chiffrés. |
| 10 | **Contrats d'assistance** | Tableau Standard / Renforcée / Premium × 6, 12, 24 mois. |
| 11 | **Options** | Tableau des 8 prestations complémentaires. |
| 12 | **Conditions commerciales** | Huit blocs : facturation, échéancier, moyens de paiement, paiement pluriannuel, tarif solidaire, assistance, révision des prix, réversibilité. |
| 13 | **FAQ tarifaire** | 8 questions ciblées (voir §11.4). |
| 14 | **CTA final** | `Obtenir un devis précis` — pré-rempli par la simulation en cours. |

**Règles impératives** :
- **Une seule source de vérité tarifaire** : un fichier `pricing.ts` / `pricing.json` alimente à la fois le simulateur, les tableaux et le PDF téléchargeable. Aucun montant ne doit être écrit en dur dans une page.
- Mention permanente en pied de page tarifaire : « Prix en FCFA (XOF) hors taxes. TVA de 18 % en sus si l'établissement y est assujetti. Grille mise à jour en août 2026, valable pour l'année scolaire en cours. »
- Bouton `Télécharger la grille tarifaire (PDF)` → `docs/grille_tarifaire_horizonecole.pdf`, servi depuis `/documents/grille-tarifaire-horizonecole.pdf`.
- Le libellé « à partir de » est proscrit sur cette page : les prix sont fermes par tranche.

---

### 8.5 Déploiement — `/deploiement`

**Objectif** : lever l'objection « où sont mes données » et qualifier le mode d'hébergement avant l'entretien commercial.

1. **Héros** : « Notre cloud, ou votre serveur. À vous de choisir. »
2. **Comparatif détaillé** — tableau à deux colonnes :

| Critère | Cloud HorizonEcole | Serveur local |
|---|---|---|
| Serveur | Fourni et exploité par nous (VPS dimensionné) | Fourni par l'établissement |
| Nom de domaine & SSL | Inclus | Option 30 000 FCFA/an |
| Sauvegardes | Quotidiennes, conservées 30 jours, externalisées | Script local fourni ; externalisation en option (80 000 FCFA/an) |
| Supervision | Incluse | À la charge du client |
| Mises à jour | Appliquées par nos soins | Livrées à distance |
| Accès parents à distance | Immédiat | Nécessite une ouverture réseau |
| Électricité / onduleur / réseau | Sans objet | À la charge du client |
| Prérequis | Connexion Internet | 4 vCPU · 8 Go RAM · 100 Go SSD · Ubuntu Server 22.04+ |
| Impact tarifaire | Part hébergement incluse dans le prix | Part hébergement non facturée |

3. **Les cinq formules Cloud** — tableau des ressources et capacités, avec la règle de dimensionnement selon l'effectif.
4. **Aide au choix** : mini-questionnaire (3 questions : avez-vous un service informatique ? un serveur ? les parents doivent-ils accéder à distance ?) → recommandation.
5. **Ce qui est inclus dans les deux cas** : comptes protégés par mot de passe chiffré, cloisonnement strict des données entre établissements, journal des accès, HTTPS, mises à jour fonctionnelles de l'année en cours.
6. **CTA** : `Parler à un technicien`.

---

### 8.6 Sécurité & données — `/securite`

**Objectif** : page de réassurance, courte, factuelle, sans jargon marketing.

Sections :

1. **Qui possède les données** — « Les données appartiennent à l'établissement. » Engagement de réversibilité : export complet (SQL et PDF), à tout moment, sans frais.
2. **Cloisonnement multi-établissements** — chaque établissement dispose d'un périmètre de données strictement séparé.
3. **Comptes et accès** — mots de passe chiffrés (bcrypt), sessions à jeton, rôles et droits par profil, journal d'audit des actions sensibles.
4. **Transport** — HTTPS obligatoire, certificat TLS, en-têtes de sécurité (HSTS, X-Content-Type-Options, X-Frame-Options).
5. **Sauvegardes et restauration** — quotidiennes en mode cloud, conservation 30 jours, restauration en cas d'incident.
6. **Mises à jour** — correctives et fonctionnelles incluses dans l'abonnement.
7. **Données des mineurs** — engagement d'usage strictement scolaire, aucune revente, aucune exploitation publicitaire.
8. **En cas de fin de contrat** — export fourni, puis suppression des données sur demande écrite.

**Règle** : cette page ne promet **que ce qui est effectivement implémenté**. Toute mention de certification (ISO, SOC) est interdite tant qu'elle n'est pas obtenue. Toute affirmation doit être vérifiable dans le code ou dans le contrat.

---

### 8.7 Accompagnement — `/accompagnement`

1. **Héros** : « Une école mise en service, pas un logiciel livré. »
2. **Les 4 étapes de mise en service** : Paramétrage de l'année scolaire → Reprise des données existantes → Création des comptes → Formation des équipes.
3. **Le contenu de la formation selon la tranche** : 1, 2, 3 ou 5 journées.
4. **Les trois formules d'assistance** : Standard (incluse), Renforcée, Premium — canaux, horaires, délais de prise en charge, visites sur site.
5. **Calendrier type d'un déploiement** — frise : signature → J+15 paramétrage → J+30 formation → rentrée → accompagnement du 1ᵉʳ trimestre.
6. **CTA** : `Planifier une mise en service`.

---

### 8.8 Formulaires — `/demonstration`, `/devis`, `/contact`

Spécification détaillée en §12.

---

### 8.9 Ressources — `/ressources/*`

- **Index** : trois entrées (Guides, Blog, FAQ) + les 3 contenus les plus récents.
- **Guides** (contenus fondateurs, à produire au lot 3) :
  1. *Réussir l'informatisation de son établissement : checklist en 12 points*
  2. *Calculer les moyennes et les rangs : ce que dit la réglementation, ce que fait le logiciel*
  3. *Recouvrer les frais de scolarité sans se fâcher avec les familles*
  4. *Préparer sa rentrée scolaire : le rétroplanning de l'administration*
- **Blog** : articles courts, cadence cible d'un article toutes les trois semaines.
- **FAQ** : 25 à 30 questions, regroupées en 5 catégories (Produit, Tarifs, Déploiement, Données & sécurité, Accompagnement), avec balisage `FAQPage` en JSON-LD.

**Moteur** : fichiers Markdown avec frontmatter (`title`, `description`, `date`, `category`, `author`, `cover`, `draft`), compilés au build. Pas de base de données, pas d'interface d'administration.

---

### 8.10 À propos — `/a-propos`

Histoire du produit, ancrage abidjanais, démarche (le logiciel est né d'un besoin réel d'établissement), engagement de support local, coordonnées physiques. Page courte, sans emphase.

---

### 8.11 Pages légales

- `/mentions-legales` — éditeur, hébergeur, directeur de publication, contact, RCCM.
- `/confidentialite` — nature des données collectées sur le **site vitrine** (formulaires, mesure d'audience), finalités, durée de conservation, droits d'accès et de suppression, contact. Distinction explicite avec les données traitées **dans l'application** pour le compte des établissements (nous y sommes sous-traitant, pas responsable de traitement).
- `/cgv` — reprise structurée des conditions commerciales de la grille tarifaire.

---

## 9. Module tarifs et simulateur de devis

### 9.1 Objectif

Permettre à un visiteur d'obtenir, en moins de 60 secondes et sans contact humain, **le budget de première année et l'abonnement des années suivantes** pour son établissement, puis de transformer ce résultat en demande de devis.

### 9.2 Parcours

```
Étape 1  Quel(s) cycle(s) gérez-vous ?         [Primaire] [Collège] [Lycée]   (multi-sélection)
Étape 2  Combien d'élèves par cycle ?          champ numérique par cycle sélectionné
Étape 3  Où souhaitez-vous héberger ?          (•) Cloud HorizonEcole  ( ) Notre serveur
Étape 4  Votre établissement est…              ( ) Privé  ( ) Public / confessionnel / associatif
Étape 5  Options souhaitées                    cases à cocher (Paie, Budget, SMS, Sauvegarde…)
Étape 6  Assistance                            (•) Standard  ( ) Renforcée  ( ) Premium
                                               → si non-Standard : durée 6 / 12 / 24 mois
Étape 7  Paiement                              ( ) Annuel  ( ) 2 ans d'avance  ( ) 3 ans d'avance
─────────────────────────────────────────────────────────────────────────────────────────
RÉSULTAT   Budget 1ʳᵉ année : X XXX XXX FCFA HT
           Puis Y YYY YYY FCFA / an
           Soit Z FCFA / élève / an
           [Détail du calcul ▾]   [Obtenir ce devis par e-mail]   [Télécharger en PDF]
```

Les étapes sont affichées **sur une seule page**, en colonne, avec un panneau de résultat **collant** (sticky) sur la droite en desktop et en bas d'écran en mobile. Le résultat se recalcule à chaque changement, sans bouton « Calculer ».

### 9.3 Algorithme de calcul

**Deux invariants vérifiés sur les 24 lignes de la grille** :

1. `prix 1ʳᵉ année = abonnement annuel + frais de mise en service`
2. `abonnement Cloud = abonnement Serveur local + part hébergement de la formule`

Le second invariant est **structurant pour le calcul multi-cycles**. La grille énonce qu'« un établissement qui exploite plusieurs cycles ne paie qu'un seul hébergement », mais la colonne Cloud contient déjà la part hébergement de *chaque* cycle. Additionner deux abonnements Cloud facture donc l'hébergement deux fois. Le calcul doit se faire **sur la base locale** (part logicielle pure), puis ajouter une seule part hébergement, dimensionnée sur l'effectif total.

Le simulateur applique donc :

```
POUR CHAQUE cycle sélectionné :
    tranche      ← résoudreTranche(cycle, effectif)
    logiciel     ← TARIFS[cycle][tranche].local.recurrent   ← TOUJOURS la base locale
    miseEnService← MISE_EN_SERVICE[tranche][mode]

logicielBrut    ← Σ logiciel
remisePack      ← 0 %                si 1 cycle
                  15 %               si 2 cycles
                  25 %               si 3 cycles
logicielPack    ← logicielBrut × (1 − remisePack)

SI mode = cloud :
    # La formule se résout PAR TRANCHE sur l'effectif total, et non par capacité :
    # on lit la tranche qu'appellerait l'effectif cumulé, puis la formule que la
    # grille lui associe. En pack mixte (primaire + secondaire), les bornes de
    # tranche diffèrent d'une table à l'autre : retenir la formule la plus élevée.
    tranche_tot ← résoudreTranche(table_la_plus_exigeante, Σ effectifs)
    formule     ← FORMULE_DE_TRANCHE[tranche_tot]
    hebergement ← PART_HEBERGEMENT[formule]         # facturée une fois, non remisée
SINON :
    hebergement ← 0

abonnementPack  ← logicielPack + hebergement

remiseSolidaire ← 20 % si établissement public / confessionnel / associatif, sinon 0
                  # appliquée à la part LOGICIELLE seule : l'hébergement est un coût
                  # refacturé en devise étrangère, non remisable (cf. Q12, §19.2)
abonnementNet   ← logicielPack × (1 − remiseSolidaire) + hebergement

optionsAnnuelles← Σ prix des options cochées
assistance      ← prix du contrat choisi (0 si Standard), ramené à 12 mois

miseEnServiceTotale ← MISE_EN_SERVICE[tranche_dominante][mode]
                      (tranche_dominante = tranche correspondant à l'effectif TOTAL)

budgetAnnee1    ← abonnementNet + optionsAnnuelles + assistance + miseEnServiceTotale
abonnementSuivant ← abonnementNet + optionsAnnuelles + assistance
                    # l'assistance se renouvelle par tacite reconduction (cf. Q13, §19.2)

SI paiement pluriannuel :
    remisePluri ← 10 % (2 ans) | 15 % (3 ans)
    total       ← (budgetAnnee1 + abonnementSuivant × (n−1)) × (1 − remisePluri)
```

**Règles de résolution et arbitrages** :

| Règle | Décision |
|---|---|
| Tranche d'effectif | Bornes strictes de la grille : primaire `<150 / 150–400 / 400–800 / >800` ; collège et lycée `<200 / 200–500 / 500–1000 / >1000` |
| Formule d'hébergement | Résolue **par tranche** sur l'effectif total (et non par capacité du serveur), puis facturée **une seule fois**. Cette lecture garantit qu'un pack ne paie jamais moins d'hébergement qu'un de ses cycles pris isolément : l'effectif total étant supérieur à chaque effectif, et la tranche étant monotone, `formule(total) ≥ formule(cycle)`. Une résolution par capacité briserait cette propriété — un collège de 200 et un lycée de 150 tomberaient sur Mutualisé (100 000) là où un collège seul de 350 paie Dédié S (240 000). |
| Multi-cycles | Le calcul part **toujours de la base locale** (part logicielle), à laquelle on ajoute une part hébergement unique en mode Cloud. **Ne jamais additionner deux prix de la colonne Cloud** : la part hébergement y figure déjà pour chaque cycle et serait comptée deux fois. |
| Cumul des remises | Pack puis solidaire, **multiplicativement, sur la part logicielle seule** ; l'hébergement n'est pas remisé ; la remise pluriannuelle s'applique en dernier sur le total |
| Contrôle de cohérence mono-cycle | En un seul cycle sans option, le résultat doit être **identique au montant publié** : `local.recurrent + part hébergement = cloud.recurrent`. Ce test verrouille l'ensemble du calcul. |
| Effectif hors bornes hautes | Au-delà de 3 000 élèves : le simulateur cesse d'afficher un chiffre et affiche « Groupe scolaire — devis sur mesure » avec CTA contact |
| Établissement supplémentaire d'un groupe | Non simulé en v1 (remise de 30 % traitée en devis) ; encart informatif affiché |
| Arrondi | Aucun arrondi commercial automatique : les montants sont affichés au franc près, séparateur d'espace insécable fine |

### 9.4 Affichage du résultat

- **Trois chiffres** : budget 1ʳᵉ année (dominant), abonnement des années suivantes, coût par élève et par an.
- **Détail du calcul repliable** : une ligne par composante (abonnement par cycle, remise pack, remise solidaire, options, assistance, mise en service), avec les montants intermédiaires. La transparence du calcul est un argument de vente ; c'est aussi ce qui rend le chiffre défendable en réunion de direction.
- **Mentions** : « Prix indicatifs en FCFA (XOF) hors taxes. TVA de 18 % en sus si applicable. Devis valable 60 jours. Ce résultat n'a pas valeur d'offre contractuelle. »
- **Actions** : `Obtenir ce devis par e-mail` (ouvre `/devis` avec la simulation encodée) · `Télécharger en PDF` (génération côté client) · `Copier le lien de ma simulation` (URL avec paramètres — permet au directeur de partager sa simulation à son conseil d'administration).

### 9.5 Contraintes techniques

- **100 % côté client.** Aucun appel réseau : le simulateur fonctionne sur une connexion instable et reste utilisable hors ligne après le premier chargement.
- **État encodé dans l'URL** (`?cycles=college,lycee&eff=450,300&mode=cloud&…`) : partageable, indexable, restaurable.
- **Données tarifaires** dans un module unique typé, importé par le simulateur, les tableaux et le générateur PDF.
- **Un test unitaire par ligne de la grille** vérifie que `1ʳᵉ année = abonnement + mise en service` et que le simulateur redonne exactement les montants publiés pour un cycle unique sans option. **Un écart entre le simulateur et le PDF commercial est un bug bloquant.**
- **Accessibilité** : navigable au clavier, résultat annoncé via `aria-live="polite"`.

---

## 10. Design system du site vitrine

### 10.1 Principe

Le site vitrine **dérive** du design system applicatif « Encre & Craie » (`docs/design-system-horizonecole.md`) sans le copier : le prospect doit reconnaître le produit lorsqu'il en voit une capture, mais un site marketing a des besoins que n'a pas un back-office (respiration, grands titres, contraste éditorial).

### 10.2 Couleurs

Reprise stricte des palettes applicatives :

| Rôle | Token | Valeur | Usage vitrine |
|---|---|---|---|
| Marque | `ink-600` | `#34478F` | Boutons primaires, liens, accents |
| Marque foncée | `ink-900` | `#171F3F` | Fonds de sections sombres, pied de page, en-tête du héros |
| Marque claire | `ink-50` | `#EEF1FA` | Fonds de blocs, encadrés |
| Accent enseignant | `green-600` | `#217A54` | Colonne « Serveur local », espace Enseignant |
| Accent chaud | `amber-600` | `#CC8722` | Filets de section, badges, mises en avant, remises |
| Neutres | `slate-0` → `slate-900` | `#F5F6FA` → `#1B1E2B` | Fonds, textes, bordures |

Cohérence avec le PDF tarifaire : bleu-encre pour la colonne Cloud, vert pour la colonne Serveur local, ambre pour les remises. **Le visiteur qui passe du PDF au site doit retrouver le même code couleur.**

### 10.3 Typographie

| Rôle | Police | Usage vitrine |
|---|---|---|
| Titres | **Space Grotesk** (600/700) | H1 à H3, chiffres de mise en avant |
| Corps | **Inter** (400/500/600) | Texte courant, listes, formulaires |
| Données | **IBM Plex Mono** (500) | Tous les montants FCFA, effectifs, pourcentages de remise |

Échelle marketing (plus ample que l'échelle applicative) :

| Style | Taille desktop | Taille mobile |
|---|---|---|
| Titre héros (H1) | 3,25 rem / 1,1 | 2,1 rem / 1,15 |
| Titre de section (H2) | 2,1 rem / 1,2 | 1,6 rem |
| Titre de bloc (H3) | 1,35 rem / 1,3 | 1,2 rem |
| Chapô | 1,25 rem / 1,55 | 1,1 rem |
| Corps | 1,0625 rem / 1,65 | 1 rem |
| Légende | 0,875 rem / 1,5 | 0,8125 rem |
| Chiffre tarifaire | 2,5 rem, mono, 600 | 2 rem |

Chargement : sous-ensemble latin, `font-display: swap`, auto-hébergement (pas de CDN tiers — le réseau ivoirien impose de maîtriser les temps de réponse).

### 10.4 Composants

| Composant | Description |
|---|---|
| `Header` | En-tête collant, transparent sur le héros puis opaque au défilement ; méga-menu desktop, tiroir mobile |
| `Hero` | Deux variantes : accueil (visuel large) et page interne (titre + chapô + fil d'ariane) |
| `SectionHeader` | Titre + filet ambre de 2,4 cm — reprise du motif exact du PDF tarifaire |
| `FeatureCard` | Carte à **languette de dossier** (filet coloré de 4 px en haut à gauche) — élément signature repris du design system |
| `SplitFeature` | Bloc capture + texte, alternance gauche/droite |
| `ComparisonTable` | Tableau à deux colonnes colorées (bleu Cloud / vert Local), transformé en cartes sous 768 px |
| `PricingTable` | Tableau tarifaire par module ; en mobile, une carte par tranche |
| `PriceSimulator` | Composant interactif du §9 |
| `StatCard` | Chiffre en mono + libellé + précision |
| `Accordion` | FAQ, blocs repliables, balisage sémantique `<details>` en secours sans JS |
| `LeadForm` | Formulaire de conversion, 3 variantes (démo, devis, contact) |
| `CTABanner` | Bandeau pleine largeur fond `ink-900` + CTA |
| `ScreenshotFrame` | Cadre navigateur ou téléphone autour des captures |
| `Breadcrumb` | Fil d'ariane sur toutes les pages internes, avec JSON-LD |
| `Footer` | Quatre colonnes + bandeau légal |

### 10.5 Grille et espacements

- Conteneur : 1 200 px max, gouttières 24 px (desktop) / 16 px (mobile).
- Grille 12 colonnes desktop, 6 tablette, 4 mobile.
- Rythme vertical : sections espacées de 96 px (desktop) / 64 px (mobile).
- Points de rupture : 480, 768, 1 024, 1 280, 1 536 px.
- Rayons : 12 px (cartes), 8 px (boutons, champs), 4 px (badges).
- Ombres : deux niveaux seulement, très douces — le système est sobre.

### 10.6 Thème sombre

L'application gère le mode sombre. Le site vitrine **ne l'implémente pas en v1** : un site marketing en thème unique est plus simple à maîtriser visuellement. Les tokens sont néanmoins déclarés en variables CSS pour permettre l'ajout ultérieur sans refonte.

### 10.7 Animation

- Apparition au défilement : translation de 12 px + opacité, 320 ms, `ease-out`. Une seule fois par élément.
- Aucune animation sur le premier écran (elle retarderait le LCP).
- `prefers-reduced-motion: reduce` désactive toutes les transitions non essentielles.

### 10.8 Iconographie et imagerie

- Icônes : **Lucide** (déjà utilisé dans l'application), trait 1,5 px, 24 px.
- Captures d'écran : issues de l'application réelle, avec **données de démonstration exclusivement** — aucun nom, aucune photo, aucun matricule d'élève réel. Chaque capture est passée en revue avant publication.
- Photographies : contexte scolaire ivoirien, si et seulement si les droits sont acquis et les personnes ont consenti. À défaut, illustration schématique. **Aucune banque d'images générique de salle de classe occidentale.**

---

## 11. Ligne éditoriale et contenus

### 11.1 Ton

Français ivoirien professionnel : vouvoiement, phrases courtes, verbes d'action. **Registre sobre et factuel** — le marché est méfiant vis-à-vis des promesses excessives, et la crédibilité se joue sur la précision.

**Proscrit** : « révolutionnaire », « leader du marché », « solution 360° », « disruptif », superlatifs sans preuve, anglicismes évitables (*dashboard* → tableau de bord, *features* → fonctionnalités, *pricing* → tarifs).

**Recommandé** : nommer les choses comme l'école les nomme (composition, moyenne, rang, conseil de classe, professeur principal, économe, BEPC, BAC, série A/C/D, CP1, CM2).

### 11.2 Règles rédactionnelles

- Titres de section à la forme affirmative, jamais interrogative.
- Toute affirmation chiffrée est sourcée ou retirée.
- Les fonctionnalités sont décrites **par leur effet**, pas par leur mécanique : « Les bulletins du trimestre en une après-midi » plutôt que « Génération PDF via moteur de rendu ».
- Montants : format `1 200 000 FCFA` avec espaces insécables fines, toujours suivi de « HT » en première occurrence d'une page.
- Dates scolaires au format ivoirien.

### 11.3 Copie de référence — accroches

| Page | H1 |
|---|---|
| Accueil | Le logiciel de gestion scolaire pensé pour les établissements ivoiriens |
| Fonctionnalités | Tout ce que gère une école, dans un seul outil |
| Primaire | Du CP1 au CM2, chaque composition à sa place |
| Collège | De la 6ᵉ à la 3ᵉ, jusqu'au BEPC |
| Lycée | De la 2nde à la Terminale, séries A, C et D |
| Tarifs | Nos tarifs, en clair |
| Déploiement | Notre cloud, ou votre serveur. À vous de choisir. |
| Sécurité | Vos données appartiennent à votre établissement |
| Accompagnement | Une école mise en service, pas un logiciel livré |
| Démonstration | Voyons votre établissement dans HorizonEcole |

### 11.4 FAQ tarifaire — questions obligatoires

1. Les prix sont-ils hors taxes ? *(Oui, en FCFA HT ; TVA 18 % en sus si l'établissement y est assujetti.)*
2. Que paie-t-on la deuxième année ? *(L'abonnement seul ; les frais de mise en service ne sont facturés que la première année.)*
3. Peut-on résilier ? *(Oui, à la fin de chaque année scolaire.)*
4. Que se passe-t-il si l'effectif change en cours d'année ? *(La tranche est figée pour l'année scolaire en cours ; le changement s'applique au renouvellement.)*
5. Comment payer ? *(Virement, chèque, Orange Money, MTN MoMo, Moov Money, Wave. 60 % à la signature, 40 % à la mise en service.)*
6. Le tarif solidaire, pour qui ? *(Établissements publics, confessionnels et associatifs : −20 % sur l'abonnement.)*
7. Le prix peut-il augmenter en cours de contrat ? *(Le prix est ferme pour l'année scolaire en cours. La part hébergement, facturée en devise étrangère, peut être révisée si le taux USD/FCFA varie de plus de 10 %.)*
8. Que se passe-t-il si nous arrêtons ? *(Export complet des données — SQL et PDF — sans frais. Les données appartiennent à l'établissement.)*

---

## 12. Parcours de conversion et formulaires

### 12.1 Hiérarchie des appels à l'action

| Niveau | CTA | Destination | Présence |
|---|---|---|---|
| Primaire | `Demander une démonstration` | `/demonstration` | En-tête, fin de chaque page |
| Secondaire | `Obtenir un devis` | `/devis` | Tarifs, simulateur, pages cycles |
| Tertiaire | `Voir les tarifs` | `/tarifs` | Accueil, fonctionnalités |
| Utilitaire | **`Se connecter`** | **`/app/login`** | **En-tête et pied de page de toutes les pages** |
| Contact direct | WhatsApp | `wa.me/…` | Bouton flottant discret, mobile uniquement |

### 12.2 Formulaire de démonstration — `/demonstration`

| Champ | Type | Obligatoire |
|---|---|---|
| Nom et prénoms | texte | ✔ |
| Fonction | liste (Fondateur/Promoteur · Directeur · Économe · Responsable informatique · Autre) | ✔ |
| Établissement | texte | ✔ |
| Ville | texte | ✔ |
| Téléphone / WhatsApp | tél. (format ivoirien, indicatif +225 pré-rempli) | ✔ |
| E-mail | e-mail | ✔ |
| Cycle(s) | cases à cocher (Primaire, Collège, Lycée) | ✔ |
| Effectif approximatif | liste de tranches | ✔ |
| Créneau souhaité | liste (Matin · Après-midi · Indifférent) | ✖ |
| Message | zone de texte | ✖ |
| Consentement | case à cocher liée à `/confidentialite` | ✔ |

**Après soumission** : page de confirmation `/demonstration/confirmation` (URL distincte, pour le suivi analytics), message « Nous vous rappelons sous 48 h ouvrées », rappel des coordonnées directes, lien vers la grille tarifaire PDF.

### 12.3 Formulaire de devis — `/devis`

Mêmes champs, **plus** le récapitulatif de simulation si le visiteur arrive depuis le simulateur (paramètres d'URL, affichés en lecture seule et modifiables d'un clic « Modifier ma simulation »). Le corps de l'e-mail envoyé à l'équipe commerciale contient la simulation détaillée, ligne par ligne, prête à être transformée en devis.

### 12.4 Formulaire de contact — `/contact`

Version courte : nom, e-mail, téléphone, sujet (liste), message, consentement. Complété par les coordonnées directes (téléphone, WhatsApp, e-mail, adresse à Abidjan) et les horaires (lundi–vendredi, 8 h–18 h).

### 12.5 Règles techniques des formulaires

- **Anti-spam sans friction** : champ leurre (*honeypot*) + horodatage minimal de 3 secondes. **Pas de CAPTCHA** — il dégrade la conversion et pénalise les connexions lentes.
- **Validation côté client** avec messages en français, sous le champ concerné, jamais en alerte modale.
- **Traitement serveur** : point d'entrée minimal — au choix, une fonction du serveur du site vitrine ou un routeur `POST /api/public/leads` ajouté à l'API existante. *(Décision à trancher — voir §19.)* Dans les deux cas : validation Zod, limitation de débit (5 soumissions / heure / IP), envoi par nodemailer (déjà présent dans `apps/api`).
- **Journalisation** des leads : a minima en e-mail structuré ; idéalement en table `lead` pour ne rien perdre.
- **Aucune donnée d'élève** n'est jamais demandée sur le site vitrine.
- Accusé de réception automatique à l'adresse du prospect.

---

## 13. Architecture technique et bascule de l'application vers `/app/login`

### 13.1 Vue d'ensemble cible

```
                         ┌──────────── nginx (443, TLS) ────────────┐
                         │                                          │
  horizonecole.com/      │  →  /var/www/horizonecole/site/dist      │  Site vitrine (statique)
  horizonecole.com/app/  │  →  /var/www/horizonecole/apps/web/dist  │  Application SPA
  horizonecole.com/api   │  →  proxy localhost:4001                 │  API Express (inchangée)
  horizonecole.com/auth  │  →  proxy localhost:4001                 │
  horizonecole.com/uploads   →  proxy localhost:4001                │
  horizonecole.com/api-docs  →  proxy localhost:4001                │
                         └──────────────────────────────────────────┘
```

### 13.2 Choix de la technologie du site vitrine

**Recommandation : Astro 4 + Tailwind CSS**, avec des îlots React pour le simulateur.

| Critère | Astro | Next.js | Second app Vite/React |
|---|---|---|---|
| HTML statique par défaut, zéro JS sur les pages de contenu | ✔ | partiel | ✖ |
| SEO et LCP sur réseau mobile ivoirien | ✔✔ | ✔ | ✖ |
| Contenu Markdown natif (blog, guides, FAQ) | ✔✔ | ✔ | ✖ |
| Réutilisation de composants React (simulateur) | ✔ (îlots) | ✔ | ✔ |
| Déploiement : fichiers statiques servis par nginx, sans processus Node supplémentaire | ✔ | ✖ | ✔ |
| Cohérence avec la stack existante (Tailwind, TypeScript) | ✔ | ✔ | ✔ |

Astro produit un dossier statique servi directement par nginx : **aucun processus serveur supplémentaire**, aucune charge sur le VPS, et le simulateur reste un composant React réutilisant les tokens Tailwind existants.

**Emplacement dans le monorepo** : `apps/site/`, intégré aux workspaces pnpm.

### 13.3 Modifications requises dans `apps/web` — bascule vers `/app/`

Quatre fichiers seulement :

**1. `apps/web/vite.config.ts`** — préfixer les ressources produites :

```ts
export default defineConfig({
  base: '/app/',            // ← ajout
  plugins: [react()],
  server: { port: 5173, host: true },
  resolve: { alias: { '@': '/src' } },
})
```

**2. `apps/web/index.html`** — aligner la base et les chemins absolus :

```html
<base href="/app/" />                                  <!-- était "/" -->
<link rel="icon" type="image/png" href="/app/favicon.png" />   <!-- était "/favicon.png" -->
```

**3. `apps/web/src/main.tsx`** — donner son préfixe au routeur :

```tsx
<BrowserRouter
  basename="/app"                                      // ← ajout
  future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
>
```

`basename` est traité par React Router en amont de toutes les routes : les `<Route path="/login">`, `<Navigate to="/login">` et `roleHome()` existants continuent de fonctionner **sans modification**, et produisent des URL préfixées `/app`.

**4. Point de vigilance — chemins absolus écrits en dur.** Avant la bascule, auditer :
- les `window.location.href = '/...'` et `location.replace('/...')` ;
- les liens `<a href="/...">` internes ;
- les chemins d'images ou d'assets référencés en absolu hors du bundle Vite ;
- l'intercepteur Axios de `apps/web/src/lib/api.ts` : la redirection vers la page de connexion sur 401 doit viser `/app/login` (ou passer par le routeur).

**Ce qui ne change pas** :

| Élément | Raison |
|---|---|
| `apps/api` (routeurs, middleware, index) | Les préfixes `/api`, `/auth`, `/uploads`, `/api-docs` sont indépendants du chemin du frontend |
| Jeton JWT en `localStorage` | Stockage par origine, pas par chemin |
| `VITE_API_URL` / appels Axios | Ils visent `/api`, servi à la racine |
| Base de données, modèles Prisma | Aucun impact |

**Point de contrôle** : si un **cookie de rafraîchissement** est posé par l'API, vérifier que son attribut `Path` vaut `/` (et non un chemin plus restrictif). Un cookie limité à `/app` cesserait d'être envoyé vers `/auth/refresh`. À vérifier dans `apps/api/src/routes/auth.ts` avant la bascule.

### 13.4 Configuration nginx cible

```nginx
server {
    listen 80;
    server_name horizonecole.com www.horizonecole.com;
    return 301 https://horizonecole.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.horizonecole.com;
    # … certificats …
    return 301 https://horizonecole.com$request_uri;   # canonicalisation sans www
}

server {
    listen 443 ssl http2;
    server_name horizonecole.com;

    ssl_certificate     /etc/letsencrypt/live/horizonecole.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/horizonecole.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    # ── 1. API, auth, uploads, documentation — inchangé, en premier ──
    location ~ ^/(api|auth|uploads|api-docs) {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    # ── 2. Redirections de compatibilité (anciennes URL applicatives) ──
    location = /login              { return 301 /app/login; }
    location = /creer-etablissement{ return 301 /app/creer-etablissement; }
    location = /dashboard          { return 301 /app/dashboard; }
    # … une ligne par racine de section applicative (liste en §13.5) …

    # ── 3. Application SPA sous /app/ ──
    location /app/ {
        alias /var/www/horizonecole/apps/web/dist/;
        try_files $uri $uri/ /app/index.html;

        location ~* \.(js|css|woff2|png|jpg|svg|webp|avif)$ {
            alias /var/www/horizonecole/apps/web/dist/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    location = /app { return 301 /app/; }

    # ── 4. Site vitrine à la racine ──
    root /var/www/horizonecole/site/dist;
    index index.html;

    location / {
        try_files $uri $uri.html $uri/index.html /404.html;
    }

    location ~* \.(js|css|woff2|png|jpg|svg|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html { add_header Cache-Control "public, max-age=300"; }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript
               application/xml text/xml text/javascript image/svg+xml;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

**Ordre des blocs — critique** : le `location ~ ^/(api|auth|…)` en expression régulière prime sur les préfixes ; il doit rester en tête. Le `location /app/` doit être déclaré **avant** le `location /`.

### 13.5 Plan de redirection des anciennes URL

Toutes les URL applicatives actuelles doivent répondre en 301 vers leur équivalent sous `/app`. Deux stratégies :

**Option A — Redirection générique par carte de préfixes** *(recommandée)* : une `map` nginx énumérant les racines applicatives connues.

```nginx
map $uri $legacy_app_path {
    default                        "";
    ~^/(login|dashboard|eleves|parents|enseignants|classes|matieres|inscriptions|
        notes|bulletins|presences|absences|discipline|emploi-du-temps|salles|
        annees-scolaires|trimestres|coefficients|evaluations|conduite|
        finances|paiements|factures|budget|paie|personnel|utilisateurs|roles|
        parametres|profil|mon-espace|creer-etablissement)(/.*)?$   /app$uri;
}

server {
    if ($legacy_app_path != "") { return 301 $legacy_app_path; }
    # …
}
```

**Option B — Page de bascule** : servir à la racine une page qui détecte un jeton en `localStorage` et redirige vers `/app`. Rejetée : elle pénalise le SEO de la page d'accueil et ajoute un aller-retour.

**Liste exacte des racines à rediriger** : à extraire de `apps/web/src/App.tsx` (déclarations `<Route path=…>` de premier niveau) au moment de l'implémentation. C'est une tâche mécanique mais **exhaustive** : une racine oubliée est un 404 pour un utilisateur en production.

**Durée** : les redirections sont **permanentes** (aucune date de retrait), les favoris des utilisateurs ne se réécrivant pas.

### 13.6 Développement local

| Service | Commande | URL |
|---|---|---|
| API | `pnpm --filter api dev` | `http://localhost:4001` |
| Application | `pnpm --filter web dev` | `http://localhost:5173/app/` |
| Site vitrine | `pnpm --filter site dev` | `http://localhost:4321` |

Ajouts au `package.json` racine :

```json
"dev": "concurrently \"pnpm --filter api dev\" \"pnpm --filter web dev\" \"pnpm --filter site dev\"",
"dev:site": "pnpm --filter site dev",
"build": "… && pnpm --filter web build && pnpm --filter site build"
```

Un proxy Vite optionnel sur le site vitrine permet d'atteindre `/app` en local et de tester les liens inter-surfaces.

### 13.7 Déploiement

Le pipeline existant (`.github/workflows/`) est étendu :

1. `pnpm build` construit désormais `apps/site` en plus de `apps/web`.
2. Synchronisation de `apps/site/dist` vers `/var/www/horizonecole/site/dist`.
3. Synchronisation de `apps/web/dist` vers `/var/www/horizonecole/apps/web/dist` (inchangé).
4. Copie du fichier nginx, `nginx -t`, `systemctl reload nginx`.
5. Aucun redémarrage PM2 n'est requis pour un changement portant uniquement sur le site vitrine.

**Ordre de bascule en production** — pour éviter toute fenêtre d'indisponibilité :

1. Déployer le site vitrine sur un chemin temporaire, vérifier.
2. Déployer la version `/app/` de l'application **sans** modifier nginx, la tester par IP ou sous-domaine de préproduction.
3. Basculer la configuration nginx (site à la racine, app sous `/app`, redirections actives) en une seule opération.
4. Vérifier la liste de contrôle §18.4.
5. Conserver la configuration précédente pour un retour arrière immédiat.

**Fenêtre recommandée** : hors période de rentrée et hors semaine de saisie des bulletins.

### 13.8 Communication du changement aux utilisateurs actuels

- Bandeau d'information dans l'application, deux semaines avant : « À partir du JJ/MM, l'adresse de connexion devient horizonecole.com/app/login. Vos favoris continueront de fonctionner. »
- E-mail aux administrateurs d'établissement.
- Les redirections 301 rendent l'action facultative pour l'utilisateur — la communication vise à éviter l'inquiétude, pas à imposer une manipulation.

---

## 14. SEO, performance, accessibilité

### 14.1 SEO technique

| Élément | Exigence |
|---|---|
| URL | En français, en minuscules, avec tirets ; jamais de paramètre pour la navigation |
| Titre | Unique par page, 50–60 caractères, marque en suffixe (`… — HorizonEcole`) |
| Méta description | Unique, 140–160 caractères, avec une incitation à l'action |
| H1 | Un seul par page |
| Canonique | Sur toutes les pages ; les URL de simulation portent la canonique de `/tarifs` |
| `sitemap.xml` | Généré au build ; **exclut `/app/*`** |
| `robots.txt` | `Disallow: /app/` — l'application authentifiée n'a pas à être indexée ; `Allow` sur tout le reste ; lien vers le sitemap |
| Balisage structuré | `Organization`, `WebSite`, `SoftwareApplication` (avec `offers` reprenant les tranches tarifaires), `FAQPage`, `BreadcrumbList`, `Article` (blog) |
| Open Graph / Twitter Card | Sur toutes les pages ; image 1200×630 par grande section |
| Hreflang | Non applicable en v1 (structure prévue pour `fr` / `en`) |
| Redirections | 301 uniquement ; aucune chaîne de plus d'un saut |
| Pagination du blog | `rel=prev/next` + URL propres |
| 404 | Page personnalisée avec recherche et liens principaux, dont `Se connecter` |

**Mots-clés cibles** (à confirmer par une étude de volume) : *logiciel gestion scolaire Côte d'Ivoire* · *logiciel école privée Abidjan* · *logiciel bulletins scolaires* · *gestion frais de scolarité école* · *logiciel gestion collège lycée* · *application suivi scolaire parents* · *logiciel notes et moyennes CP1 CM2*.

### 14.2 Performance

Budget par page, mesuré en 4G simulée :

| Métrique | Budget |
|---|---|
| LCP | < 2,5 s (cible 2,0 s) |
| CLS | < 0,1 |
| INP | < 200 ms |
| Poids HTML+CSS+JS de la page d'accueil | < 250 Ko compressé |
| JavaScript sur les pages de contenu | 0 Ko (hors menu mobile, < 8 Ko) |
| JavaScript du simulateur | < 60 Ko compressé |
| Requêtes au premier chargement | < 25 |
| Lighthouse Performance (mobile) | ≥ 90 |

Moyens : génération statique, images AVIF/WebP responsives avec `loading="lazy"` hors premier écran, polices auto-hébergées en sous-ensemble latin avec préchargement de la seule variante du H1, CSS critique en ligne, aucun script tiers bloquant.

### 14.3 Accessibilité — RGAA / WCAG 2.1 AA

- Contraste ≥ 4,5:1 pour le texte, ≥ 3:1 pour les éléments d'interface.
- Navigation complète au clavier, focus visible non supprimé.
- Structure de titres cohérente, repères ARIA (`header`, `nav`, `main`, `footer`).
- Textes alternatifs sur toutes les images informatives ; `alt=""` sur les images décoratives.
- Formulaires : `<label>` associé, erreurs liées par `aria-describedby`, résultat du simulateur en `aria-live`.
- Lien d'évitement « Aller au contenu principal ».
- Tableaux tarifaires avec `<th scope>` et `<caption>`.
- Respect de `prefers-reduced-motion`.
- Le site reste utilisable sans JavaScript, sauf le simulateur — qui affiche alors un message et un lien vers la grille PDF.

---

## 15. Analytics et mesure

### 15.1 Outillage

**Recommandation : Plausible ou Matomo auto-hébergé** — sans cookie, sans bandeau de consentement obligatoire, léger, respectueux de la vie privée. Google Analytics 4 uniquement si une exigence commerciale l'impose ; il déclencherait alors l'obligation d'un bandeau de consentement.

### 15.2 Événements à suivre

| Événement | Déclencheur | Propriétés |
|---|---|---|
| `cta_demo_click` | Clic sur `Demander une démonstration` | page, emplacement |
| `cta_login_click` | Clic sur `Se connecter` | page, emplacement |
| `pricing_view` | Affichage de `/tarifs` | source |
| `simulator_start` | Première interaction avec le simulateur | — |
| `simulator_complete` | Résultat affiché | cycles, effectif total, mode, type d'établissement |
| `simulator_share` | Copie du lien de simulation | — |
| `simulator_pdf` | Téléchargement du PDF de simulation | — |
| `pricing_pdf_download` | Téléchargement de la grille tarifaire | page |
| `lead_submit` | Soumission d'un formulaire | type (démo/devis/contact), cycles, effectif |
| `lead_error` | Échec de soumission | type, motif |
| `scroll_depth` | 25 / 50 / 75 / 100 % | page |

### 15.3 Entonnoir de référence

```
Visite  →  Page fonctionnalités ou cycle  →  Page tarifs  →  Simulation complétée  →  Formulaire soumis
```

Objectif de bout en bout : **2,5 % à 3 mois, 4 % à 12 mois**.

Un tableau de bord mensuel consolide : trafic par source, entonnoir, distribution des simulations (cycle, effectif, mode), taux de transformation lead → devis → signature.

---

## 16. Conformité, mentions légales et données personnelles

- **Mentions légales** : raison sociale, forme juridique, RCCM, siège à Abidjan, directeur de publication, contact, hébergeur (nom et adresse).
- **Politique de confidentialité** — distinguer clairement deux traitements :
  - *Site vitrine* : données de prospection collectées via les formulaires (identité, fonction, établissement, coordonnées). Finalité : réponse commerciale. Conservation : 3 ans après le dernier contact. Base : intérêt légitime / consentement.
  - *Application* : données scolaires traitées **pour le compte** des établissements, qui en sont responsables ; HorizonEcole intervient comme sous-traitant. Renvoi au contrat.
- **Données de mineurs** : mention explicite qu'aucune donnée d'élève n'est collectée par le site vitrine.
- **Cookies** : si la solution d'analytics est sans cookie, une simple information suffit ; sinon, bandeau de consentement conforme, avec refus aussi accessible que l'acceptation, et **aucun dépôt avant choix**.
- **Cadre national** : conformité à la loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel ; déclaration auprès de l'**ARTCI** si requise pour le traitement de prospection. *(À faire confirmer par un conseil juridique — voir §19.)*
- **CGV** : reprise des conditions commerciales de la grille (facturation, échéancier, moyens de paiement, révision des prix, réversibilité, résiliation).
- **Accessibilité** : déclaration de conformité en pied de page si le niveau AA est atteint.

---

## 17. Lots de livraison et planning

### Lot 0 — Cadrage et fondations *(1 semaine)*

- Validation de ce PRD, du positionnement et des messages.
- Choix de la technologie (Astro confirmé ou non), création de `apps/site`.
- Portage des tokens du design system, mise en place de la bibliothèque de composants de base.
- Constitution du jeu de captures d'écran anonymisées.

**Livrable** : squelette technique, charte du site, arborescence figée.

### Lot 1 — Bascule applicative vers `/app/` *(1 semaine, parallélisable)*

- Modifications de `vite.config.ts`, `index.html`, `main.tsx`.
- Audit et correction des chemins absolus.
- Vérification du `Path` du cookie de rafraîchissement.
- Écriture de la configuration nginx et de la table de redirections.
- Recette complète de l'application sous `/app/` (les quatre espaces, tous les rôles).

**Livrable** : application fonctionnelle sous `/app/`, redirections testées. **Ce lot est déployable indépendamment du site vitrine** — l'application étant alors accessible à la fois à la racine et sous `/app/` pendant la transition.

### Lot 2 — Site vitrine, socle *(3 semaines)*

- Accueil, Fonctionnalités (vue d'ensemble + 3 sous-pages espaces), Cycles (3 pages), Déploiement, Sécurité, Accompagnement, Contact, pages légales.
- En-tête, pied de page, navigation mobile.
- Formulaire de démonstration et son traitement.
- SEO technique, sitemap, balisage structuré.

**Livrable** : site publiable sans la page Tarifs.

### Lot 3 — Tarifs et simulateur *(2 semaines)*

- Module de données tarifaires unique et testé.
- Page `/tarifs` complète, tableaux responsifs.
- Simulateur interactif, partage par URL, export PDF.
- Formulaire de devis pré-rempli.
- Tests unitaires de conformité à la grille PDF.

**Livrable** : page Tarifs complète, entonnoir de conversion opérationnel.

### Lot 4 — Contenus et ressources *(2 semaines)*

- Moteur Markdown, index et gabarits Guides / Blog / FAQ.
- Rédaction des 4 guides fondateurs et de la FAQ complète.
- Sous-pages Fonctionnalités restantes (finances, bulletins, présences, paie).
- Page À propos.

**Livrable** : site complet.

### Lot 5 — Mise en production et mesure *(1 semaine)*

- Bascule nginx définitive.
- Vérification de toutes les redirections.
- Analytics, Search Console, soumission du sitemap.
- Audit Lighthouse et accessibilité, corrections.
- Communication aux établissements clients.

**Livrable** : site en production, mesure active.

**Durée totale : 9 à 10 semaines**, lots 1 et 2 partiellement parallélisables.

---

## 18. Critères d'acceptation

### 18.1 Fonctionnels

- [ ] Toutes les pages de l'arborescence §7.1 existent et répondent en 200.
- [ ] Le bouton `Se connecter` est présent en en-tête **et** en pied de page de chaque page publique, et mène à `/app/login`.
- [ ] Le simulateur restitue **exactement** les montants de la grille pour un cycle unique, sans option, dans les deux modes — vérifié sur les 24 lignes.
- [ ] La règle `1ʳᵉ année = abonnement + mise en service` est vérifiée par test automatisé sur toute la grille.
- [ ] Les remises pack (15 %/25 %), solidaire (20 %) et pluriannuelle (10 %/15 %) sont appliquées dans l'ordre spécifié.
- [ ] Au-delà de 3 000 élèves, le simulateur bascule sur « devis sur mesure ».
- [ ] Une simulation est partageable par URL et restaurée à l'identique.
- [ ] Les trois formulaires envoient un e-mail à l'équipe commerciale et un accusé de réception au prospect.
- [ ] Le formulaire de devis contient le détail de la simulation.
- [ ] La grille tarifaire PDF est téléchargeable.

### 18.2 Techniques

- [ ] L'application répond sur `/app/*` ; `/app/login` affiche la page de connexion.
- [ ] Les quatre espaces (Administration, Enseignant, Élève, Parent) fonctionnent sous `/app/` : connexion, navigation, appels API, génération de bulletins PDF, téléversement de documents.
- [ ] Toutes les anciennes URL applicatives répondent en 301 vers `/app/…` — aucune 404 dans les logs après bascule.
- [ ] `robots.txt` interdit `/app/` ; `sitemap.xml` ne contient aucune URL applicative.
- [ ] `www` redirige vers l'apex ; HTTP redirige vers HTTPS ; une seule redirection par chaîne.
- [ ] Le déploiement construit et publie les deux applications.
- [ ] Un retour arrière nginx est possible en moins de 5 minutes.

### 18.3 Qualité

- [ ] Lighthouse mobile : Performance ≥ 90, Accessibilité ≥ 95, Bonnes pratiques ≥ 95, SEO = 100 sur l'accueil, les fonctionnalités et les tarifs.
- [ ] Aucun défilement horizontal entre 320 px et 1 920 px.
- [ ] Tous les tableaux tarifaires sont lisibles sur un écran de 360 px.
- [ ] Navigation clavier complète, focus visible.
- [ ] Contrastes conformes AA sur l'ensemble du site.
- [ ] Aucune coquille sur les pages Accueil, Tarifs et Fonctionnalités (relecture par un tiers).
- [ ] Aucune donnée d'élève réelle sur une capture d'écran.
- [ ] Rendu vérifié sur Chrome, Safari iOS, Firefox et Chrome Android.

### 18.4 Liste de contrôle post-bascule

| # | Vérification |
|---|---|
| 1 | `https://horizonecole.com/` affiche le site vitrine |
| 2 | `https://horizonecole.com/login` redirige en 301 vers `/app/login` |
| 3 | `https://horizonecole.com/app/login` permet de se connecter |
| 4 | Après connexion, l'utilisateur atterrit sur la page d'accueil de son rôle, sous `/app/` |
| 5 | Un rafraîchissement (F5) sur une page profonde de l'application ne produit pas de 404 |
| 6 | Les appels `/api/*` et `/auth/*` répondent normalement |
| 7 | Le rafraîchissement de session fonctionne (cookie correctement transmis) |
| 8 | Le téléchargement d'un bulletin PDF fonctionne |
| 9 | Le téléversement d'un document fonctionne |
| 10 | La déconnexion renvoie vers `/app/login` |
| 11 | Les ressources statiques de l'application chargent depuis `/app/assets/…` |
| 12 | Aucune erreur de console sur la page d'accueil de l'application |

---

## 19. Risques et points ouverts

### 19.1 Risques

| # | Risque | Impact | Prob. | Mitigation |
|---|---|---|---|---|
| R1 | Une racine d'URL applicative oubliée dans la table de redirection → 404 pour un utilisateur en production | Élevé | Moyenne | Extraction exhaustive depuis `App.tsx` ; redirection générique par `map` plutôt que liste manuelle ; surveillance des 404 la première semaine |
| R2 | Chemin absolu écrit en dur dans `apps/web` → page blanche sous `/app/` | Élevé | Moyenne | Audit `grep` avant bascule ; recette complète des quatre espaces |
| R3 | Cookie de rafraîchissement limité en `Path` → déconnexions intempestives | Élevé | Faible | Vérification de `apps/api/src/routes/auth.ts` au lot 1 |
| R4 | Divergence entre le simulateur et le PDF commercial | Élevé | Moyenne | Source de vérité unique + tests sur les 24 lignes + régénération du PDF depuis la même source à terme |
| R5 | Publication des prix exploitée par la concurrence | Moyen | Élevée | Assumé : la transparence est un différenciateur sur ce marché |
| R6 | Bascule pendant une période scolaire critique | Élevé | Faible | Fenêtre hors rentrée et hors saisie de bulletins ; retour arrière préparé |
| R7 | Captures d'écran contenant des données réelles | Élevé | Moyenne | Jeu de données de démonstration dédié ; revue systématique avant publication |
| R8 | Contenus éditoriaux non livrés (goulot rédactionnel) | Moyen | Élevée | Lot 4 séparé ; le site est publiable sans les guides |
| R9 | Charge du VPS augmentée par le trafic public | Faible | Faible | Site statique, mise en cache agressive, aucun processus supplémentaire |
| R10 | Grille tarifaire révisée sans mise à jour du site | Moyen | Moyenne | Procédure : toute évolution tarifaire passe par le module de données unique ; date de mise à jour affichée |

### 19.2 Points ouverts — à trancher avant le lot 1

| # | Question | Décision attendue de |
|---|---|---|
| Q1 | Technologie du site vitrine : Astro confirmé ? | Direction technique |
| Q2 | Traitement des formulaires : fonction du site vitrine ou routeur `POST /api/public/leads` dans l'API existante ? | Direction technique |
| Q3 | Les leads sont-ils persistés en base ou seulement envoyés par e-mail ? | Produit + commercial |
| Q4 | Adresse de réception des demandes commerciales, numéro de téléphone et de WhatsApp publics | Commercial |
| Q5 | Coordonnées légales complètes (raison sociale, RCCM, siège, directeur de publication) | Direction |
| Q6 | Solution d'analytics : Plausible, Matomo ou GA4 ? | Produit |
| Q7 | Déclaration ARTCI requise pour la prospection ? | Conseil juridique |
| Q8 | Des établissements clients acceptent-ils d'être cités ou de témoigner ? | Commercial |
| Q9 | Anglais prévu à quelle échéance (structure à préparer dès la v1) ? | Direction |
| Q10 | La création d'établissement en autonomie (`/creer-etablissement`) doit-elle rester accessible par lien direct, ou passer derrière un jeton d'invitation ? | Produit + sécurité |
| Q11 | Date de bascule en production | Direction |
| Q12 | Le tarif solidaire (−20 %) porte-t-il sur la part logicielle seule, ou aussi sur la part hébergement ? Le PRD retient « logicielle seule », l'hébergement étant un coût refacturé en devise étrangère — à confirmer. | Commercial |
| Q13 | Un contrat d'assistance Renforcée / Premium se reconduit tacitement : doit-il apparaître dans le montant « puis X FCFA / an » du simulateur ? Le PRD retient « oui ». | Commercial |

---

## 20. Annexes — données tarifaires de référence

> Source : `docs/grille_tarifaire_generate.py` / `docs/grille_tarifaire_horizonecole.pdf` — mise à jour août 2026.
> **Tous les montants sont en FCFA (XOF) hors taxes.**
> Ces tableaux constituent la spécification du module `pricing` : toute valeur du site doit en être issue.

### A. Formules d'hébergement Cloud

| Formule | Serveur | Ressources | Capacité recommandée | Part hébergement / an |
|---|---|---|---|---|
| Cloud Mutualisé | VPS KVM 2 partagé | 2 vCPU · 8 Go RAM · 100 Go NVMe, instance partagée et cloisonnée | jusqu'à 400 élèves | 100 000 |
| Cloud Dédié S | VPS KVM 1 dédié | 1 vCPU · 4 Go RAM · 50 Go NVMe · 4 To de trafic | jusqu'à 800 élèves | 240 000 |
| Cloud Dédié M | VPS KVM 2 dédié | 2 vCPU · 8 Go RAM · 100 Go NVMe · 8 To de trafic | jusqu'à 1 500 élèves | 320 000 |
| Cloud Dédié L | VPS KVM 4 dédié | 4 vCPU · 16 Go RAM · 200 Go NVMe · 16 To de trafic | jusqu'à 3 000 élèves · multi-sites | 550 000 |
| Cloud Dédié XL | VPS KVM 8 dédié | 8 vCPU · 32 Go RAM · 400 Go NVMe · 32 To de trafic | groupes de plus de 3 000 élèves | 900 000 |

*La part hébergement est déjà comprise dans la colonne « Hébergement HorizonEcole ». Elle n'est pas facturée en mode serveur local.*

### B. Module École primaire — CP1 à CM2

| Tranche | Effectif | Formule | Cloud — 1ʳᵉ année | Cloud — puis / an | Local — 1ʳᵉ année | Local — puis / an |
|---|---|---|---|---|---|---|
| Petite école | < 150 élèves | Mutualisé | 430 000 | 280 000 | 380 000 | 180 000 |
| École moyenne | 150 à 400 | Mutualisé | 670 000 | 420 000 | 670 000 | 320 000 |
| Grande école | 400 à 800 | Dédié S | 1 200 000 | 800 000 | 1 110 000 | 560 000 |
| Très grande école | > 800 | Dédié M | 1 800 000 | 1 200 000 | 1 680 000 | 880 000 |

### C. Module Collège — 6ᵉ à 3ᵉ

| Tranche | Effectif | Formule | Cloud — 1ʳᵉ année | Cloud — puis / an | Local — 1ʳᵉ année | Local — puis / an |
|---|---|---|---|---|---|---|
| Petit collège | < 200 élèves | Mutualisé | 500 000 | 350 000 | 450 000 | 250 000 |
| Collège moyen | 200 à 500 | Dédié S | 910 000 | 660 000 | 770 000 | 420 000 |
| Grand collège | 500 à 1 000 | Dédié M | 1 400 000 | 1 000 000 | 1 230 000 | 680 000 |
| Très grand collège | > 1 000 | Dédié L | 2 250 000 | 1 650 000 | 1 900 000 | 1 100 000 |

### D. Module Lycée — 2nde à Terminale

| Tranche | Effectif | Formule | Cloud — 1ʳᵉ année | Cloud — puis / an | Local — 1ʳᵉ année | Local — puis / an |
|---|---|---|---|---|---|---|
| Petit lycée | < 200 élèves | Mutualisé | 550 000 | 400 000 | 500 000 | 300 000 |
| Lycée moyen | 200 à 500 | Dédié S | 990 000 | 740 000 | 850 000 | 500 000 |
| Grand lycée | 500 à 1 000 | Dédié M | 1 520 000 | 1 120 000 | 1 350 000 | 800 000 |
| Très grand lycée | > 1 000 | Dédié L | 2 450 000 | 1 850 000 | 2 100 000 | 1 300 000 |

### E. Frais de mise en service *(première année uniquement, déjà compris dans les prix ci-dessus)*

| Tranche | Effectif correspondant | Prestations comprises | Cloud | Serveur local |
|---|---|---|---|---|
| Petit établissement | primaire < 150 · collège et lycée < 200 | Paramétrage, import des élèves, 1 journée de formation | 150 000 | 200 000 |
| Établissement moyen | primaire 150–400 · collège et lycée 200–500 | Paramétrage, reprise des données, 2 journées de formation | 250 000 | 350 000 |
| Grand établissement | primaire 400–800 · collège et lycée 500–1 000 | Reprise complète, 3 journées de formation, accompagnement dédié | 400 000 | 550 000 |
| Très grand établissement | primaire > 800 · collège et lycée > 1 000 | Reprise multi-sites, 5 journées de formation, chef de projet dédié | 600 000 | 800 000 |

### F. Packs multi-cycles et groupes scolaires

| Configuration | Remise sur les abonnements | Hébergement | Exemple chiffré |
|---|---|---|---|
| Primaire + Collège | − 15 % | une seule formule, selon l'effectif total | 300 + 400 élèves, serveur local : (320 000 + 420 000) − 15 % = **629 000 / an** |
| Collège + Lycée | − 15 % | une seule formule, selon l'effectif total | 450 + 350 élèves, serveur local : (420 000 + 500 000) − 15 % = **782 000 / an** |
| Primaire + Collège + Lycée | − 25 % | Dédié L ou XL selon l'effectif total | 1 200 élèves au total, serveur local : (320 000 + 420 000 + 500 000) − 25 % = **930 000 / an** |
| Établissement supplémentaire du même groupe | − 30 % | mutualisé sur l'instance du groupe | Le 2ᵉ site et les suivants bénéficient de 30 % de remise sur leur abonnement |

### G. Contrats d'assistance

| Formule | Ce qui est couvert | 6 mois | 12 mois | 24 mois |
|---|---|---|---|---|
| **Standard** *(comprise dans l'abonnement)* | E-mail et WhatsApp, lundi–vendredi 8 h–18 h. Prise en charge sous 48 h ouvrées. Mises à jour correctives et sauvegardes. | incluse | incluse | incluse |
| **Renforcée** *(recommandée la 1ʳᵉ année)* | Hotline téléphonique, prise en charge sous 24 h, lundi–samedi. Une visite de suivi par trimestre. Assistance à la clôture des bulletins. | 180 000 | 320 000 | 570 000 |
| **Premium** *(grands établissements et multi-sites)* | Prise en charge sous 4 h, 7 j/7, interlocuteur dédié. Une visite mensuelle sur site. Formation continue des nouveaux utilisateurs. Priorité sur les demandes d'évolution. | 300 000 | 540 000 | 960 000 |

*Souscription possible en cours d'année, par période de 6 mois indivisible. Tacite reconduction, sauf dénonciation un mois avant le terme. Interventions sur site comprises à Abidjan ; frais de déplacement à l'intérieur du pays facturés au réel.*

### H. Modules et prestations complémentaires

| Prestation | Description | Tarif |
|---|---|---|
| Module Paie & RH du personnel | Bulletins de paie, barème d'ancienneté, contrats, heures effectuées, acomptes et prorata | 200 000 / an |
| Module Budget & comptabilité | Lignes budgétaires, transactions, justificatifs, bilan et tableau de trésorerie | 180 000 / an |
| Notifications SMS et WhatsApp | Alertes d'absence, rappels d'échéance, publication des bulletins (coût des SMS en sus) | 90 000 / an |
| Sauvegarde externalisée | Sauvegarde quotidienne chiffrée hors site — recommandée en mode serveur local | 80 000 / an |
| Nom de domaine et certificat SSL | Inclus dans toutes les formules Cloud ; facturé uniquement en mode serveur local | 30 000 / an |
| Journée de formation supplémentaire | Sur site, jusqu'à 15 participants (Abidjan) | 75 000 / jour |
| Intervention sur site hors forfait | Déplacement et intervention technique (Abidjan ; transport en sus à l'intérieur) | 50 000 / intervention |
| Reprise de données supplémentaire | Import d'un historique de notes ou de paiements au-delà de l'année en cours | 120 000 / année reprise |

### I. Repères — coût par élève

*Abonnement de croisière rapporté à l'effectif, hors frais de mise en service de la première année.*

| Établissement type | Effectif | Serveur local | Cloud tout compris |
|---|---|---|---|
| École primaire | 300 élèves | 1 067 FCFA / élève / an | 1 400 FCFA / élève / an |
| Collège | 450 élèves | 933 FCFA / élève / an | 1 467 FCFA / élève / an |
| Lycée | 800 élèves | 1 000 FCFA / élève / an | 1 400 FCFA / élève / an |

### J. Conditions commerciales

| Sujet | Condition |
|---|---|
| Facturation | Prix en FCFA (XOF) hors taxes. TVA de 18 % en sus si l'établissement y est assujetti. |
| Échéancier | 60 % à la signature, 40 % à la mise en service. Abonnement payable annuellement d'avance, en début d'année scolaire. |
| Moyens de paiement | Virement bancaire, chèque, Orange Money, MTN MoMo, Moov Money, Wave. |
| Paiement pluriannuel | − 10 % pour 2 années réglées d'avance, − 15 % pour 3 années. |
| Tarif solidaire | − 20 % sur l'abonnement pour les établissements publics, confessionnels et associatifs. |
| Assistance | Formule Standard comprise dans l'abonnement. Renforcée et Premium souscriptibles à partir de 6 mois, à tout moment de l'année. |
| Révision des prix | L'hébergement étant facturé en devise étrangère, la part hébergement peut être révisée si le taux USD/FCFA varie de plus de 10 %. |
| Réversibilité | À tout moment, export complet des données de l'établissement (SQL et PDF) sans frais. Les données appartiennent à l'établissement. |

### K. Ce que comprend l'abonnement, quel que soit le module

| Espace Administration | Espace Enseignant | Espace Élève & Parent |
|---|---|---|
| Élèves et parents · Inscriptions · Classes et matières · Années scolaires et périodes · Emploi du temps et salles · Absences et discipline · Frais de scolarité, échéanciers et reçus · Bulletins PDF · Utilisateurs, rôles et droits · Journal d'audit · Tableau de bord | Saisie des notes par évaluation · Coefficients et moyennes pondérées · Appel et feuille de présence · Notes de conduite · Suivi de classe et professeur principal · Bilan de période · Emploi du temps personnel · Documents pédagogiques | Notes et moyennes en temps réel · Bulletins en ligne · Absences et retards · Emploi du temps de la classe · Situation des paiements · Comptes sécurisés individuels |

**Sécurité et exploitation incluses dans tous les cas** : comptes protégés par mot de passe chiffré, séparation stricte des données entre établissements, journal des accès, connexion chiffrée HTTPS, mises à jour fonctionnelles de l'année en cours.

---

*Fin du document.*
