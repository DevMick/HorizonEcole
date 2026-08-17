# Spécification technique — Profil « Propriétaire » (`OWNER`)

> Document de conception. Aucune modification de code n'accompagne ce fichier.
> Chaque affirmation sur l'existant est appuyée par une référence `chemin:ligne`
> vérifiée dans le dépôt à la date de rédaction.
>
> Convention de marquage utilisée partout dans le document :
>
> | Marque | Signification |
> | --- | --- |
> | `[EXISTANT]` | Le code, la table ou la route existe déjà et est utilisable en l'état. |
> | `[À CRÉER]` | N'existe pas ; doit être écrit. |
> | `[À MODIFIER]` | Existe mais doit être amendé pour accueillir `OWNER`. |
> | `[BLOQUANT]` | Manque une donnée ou une route sans laquelle l'indicateur est impossible. |

---

## 1. Résumé exécutif

### 1.1 Le besoin

Le propriétaire d'un établissement (le financeur / le dirigeant non opérationnel)
doit pouvoir se connecter à HorizonEcole et n'y voir **que des tableaux de bord
analytiques**, sur **l'intégralité des modules** de son établissement, filtrables
par **année scolaire**, avec **comparaison entre années**.

Il ne gère rien : pas de création, pas de modification, pas de suppression, pas
d'accès aux écrans d'administration, pas d'accès aux fiches individuelles
nominatives sensibles.

### 1.2 La solution retenue (décisions arrêtées, non rediscutées)

1. **`OWNER` est une nouvelle valeur de l'enum `UserRole`**, à la fois côté Prisma
   (`packages/database/prisma/schema.prisma:1227-1233`) et côté TypeScript
   (`packages/types/src/index.ts:106-114`). Ce n'est **pas** un rôle personnalisé
   `Role`/`RoleMenu` (`schema.prisma:1237-1276`).
2. **Un propriétaire = un seul établissement.** L'isolation multi-tenant existante
   par `establishment_id`, injectée par l'extension Prisma
   (`packages/database/src/tenant-extension.ts:228-302`), reste la seule et unique
   barrière. Aucune vue multi-établissements, aucun `runUnscoped`, aucun
   contournement.

### 1.3 Patron d'implémentation

`OWNER` reproduit exactement le patron déjà éprouvé des espaces **Parent** et
**Élève** :

| Aspect | Précédent existant | Référence |
| --- | --- | --- |
| Routeur API dédié, verrouillé par rôle | `router.use(authenticate, requireRole(UserRole.PARENT))` | `apps/api/src/routes/parent-space.ts:26` |
| Idem, plus strict encore | `router.use(authenticate, requireRole(UserRole.STUDENT))` | `apps/api/src/routes/student-space.ts:25` |
| Branche de menu dédiée (pas un filtrage du menu admin) | branche `PARENT` | `apps/web/src/lib/navigation/use-app-navigation.tsx:91-139` |
| Idem | branche `STUDENT` | `apps/web/src/lib/navigation/use-app-navigation.tsx:142-182` |
| Jeu de routes React isolé, `catch-all` vers son propre espace | `isParentRole` / `isStudentRole` | `apps/web/src/App.tsx:161-196` |
| Redirection post-login | `roleHome()` | `apps/web/src/lib/navigation/role-home.ts:13-22` |
| Raccourcis tabbar mobile par rôle | `getTabbarItems()` | `apps/web/src/components/ds/nav/navModel.tsx:81-131` |

### 1.4 Objectifs

| # | Objectif | Critère de réussite |
| --- | --- | --- |
| O1 | Rôle `OWNER` déployable sans régression sur les 5 rôles existants | Migration jouée, tous les tests existants passent |
| O2 | Lecture seule vérifiable | Toute méthode ≠ `GET` sur `/api/owner/*` répond `405` ; aucun `prisma.*.create/update/delete` dans `routes/owner/**` ni `services/owner/**` |
| O3 | Cloisonnement intact | Un `OWNER` de l'école A ne lit aucune ligne de l'école B (test d'isolation) |
| O4 | Couverture fonctionnelle | Tout menu du catalogue ouvert par le `schoolType` donne lieu à au moins un indicateur (cf. §3) |
| O5 | Adaptation au cycle | Le contenu affiché suit `menuKeysForSchoolType()` (`packages/types/src/index.ts:79-89`) et `establishment.modules` (`apps/api/src/services/establishment.service.ts:406-409`) |
| O6 | Comparaison inter-années | Chaque écran accepte `academicYearId` + `compareAcademicYearId` et affiche le delta |

### 1.5 Hors-périmètre

| Exclu | Raison |
| --- | --- |
| Toute écriture, y compris export « qui déclenche un calcul persisté » | Lecture seule stricte |
| Vue consolidée multi-établissements / groupe scolaire | Décision arrêtée §1.2 point 2 |
| Rôle personnalisé `Role`/`RoleMenu` pour le propriétaire | Décision arrêtée §1.2 point 1 |
| Notes individuelles nominatives, dossiers médicaux, adresses, coordonnées parents | Données personnelles sensibles (cf. §7.6) |
| Écrans de gestion (Rôles, Utilisateurs, Établissement, Inscriptions, Saisie) | Lecture seule stricte |
| Envoi d'emails / notifications au propriétaire | Non demandé |
| Refonte des modules non montés (paie, dépenses, budgets) | Voir §11-R3 : leurs routes existent mais ne sont pas montées |

---

## 2. Contexte technique existant

### 2.1 Rôles

Le système a **deux notions de rôle** superposées, et il est capital de ne pas les
confondre :

| Notion | Table / type | Rôle | Référence |
| --- | --- | --- | --- |
| Rôle **système** | `users.role` : enum `UserRole` | Décide des **autorisations API** | `schema.prisma:992`, `schema.prisma:1227-1233` |
| Rôle **personnalisé** | `users.role_id` → `roles` + `role_menus` | Décide uniquement des **menus visibles** du sidebar | `schema.prisma:1235-1276` |

Le commentaire du modèle `Role` le dit explicitement :
« contrôlant uniquement les menus visibles dans le sidebar (pas les autorisations
API, qui restent basées sur `UserRole`) » — `schema.prisma:1235-1236`.

#### 2.1.1 Divergence existante entre les deux enums `UserRole` `[À MODIFIER]`

| Source | Valeurs | Référence |
| --- | --- | --- |
| Prisma | `ADMIN`, `TEACHER`, `ACCOUNTANT`, `STUDENT`, `PARENT` (5) | `schema.prisma:1227-1233` |
| TypeScript | `ADMIN`, `TEACHER`, `SECRETARY`, `ACCOUNTANT`, `PARENT`, `STUDENT`, `STAFF` (7) | `packages/types/src/index.ts:106-114` |

`SECRETARY` et `STAFF` n'existent **pas** en base. Le schéma Zod d'inscription ne
connaît que les 5 valeurs Prisma (`apps/api/src/routes/auth.ts:39`). C'est un
écart préexistant : la spécification n'en demande pas la correction, mais elle
impose de ne pas l'aggraver — `OWNER` doit être ajouté **aux deux** enums (§7.1).

#### 2.1.2 Comment un compte reçoit son rôle système

- Les comptes « personnel » créés par l'écran Utilisateurs reçoivent
  `ADMIN` ou `ACCOUNTANT`, **déduits** du rôle personnalisé choisi : le rôle
  protégé donne `ADMIN`, tout autre donne `ACCOUNTANT`
  (`apps/api/src/routes/users.ts:26`, `apps/api/src/routes/users.ts:157-159`).
  La liste blanche `SYSTEM_ROLES` y est fermée à ces deux valeurs
  (`apps/api/src/routes/users.ts:26`).
- Le compte administrateur initial est créé avec l'établissement
  (`apps/api/src/services/establishment.service.ts:288-322`), qui crée aussi le
  rôle protégé « Administrateur » et lui affecte les menus du type d'école.

### 2.2 Menus et catalogue

#### 2.2.1 Source de vérité backend — `packages/types/src/index.ts`

| Constante | Contenu | Lignes |
| --- | --- | --- |
| `COMMON_MENU_KEYS` | `/dashboard`, `/people/students`, `/people/parents`, `/people/teachers`, `/people/roles`, `/people/users`, `/academic/years`, `/academic/inscriptions`, `/academic/timetable`, `/academic/attendance`, `/academic/uncalled-sessions` | `18-30` |
| `SECONDARY_MENU_KEYS` | `/people/classrooms`, `/academic/classes`, `/academic/subjects`, `/academic/assignments`, `/academic/coefficients`, `/academic/class-grades`, `/academic/conduct`, `/academic/complete-averages` | `33-42` |
| `PRIMARY_MENU_KEYS` | `/primary/classes`, `/primary/evaluations`, `/primary/grades`, `/primary/results` | `45-50` |
| `FINANCE_MENU_KEYS` | `/finance/payment-conditions`, `/finance/fee-rates`, `/finance/payment-schedules`, `/finance/invoices` | `53-58` |
| `ALL_MENU_KEYS` | concaténation — « sert de référence, jamais d'octroi de droits » | `61-66` |
| `SchoolTypeValue` | `'PRIMAIRE' \| 'COLLEGE' \| 'LYCEE'` | `68` |
| `PROTECTED_ADMIN_ROLE_NAME` | `'Administrateur'` | `92` |

`menuKeysForSchoolType()` (`packages/types/src/index.ts:79-89`) :

```
PRIMAIRE          → COMMON + PRIMARY   + FINANCE
COLLEGE | LYCEE   → COMMON + SECONDARY + FINANCE
défaut (inconnu)  → COMMON            + FINANCE
```

> Note d'écart préexistante : `FINANCE_MENU_KEYS` (`packages/types/src/index.ts:53-58`)
> et le groupe `finance` du catalogue front (`apps/web/src/lib/navigation/menu-catalog.ts:75-82`)
> ne listent pas les mêmes clés — le front expose `/finance/payment-conditions`
> et `/finance/payments`, le back `/finance/payment-conditions`,
> `/finance/fee-rates`, `/finance/payment-schedules`, `/finance/invoices`. Le
> profil `OWNER` n'utilisant aucune de ces clés (§7.5), l'écart est hors-périmètre
> mais mérite d'être signalé (§11-Q4).

#### 2.2.2 Catalogue front — `apps/web/src/lib/navigation/menu-catalog.ts`

Groupes `dashboard`, `people`, `academic`, `pedagogy`, `primary`, `finance`
(`apps/web/src/lib/navigation/menu-catalog.ts:24-83`), avec un filtrage par cycle :

- `SECONDARY_ONLY_GROUPS = { 'pedagogy' }` — `menu-catalog.ts:19`
- `PRIMARY_ONLY_GROUPS = { 'primary' }` — `menu-catalog.ts:20`
- `SECONDARY_ONLY_ITEMS = { '/people/classrooms' }` — `menu-catalog.ts:22`
- `menuCatalogForModules()` applique ce filtre — `menu-catalog.ts:94-110`

Ce catalogue sert **l'écran Rôles**, c'est-à-dire l'attribution de menus à un rôle
personnalisé. **Le profil `OWNER` ne doit rien y ajouter** (§7.5).

#### 2.2.3 Navigation applicative — `use-app-navigation.tsx`

Les modules ouverts sont lus depuis l'établissement :

```tsx
const showPrimary   = establishment?.modules.primary   ?? true;
const showSecondary = establishment?.modules.secondary ?? true;
```
— `apps/web/src/lib/navigation/use-app-navigation.tsx:74-75`

Branches par rôle, dans l'ordre d'évaluation :

| Ordre | Test | Comportement | Lignes |
| --- | --- | --- | --- |
| 1 | `role === 'PARENT'` | menu Espace Famille construit **à part** (« il ne "filtre" pas le menu admin ») ; `/parent/attendance` masqué si école primaire pure | `91-139` (dont `92`, `124-129`) |
| 2 | `role === 'STUDENT'` | menu Ma Scolarité, 5 entrées | `142-182` |
| 3 | `user?.role === 'TEACHER'` | 2 variantes : titulaire du primaire (menu à plat, 7 entrées, `191-236`) ou enseignant du secondaire (`238-323`), avec sous-blocs `showPrimary` (`276-297`) et `showSecondary` (`298-322`) | `184-324` |
| 4 | `defaultItems` | menu d'administration complet, avec `showSecondary` sur `/people/classrooms`, `/academic/attendance`, `/academic/uncalled-sessions` (`350-357`), groupe `pedagogy` (`360-373`), groupe `primary` (`374-385`) | `326-405` |
| 5 | `role === 'ADMIN'` → `defaultItems` tel quel | | `407` |
| 6 | sinon `customRole.menuKeys` → `filterMenuByKeys(defaultItems, …)` | | `409-413` |

`filterMenuByKeys()` (`use-app-navigation.tsx:49-61`) élague récursivement l'arbre
Ant Design ; un groupe parent survit s'il lui reste un enfant.

L'effet `useEffect` (`use-app-navigation.tsx:420-474`) calcule les `openKeys` du
sidebar à partir du `pathname` — il devra connaître les chemins `/owner/*`.

#### 2.2.4 Layout, tabbar, thème

| Élément | Contenu actuel | Référence |
| --- | --- | --- |
| `ROLE_LABEL` | `ADMIN`, `TEACHER`, `ACCOUNTANT`, `STUDENT`, `PARENT` — pas de `OWNER` | `apps/web/src/components/layout/Layout.tsx:18-24` |
| Repli si clé absente | `ROLE_LABEL[role] ?? user?.role ?? ''` — affiche « OWNER » brut | `Layout.tsx:83` |
| Menu utilisateur | « Profil de l'établissement » → `/etablissement` pour tout non-titulaire-primaire | `Layout.tsx:50-65` |
| Tabbar mobile | `getTabbarItems(role, { primaryOnly })` : branches `STUDENT`, `PARENT`, `TEACHER`, puis **repli administratif** (`/dashboard`, `/people/students`, `/academic/timetable`, `/academic/inscriptions`) | `apps/web/src/components/ds/nav/navModel.tsx:81-131`, repli `125-130` |
| Accent de rôle CSS | `html[data-role='admin'\|'teacher'\|'accountant'\|'student'\|'parent']` | `apps/web/src/index.css:60-64`, `116-118`, `149-170` |
| Pose de l'attribut | `document.documentElement.setAttribute('data-role', String(user.role).toLowerCase())` | `apps/web/src/components/theme/ThemeProvider.tsx:17-27` |
| Accent Ant Design | `getRoleAccent()` : vert si `TEACHER`, bleu sinon | `apps/web/src/theme/tokens.ts:78-80` |
| Thème clair/sombre | `html[data-theme='dark']` + variantes croisées rôle × thème | `apps/web/src/index.css:136`, `167-170` |

### 2.3 Isolation multi-tenant

| Élément | Rôle | Référence |
| --- | --- | --- |
| `authenticate` | Valide le JWT, charge le compte via `unscopedPrisma`, **ouvre le contexte d'établissement** : `runWithEstablishment(user.establishment_id, () => next())` | `apps/api/src/middleware/auth.ts:29-104`, ouverture ligne `96` |
| Refus si établissement absent/inactif | `403 Établissement inactif` | `apps/api/src/middleware/auth.ts:79-85` |
| `AuthRequest.user` | `{ id, email, role, establishmentId }` | `apps/api/src/middleware/auth.ts:6-14` |
| `runWithEstablishment` / `runUnscoped` | `AsyncLocalStorage` — « aucun [service] ne peut *oublier* de transmettre l'établissement » | `packages/database/src/tenant.ts:28-30`, `40-42` |
| `requireEstablishmentId()` | Lève si la route n'est pas cloisonnée | `packages/database/src/tenant.ts:64-73` |
| Extension Prisma | Injecte `where.establishment_id` sur `findMany/findFirst/count/aggregate/groupBy` (`FILTERABLE_READS`), réécrit `findUnique` en `findFirst`, contrôle l'appartenance avant `update`/`delete` | `packages/database/src/tenant-extension.ts:95-109`, `115-119`, `239-241`, `246-255`, `289-300` |
| Client applicatif cloisonné | `export const prisma = basePrisma.$extends(createTenantExtension(basePrisma))` | `packages/database/src/index.ts:61-71` |
| Client non cloisonné | `export const unscopedPrisma = basePrisma` — « Tout autre usage contournerait l'isolation » | `packages/database/src/index.ts:73-80` |

**Point de vigilance rappelé en mémoire projet et confirmé par le schéma** :
`establishment_id` est déclaré optionnel dans Prisma mais **`NOT NULL` en base**
(commentaire répété sur chaque modèle, p. ex. `schema.prisma:136-148`). Une route
montée **sans `authenticate`** n'ouvre pas le contexte : l'extension se retire
(`tenant-extension.ts:233`), et toute écriture viole la contrainte `NOT NULL`.
Pour `OWNER` (lecture seule), l'effet serait pire encore qu'une erreur : une
**lecture non filtrée**, c'est-à-dire une fuite inter-établissements. `authenticate`
est donc non négociable sur `/api/owner/*` (§7.3).

Un script de vérification existe déjà : `pnpm --filter api verify:tenant`
(`apps/api/package.json`, script `verify:tenant` →
`apps/api/src/scripts/verify-tenant-isolation.ts`), et `tenantScopedModels` est
exposé pour les tests (`packages/database/src/tenant-extension.ts:310`).

### 2.4 Autorisation

```ts
export const requireRole = (...allowedRoles: (UserRole | string | (UserRole | string)[])[]) => { … }
```
— `apps/api/src/middleware/rbac.ts:9-35`

- Accepte indifféremment des chaînes, des membres d'enum, ou des tableaux (aplatis
  ligne `19`).
- `401` si non authentifié (`12-17`), `403 Insufficient permissions` sinon (`25-31`).
- Réexporté depuis `auth.ts` pour commodité : `apps/api/src/middleware/auth.ts:189`.
- `hasAnyRole(req, ...roles)` : helper booléen — `rbac.ts:105-107`.
- `authorize()` est marqué `@deprecated Use requireRole from rbac.ts` —
  `apps/api/src/middleware/auth.ts:158-179`. **Ne pas l'utiliser pour `OWNER`.**
- Helpers booléens existants : `isAdmin`, `isTeacher`, `isAccountant`, `isStudent`,
  `isParent` — `rbac.ts:68-100`. Pas d'`isOwner` (§8).

### 2.5 Précédents d'espaces en lecture seule

| Espace | Montage | Contrôle d'accès | Service de lecture |
| --- | --- | --- | --- |
| Parent | `app.use('/api/parent', parentSpaceRoutes)` — `apps/api/src/index.ts:270` | `router.use(authenticate, requireRole(UserRole.PARENT))` — `parent-space.ts:26` ; `resolveChild()` n'accepte que les élèves liés par `student_parents` — `parent-space.ts:54-95` | `school-space.service.ts` |
| Élève | `app.use('/api/student', studentSpaceRoutes)` — `apps/api/src/index.ts:271` | `router.use(authenticate, requireRole(UserRole.STUDENT))` — `student-space.ts:25` ; « Aucune route n'accepte d'identifiant d'élève » — `student-space.ts:16-22` | `school-space.service.ts` |

Le service partagé `apps/api/src/services/school-space.service.ts` porte la
**lecture**, les routeurs portent l'**autorisation** — « jamais l'inverse »
(`school-space.service.ts:5-13`). C'est exactement la séparation à reproduire
pour `OWNER`.

### 2.6 Ce qui existe déjà côté statistiques — et ses limites

| Route | Montée ? | Garde | Constat |
| --- | --- | --- | --- |
| `GET /api/dashboard/stats` | ✅ `apps/api/src/index.ts:274` | `authenticate` **seul**, aucun `requireRole` — `apps/api/src/routes/dashboard.ts:9` | 7 compteurs bruts, pas de filtre année |
| `GET /api/dashboard/activities` | ✅ | idem — `dashboard.ts:80` | 5 derniers élèves / paiements / notes |
| `/api/analytics/*` | ❌ **non montée** (absente de `apps/api/src/index.ts`) | `requireRole(['ADMIN', 'COMPTABLE'])` — `analytics.ts:8`, `19`, `35`, `51` ; `['ADMIN','ENSEIGNANT']` — `analytics.ts:63`, `75` | **Rôles inexistants** : l'enum ne contient ni `COMPTABLE` ni `ENSEIGNANT` (`schema.prisma:1227-1233`) — ces routes seraient inaccessibles même montées |

`AnalyticsService` est **inutilisable en l'état** pour `OWNER`, pour trois raisons
cumulées :

1. Il instancie son **propre client Prisma non étendu** :
   `const prisma = new PrismaClient();` — `apps/api/src/services/analytics.service.ts:1-3`.
   Ce client **contourne intégralement le cloisonnement** (`packages/database/src/index.ts:61-71`).
2. Plusieurs agrégats sont désactivés en dur : `byLevel` et `byGender` renvoient
   `Promise.resolve([])` (`analytics.service.ts:64-67`), les revenus renvoient
   `{ _sum: { amount: 0 } }` faute de modèle (`analytics.service.ts:110-111`), les
   retards renvoient `0` (`analytics.service.ts:122`).
3. Il référence des modèles absents du schéma (`staff`, `reportCard`) et retombe
   sur des substituts (`analytics.service.ts:149-152`, `194-195`).

**Décision** : `OWNER` n'utilise ni `/api/dashboard` ni `/api/analytics`. Un
service d'agrégation neuf, bâti sur le client `prisma` cloisonné importé de
`@school/database`, est écrit dans `apps/api/src/services/owner/` (§6).

### 2.7 Routes existantes mais non montées `[BLOQUANT]` pour certains domaines

Vérifié par balayage de `apps/api/src/index.ts` :

| Fichier de route | Domaine | Conséquence pour `OWNER` |
| --- | --- | --- |
| `apps/api/src/routes/analytics.ts` | Analytique | Sans objet (§2.6) |
| `apps/api/src/routes/expenses.ts` | Dépenses | Les données `expenses` existent en base (`schema.prisma:577-609`) mais aucune API ne les sert |
| `apps/api/src/routes/budgets.ts`, `budget-lines.ts`, `budget-transactions.ts` | Budgets | Idem (`schema.prisma:384-462`) |
| `apps/api/src/routes/payroll.ts` | Paie / masse salariale | Idem (`schema.prisma:2481-2614`) |
| `apps/api/src/routes/revenues.ts` | Recettes | **Aucun modèle `revenue` dans le schéma** — cf. `analytics.service.ts:110-111` |
| `apps/api/src/routes/staff.ts`, `staff-salaries.ts` | Personnel non-enseignant | **Aucun modèle `staff`** — seul `teachers` existe (`schema.prisma:1405-1458`) |
| `apps/api/src/routes/teacher-hours.ts` | Heures effectuées | Table `teacher_hours` existante (`schema.prisma:2413-2443`) |
| `apps/api/src/routes/teacher-absences.ts` | Absences enseignants | Table `teacher_absences` existante (`schema.prisma:2446-2478`) |
| `apps/api/src/routes/teacher-remuneration.ts` | Rémunération | Table `teacher_remuneration` existante (`schema.prisma:2314-2330`) |

**Cela ne bloque pas `OWNER`** : les services d'agrégation `owner` lisent les
tables Prisma directement, ils ne consomment pas ces routes. Mais cela signifie
que les données concernées peuvent être **vides en production** faute d'écran de
saisie monté. Chaque indicateur concerné est marqué en §4 (colonne « Dispo. »).

### 2.8 Design system disponible

| Composant | Export | Référence |
| --- | --- | --- |
| `Card` (+ `accent`, `hover`, `padded`) | `@/components/ds` | `apps/web/src/components/ds/Card.tsx:13-45`, `apps/web/src/components/ds/index.ts:3` |
| `Tabs` (contrôlé, `role="tablist"`, flèches) | idem | `apps/web/src/components/ds/Tabs.tsx:8-45`, `index.ts:7` |
| `Skeleton`, `Button`, `Input`/`Field`/`SearchInput`, `StatusBadge`, `Drawer`, `Modal`, `toast` | idem | `apps/web/src/components/ds/index.ts:2-10` |
| `AppShell`, `AppSidebar`, `AppTopbar`, `MobileTabbar`, `adaptMenu`, `getTabbarItems` | `@/components/ds/nav` | `apps/web/src/components/ds/nav/index.ts:2-6` |
| `StatCard` (label / value / icon) | `@/components/ui` | `apps/web/src/components/ui/stat-card.tsx:5-19`, `apps/web/src/components/ui/index.ts:2` |
| Grille de stat-cards CSS | `.ds-stat-grid` (4 col., `--ds-stat-cols` réglable ; 2 col. puis 1 col. en responsive) | `apps/web/src/index.css:1777`, `1817`, `1821` |
| Anatomie d'une stat-card | `.ds-stat`, `.ds-stat-body`, `.ds-stat-label`, `.ds-stat-value`, `.ds-stat-medallion` | `apps/web/src/index.css:1779-1783` |
| Exemple d'usage complet | `DashboardBoard` : 4 stat-cards + activité récente, présentation pure | `apps/web/src/components/dashboard/DashboardBoard.tsx:63-163` |

**`[BLOQUANT]` léger — aucune librairie de graphiques** : `apps/web/package.json`
ne contient ni `recharts`, ni `chart.js`, ni `d3`, ni `visx`. Les seules
dépendances graphiques sont `jspdf` / `jspdf-autotable` (export PDF). Les
visualisations `OWNER` doivent donc être **soit des SVG faits main**, soit
introduire une dépendance. Décision proposée en §11-Q1.

---

## 3. Matrice module × type d'école

Lecture : pour chaque clé de menu du catalogue, quelle statistique propriétaire en
découle, et pour quels cycles. La colonne « Ouvert par » reprend
`menuKeysForSchoolType()` (`packages/types/src/index.ts:79-89`).

### 3.1 Tronc commun — `COMMON_MENU_KEYS`

| Clé de menu | Ouvert par | Statistique propriétaire | Domaine §4 | PRIMAIRE | COLLEGE | LYCEE |
| --- | --- | --- | --- | :-: | :-: | :-: |
| `/dashboard` | tous | Remplacé par la page d'accueil `OWNER` (10 KPI) | h | ✅ | ✅ | ✅ |
| `/people/students` | tous | Effectifs : par niveau, classe, sexe, âge, statut | a | ✅ | ✅ | ✅ |
| `/people/parents` | tous | **Aucune** — donnée personnelle, hors-périmètre (§7.6) | — | ⛔ | ⛔ | ⛔ |
| `/people/teachers` | tous | Effectif enseignant, contrats, ancienneté, couverture matières | e | ✅ | ✅ | ✅ |
| `/people/roles` | tous | **Aucune** — écran d'administration, interdit (§7.6) | — | ⛔ | ⛔ | ⛔ |
| `/people/users` | tous | **Aucune** — écran d'administration, interdit (§7.6) | — | ⛔ | ⛔ | ⛔ |
| `/academic/years` | tous | Alimente le **sélecteur d'année** (référentiel, pas un indicateur) | §5.3 | ✅ | ✅ | ✅ |
| `/academic/inscriptions` | tous | Nouveaux vs réinscrits, évolution, départs | a | ✅ | ✅ | ✅ |
| `/academic/timetable` | tous | Volume horaire, occupation des salles, conflits | g | ✅ | ✅ | ✅ |
| `/academic/attendance` | tous *(mais front : secondaire seulement — `use-app-navigation.tsx:354-357`)* | Taux de présence/absence, retards, justifiées | b | ⚠️ | ✅ | ✅ |
| `/academic/uncalled-sessions` | tous *(idem, secondaire seulement)* | Séances non tenues, taux d'appel | b | ⚠️ | ✅ | ✅ |

⚠️ **Nuance importante** : `menuKeysForSchoolType()` place `/academic/attendance`
et `/academic/uncalled-sessions` dans le **tronc commun**
(`packages/types/src/index.ts:28-29`), mais la navigation applicative ne les
affiche **que si `showSecondary`** (`apps/web/src/lib/navigation/use-app-navigation.tsx:354-357`).
L'espace Parent confirme cette lecture : `/parent/attendance` est masqué dans une
école primaire pure (`use-app-navigation.tsx:92`, `124-129`).
**Décision retenue pour `OWNER`** : suivre la navigation, pas le catalogue. Le
domaine « Assiduité » n'est proposé que si `establishment.modules.secondary`.

### 3.2 Secondaire — `SECONDARY_MENU_KEYS` (COLLEGE / LYCEE)

| Clé de menu | Statistique propriétaire | Domaine §4 | PRIMAIRE | COLLEGE | LYCEE |
| --- | --- | --- | :-: | :-: | :-: |
| `/people/classrooms` | Occupation des salles, créneaux libres | g | ⛔ | ✅ | ✅ |
| `/academic/classes` | Effectif par classe, capacité vs occupation | a | ⛔ | ✅ | ✅ |
| `/academic/subjects` | Moyennes par matière, meilleures / plus faibles | c | ⛔ | ✅ | ✅ |
| `/academic/assignments` | Taux de couverture des matières par enseignant | e | ⛔ | ✅ | ✅ |
| `/academic/coefficients` | Effet des coefficients (moyenne pondérée vs brute) | c | ⛔ | ✅ | ✅ |
| `/academic/class-grades` | Distribution des notes, écart-type, taux ≥ 10 | c | ⛔ | ✅ | ✅ |
| `/academic/conduct` | Note de conduite moyenne, distribution, pénalités | b | ⛔ | ✅ | ✅ |
| `/academic/complete-averages` | Moyennes complètes, MGA, classements, taux de réussite | c | ⛔ | ✅ | ✅ |

### 3.3 Primaire — `PRIMARY_MENU_KEYS` (PRIMAIRE)

| Clé de menu | Statistique propriétaire | Domaine §4 | PRIMAIRE | COLLEGE | LYCEE |
| --- | --- | --- | :-: | :-: | :-: |
| `/primary/classes` | Grille des matières, diviseur, seuils admission/redoublement par classe | d | ✅ | ⛔ | ⛔ |
| `/primary/evaluations` | Nombre de compositions par classe/période, calendrier, verrouillage | d | ✅ | ⛔ | ⛔ |
| `/primary/grades` | Moyennes, classements, mentions, taux de réussite, comparaison inter-classes | d | ✅ | ⛔ | ⛔ |
| `/primary/results` *(clé backend sans écran front — cf. `menu-catalog.ts:69-73`)* | Résultats annuels consolidés CP1→CM2 | d | ✅ | ⛔ | ⛔ |

> Écart préexistant signalé : `PRIMARY_MENU_KEYS` contient `/primary/results`
> (`packages/types/src/index.ts:49`) mais le groupe `primary` du catalogue front
> ne l'expose pas (`apps/web/src/lib/navigation/menu-catalog.ts:69-73`), et aucune
> route React `/primary/results` n'est déclarée (`apps/web/src/App.tsx:229-240`).
> Sans incidence sur `OWNER`, qui lit les tables, pas les écrans.

### 3.4 Finance — `FINANCE_MENU_KEYS` (tous types)

| Clé de menu | Statistique propriétaire | Domaine §4 | PRIMAIRE | COLLEGE | LYCEE |
| --- | --- | --- | :-: | :-: | :-: |
| `/finance/payment-conditions` | Répartition des élèves par échéancier, tranches, retards par tranche | f | ✅ | ✅ | ✅ |
| `/finance/fee-rates` | Tarifs par niveau, écart tarif vs facturé | f | ✅ | ✅ | ✅ |
| `/finance/payment-schedules` | Échéances à venir / échues, retard moyen | f | ✅ | ✅ | ✅ |
| `/finance/invoices` | Chiffre d'affaires facturé, par type de frais / classe / niveau | f | ✅ | ✅ | ✅ |
| `/finance/payments` *(clé front — `menu-catalog.ts:80`)* | Encaissé, taux de recouvrement, saisonnalité, top débiteurs | f | ✅ | ✅ | ✅ |

### 3.5 Modules sans clé de menu — statistiques néanmoins produites

Ces domaines n'ont **pas** d'entrée de menu (leurs routes ne sont pas montées,
§2.7) mais leurs tables existent et alimentent des indicateurs propriétaire.

| Tables | Statistique propriétaire | Domaine §4 | Dispo. |
| --- | --- | --- | --- |
| `expenses` (`schema.prisma:577-609`) | Dépenses par catégorie, statut, saisonnalité | f | ⚠️ route non montée |
| `budgets`, `budget_lines`, `budget_transactions` (`schema.prisma:384-462`) | Budget prévu vs réalisé | f | ⚠️ route non montée |
| `monthly_payrolls`, `payroll_payments`, `advance_payments` (`schema.prisma:2481-2614`) | Masse salariale, net payé, acomptes | e, f | ⚠️ route non montée |
| `teacher_hours` (`schema.prisma:2413-2443`) | Heures effectuées (vacataires) | e | ⚠️ route non montée |
| `teacher_absences` (`schema.prisma:2446-2478`) | Absences enseignants | b, e | ⚠️ route non montée |
| `disciplinary_incidents` (`schema.prisma:549-575`) | Incidents par gravité | b | ⚠️ route `discipline` montée (`index.ts:246`) mais sans écran de menu |

### 3.6 Synthèse — écrans `OWNER` par type d'école

| Écran `OWNER` | Condition d'affichage | PRIMAIRE | COLLEGE | LYCEE |
| --- | --- | :-: | :-: | :-: |
| `/owner` (accueil KPI) | toujours | ✅ | ✅ | ✅ |
| `/owner/effectifs` | toujours | ✅ | ✅ | ✅ |
| `/owner/assiduite` | `modules.secondary` | ⛔ | ✅ | ✅ |
| `/owner/resultats` | toujours — onglet « Secondaire » si `modules.secondary`, onglet « Primaire » si `modules.primary` | ✅ (primaire) | ✅ (secondaire) | ✅ (secondaire) |
| `/owner/enseignants` | toujours | ✅ | ✅ | ✅ |
| `/owner/finance` | toujours | ✅ | ✅ | ✅ |
| `/owner/ressources` | toujours | ✅ | ✅ | ✅ |

Un établissement peut avoir **les deux modules actifs** : `getEstablishment()`
active `primary` si des classes de cycle `PRIMAIRE` existent, et `secondary` si
des classes `SECONDAIRE` existent, indépendamment du `schoolType`
(`apps/api/src/services/establishment.service.ts:398-409`). L'écran `/owner/resultats`
affiche alors **deux onglets** (`Tabs`, `apps/web/src/components/ds/Tabs.tsx:20`).

---

## 4. Catalogue exhaustif des indicateurs

### 4.0 Conventions communes

**Filtres globaux** — disponibles sur *tous* les indicateurs sauf mention contraire :

| Filtre | Paramètre | Valeur | Origine |
| --- | --- | --- | --- |
| Année scolaire | `academicYearId` | UUID | `academic_years.id` (`schema.prisma:105-150`) |
| Année de comparaison | `compareAcademicYearId` | UUID, optionnel | idem |
| Profondeur d'historique | `years` | entier 1-10, défaut 5 | — |

**Filtres locaux** — proposés selon le domaine, notés `L1`…`L8` :

| Code | Filtre | Paramètre | Source |
| --- | --- | --- | --- |
| `L1` | Niveau | `level` | `classes.level` (`schema.prisma:494`) |
| `L2` | Classe | `classId` | `classes.id` (`schema.prisma:492`) |
| `L3` | Cycle | `cycle` | `classes.cycle` : enum `SchoolCycle` (`schema.prisma:500`, `1062-1065`) |
| `L4` | Matière | `subjectId` | `subjects.id` (`schema.prisma:951`) |
| `L5` | Trimestre / semestre | `semesterId` | `semesters.id` (`schema.prisma:1656`) |
| `L6` | Enseignant | `teacherId` | `teachers.id` (`schema.prisma:1406`) |
| `L7` | Période calendaire | `startDate` / `endDate` | — |
| `L8` | Sexe | `gender` | `students.gender` (`schema.prisma:881`) |

**Convention de comparaison N vs N-1** : chaque valeur numérique est renvoyée sous
la forme `{ value, previous, delta, deltaPct }`, où `previous` est calculé sur
`compareAcademicYearId` (null si non fourni), `delta = value - previous`, et
`deltaPct = previous === 0 ? null : delta / previous`. Ce contrat est décrit
formellement en §6.3.

**Colonne « Dispo. »** :

| Symbole | Sens |
| --- | --- |
| ✅ | Table alimentée par un écran monté aujourd'hui |
| ⚠️ | Table présente au schéma, mais **route de saisie non montée** (§2.7) — peut être vide en production |
| 🔧 | Nécessite un **ajout de colonne** au schéma (`[À CRÉER]`) |

---

### 4.a Effectifs & scolarité

**Table de référence** : `students` (`schema.prisma:871-948`),
`inscriptions` (`schema.prisma:611-640`), `classes` (`schema.prisma:491-547`).

Point de modélisation essentiel : l'appartenance d'un élève à une année scolaire
passe par `inscriptions`, contrainte unique `@@unique([student_id, academic_year_id])`
(`schema.prisma:622`). `students.class_id` (`schema.prisma:896`) ne porte que la
classe **courante** et ne permet aucune lecture historique. **Tous les indicateurs
d'effectif se lisent donc via `inscriptions`, jamais via `students.class_id`.**

| Code | Nom | Définition métier | Formule | Source Prisma (table.colonne) | Granularité | Filtres | Visualisation | Cycles | Dispo. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | :-: |
| `EFF-01` | Effectif inscrit | Nombre d'élèves ayant une inscription sur l'année | `COUNT(inscriptions WHERE academic_year_id = :y)` | `inscriptions.id`, `.academic_year_id` | école | `L1`,`L2`,`L3` | Stat-card + delta N-1 | tous | ✅ |
| `EFF-02` | Effectif par niveau | Répartition de `EFF-01` par niveau de classe | `groupBy(classes.level) COUNT(inscriptions)` via `inscriptions.class_id → classes.level` | `inscriptions.class_id`, `classes.level` | niveau | `L3` | Barres horizontales | tous | ✅ |
| `EFF-03` | Effectif par classe | Idem au grain classe | `groupBy(inscriptions.class_id) COUNT(*)` | `inscriptions.class_id`, `classes.name` | classe | `L1`,`L3` | Tableau trié + barres | tous | ✅ |
| `EFF-04` | Répartition par sexe | Part filles / garçons | `groupBy(students.gender) COUNT(*)` sur les élèves inscrits | `students.gender`, jointure `inscriptions.student_id` | école / niveau / classe | `L1`,`L2` | Donut + % | tous | ✅ |
| `EFF-05` | Parité par classe | Ratio F/G par classe, pour repérer les déséquilibres | `count(F) / count(M)` par `class_id` | idem `EFF-04` | classe | `L1` | Barres empilées 100 % | tous | ✅ |
| `EFF-06` | Pyramide des âges | Distribution des âges au 31/12 de l'année de début | `age = start_year - EXTRACT(YEAR FROM students.date_of_birth)`, `academic_years.start_year` | `students.date_of_birth` (`schema.prisma:879`), `academic_years.start_year` (`schema.prisma:108`) | école / niveau | `L1`,`L8` | Histogramme | tous | ✅ |
| `EFF-07` | Âge moyen par niveau | Moyenne d'âge, révèle les retards scolaires | `AVG(age)` groupé par `classes.level` | idem `EFF-06` | niveau | `L8` | Barres + ligne de référence | tous | ✅ |
| `EFF-08` | Nouveaux élèves | Inscrits en N n'ayant **aucune** inscription en N-1 | `COUNT(inscriptions_N WHERE student_id NOT IN (SELECT student_id FROM inscriptions_{N-1}))` | `inscriptions.student_id`, `.academic_year_id` | école / niveau | `L1` | Stat-card + barres empilées avec `EFF-09` | tous | ✅ |
| `EFF-09` | Réinscrits | Inscrits en N **déjà** inscrits en N-1 | `EFF-01 − EFF-08` | idem | école / niveau | `L1` | idem | tous | ✅ |
| `EFF-10` | Taux de réinscription | Fidélisation d'une cohorte | `EFF-09(N) / EFF-01(N-1)` | idem | école / niveau | `L1` | Jauge % + delta | tous | ✅ |
| `EFF-11` | Départs / non-réinscrits | Inscrits en N-1 absents de N | `COUNT(inscriptions_{N-1}.student_id NOT IN inscriptions_N.student_id)` | idem | école / niveau | `L1` | Stat-card (accent `danger`) | tous | ✅ |
| `EFF-12` | Sorties par statut | Ventilation des élèves non actifs | `groupBy(students.status)` pour `status ≠ ACTIVE` | `students.status` : enum `StudentStatus` = `ACTIVE`,`INACTIVE`,`GRADUATED`,`TRANSFERRED`,`EXPELLED` (`schema.prisma:898`, `1208-1214`) | école | — | Donut | tous | ✅ |
| `EFF-13` | Taux d'abandon | Part de départs non expliqués par un diplôme | `(TRANSFERRED + EXPELLED + INACTIVE) / EFF-01` | idem `EFF-12` | école / niveau | `L1` | Jauge % | tous | ✅ |
| `EFF-14` | Évolution pluriannuelle des effectifs | Série `EFF-01` sur les N dernières années | série `(academic_years.name, COUNT(inscriptions))` triée par `start_year` | `academic_years.name`, `.start_year` (`schema.prisma:107-109`) | école / niveau | `L1`, `years` | Courbe multi-séries | tous | ✅ |
| `EFF-15` | Élèves affectés par l'État | Part des élèves à tarif « affecté » | `COUNT(students WHERE is_state_assigned = true) / EFF-01` | `students.is_state_assigned` (`schema.prisma:906`) | école / niveau | `L1` | Stat-card + % | tous | ✅ |
| `EFF-16` | Occupation d'une classe | Effectif rapporté à la capacité déclarée | `EFF-03 / classes.capacity` | `classes.capacity` 🔧 **absente du schéma** | classe | `L1` | Barres + seuil | tous | 🔧 |
| `EFF-17` | Classes en sur/sous-effectif | Classes hors bande cible | `EFF-16 > 1` (surcharge) ou `< 0,6` (sous-remplissage) | idem `EFF-16` | classe | `L1` | Tableau à badges `StatusBadge` | tous | 🔧 |
| `EFF-18` | Effectif moyen par classe | Substitut de `EFF-16` tant que la capacité n'existe pas | `EFF-01 / COUNT(DISTINCT inscriptions.class_id)` | `inscriptions.class_id` | école / niveau | `L1` | Stat-card | tous | ✅ |
| `EFF-19` | Taux d'occupation des salles | Créneaux occupés rapportés aux créneaux ouvrables | voir `RES-01` (§4.g) | `class_timetables`, `classrooms` | salle | `L7` | cf. §4.g | secondaire | ✅ |

#### `[À CRÉER]` — colonnes de capacité

Les indicateurs `EFF-16` et `EFF-17` sont **impossibles en l'état** :

- Le modèle Prisma `SchoolClass` (`schema.prisma:491-547`) porte `id`, `name`,
  `level`, `cycle`, `payment_condition_id`, `createdAt`, `establishment_id` — **pas
  de capacité**. Le champ `maxStudents` n'existe **que** dans l'interface
  TypeScript `SchoolClass` (`packages/types/src/index.ts:489`), sans contrepartie
  en base.
- Le modèle `classrooms` (`schema.prisma:1548-1572`) porte `id`, `name`,
  `created_at`, `updated_at`, `establishment_id` — **pas de capacité** non plus.

Deux colonnes sont donc à créer, dans une migration distincte de celle de l'enum
(§7.1) :

```prisma
model SchoolClass {
  // …
  /// Effectif maximal visé pour la classe. Null = non renseigné : les
  /// indicateurs de remplissage retombent alors sur l'effectif moyen (EFF-18).
  capacity Int? @map("capacity")
}

model classrooms {
  // …
  /// Nombre de places assises de la salle. Null = non renseigné.
  capacity Int? @map("capacity")
}
```

Tant que ces colonnes sont nulles, `EFF-16`/`EFF-17` doivent afficher l'état vide
« Capacité non renseignée » (§5.7) et **non** un zéro trompeur.

---

### 4.b Assiduité & vie scolaire

**Affiché uniquement si `establishment.modules.secondary`** (§3.1, ⚠️).

Il existe **deux mécanismes d'appel distincts** dans le schéma, qui ne doivent pas
être mélangés :

| Mécanisme | Tables | Grain | Référence |
| --- | --- | --- | --- |
| Appel **demi-journée** | `attendances` | (élève, date, `MORNING`/`AFTERNOON`) — unique par `@@unique([student_id, date, period])` | `schema.prisma:183-214`, unicité `199` |
| Appel **par séance de cours** | `attendance_sessions` + `attendance_records` | (année, classe, matière, enseignant, date, heure) puis un enregistrement par élève | `schema.prisma:219-278`, unicité session `242`, unicité record `275` |

Le commentaire du schéma est sans ambiguïté : l'appel par séance « remplace l'appel
demi-journée pour l'enseignant » (`schema.prisma:216-218`). **Les indicateurs
propriétaires s'appuient donc sur `attendance_sessions`/`attendance_records`**,
`attendances` n'étant conservé que pour l'indicateur de repli `ASS-11`.

Une troisième table, `student_absences` (`schema.prisma:1796-1839`), compte des
**heures** d'absence par (élève, semestre, matière, enseignant) — c'est elle qui
alimente le calcul de conduite (`apps/api/src/services/conduct.service.ts:338-339`).

| Code | Nom | Définition métier | Formule | Source Prisma | Granularité | Filtres | Visualisation | Cycles | Dispo. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | :-: |
| `ASS-01` | Taux de présence | Part des présences sur l'ensemble des relevés | `COUNT(records WHERE status = 'PRESENT') / COUNT(records)` | `attendance_records.status` : enum `AttendanceStatus` = `PRESENT`,`ABSENT`,`LATE`,`EXCUSED` (`schema.prisma:267`, `1072-1077`) | école | `L1`,`L2`,`L4`,`L5`,`L7` | Stat-card + jauge | secondaire | ✅ |
| `ASS-02` | Taux d'absence | Complément de `ASS-01` | `COUNT(status IN ('ABSENT','EXCUSED')) / COUNT(records)` | idem | école / niveau / classe | idem | Jauge + delta N-1 | secondaire | ✅ |
| `ASS-03` | Absences justifiées vs non | Part des absences couvertes par un justificatif | `COUNT(status='ABSENT' AND is_justified) / COUNT(status='ABSENT')` | `attendance_records.is_justified` (`schema.prisma:269`) | école / classe | `L1`,`L2`,`L7` | Barres empilées 100 % | secondaire | ✅ |
| `ASS-04` | Taux de retard | Part des `LATE` | `COUNT(status='LATE') / COUNT(records)` | `attendance_records.status` | école / classe / matière | `L1`,`L2`,`L4` | Jauge + top 5 classes | secondaire | ✅ |
| `ASS-05` | Volume d'absences en heures | Heures cumulées d'absence, base du calcul de conduite | `SUM(student_absences.hours_absent)` | `student_absences.hours_absent` `Decimal(3,1)` (`schema.prisma:1804`) | école / classe / matière / élève* | `L1`,`L2`,`L4`,`L5` | Barres | secondaire | ✅ |
| `ASS-06` | Absences par matière | Matières les plus désertées | `SUM(hours_absent) groupBy subject_id`, normalisé par volume horaire (`RES-04`) | `student_absences.subject_id` (`schema.prisma:1802`) | matière | `L1`,`L5` | Barres triées | secondaire | ✅ |
| `ASS-07` | Séances tenues | Nombre d'appels effectivement saisis | `COUNT(attendance_sessions)` | `attendance_sessions.id` (`schema.prisma:220`) | école / classe / matière / enseignant | `L1`,`L2`,`L4`,`L6`,`L7` | Stat-card | secondaire | ✅ |
| `ASS-08` | Séances non tenues | Créneaux d'emploi du temps sans appel correspondant | `occurrences_attendues(class_timetables) − ASS-07`, arbitrées par `attendance_makeup_sessions` | `class_timetables` (`schema.prisma:1614-1653`), `attendance_makeup_sessions.status` (`schema.prisma:300`) | école / classe / matière / enseignant | idem `ASS-07` | Stat-card `danger` + tableau | secondaire | ✅ |
| `ASS-09` | Taux de couverture d'appel | Fiabilité du relevé de présence | `ASS-07 / (ASS-07 + ASS-08)` | idem | école / enseignant | `L6`,`L7` | Jauge % | secondaire | ✅ |
| `ASS-10` | Séances rattrapées vs écartées | Suites données aux séances manquées | `groupBy(attendance_makeup_sessions.status)` — `SCHEDULED`, `DISMISSED`, `MOVED` | `attendance_makeup_sessions.status` `VarChar(20)` (`schema.prisma:300`), `makeup_date` (`299`) | école / enseignant | `L6`,`L7` | Donut | secondaire | ✅ |
| `ASS-11` | Demandes de déplacement de cours | Volume et sort des demandes enseignant → administration | `groupBy(attendance_move_requests.status)` — `PENDING`, `APPROVED`, … | `attendance_move_requests.status` défaut `'PENDING'` (`schema.prisma:331`) | école / enseignant | `L6`,`L7` | Barres empilées | secondaire | ✅ |
| `ASS-12` | Assiduité demi-journée *(repli)* | Taux de présence issu de l'appel demi-journée historique | `COUNT(attendances WHERE status='PRESENT') / COUNT(attendances)` | `attendances.status`, `.period` : enum `TimePeriod` (`schema.prisma:189`, `1216-1219`) | école / classe | `L1`,`L2`,`L7` | Courbe mensuelle | secondaire | ✅ |
| `ASS-13` | Absences enseignants (heures) | Heures d'absence déclarées côté enseignant | `SUM(teacher_absences.hours_absent)` | `teacher_absences.hours_absent` `Decimal(5,2)` (`schema.prisma:2450`) | école / enseignant | `L6`,`L7` | Barres + delta N-1 | tous | ⚠️ |
| `ASS-14` | Absences enseignants justifiées | Part couverte par un motif | `COUNT(is_justified) / COUNT(*)` | `teacher_absences.is_justified` (`schema.prisma:2451`), `.reason` (`2452`) | école / enseignant | `L6` | Barres empilées 100 % | tous | ⚠️ |
| `ASS-15` | Note de conduite moyenne | Moyenne des notes de comportement du trimestre | `AVG(conduct_grades.final_note)` | `conduct_grades.final_note` `Decimal(5,2)` (`schema.prisma:1894`) | école / niveau / classe | `L1`,`L2`,`L5` | Stat-card + barres par classe | secondaire | ✅ |
| `ASS-16` | Distribution des notes de conduite | Répartition par tranche de 2 points | histogramme sur `final_note`, bornes `[0-2[ … [18-20]` | idem | école / classe | `L1`,`L2`,`L5` | Histogramme | secondaire | ✅ |
| `ASS-17` | Pénalité de conduite moyenne | Points perdus en moyenne, mesure directe de l'absentéisme | `AVG(conduct_grades.penalty)`, avec `penalty = f(absence_hours, hours_per_point)` | `conduct_grades.penalty` (`schema.prisma:1891`), `.absence_hours` (`1890`), `conduct_settings.hours_per_point` défaut `2` (`schema.prisma:1854`), `.base_note` défaut `20` (`1853`) | école / classe | `L1`,`L2`,`L5` | Barres | secondaire | ✅ |
| `ASS-18` | Élèves sous le seuil de conduite | Part d'élèves à `final_note` < 10 | `COUNT(final_note < 10) / COUNT(*)` | `conduct_grades.final_note` | école / classe | `L1`,`L2`,`L5` | Stat-card `warning` | secondaire | ✅ |
| `ASS-19` | Corrections manuelles de conduite | Heures d'absence corrigées a posteriori — indicateur de qualité de saisie | `COUNT(conduct_absence_overrides)`, `SUM(hours)` | `conduct_absence_overrides.hours` (`schema.prisma:1940`), `.reason` (`1941`) | école / classe / matière | `L1`,`L2`,`L4`,`L5` | Stat-card | secondaire | ✅ |
| `ASS-20` | Incidents disciplinaires | Volume d'incidents par gravité | `groupBy(disciplinary_incidents.severity) COUNT(*)` | `disciplinary_incidents.severity` : enum `IncidentSeverity` = `MINEUR`,`MOYEN`,`GRAVE`,`TRES_GRAVE` (`schema.prisma:557`, `1135-1140`) | école / niveau | `L1`,`L7` | Barres empilées | secondaire | ⚠️ |

\* **Grain élève : agrégé uniquement.** Aucun indicateur d'assiduité n'expose de
nom d'élève au propriétaire (§7.6). Le grain « élève » sert exclusivement au
calcul intermédiaire (ex. « nombre d'élèves à plus de 20 h d'absence »).

#### Note de calcul — `ASS-08` « Séances non tenues »

Le service existant `apps/api/src/services/attendance-session.service.ts` calcule
déjà des agrégats voisins : il compte les élèves attendus par séance
(`expected += headcountByClass.get(s.class_id)`,
`attendance-session.service.ts:560`, `582`, `663`) et les relevés manquants par
élève (`missing: Math.max(0, sessions.length - st.marks)`,
`attendance-session.service.ts:645`). La route `GET /api/attendance-sessions/overview`
existe et est réservée à `ADMIN` (`apps/api/src/routes/attendance-sessions.ts:87`).

**`OWNER` ne réutilise pas cette route** (elle est `ADMIN`-only et non paramétrée
par année) mais **doit réutiliser la même définition métier** pour rester
cohérent avec l'écran `AdminUncalledSessionsPage` (`apps/web/src/App.tsx:218`).
L'algorithme est donc extrait dans une fonction partagée (§8, `[À MODIFIER]` sur
`attendance-session.service.ts`) ou, à défaut, recopié à l'identique dans
`owner/attendance.service.ts` avec un renvoi de commentaire explicite.

---

### 4.c Résultats pédagogiques — SECONDAIRE

**Affiché uniquement si `establishment.modules.secondary`.**

Modèle de calcul, tel qu'il est implémenté dans
`apps/api/src/services/school-space.service.ts` (service de référence, partagé
Parent/Élève) :

1. **Normalisation** — une note sur 10 vaut demi-poids :
   `maxNote === 10 ? { value: (note/10)*20, weight: 0.5 } : { value: note, weight: 1 }`
   — `school-space.service.ts:28-31`.
2. **Moyenne par matière** — `sum / weight` arrondi à 2 décimales
   — `school-space.service.ts:266`, arrondi `33`.
3. **Coefficients** — lus sur `class_subjects.coefficient`, défaut 1 si la matière
   n'y figure pas — `school-space.service.ts:36-45`, `schema.prisma:470`.
4. **Moyenne générale** — `Σ(moyenne_matière × coefficient) / Σ(coefficients)`
   — `school-space.service.ts:272-292`.
5. **Moyenne générale annuelle (MGA)** — le trimestre porte lui-même un
   coefficient : « les deux derniers trimestres comptent double (1er = 1, 2e et
   3e = 2), d'où une MGA sur 5 coefficients : (T1 + 2×T2 + 2×T3) / 5 »
   — `schema.prisma:1661-1664`, colonne `semesters.coefficient` défaut 1
   (`schema.prisma:1664`).
6. **Conduite** — `conduct_settings.coefficient` (`schema.prisma:1857`) définit son
   poids dans la moyenne générale.

| Code | Nom | Définition métier | Formule | Source Prisma | Granularité | Filtres | Visualisation | Cycles | Dispo. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | :-: |
| `SEC-01` | Moyenne générale école | Moyenne des moyennes générales élèves | `AVG(moyenne_générale_élève)` (étape 4 ci-dessus) | `grades.note`, `.max_note` (`schema.prisma:1759-1760`), `class_subjects.coefficient` (`470`) | école | `L5` | Stat-card + delta N-1 | secondaire | ✅ |
| `SEC-02` | Moyenne par niveau | Idem au grain niveau | `AVG` groupé par `classes.level` | idem + `classes.level` (`494`) | niveau | `L5` | Barres | secondaire | ✅ |
| `SEC-03` | Moyenne par classe | Idem au grain classe | `AVG` groupé par `grades.class_id` | `grades.class_id` (`schema.prisma:1757`) | classe | `L1`,`L5` | Barres triées + médiane | secondaire | ✅ |
| `SEC-04` | Moyenne par matière | Moyenne normalisée sur 20 par matière | `Σ(note_normalisée × poids) / Σ(poids)` groupé par `subject_id` | `grades.subject_id` (`1754`), `subjects.name` (`952`) | matière | `L1`,`L2`,`L5` | Barres triées | secondaire | ✅ |
| `SEC-05` | Meilleures matières | 5 matières de moyenne la plus haute | `TOP 5 DESC(SEC-04)` | idem | matière | `L1`,`L2`,`L5` | Liste + badges verts | secondaire | ✅ |
| `SEC-06` | Matières les plus faibles | 5 matières de moyenne la plus basse | `TOP 5 ASC(SEC-04)` | idem | matière | `L1`,`L2`,`L5` | Liste + badges rouges | secondaire | ✅ |
| `SEC-07` | Moyenne par enseignant | Moyenne des notes attribuées, à lire avec prudence | `AVG` groupé par `grades.teacher_id` | `grades.teacher_id` (`1753`), index composite `(academic_year_id, teacher_id, subject_id, semester_id)` (`1778`) | enseignant × matière | `L4`,`L5` | Tableau | secondaire | ✅ |
| `SEC-08` | Effet des coefficients | Écart entre moyenne pondérée et moyenne arithmétique brute | `moyenne_pondérée − AVG(moyennes_matières)` | `class_subjects.coefficient` vs moyennes de `SEC-04` | école / classe | `L1`,`L2`,`L5` | Barres divergentes | secondaire | ✅ |
| `SEC-09` | Poids réel des matières | Part de chaque matière dans la moyenne générale | `coefficient_matière / Σ(coefficients_classe)` | `class_subjects.coefficient` (`470`), `subjects.coefficient` (`954`) | classe × matière | `L2` | Treemap ou barres 100 % | secondaire | ✅ |
| `SEC-10` | Moyenne complète (annuelle) | MGA pondérée par les coefficients de trimestre | `Σ(moyenne_trimestre × semesters.coefficient) / Σ(semesters.coefficient)` | `semesters.coefficient` (`1664`), `semesters.name` (`1657`) | élève*, classe, école | `L1`,`L2` | Stat-card + barres | secondaire | ✅ |
| `SEC-11` | Taux de réussite | Part d'élèves à moyenne générale ≥ 10 | `COUNT(moyenne ≥ 10) / COUNT(moyennes non nulles)` | dérivé `SEC-01` | école / niveau / classe | `L1`,`L2`,`L5` | Jauge % + delta N-1 | secondaire | ✅ |
| `SEC-12` | Distribution des notes | Histogramme des notes normalisées | buckets de 2 points sur `note × 20 / max_note` | `grades.note`, `.max_note` (`1759-1760`) | école / classe / matière | `L1`,`L2`,`L4`,`L5` | Histogramme | secondaire | ✅ |
| `SEC-13` | Distribution des moyennes | Histogramme des moyennes générales élèves | buckets de 1 point | dérivé `SEC-01` | école / classe | `L1`,`L2`,`L5` | Histogramme | secondaire | ✅ |
| `SEC-14` | Dispersion (écart-type) | Hétérogénéité d'une classe | `σ = √(Σ(x−x̄)² / n)` sur les moyennes générales | dérivé `SEC-01` | classe / matière | `L1`,`L2`,`L4`,`L5` | Boîtes à moustaches simplifiées | secondaire | ✅ |
| `SEC-15` | Répartition par mention | Ventilation `EXCELLENT` → `INSUFFISANT` | seuils appliqués à la moyenne générale | enum `Mention` (`schema.prisma:1142-1149`) | école / classe | `L1`,`L2`,`L5` | Barres empilées 100 % | secondaire | ✅ |
| `SEC-16` | Classement des classes | Classes ordonnées par moyenne générale | `RANK() OVER (ORDER BY SEC-03 DESC)`, ex æquo au même rang | dérivé `SEC-03` | classe | `L1`,`L5` | Tableau classé | secondaire | ✅ |
| `SEC-17` | Évolution par trimestre | Progression T1 → T2 → T3 | série `(semesters.name, SEC-01)` triée par `start_date` | `semesters.name`, `.start_date` (`1657-1658`) | école / classe / matière | `L1`,`L2`,`L4` | Courbe multi-séries | secondaire | ✅ |
| `SEC-18` | Évolution pluriannuelle | Moyenne générale école sur N années | série `(academic_years.name, SEC-01)` | `academic_years.name` (`107`) | école / niveau | `L1`, `years` | Courbe | secondaire | ✅ |
| `SEC-19` | Volume de notes saisies | Nombre d'évaluations notées — mesure d'activité pédagogique | `COUNT(grades)` | `grades.id` (`1751`) | école / matière / enseignant | `L4`,`L5`,`L6` | Stat-card | secondaire | ✅ |
| `SEC-20` | Types d'évaluation | Répartition devoirs / interros / compositions | `groupBy(evaluation_types.name) COUNT(grades)` | `evaluation_types.name` (`1696`), `.coefficient` (`1701`), `.max_note` (`1703`) | école / matière | `L4`,`L5` | Donut | secondaire | ✅ |
| `SEC-21` | Bulletins publiés | Couverture de la publication des bulletins | `COUNT(bulletin_releases) / (classes × semestres attendus)` | `bulletin_releases` unicité `(academic_year_id, semester_id, class_id)` (`schema.prisma:1982`), `.generated_at` (`1972`) | école / classe | `L1`,`L5` | Jauge % + tableau | secondaire | ✅ |

\* `SEC-10` au grain élève : **agrégé seulement** (distribution, taux), jamais
nominatif (§7.6).

---

### 4.d Résultats pédagogiques — PRIMAIRE

**Affiché uniquement si `establishment.modules.primary`.**

Le primaire **ne réutilise pas** `grades`/`evaluation_types`. Le schéma l'explique
en toutes lettres (`schema.prisma:2002-2014`) : là où le secondaire fait une
moyenne pondérée sur des notes ramenées sur 20, le primaire additionne des notes
de barèmes hétérogènes (MATH /50, DICTEE /20…) et divise par un **diviseur propre
au niveau** — « CM1 : (50 + 50 + 20 + 50) / 8,5 = /20 ».

Formules de référence, telles qu'implémentées dans
`apps/api/src/services/primary/primary-results.service.ts` :

| Élément | Formule | Référence |
| --- | --- | --- |
| Moyenne | `moyenne = Σ(notes) / divisor`, arrondi 2 décimales | `primary-results.service.ts:242`, arrondi `20` |
| Diviseur | figé à la création de la composition, **recopié** depuis la classe pour ne pas bouger si la grille est retouchée | `schema.prisma:2086-2090`, `primary_evaluations.divisor` (`2102`) |
| Élève classé | uniquement si non absent **et** au moins une note | `primary-results.service.ts:241` |
| Rang avec ex æquo | deux élèves à égalité partagent le rang | `primary-results.service.ts:65-99`, notamment `86` |
| Statut | `ADMIS` si `moyenne ≥ moyenne_admission`, `REDOUBLE` si `< moyenne_redoublement`, sinon intermédiaire ; `NON_CLASSE` si moyenne nulle | `primary-results.service.ts:48-56`, seuils `202-205` |
| Seuils par défaut | `admission = scale/2`, `redoublement = scale/2 − 1` si `primary_class_settings` absent | `primary-results.service.ts:203-204` |
| Échelle | `average_scale` : 10 au CP/CE, 20 au CM | `schema.prisma:2019-2021`, `primary_class_settings.average_scale` (`2026`) |
| Absence ≠ zéro | `is_absent` écarte l'élève du classement | `schema.prisma:2196-2198`, `primary_grades.is_absent` (`2205`) |

| Code | Nom | Définition métier | Formule | Source Prisma | Granularité | Filtres | Visualisation | Cycles | Dispo. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | :-: |
| `PRI-01` | Compositions organisées | Nombre de compositions sur l'année | `COUNT(primary_evaluations)` | `primary_evaluations.id`, `.academic_year_id` (`schema.prisma:2092-2093`) | école / classe | `L2` | Stat-card | primaire | ✅ |
| `PRI-02` | Calendrier des compositions | Répartition dans l'année | `groupBy(EXTRACT(MONTH FROM date))` | `primary_evaluations.date` (`2096`), `.sort_order` (`2097`) | école / classe | `L2` | Chronologie | primaire | ✅ |
| `PRI-03` | Compositions verrouillées | Part de compositions clôturées à la saisie | `COUNT(is_locked) / COUNT(*)` | `primary_evaluations.is_locked` (`2101`) | école / classe | `L2` | Jauge % | primaire | ✅ |
| `PRI-04` | Examens blancs CM2 | Compositions marquées examen (grille EPS, diviseur 9,5) | `COUNT(is_exam = true)` | `primary_evaluations.is_exam` (`2099`) | classe | `L2` | Stat-card | primaire | ✅ |
| `PRI-05` | Moyenne par composition | Moyenne de classe pour une composition | `AVG(Σ(notes)/divisor)` sur les élèves classés | `primary_grades.note` (`2204`), `primary_evaluations.divisor` (`2102`) | classe × composition | `L2` | Barres | primaire | ✅ |
| `PRI-06` | Moyenne par classe (annuelle) | Moyenne des compositions de la classe sur l'année | `AVG(PRI-05)` sur les compositions de l'année | idem | classe | `L1` | Barres triées | primaire | ✅ |
| `PRI-07` | Moyenne par niveau | CP1 → CM2 | `AVG(PRI-06)` groupé par `classes.level` | `classes.level` (`494`) | niveau | — | Barres | primaire | ✅ |
| `PRI-08` | Moyenne par matière | Moyenne rapportée au barème de la matière | `AVG(primary_grades.note) / max_score × 20` | `primary_grades.subject_id` (`2203`), `primary_evaluation_subjects.max_score` (`2182`) | matière × classe | `L2`,`L4` | Barres triées | primaire | ✅ |
| `PRI-09` | Taux de réussite | Part d'élèves `ADMIS` | `COUNT(status='ADMIS') / COUNT(classés)` | seuils `primary_class_settings.moyenne_admission` (`2027`) | classe / niveau / école | `L1`,`L2` | Jauge % + delta N-1 | primaire | ✅ |
| `PRI-10` | Taux de redoublement projeté | Part d'élèves sous le seuil de redoublement | `COUNT(moyenne < moyenne_redoublement) / COUNT(classés)` | `primary_class_settings.moyenne_redoublement` (`2028`) | classe / niveau | `L1`,`L2` | Jauge % `danger` | primaire | ✅ |
| `PRI-11` | Élèves non classés | Part d'élèves écartés du classement (absents / sans note) | `COUNT(NON_CLASSE) / COUNT(inscrits classe)` | `primary_grades.is_absent` (`2205`), absence de ligne | classe | `L2` | Stat-card `warning` | primaire | ✅ |
| `PRI-12` | Répartition par mention | Mentions calculées sur l'échelle de la classe | seuils appliqués à la moyenne, échelle `average_scale` | `primary_evaluations.average_scale` (`2103`) | classe / école | `L1`,`L2` | Barres empilées 100 % | primaire | ✅ |
| `PRI-13` | Distribution des moyennes | Histogramme, buckets adaptés à l'échelle (10 ou 20) | buckets de `scale/10` | dérivé `PRI-05` | classe | `L2` | Histogramme | primaire | ✅ |
| `PRI-14` | Comparaison inter-classes | Classes d'un même niveau côte à côte | `PRI-06` groupé par `classes.level`, ordonné | `classes.level`, `.name` (`493-494`) | niveau × classe | `L1` | Barres groupées | primaire | ✅ |
| `PRI-15` | Évolution par période | Progression composition après composition | série `(primary_evaluations.name, PRI-05)` triée par `sort_order`,`date` | `primary_evaluations.name` (`2095`), `.sort_order` (`2097`) | classe | `L2` | Courbe | primaire | ✅ |
| `PRI-16` | Évolution pluriannuelle | Moyenne école sur N années | série `(academic_years.name, PRI-07)` | `academic_years.name` (`107`) | école / niveau | `L1`, `years` | Courbe | primaire | ✅ |
| `PRI-17` | Écart entre classes d'un niveau | Amplitude max − min des moyennes de classes d'un même niveau | `MAX(PRI-06) − MIN(PRI-06)` par niveau | dérivé `PRI-06` | niveau | — | Barres + indicateur d'amplitude | primaire | ✅ |
| `PRI-18` | Couverture de la grille | Matières effectivement notées vs matières de la grille | `COUNT(DISTINCT primary_grades.subject_id) / COUNT(primary_class_subjects)` | `primary_class_subjects` (`schema.prisma:2054-2084`), unicité `(class_id, subject_id)` (`2066`) | classe | `L2` | Jauge % | primaire | ✅ |
| `PRI-19` | Bulletins publiés | Compositions dont les bulletins sont publiés | `COUNT(primary_bulletin_releases) / COUNT(primary_evaluations)` | `primary_bulletin_releases.evaluation_id` unique (`schema.prisma:2242`), `.generated_at` (`2243`) | école / classe | `L2` | Jauge % | primaire | ✅ |
| `PRI-20` | Diviseurs et échelles en vigueur | Contrôle de cohérence des paramètres de calcul par classe | lecture directe | `primary_class_settings.divisor` (`2025`), `.average_scale` (`2026`) | classe | — | Tableau de référence | primaire | ✅ |

---

### 4.e Enseignants & personnel

**Limite structurelle** : il n'existe **aucun modèle `staff`** au schéma. Le seul
personnel modélisé est `teachers` (`schema.prisma:1405-1458`) —
`AnalyticsService` le constate déjà en substituant `prisma.teachers` à
`prisma.staff` (`apps/api/src/services/analytics.service.ts:149-152`). L'enum
`StaffFunction` (`schema.prisma:1199-1206`) et les interfaces TypeScript `Staff` /
`StaffSalary` (`packages/types/src/index.ts:333-405`) n'ont pas de contrepartie en
base. **Le domaine « personnel » se lit donc comme « corps enseignant ».**

| Code | Nom | Définition métier | Formule | Source Prisma | Granularité | Filtres | Visualisation | Cycles | Dispo. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | :-: |
| `ENS-01` | Effectif enseignant | Nombre d'enseignants de l'établissement | `COUNT(teachers)` | `teachers.id` (`schema.prisma:1406`) | école | — | Stat-card + delta N-1 | tous | ✅ |
| `ENS-02` | Répartition par type de contrat | CDI / CDD / Vacataire | `groupBy(contract_type) COUNT(*)` | `teachers.contract_type` : enum `TeacherContractType` = `CDI`,`CDD`,`VACATAIRE` (`schema.prisma:1411`, `1086-1090`) | école | — | Donut | tous | ✅ |
| `ENS-03` | Ancienneté moyenne | Années depuis l'embauche | `AVG(NOW() − hire_date)` en années | `teachers.hire_date` (`1412`) | école / contrat | — | Stat-card | tous | ✅ |
| `ENS-04` | CDD arrivant à échéance | Contrats se terminant dans l'année scolaire | `COUNT(end_date BETWEEN start AND end)` | `teachers.end_date` (`1413`) | école | `L7` | Tableau + badges | tous | ✅ |
| `ENS-05` | Comptes enseignants actifs | Enseignants disposant d'un accès applicatif | `COUNT(teachers.user_id IS NOT NULL)` | `teachers.user_id` unique (`1419`) | école | — | Jauge % | tous | ✅ |
| `ENS-06` | Charge horaire hebdomadaire | Heures de cours par enseignant dans l'emploi du temps | `Σ(end_time − start_time)` sur `class_timetables` par `teacher_id` | `class_timetables.teacher_id` (`1622`), `.start_time`,`.end_time` `VarChar(10)` (`1619-1620`) | enseignant | `L1`,`L2`,`L4` | Barres triées | tous | ✅ |
| `ENS-07` | Charge horaire moyenne | Moyenne de `ENS-06` | `AVG(ENS-06)` | idem | école | — | Stat-card + delta N-1 | tous | ✅ |
| `ENS-08` | Surcharge / sous-charge | Enseignants hors bande cible de `teacher_remuneration.heures_hebdo` | `ENS-06 − teacher_remuneration.heures_hebdo` | `teacher_remuneration.heures_hebdo` (`schema.prisma:2319`) | enseignant | — | Barres divergentes | tous | ⚠️ |
| `ENS-09` | Heures effectuées (vacataires) | Heures déclarées mois par mois | `SUM(teacher_hours.hours_worked)` | `teacher_hours.hours_worked` `Decimal(5,2)` (`2418`), `.month`,`.year` (`2416-2417`) | enseignant / mois | `L6`,`L7` | Courbe mensuelle | tous | ⚠️ |
| `ENS-10` | Effectuées vs prévues | Écart entre heures déclarées et heures d'emploi du temps | `ENS-09 − (ENS-06 × nombre_de_semaines_du_mois)` | `teacher_hours.hours_worked` vs `class_timetables` ; `payroll_settings.nombre_semaines_par_mois` défaut `4.33` (`schema.prisma:2360`) | enseignant / mois | `L6`,`L7` | Barres divergentes | tous | ⚠️ |
| `ENS-11` | Taux de couverture des matières | Matières de classe effectivement affectées à un enseignant | `COUNT(class_subjects WHERE teacher_id IS NOT NULL) / COUNT(class_subjects)` | `class_subjects.teacher_id` (`schema.prisma:468`) | école / classe | `L1`,`L2` | Jauge % | secondaire | ✅ |
| `ENS-12` | Affectations enseignant × classe × matière | Volume d'affectations formalisées pour l'année | `COUNT(teacher_class_assignments)` | `teacher_class_assignments`, unicité `(teacher_id, class_id, subject_id, academic_year_id)` (`schema.prisma:1492`) | école / enseignant | `L6` | Stat-card + matrice | secondaire | ✅ |
| `ENS-13` | Créneaux sans enseignant | Trous d'affectation dans l'emploi du temps | `COUNT(class_timetables WHERE teacher_id IS NULL)` | `class_timetables.teacher_id` nullable (`1622`) | école / classe | `L1`,`L2` | Stat-card `danger` + tableau | tous | ✅ |
| `ENS-14` | Professeurs principaux affectés | Classes disposant d'un titulaire pour l'année | `COUNT(class_main_teachers) / COUNT(classes)` | `class_main_teachers`, doubles unicités `(teacher_id, academic_year_id)` et `(class_id, academic_year_id)` (`schema.prisma:1526-1527`) | école | — | Jauge % | tous | ✅ |
| `ENS-15` | Polyvalence | Nombre de matières enseignées par enseignant | `COUNT(DISTINCT teacher_subjects.subject_id)` par enseignant | `teacher_subjects`, unicité `(teacher_id, subject_id)` (`schema.prisma:1472`) | enseignant | — | Histogramme | secondaire | ✅ |
| `ENS-16` | Masse salariale brute | Cumul du brut de paie sur l'année scolaire | `SUM(monthly_payrolls.total_brut)` | `monthly_payrolls.total_brut` `Decimal(10,2)` (`schema.prisma:2490`), `.month`,`.year` (`2484-2485`) | école / mois | `L7` | Courbe + stat-card | tous | ⚠️ |
| `ENS-17` | Masse salariale nette | Cumul du net payable | `SUM(monthly_payrolls.net_payable)` | `monthly_payrolls.net_payable` (`2492`) | école / mois | `L7` | Courbe | tous | ⚠️ |
| `ENS-18` | Décomposition de la paie | Base / indemnités / ancienneté / retenues | `SUM` sur `base_salary`, `total_allowances`, `seniority_bonus`, `deductions` | `monthly_payrolls.base_salary` (`2487`), `.total_allowances` (`2488`), `.seniority_bonus` (`2489`), `.deductions` (`2491`) | école / mois | `L7` | Barres empilées | tous | ⚠️ |
| `ENS-19` | Retenues d'absence et d'acompte | Part des retenues dans le brut | `(absences_deduction + advances_deduction) / total_brut` | `monthly_payrolls.absences_deduction` (`2494`), `.advances_deduction` (`2495`) | école / mois | `L7` | Barres | tous | ⚠️ |
| `ENS-20` | Charges sociales | CNPS salarié / employeur, IGR | `SUM(cnps_salarie)`, `SUM(cnps_employeur)`, `SUM(igr)` | `monthly_payrolls.cnps_salarie` (`2499`), `.cnps_employeur` (`2500`), `.igr` (`2501`) | école / mois | `L7` | Barres empilées | tous | ⚠️ |
| `ENS-21` | Statut des paies | DRAFT / VALIDATED / PAID / CANCELLED | `groupBy(status) COUNT(*)` | `monthly_payrolls.status` : enum `PayrollStatus` (`schema.prisma:2486`, `2275-2280`) | école / mois | `L7` | Barres empilées | tous | ⚠️ |
| `ENS-22` | Salaire moyen | Net moyen par enseignant et par mois | `SUM(net_payable) / COUNT(DISTINCT teacher_id)` | `monthly_payrolls.net_payable`, `.teacher_id` (`2483`) | école / contrat | `L7` | Stat-card | tous | ⚠️ |
| `ENS-23` | Acomptes versés | Volume et statut des avances | `SUM(advance_payments.amount)`, `groupBy(status)` | `advance_payments.amount` (`schema.prisma:2576`), `.status` défaut `'PENDING'` (`2581`), `.deducted` (`2586`) | école / enseignant | `L6`,`L7` | Stat-card + tableau | tous | ⚠️ |
| `ENS-24` | Demandes de correction de paie | Signal de qualité du processus de paie | `groupBy(payroll_correction_requests.status)` | `payroll_correction_requests.status` (`schema.prisma:2622`) | école | `L7` | Barres | tous | ⚠️ |
| `ENS-25` | Coût salarial par élève | Masse salariale rapportée à l'effectif | `ENS-16 / EFF-01` | dérivé | école | — | Stat-card | tous | ⚠️ |

---

### 4.f Finance

**Chaîne de facturation, telle qu'elle est modélisée** :

```
school_fee_rates (tarif par niveau)          payment_conditions (découpage temporel)
        │ school_fee_rate_details                     │ payment_condition_lines
        │ (montant par type de frais)                 │ (%, délai en jours, ou montant + date)
        ▼                                             ▼
                    custom_payment_plans  ─────────────┘
                    (échéancier de l'élève, total_amount)
                              │ custom_payment_plan_installments
                              │ (n° tranche, due_date, amount, is_paid)
                              ▼
      invoices ◄──────────────┴──────────────► student_payments
   (facturé, total_amount)                   (encaissé, amount / expected_amount)
        │ invoice_lines
        ▼ (ventilation par payment_type)
```

**Règle de dérivation du statut d'une tranche**, reprise telle quelle du service
existant `apps/api/src/services/studentPayment.service.ts:221-228` :

```
payé >= attendu            → PAID
0 < payé < attendu         → PARTIAL
payé = 0                   → PENDING
statut ≠ PAID et today > due_date → OVERDUE  (prévaut)
```

**Périmètre temporel** : toutes les données financières sont rattachées à
`academic_year_id` (`invoices.academic_year_id` `schema.prisma:1355`,
`student_payments.academic_year_id` `831`, `custom_payment_plans.academic_year_id`
`1283`, `budgets.academic_year_id` `386`, `budget_lines.academic_year_id` `414`).
**Exception** : `expenses` n'a **pas** de rattachement à l'année scolaire, seulement
une `date` (`schema.prisma:582`). Le rattachement se fait donc par intervalle
`[academic_years.start_year-09-01 ; academic_years.end_year-08-31]` — approximation
à valider par le métier (§11-Q3).

| Code | Nom | Définition métier | Formule | Source Prisma | Granularité | Filtres | Visualisation | Cycles | Dispo. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | :-: |
| `FIN-01` | Chiffre d'affaires facturé | Montant total facturé sur l'année, hors factures annulées | `SUM(invoices.total_amount WHERE status='ISSUED')` | `invoices.total_amount` `Decimal(10,2)` (`schema.prisma:1357`), `.status` : enum `InvoiceStatus` = `ISSUED`,`CANCELLED` (`1358`, `1345-1348`) | école | `L1`,`L2` | Stat-card + delta N-1 | tous | ✅ |
| `FIN-02` | Montant encaissé | Total effectivement perçu | `SUM(student_payments.amount)` | `student_payments.amount` (`schema.prisma:833`) | école | `L1`,`L2`,`L7` | Stat-card + delta N-1 | tous | ✅ |
| `FIN-03` | Impayés | Reste dû sur l'année | `FIN-01 − FIN-02` | dérivé | école / niveau / classe | `L1`,`L2` | Stat-card `danger` | tous | ✅ |
| `FIN-04` | Taux de recouvrement | Part du facturé effectivement encaissé | `FIN-02 / FIN-01` | dérivé | école / niveau / classe | `L1`,`L2` | Jauge % + delta N-1 | tous | ✅ |
| `FIN-05` | Attendu échu | Somme des tranches dont l'échéance est passée | `SUM(custom_payment_plan_installments.amount WHERE due_date <= today)` | `custom_payment_plan_installments.amount` (`schema.prisma:1330`), `.due_date` (`1329`) | école / classe | `L1`,`L2` | Stat-card | tous | ✅ |
| `FIN-06` | Taux de recouvrement à échéance | Recouvrement corrigé du calendrier — indicateur le plus juste en cours d'année | `FIN-02 / FIN-05` | dérivé | école / niveau / classe | `L1`,`L2` | Jauge % | tous | ✅ |
| `FIN-07` | Tranches en retard | Nombre de tranches échues non soldées | `COUNT(installments WHERE due_date < today AND is_paid = false)` | `custom_payment_plan_installments.is_paid` (`1331`), `.due_date` (`1329`) | école / classe / n° de tranche | `L1`,`L2` | Stat-card + barres par n° de tranche | tous | ✅ |
| `FIN-08` | Montant en retard | Encours échu non réglé | `SUM(amount − payé) sur les tranches en retard` | `custom_payment_plan_installments.amount`, `student_payments.amount` via `custom_payment_plan_installment_id` (`schema.prisma:832`) | école / classe | `L1`,`L2` | Stat-card `danger` | tous | ✅ |
| `FIN-09` | Retard moyen | Ancienneté moyenne des tranches en retard | `AVG(today − due_date)` en jours, sur `FIN-07` | idem | école / classe | `L1`,`L2` | Stat-card (jours) | tous | ✅ |
| `FIN-10` | Vieillissement de la créance | Ventilation des impayés par tranche d'ancienneté (0-30, 31-60, 61-90, > 90 j) | buckets sur `today − due_date` | idem | école | `L1` | Barres empilées | tous | ✅ |
| `FIN-11` | Recettes par type de frais | Ventilation du facturé par nature (scolarité, inscription, cantine…) | `SUM(invoice_lines.amount) groupBy payment_type_id` | `invoice_lines.amount` (`schema.prisma:1396`), `.payment_type_id` (`1394`), `payment_types.name` (`681`), `.level` (`680`) | type de frais | `L1`,`L2` | Donut + tableau | tous | ✅ |
| `FIN-12` | Recettes par classe | Facturé par classe | `SUM(invoices.total_amount) groupBy class_id` | `invoices.class_id` (`schema.prisma:1354`) | classe | `L1` | Barres triées | tous | ✅ |
| `FIN-13` | Recettes par niveau | Facturé par niveau | `SUM(invoices.total_amount)` via `invoices.class_id → classes.level` | `classes.level` (`494`) | niveau | — | Barres | tous | ✅ |
| `FIN-14` | Encaissé par mode de paiement | Espèces / chèque / virement / mobile money / carte | `groupBy(student_payments.payment_method) SUM(amount)` | `student_payments.payment_method` : enum `PaymentMethod` (`schema.prisma:836`, `1158-1164`) | école | `L7` | Donut | tous | ✅ |
| `FIN-15` | Saisonnalité des encaissements | Courbe mensuelle des recettes sur l'année scolaire | `groupBy(EXTRACT(MONTH FROM payment_date)) SUM(amount)` | `student_payments.payment_date` (`schema.prisma:835`), index `@@index([payment_date])` (`850`) | école / mois | `L1`,`L2` | Courbe 12 mois + superposition N-1 | tous | ✅ |
| `FIN-16` | Statut des paiements | PENDING / PARTIAL / PAID / OVERDUE / CANCELLED | `groupBy(student_payments.status) COUNT(*)`, `SUM(amount)` | `student_payments.status` : enum `PaymentStatus` (`schema.prisma:840`, `1166-1172`), index `@@index([status])` (`852`) | école | `L1`,`L2` | Barres empilées | tous | ✅ |
| `FIN-17` | Élèves à jour | Part d'élèves sans tranche échue impayée | `COUNT(élèves sans tranche OVERDUE) / EFF-01` | dérivé `FIN-07` | école / classe / niveau | `L1`,`L2` | Jauge % | tous | ✅ |
| `FIN-18` | Top débiteurs **agrégé** | Concentration de la créance — **par classe, jamais nominatif** | `TOP 10 DESC(SUM(impayé) groupBy class_id)` | `invoices.class_id`, `student_payments` | classe | `L1` | Tableau classé | tous | ✅ |
| `FIN-19` | Concentration de la créance | Part des impayés portée par les 3 classes les plus endettées | `Σ(top3 impayés) / FIN-03` | dérivé `FIN-18` | école | — | Stat-card % | tous | ✅ |
| `FIN-20` | Répartition par échéancier | Nombre d'élèves par condition de paiement | `COUNT(classes) groupBy payment_condition_id`, pondéré par `EFF-03` | `classes.payment_condition_id` (`schema.prisma:505`), `payment_conditions.name` (`2141`) | échéancier | `L1` | Donut | tous | ✅ |
| `FIN-21` | Structure des échéanciers | Nombre de tranches et étalement par condition | `COUNT(payment_condition_lines) groupBy payment_condition_id`, `MAX(delay_days)` | `payment_condition_lines.line_number` (`schema.prisma:2162`), `.percent` (`2165`), `.delay_days` (`2166`), `.value_type` : enum `PaymentValueType` = `PERCENT`,`BALANCE` (`2164`, `21-24`) | échéancier | — | Tableau | tous | ✅ |
| `FIN-22` | Tarif de référence par niveau | Grille tarifaire officielle | `school_fee_rates.total_amount groupBy level` | `school_fee_rates.total_amount` (`schema.prisma:777`), `.level` (`776`), `.is_for_state_assigned` (`778`) | niveau | — | Tableau | tous | ✅ |
| `FIN-23` | Écart tarif vs facturé | Remises et cas particuliers consentis | `AVG(invoices.total_amount) − school_fee_rates.total_amount` par niveau | `invoices.total_amount`, `school_fee_rates.total_amount` | niveau | — | Barres divergentes | tous | ✅ |
| `FIN-24` | Manque à gagner « affectés État » | Écart de tarif entre élèves affectés et non affectés | comparaison des `school_fee_rates` sur `is_for_state_assigned` × `EFF-15` | `school_fee_rates.is_for_state_assigned` (`778`), `students.is_state_assigned` (`906`) | niveau | — | Stat-card | tous | ✅ |
| `FIN-25` | Factures annulées | Volume et montant des annulations | `COUNT` et `SUM(total_amount) WHERE status='CANCELLED'` | `invoices.status` (`1358`), `.cancelled_at` (`1360`) | école | `L1`,`L7` | Stat-card `warning` | tous | ✅ |
| `FIN-26` | Taux de facturation | Élèves inscrits disposant d'une facture | `COUNT(invoices) / EFF-01` | `invoices` unicité `(student_id, academic_year_id)` (`schema.prisma:1369`) | école / classe | `L1`,`L2` | Jauge % | tous | ✅ |
| `FIN-27` | Dépenses totales | Charges approuvées ou payées | `SUM(expenses.amount WHERE status IN ('APPROVED','PAID'))` | `expenses.amount` (`schema.prisma:580`), `.status` : enum `ExpenseStatus` (`588`, `1117-1123`), `.date` (`581`) | école | `L7` | Stat-card + delta N-1 | tous | ⚠️ |
| `FIN-28` | Dépenses par catégorie | Salaires, fournitures, énergie, loyer… | `groupBy(expenses.category) SUM(amount)` | `expenses.category` : enum `ExpenseCategory` (9 valeurs, `schema.prisma:579`, `1105-1115`) | catégorie | `L7` | Donut + tableau | tous | ⚠️ |
| `FIN-29` | Dépenses en attente d'approbation | Engagements non encore validés | `SUM(amount WHERE status IN ('DRAFT','PENDING_APPROVAL'))` | `expenses.status` (`588`), `.approved_at` (`590`) | école | `L7` | Stat-card `warning` | tous | ⚠️ |
| `FIN-30` | Saisonnalité des dépenses | Courbe mensuelle des charges | `groupBy(EXTRACT(MONTH FROM date)) SUM(amount)` | `expenses.date` (`581`) | école / mois | `L7` | Courbe superposée à `FIN-15` | tous | ⚠️ |
| `FIN-31` | Budget prévu vs réalisé | Exécution budgétaire par catégorie | `budgets.spent_amount / budgets.planned_amount` | `budgets.planned_amount` (`schema.prisma:388`), `.spent_amount` (`389`), `.remaining_amount` (`390`), unicité `(academic_year_id, category)` (`395`) | catégorie | `L1` | Barres appariées | tous | ⚠️ |
| `FIN-32` | Budget par nature | Prévisions de dépenses vs de revenus | `groupBy(budget_lines.type) SUM(amount)` | `budget_lines.type` : enum `BudgetType` = `DEPENSES`,`REVENUS` (`schema.prisma:417`, `1067-1070`), arborescence via `parent_id` (`418`) | poste budgétaire | `L1` | Arborescence + barres | tous | ⚠️ |
| `FIN-33` | Réalisé budgétaire | Transactions rattachées aux lignes budgétaires | `SUM(budget_transactions.amount) groupBy budget_line_id` | `budget_transactions.amount` (`schema.prisma:448`), `.transaction_date` (`449`) | poste budgétaire | `L1`,`L7` | Barres appariées | tous | ⚠️ |
| `FIN-34` | Marge d'exploitation | Résultat brut de l'année scolaire | `FIN-02 − (FIN-27 + ENS-17)` | dérivé | école | `L1` | Stat-card (accent conditionnel) | tous | ⚠️ |
| `FIN-35` | Taux de marge | Marge rapportée aux recettes | `FIN-34 / FIN-02` | dérivé | école | `L1` | Jauge % + delta N-1 | tous | ⚠️ |
| `FIN-36` | Poids de la masse salariale | Part des salaires dans les recettes encaissées | `ENS-16 / FIN-02` | dérivé | école | `L1` | Jauge % | tous | ⚠️ |
| `FIN-37` | Recette moyenne par élève | Panier moyen | `FIN-01 / EFF-01` | dérivé | école / niveau | `L1` | Stat-card | tous | ✅ |
| `FIN-38` | Évolution pluriannuelle du CA | Facturé, encaissé et taux de recouvrement sur N années | séries `(academic_years.name, FIN-01, FIN-02, FIN-04)` | `academic_years.name` (`107`) | école | `years` | Courbe multi-séries | tous | ✅ |

> **`FIN-18` — précision de conception.** L'énoncé demande des « top débiteurs
> (agrégé) ». La granularité retenue est **la classe**, jamais l'élève : un nom
> d'élève associé à une dette est une donnée personnelle sensible que le
> propriétaire n'a pas à voir (§7.6). Si le métier exige le grain élève, il faudra
> une décision explicite et tracée (§11-Q2).

---

### 4.g Emploi du temps & ressources

**Source unique** : `class_timetables` (`schema.prisma:1614-1653`), avec
`@@unique([academic_year_id, class_id, day_of_week, start_time])` (`1634`) — une
classe ne peut avoir deux cours au même créneau, la contrainte le garantit déjà en
base. Les créneaux réutilisables sont dans `horaires` (`schema.prisma:1577-1603`),
dont le champ `type` distingue `COURS` / `RECREATION` / `PAUSE`
(`schema.prisma:1581-1584`) — **seuls les créneaux `COURS` comptent dans les
volumes horaires**.

Les heures sont stockées en `VarChar(10)` (`class_timetables.start_time`,
`.end_time`, `schema.prisma:1619-1620`), pas en `Time`. Leur différence se calcule
donc **en TypeScript après lecture**, ou via un `CAST(… AS time)` en SQL brut
(§6.4).

| Code | Nom | Définition métier | Formule | Source Prisma | Granularité | Filtres | Visualisation | Cycles | Dispo. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | :-: |
| `RES-01` | Taux d'occupation des salles | Créneaux occupés sur créneaux ouvrables | `COUNT(class_timetables WHERE classroom_id = :r) / (COUNT(horaires type='COURS') × 6 jours)` | `class_timetables.classroom_id` (`schema.prisma:1623`), `classrooms.name` (`1550`), `horaires.type` (`1584`), `DayOfWeek` 6 valeurs (`1605-1612`) | salle | `L7` | Barres triées + carte de chaleur jour × créneau | secondaire | ✅ |
| `RES-02` | Salles sous-utilisées | Salles sous un seuil d'occupation (25 %) | `RES-01 < 0,25` | idem | salle | — | Tableau + badges | secondaire | ✅ |
| `RES-03` | Créneaux sans salle affectée | Cours dont la salle n'est pas renseignée | `COUNT(class_timetables WHERE classroom_id IS NULL)` | `class_timetables.classroom_id` nullable (`1623`) | école / classe | `L1`,`L2` | Stat-card `warning` | tous | ✅ |
| `RES-04` | Volume horaire par matière | Heures hebdomadaires enseignées par matière | `Σ(end_time − start_time) groupBy subject_id` | `class_timetables.subject_id` (`1621`), `.start_time`,`.end_time` (`1619-1620`) | matière | `L1`,`L2` | Barres triées | tous | ✅ |
| `RES-05` | Volume horaire par niveau | Heures hebdomadaires par niveau | idem, groupé via `class_id → classes.level` | `classes.level` (`494`) | niveau | — | Barres | tous | ✅ |
| `RES-06` | Volume horaire par classe | Charge hebdomadaire d'une classe | `Σ(durées) groupBy class_id` | `class_timetables.class_id` (`1617`) | classe | `L1` | Barres triées | tous | ✅ |
| `RES-07` | Écart volume réel / volume prévu | Heures d'emploi du temps vs `hours_per_week` déclaré | `RES-04 − class_subjects.hours_per_week` | `class_subjects.hours_per_week` défaut 1 (`schema.prisma:469`) | classe × matière | `L1`,`L2`,`L4` | Barres divergentes | secondaire | ✅ |
| `RES-08` | Conflits enseignant | Un enseignant sur deux créneaux simultanés dans deux classes | `COUNT` des couples `(teacher_id, day_of_week, chevauchement d'intervalle horaire)` avec `class_id` distincts | `class_timetables.teacher_id` (`1622`), `.day_of_week` : enum `DayOfWeek` (`1618`) | enseignant | `L6` | Tableau `danger` | tous | ✅ |
| `RES-09` | Conflits de salle | Deux classes dans la même salle au même créneau | idem sur `classroom_id` | `class_timetables.classroom_id` (`1623`) | salle | — | Tableau `danger` | secondaire | ✅ |
| `RES-10` | Charge par jour de semaine | Répartition des cours du lundi au samedi | `COUNT groupBy day_of_week` | `class_timetables.day_of_week` (`1618`) | école / classe | `L1`,`L2` | Barres | tous | ✅ |
| `RES-11` | Amplitude horaire | Premier et dernier créneau de la journée | `MIN(start_time)`, `MAX(end_time)` par jour | `class_timetables.start_time`,`.end_time` | école / classe | `L2` | Chronologie | tous | ✅ |
| `RES-12` | Créneaux déclarés | Référentiel horaire de l'établissement | `COUNT(horaires) groupBy type` | `horaires.type` (`1584`), `.start_time`,`.end_time` (`1579-1580`) | école | — | Tableau de référence | tous | ✅ |
| `RES-13` | Densité d'emploi du temps | Créneaux `COURS` remplis sur créneaux disponibles, par classe | `RES-06 / (COUNT(horaires type='COURS') × 6)` | idem `RES-01` | classe | `L1` | Jauge % par classe | tous | ✅ |
| `RES-14` | Salles vs classes | Nombre de salles rapporté au nombre de classes | `COUNT(classrooms) / COUNT(classes)` | `classrooms.id` (`1549`), `classes.id` (`492`) | école | — | Stat-card | secondaire | ✅ |
| `RES-15` | Occupation en places assises | Effectif de classe rapporté à la capacité de salle | `EFF-03 / classrooms.capacity` | `classrooms.capacity` 🔧 **absente du schéma** (cf. §4.a) | salle × classe | `L2` | Barres + seuil | secondaire | 🔧 |

---

### 4.h KPI de synthèse — page d'accueil `/owner`

Dix cartes, choisies pour tenir en un écran de bureau (`.ds-stat-grid` à 4 colonnes,
`apps/web/src/index.css:1777`) soit **3 rangées** : 4 + 4 + 2. Chacune affiche
`{ value, delta vs N-1 }` et un accent sémantique (`Card accent`,
`apps/web/src/components/ds/Card.tsx:4-11`).

| # | KPI | Indicateur source | Format | Accent | Condition d'affichage |
| --- | --- | --- | --- | --- | --- |
| 1 | Élèves inscrits | `EFF-01` | entier + Δ | `role` | toujours |
| 2 | Nouveaux élèves | `EFF-08` | entier + Δ | `info` | toujours |
| 3 | Taux de réinscription | `EFF-10` | % + Δ | vert si ≥ 85 %, sinon `warning` | toujours |
| 4 | Enseignants | `ENS-01` | entier + Δ | `role` | toujours |
| 5 | Taux de recouvrement | `FIN-04` | % + Δ | vert si ≥ 80 %, `warning` 60-80 %, `danger` < 60 % | toujours |
| 6 | Impayés | `FIN-03` | montant FCFA + Δ | `danger` si > 0 | toujours |
| 7 | Chiffre d'affaires facturé | `FIN-01` | montant FCFA + Δ | `role` | toujours |
| 8 | Moyenne générale | `SEC-01` **ou** `PRI-07` | note /20 + Δ | vert si ≥ 10 | `SEC-01` si `modules.secondary`, sinon `PRI-07` |
| 9 | Taux de réussite | `SEC-11` **ou** `PRI-09` | % + Δ | vert si ≥ 70 % | même règle que #8 |
| 10 | Taux de présence | `ASS-01` | % + Δ | vert si ≥ 90 % | `modules.secondary` seulement |

**Substitution dans une école primaire pure** : le KPI #10 (`ASS-01`) n'est pas
calculable (§3.1). Il est remplacé par **`PRI-01` — Compositions organisées**, afin
de conserver dix cartes et une grille pleine.

**Règle de dégradation** : un KPI dont la source est marquée ⚠️ (route de saisie
non montée) et dont l'agrégat est vide affiche l'état vide « Donnée non
disponible » (§5.7), **jamais `0`**. Cela concerne exclusivement les cartes
dérivées de la paie et des dépenses, qui ne figurent pas dans les dix ci-dessus —
la page d'accueil est donc, par construction, toujours renseignée.

---

## 5. Architecture des écrans

### 5.1 Arborescence des routes `/owner/*` `[À CRÉER]`

| Route | Composant `[À CRÉER]` | Fichier | Condition |
| --- | --- | --- | --- |
| `/owner` | `OwnerHomePage` | `apps/web/src/pages/owner/OwnerHomePage.tsx` | toujours |
| `/owner/effectifs` | `OwnerEnrollmentPage` | `apps/web/src/pages/owner/OwnerEnrollmentPage.tsx` | toujours |
| `/owner/assiduite` | `OwnerAttendancePage` | `apps/web/src/pages/owner/OwnerAttendancePage.tsx` | `modules.secondary` |
| `/owner/resultats` | `OwnerResultsPage` | `apps/web/src/pages/owner/OwnerResultsPage.tsx` | toujours (onglets selon modules) |
| `/owner/enseignants` | `OwnerStaffPage` | `apps/web/src/pages/owner/OwnerStaffPage.tsx` | toujours |
| `/owner/finance` | `OwnerFinancePage` | `apps/web/src/pages/owner/OwnerFinancePage.tsx` | toujours |
| `/owner/ressources` | `OwnerResourcesPage` | `apps/web/src/pages/owner/OwnerResourcesPage.tsx` | toujours |
| `*` (catch-all) | `<Navigate to="/owner" replace />` | — | toujours |

Le sous-dossier `pages/owner/` suit la convention existante `pages/primary/` et
`pages/finance/` (`apps/web/src/App.tsx:67-76`).

Composants partagés `[À CRÉER]`, dans `apps/web/src/components/owner/` :

| Composant | Rôle |
| --- | --- |
| `AcademicYearPicker` | Sélecteur d'année + année de comparaison (§5.3) |
| `OwnerKpiGrid` | Grille de `StatCard` avec delta (réutilise `.ds-stat-grid`) |
| `DeltaBadge` | `▲ +12 (+4,2 %)` / `▼ −3 (−1,1 %)` / `=` |
| `BarChart`, `LineChart`, `DonutChart`, `Histogram`, `StackedBar` | SVG faits main (§11-Q1) |
| `OwnerSection` | `Card` + titre + sous-titre + slot d'action |
| `OwnerEmptyState` | États vides normalisés (§5.7) |

### 5.2 Menu latéral `OWNER`

Branche dédiée dans `use-app-navigation.tsx`, insérée **avant** la branche
`PARENT` (l'ordre d'évaluation actuel est `PARENT` → `STUDENT` → `TEACHER` →
défaut, `use-app-navigation.tsx:91`, `142`, `184`, `326`) :

```
📊  Vue d'ensemble              → /owner
📈  Pilotage
     👥  Effectifs               → /owner/effectifs
     ✅  Assiduité               → /owner/assiduite      (si modules.secondary)
     🏆  Résultats               → /owner/resultats
     🎓  Enseignants             → /owner/enseignants
💰  Finance                     → /owner/finance
🏫  Ressources                  → /owner/ressources
```

Icônes `lucide-react` déjà importées dans le fichier :
`LayoutDashboard` (`use-app-navigation.tsx:19`), `Users` (`29`),
`ClipboardCheck` (`9`), `Trophy` (`26`), `GraduationCap` (`23`),
`Wallet` (`31`), `Building` (`6`), `Gauge` (`16`).

### 5.3 Sélecteur d'année scolaire — comportement

Composant `AcademicYearPicker`, monté dans le **topbar** de toutes les pages
`/owner/*` (slot `topbarActions` de `AppShell`, cf. `Layout.tsx:97-115`).

| Aspect | Règle |
| --- | --- |
| Source des options | `GET /api/owner/context` → `academicYears[]` triées par `start_year` décroissant (`academic_years.start_year`, `schema.prisma:108`) |
| Valeur initiale | L'année marquée `is_current` (`academic_years.is_current`, `schema.prisma:110`) ; à défaut la plus récente |
| Persistance | `sessionStorage['owner.academicYearId']` + paramètre d'URL `?y=<id>` — l'URL prime au chargement, ce qui rend chaque vue partageable et rejouable |
| Comparaison | Second sélecteur « comparer à » : `sessionStorage['owner.compareAcademicYearId']` + `?c=<id>`. Valeur par défaut = **l'année précédente** dans la liste triée ; option « Aucune » possible |
| Propagation | Un store Zustand léger `useOwnerFilters` (`apps/web/src/lib/stores/owner-filters.ts` `[À CRÉER]`), sur le modèle de `useThemeStore` (`apps/web/src/lib/stores/theme-store.ts`) |
| Clé React Query | `['owner', <domaine>, academicYearId, compareAcademicYearId, …filtresLocaux]` — le changement d'année invalide donc naturellement le cache, sans `invalidateQueries` manuel |
| Historique multi-années | Paramètre `years` (1-10, défaut 5) porté par les seuls écrans à courbe pluriannuelle (`EFF-14`, `SEC-18`, `PRI-16`, `FIN-38`) |
| Rechargement | Aucun rechargement de page ; `staleTime` de 5 min aligné sur `useEstablishment` (`apps/web/src/lib/hooks/useEstablishment.ts:56`) |

### 5.4 Maquettes ASCII

#### `/owner` — Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ☰  HorizonEcole      [2025-2026 ▾]  vs [2024-2025 ▾]      🌓  🔔  (MA ▾)          │
├────────────────┬─────────────────────────────────────────────────────────────────┤
│ 📊 Vue d'ens.  │  Vue d'ensemble                                                 │
│                │  École Le Souverain — Collège · Année 2025-2026                 │
│ 📈 PILOTAGE    │                                                                 │
│  👥 Effectifs  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  ✅ Assiduité  │  │ Élèves   │ │ Nouveaux │ │ Réinscr. │ │Enseign.  │            │
│  🏆 Résultats  │  │   842    │ │   187    │ │  88,4 %  │ │    47    │            │
│  🎓 Enseign.   │  │ ▲ +36    │ │ ▼ −12    │ │ ▲ +2,1pt │ │ ▲ +3     │            │
│                │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│ 💰 Finance     │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ 🏫 Ressources  │  │Recouvr.  │ │ Impayés  │ │ CA fact. │ │Moy. gén. │            │
│                │  │  73,2 %  │ │ 24,1 M   │ │  89,9 M  │ │  11,42   │            │
│                │  │ ▼ −4,0pt │ │ ▲ +3,2 M │ │ ▲ +6,1 M │ │ ▲ +0,31  │            │
│                │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                │  ┌──────────┐ ┌──────────┐                                      │
│                │  │Réussite  │ │Présence  │                                      │
│                │  │  68,5 %  │ │  91,3 %  │                                      │
│                │  │ ▲ +2,4pt │ │ ▼ −0,8pt │                                      │
│                │  └──────────┘ └──────────┘                                      │
│                │                                                                 │
│                │  ┌─ Effectifs sur 5 ans ───────┐ ┌─ Recouvrement mensuel ─────┐ │
│                │  │        ╭─╮                  │ │  ▁▃▅█▆▄▃▂▁▂▃▄              │ │
│                │  │   ╭────╯ ╰──╮      ● 2025-26│ │  ── 2025-26  ┈┈ 2024-25    │ │
│                │  │ ──╯          ╰─             │ │                            │ │
│                │  │ 21  22  23  24  25          │ │ S O N D J F M A M J J A    │ │
│                │  └─────────────────────────────┘ └────────────────────────────┘ │
│                │                                                                 │
│                │  ┌─ Points d'attention ──────────────────────────────────────┐  │
│                │  │ ⚠  3 classes au-delà du seuil d'effectif        → Effectifs│  │
│                │  │ ⚠  128 tranches échues non réglées (24,1 M)     → Finance  │  │
│                │  │ ⚠  17 séances non tenues ce mois                → Assiduité│  │
│                │  └───────────────────────────────────────────────────────────┘  │
└────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### `/owner/effectifs`

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Effectifs & scolarité                     [2025-2026 ▾] vs [2024-2025 ▾]        │
│  Filtres :  Niveau [Tous ▾]   Classe [Toutes ▾]   Sexe [Tous ▾]                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│  │ Inscrits   │ │ Nouveaux   │ │ Départs    │ │Eff. moy./cl│                     │
│  │    842     │ │    187     │ │     54     │ │    38,3    │                     │
│  │ ▲ +36      │ │ ▼ −12      │ │ ▲ +9       │ │ ▲ +1,2     │                     │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                     │
│                                                                                  │
│  ┌─ Effectif par niveau ──────────────┐  ┌─ Répartition par sexe ──────────────┐ │
│  │ 6e   ████████████████████ 214      │  │            ╭───────╮                │ │
│  │ 5e   ██████████████████   192      │  │        F   │ 47,3 %│  398           │ │
│  │ 4e   █████████████████    181      │  │        M   │ 52,7 %│  444           │ │
│  │ 3e   ████████████████     168      │  │            ╰───────╯                │ │
│  │ 2nde ██████████            87      │  │  N-1 : F 46,1 % · M 53,9 %          │ │
│  └────────────────────────────────────┘  └─────────────────────────────────────┘ │
│                                                                                  │
│  ┌─ Nouveaux vs réinscrits par niveau ───────────────────────────────────────┐   │
│  │ 6e   ███████████████████░░░░  N 168 · R 46                                │   │
│  │ 5e   ███░░░░░░░░░░░░░░░░░░░░  N  11 · R 181                               │   │
│  │ 4e   ██░░░░░░░░░░░░░░░░░░░░░  N   6 · R 175                               │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Détail par classe ───────────────────────────────────────────────────────┐   │
│  │ Classe   Niv.  Eff.  Δ N-1   F/G      Âge moy.  Occupation      Statut    │   │
│  │ 6e A     6e     42   ▲ +3    19/23    11,8 ans  ███████░ 105 %  ⚠ Surchg  │   │
│  │ 6e B     6e     40   ▲ +1    21/19    11,9 ans  ███████░ 100 %  ✓         │   │
│  │ 5e A     5e     38   ▼ −2    18/20    12,7 ans  ██████░░  95 %  ✓         │   │
│  │ 2nde A   2nde   24   ▲ +4    11/13    15,4 ans  ████░░░░  60 %  ⚠ Sous-r. │   │
│  │ …                                                                         │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Évolution sur 5 ans ─────────┐  ┌─ Pyramide des âges ────────────────────┐   │
│  │  ● Inscrits  ○ Nouveaux       │  │ 10 ▏▎          17 ▏▎▎                  │   │
│  │      ╭──╮                     │  │ 11 ▏▎▎▎▎▎      18 ▏▎                   │   │
│  │  ╭───╯  ╰───╮                 │  │ 12 ▏▎▎▎▎▎▎     19 ▏                    │   │
│  │ ─╯          ╰──               │  │ 13 ▏▎▎▎▎▎                              │   │
│  └───────────────────────────────┘  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### `/owner/resultats` — onglets par cycle

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Résultats pédagogiques                    [2025-2026 ▾] vs [2024-2025 ▾]        │
│  ┌──────────────┬──────────────┐                                                 │
│  │  Secondaire  │   Primaire   │      ← Tabs (ds/Tabs.tsx) — onglets présents    │
│  └══════════════┴──────────────┘        selon modules.secondary / modules.primary│
│  Filtres :  Trimestre [Tous ▾]  Niveau [Tous ▾]  Classe [Toutes ▾]  Mat. [Ttes ▾]│
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│  │ Moy. gén.  │ │ Réussite   │ │ Écart-type │ │ Bulletins  │                     │
│  │   11,42    │ │  68,5 %    │ │    3,21    │ │   87,5 %   │                     │
│  │ ▲ +0,31    │ │ ▲ +2,4pt   │ │ ▼ −0,18    │ │ ▲ +12,5pt  │                     │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                     │
│                                                                                  │
│  ┌─ Moyenne par matière ─────────────┐ ┌─ Distribution des moyennes ───────────┐ │
│  │ EPS        ██████████████ 14,2 ▲  │ │        ▁▂▄▆██▆▄▂▁                     │ │
│  │ Français   ███████████    12,1 ▲  │ │  0  2  4  6  8 10 12 14 16 18 20      │ │
│  │ Hist-Géo   ██████████     11,4 ▼  │ │  ── 2025-26   ┈┈ 2024-25              │ │
│  │ Maths      ████████        9,3 ▼  │ │  Médiane 11,6 · Q1 9,4 · Q3 13,7      │ │
│  │ Physique   ███████         8,7 ▲  │ └───────────────────────────────────────┘ │
│  └───────────────────────────────────┘                                           │
│                                                                                  │
│  ┌─ Évolution par trimestre ─────────┐ ┌─ Classement des classes ──────────────┐ │
│  │ 14 ┤                              │ │ #  Classe   Moy.   Δ N-1  Réussite    │ │
│  │ 12 ┤    ╭────●────╮               │ │ 1  3e A     13,10  ▲+0,4   84,2 %     │ │
│  │ 10 ┤ ●──╯          ╰●             │ │ 2  6e B     12,44  ▲+0,9   79,1 %     │ │
│  │  8 ┤                              │ │ 3  5e A     11,87  ▼−0,2   71,0 %     │ │
│  │    └ T1 ── T2 ── T3               │ │ …                                     │ │
│  └───────────────────────────────────┘ └───────────────────────────────────────┘ │
│                                                                                  │
│  ┌─ Effet des coefficients ──────────────────────────────────────────────────┐   │
│  │ Moyenne pondérée 11,42  ·  Moyenne arithmétique 11,71  ·  Écart −0,29     │   │
│  │ Maths  coef 4 (18,2 % du total) ██████░░░░  tire la moyenne vers le bas   │   │
│  │ EPS    coef 1 ( 4,5 % du total) █░░░░░░░░░  effet marginal                │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### `/owner/resultats` — onglet Primaire

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┬──────────────┐                                                 │
│  │  Secondaire  │   Primaire   │                                                 │
│  └──────────────┴══════════════┘                                                 │
│  Filtres :  Composition [Toutes ▾]   Niveau [Tous ▾]   Classe [Toutes ▾]         │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│  │Compositions│ │ Réussite   │ │Redoublement│ │Non classés │                     │
│  │     18     │ │  74,1 %    │ │   9,3 %    │ │   4,2 %    │                     │
│  │ ▲ +2       │ │ ▲ +3,8pt   │ │ ▼ −1,5pt   │ │ ▼ −0,7pt   │                     │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                     │
│                                                                                  │
│  ┌─ Moyenne par niveau (CP1 → CM2) ──────────────────────────────────────────┐   │
│  │ CP1  ████████████████ 7,1/10   CE1  ███████████ 6,4/10                    │   │
│  │ CP2  ██████████████   6,8/10   CE2  ████████████ 6,9/10                   │   │
│  │ CM1  ███████████████ 12,4/20   CM2  ██████████████ 13,1/20                │   │
│  │ ⓘ  Échelles hétérogènes : /10 au CP-CE, /20 au CM (average_scale)          │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Comparaison inter-classes d'un niveau ───────────────────────────────────┐   │
│  │ CM2 A  ████████████████ 13,64   Amplitude du niveau : 1,07 pt             │   │
│  │ CM2 B  ██████████████   12,57   ⚠ écart significatif entre classes         │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Évolution composition par composition (CM2 A) ───────────────────────────┐   │
│  │ 20 ┤                                                                      │   │
│  │ 14 ┤   ●───●───╮       ╭●                                                 │   │
│  │ 10 ┤            ╰──●──╯                                                   │   │
│  │    └ Comp.1  Comp.2  Comp.3  Comp.4  Exam. blanc                          │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Paramètres de calcul en vigueur ─────────────────────────────────────────┐   │
│  │ Classe   Diviseur  Échelle  Seuil admission  Seuil redoublement  Grille   │   │
│  │ CM2 A      8,50      /20         10,00            8,00           6/6 mat. │   │
│  │ CM1 A      8,50      /20         10,00            8,00           6/6 mat. │   │
│  │ CP1 A      5,00      /10          5,00            4,00           4/4 mat. │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### `/owner/finance`

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Finance                                   [2025-2026 ▾] vs [2024-2025 ▾]        │
│  Filtres :  Niveau [Tous ▾]   Classe [Toutes ▾]   Type de frais [Tous ▾]         │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│  │ Facturé    │ │ Encaissé   │ │ Impayés    │ │ Recouvrmt  │                     │
│  │  89,9 M    │ │  65,8 M    │ │  24,1 M    │ │  73,2 %    │                     │
│  │ ▲ +6,1 M   │ │ ▲ +2,9 M   │ │ ▲ +3,2 M   │ │ ▼ −4,0pt   │                     │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                     │
│  ⓘ Recouvrement à échéance : 84,6 % (l'attendu échu n'est que de 77,8 M)          │
│                                                                                  │
│  ┌─ Saisonnalité — facturé / encaissé / dépenses ────────────────────────────┐   │
│  │  M                                                                        │   │
│  │ 20 ┤ █                                                                    │   │
│  │ 15 ┤ █ █                          █                                       │   │
│  │ 10 ┤ █ █ █ ▓     ▓   ▓  █ ▓  ▓    █ ▓     ── Encaissé  ▓ Dépenses         │   │
│  │  5 ┤ █ █ █ ▓ ▓ ▓ ▓ ▓ ▓  █ ▓  ▓    █ ▓     ┈┈ N-1                          │   │
│  │    └ S  O  N  D  J  F  M  A  M  J  J  A                                   │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Recettes par type de frais ──────┐ ┌─ Vieillissement de la créance ────────┐ │
│  │ Scolarité      ██████████ 62,4 M  │ │ 0-30 j   ████████      8,1 M          │ │
│  │ Inscription    ███        14,2 M  │ │ 31-60 j  █████         5,4 M          │ │
│  │ Cantine        ██          8,9 M  │ │ 61-90 j  ████          4,2 M          │ │
│  │ Transport      █           4,4 M  │ │ > 90 j   ██████        6,4 M  ⚠       │ │
│  └───────────────────────────────────┘ └───────────────────────────────────────┘ │
│                                                                                  │
│  ┌─ Recouvrement par classe (top 10 créances) ───────────────────────────────┐   │
│  │ Classe   Élèves  Facturé   Encaissé  Impayé   Recouvr.  Retard moy.       │   │
│  │ 6e A       42     4,62 M    2,91 M   1,71 M    63,0 %     47 j   ⚠        │   │
│  │ 5e B       39     4,29 M    2,88 M   1,41 M    67,1 %     38 j            │   │
│  │ …                                                                         │   │
│  │ ⓘ Vue agrégée par classe — aucun nom d'élève n'est exposé.                 │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Dépenses & résultat ─────────────────────────────────────────────────────┐   │
│  │ ⓘ  Module dépenses non alimenté — aucune donnée pour cette année.          │   │
│  │    (les charges se saisissent depuis un écran non encore déployé)          │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### `/owner/assiduite`

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Assiduité & vie scolaire                  [2025-2026 ▾] vs [2024-2025 ▾]        │
│  Filtres : Trimestre [Tous ▾] Niveau [Tous ▾] Classe [Ttes ▾] Matière [Ttes ▾]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│  │ Présence   │ │ Retards    │ │Séances n.t.│ │Couv. appel │                     │
│  │  91,3 %    │ │   3,1 %    │ │     17     │ │  94,2 %    │                     │
│  │ ▼ −0,8pt   │ │ ▲ +0,4pt   │ │ ▲ +5       │ │ ▼ −1,9pt   │                     │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                     │
│                                                                                  │
│  ┌─ Absences justifiées / non justifiées ────────────────────────────────────┐   │
│  │ 6e A  ████████████░░░░░░░░  Justifiées 61 %  ·  Non justifiées 39 %        │   │
│  │ 5e B  ███████░░░░░░░░░░░░░  Justifiées 35 %  ·  Non justifiées 65 %  ⚠     │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Absences (heures) par matière ───┐ ┌─ Conduite — distribution ─────────────┐ │
│  │ Maths      ████████████ 412 h     │ │        ▁▂▃▅███▇▄▂                     │ │
│  │ Physique   █████████    318 h     │ │  0 2 4 6 8 10 12 14 16 18 20          │ │
│  │ Français   ███████      241 h     │ │  Moyenne 15,8 ▲+0,4                   │ │
│  │ ⓘ normalisé par volume horaire     │ │  Sous 10 : 6,2 % des élèves ⚠         │ │
│  └───────────────────────────────────┘ └───────────────────────────────────────┘ │
│                                                                                  │
│  ┌─ Séances non tenues — suites données ─────────────────────────────────────┐   │
│  │ Reprogrammées (SCHEDULED) ████████ 9   ·  Écartées (DISMISSED) ████ 5      │   │
│  │ Déplacées (MOVED) ██ 3     ·  Sans décision ⚠ 0                            │   │
│  │ Enseignant            Séances dues   Tenues   Couverture                   │   │
│  │ (agrégé — 12 enseignants concernés, détail par matière ci-dessous)         │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### `/owner/enseignants` et `/owner/ressources` (condensé)

```
/owner/enseignants
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [Effectif 47 ▲+3] [Charge moy. 18,4 h ▲+0,6] [Couv. matières 96,2 %] [CDD éch. 4]│
│ ┌─ Contrats ─────────┐ ┌─ Charge horaire par enseignant ─────────────────────┐   │
│ │ CDI ████████ 31    │ │ ██████████████████████ 24 h  ⚠ surcharge            │   │
│ │ CDD ████ 11        │ │ ████████████████ 18 h                               │   │
│ │ Vac. ██ 5          │ │ ████████ 9 h   ⚠ sous-charge                        │   │
│ └────────────────────┘ └─────────────────────────────────────────────────────┘   │
│ ┌─ Masse salariale ─────────────────────────────────────────────────────────┐    │
│ │ ⓘ Module paie non alimenté — aucune donnée pour cette année.               │    │
│ └───────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────┘

/owner/ressources
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [Salles 14] [Occup. moy. 62,4 %] [Créneaux sans salle 23 ⚠] [Conflits 2 ⚠]       │
│ ┌─ Occupation par salle (carte de chaleur jour × créneau) ──────────────────┐    │
│ │        L    M    Me   J    V    S                                         │    │
│ │ 07-08  ██   ██   ░░   ██   ██   ░░                                        │    │
│ │ 08-09  ██   ██   ██   ██   ██   ▓▓                                        │    │
│ │ 09-10  ██   ▓▓   ██   ██   ▓▓   ░░       ██ occupé  ▓▓ partiel  ░░ libre  │    │
│ └───────────────────────────────────────────────────────────────────────────┘    │
│ ┌─ Volume horaire par matière ──────┐ ┌─ Conflits détectés ───────────────────┐  │
│ │ Maths     ████████████ 96 h/sem   │ │ ⚠ Salle B12 — Lun 08:00 : 4e A & 3e B │  │
│ │ Français  ██████████   84 h/sem   │ │ ⚠ M. K. — Mar 10:00 : 6e A & 5e C     │  │
│ └───────────────────────────────────┘ └───────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Responsive et mobile

Le shell existant (`AppShell`, `apps/web/src/components/ds/nav/index.ts:2`) gère
déjà le repli sidebar → tiroir + tabbar mobile. Règles propres à `OWNER` :

| Point de rupture | Comportement |
| --- | --- |
| ≥ 1280 px | 4 colonnes de stat-cards (`.ds-stat-grid`, `apps/web/src/index.css:1777`) ; graphiques côte à côte 2 par ligne |
| 768–1279 px | 2 colonnes de stat-cards (`apps/web/src/index.css:1817`) ; graphiques 1 par ligne |
| < 768 px | 1 colonne (`apps/web/src/index.css:1821`) ; tableaux en **cartes empilées** (un bloc par ligne) plutôt qu'en scroll horizontal ; sélecteur d'année replié dans un `Drawer` (`apps/web/src/components/ds/Drawer.tsx`) |
| Tableaux larges | Conteneur `overflow-x: auto` — jamais de scroll horizontal sur `body` |

**Tabbar mobile `OWNER`** `[À MODIFIER]` — nouvelle branche dans `getTabbarItems()`
(`apps/web/src/components/ds/nav/navModel.tsx:81-131`), 4 destinations :

| Libellé | Icône (déjà importée) | Chemin |
| --- | --- | --- |
| Accueil | `LayoutDashboard` (`navModel.tsx:4`) | `/owner` |
| Effectifs | `Users` (`navModel.tsx:5`) | `/owner/effectifs` |
| Résultats | `Trophy` (`navModel.tsx:12`) | `/owner/resultats` |
| Finance | *(à importer : `Wallet`)* | `/owner/finance` |

Sans cette branche, le repli du `return` final (`navModel.tsx:125-130`) enverrait le
propriétaire vers `/dashboard`, `/people/students`, `/academic/timetable` et
`/academic/inscriptions` — **quatre écrans d'administration interdits**. C'est un
point de sécurité, pas de confort (§7.5).

### 5.6 Thème clair / sombre et accent de rôle

`ThemeProvider` pose `data-role="owner"` automatiquement, puisqu'il dérive
l'attribut du rôle utilisateur sans liste blanche
(`apps/web/src/components/theme/ThemeProvider.tsx:22`). Mais **aucun style n'est
défini pour `html[data-role='owner']`** : les variables `--role-accent`,
`--role-accent-soft`, `--role-accent-700` retomberaient sur le défaut `:root`
(`apps/web/src/index.css:116-118`), c'est-à-dire l'encre administrative.

`[À MODIFIER]` — ajouter dans `apps/web/src/index.css`, sur le modèle exact des
blocs `teacher`/`parent`/`student` (`apps/web/src/index.css:149-170`) :

```css
html[data-role='owner'] { --role-primary: … ; --role-gradient: … ; }   /* ~ ligne 65 */
html[data-role='owner'] { --role-accent: … ; --role-accent-soft: … ; --role-accent-700: … ; }
html[data-theme='dark'][data-role='owner'] { --role-accent: … ; --role-accent-700: … ; }
```

Teinte proposée : **ardoise / bleu-gris profond**, distincte des cinq accents
existants (bleu admin, vert enseignant, ambre comptable, cassis élève, prune
parent — `apps/web/src/index.css:60-64`). Choix final à valider (§11-Q5).

`[À MODIFIER]` — `getRoleAccent()` (`apps/web/src/theme/tokens.ts:78-80`) ne
distingue aujourd'hui que `TEACHER` du reste ; ajouter la branche `OWNER` pour que
le thème Ant Design suive.

### 5.7 États vides, chargement, erreur

| État | Rendu | Composant |
| --- | --- | --- |
| Chargement | `Skeleton` aux dimensions finales (92 px pour une stat-card, comme `DashboardBoard.tsx:74`) — **jamais de spinner plein écran** | `apps/web/src/components/ds/Skeleton.tsx` |
| Vide — aucune donnée pour l'année | « Aucune donnée pour l'année 2025-2026. » + lien « Voir 2024-2025 » | `OwnerEmptyState` |
| Vide — module non alimenté (⚠️ §2.7) | « Module *paie* non alimenté — aucune donnée pour cette année. » + note explicative discrète. **Ne jamais afficher `0 FCFA`** | `OwnerEmptyState` variante `info` |
| Vide — donnée de référence manquante (🔧) | « Capacité non renseignée pour ces classes. » | `OwnerEmptyState` variante `info` |
| Erreur réseau / 5xx | Carte d'erreur + bouton « Réessayer » (relance `refetch` React Query) | `OwnerEmptyState` variante `danger` |
| `403` | Message « Cet espace n'est pas accessible avec votre compte. » + déconnexion proposée | idem |
| Année sans comparaison possible (première année) | Les badges `DeltaBadge` sont masqués, pas affichés à `0` | `DeltaBadge` renvoie `null` |

**Distinguer `0` de « inconnu » est une exigence, pas un détail** : un taux de
recouvrement affiché à `0 %` parce que la table est vide induirait le propriétaire
en erreur sur la santé financière de son école. Le contrat d'API §6.3 impose donc
`null` (et non `0`) pour toute agrégation sans ligne source.

---

## 6. Backend

### 6.1 Organisation des fichiers `[À CRÉER]`

```
apps/api/src/routes/owner/
├── index.ts              # routeur racine : authenticate + requireRole + refus non-GET
├── context.ts            # GET /context
├── summary.ts            # GET /summary
├── enrollment.ts         # GET /enrollment, /enrollment/timeline
├── attendance.ts         # GET /attendance, /attendance/sessions, /attendance/conduct
├── results.ts            # GET /results/secondary, /results/primary
├── staff.ts              # GET /staff, /staff/workload, /staff/payroll
├── finance.ts            # GET /finance/overview, /collection, /revenue-breakdown,
│                         #     /expenses, /seasonality, /debtors
└── resources.ts          # GET /resources/rooms, /resources/hours, /resources/conflicts

apps/api/src/services/owner/
├── academic-year.helper.ts   # résolution année / année de comparaison / historique
├── compare.helper.ts         # fabrique du contrat { value, previous, delta, deltaPct }
├── enrollment.service.ts
├── attendance.service.ts
├── results-secondary.service.ts
├── results-primary.service.ts
├── staff.service.ts
├── finance.service.ts
├── resources.service.ts
└── summary.service.ts        # compose les 10 KPI de §4.h
```

Le découpage « routeur = autorisation, service = lecture » reproduit celui de
`school-space.service.ts` (`apps/api/src/services/school-space.service.ts:5-13`).

**Montage** dans `apps/api/src/index.ts`, à la suite des espaces Parent et Élève
(`apps/api/src/index.ts:270-271`) :

```ts
import ownerRoutes from './routes/owner';
// …
app.use('/api/owner', ownerRoutes);
```

### 6.2 Routeur racine — squelette normatif

```ts
// apps/api/src/routes/owner/index.ts
import { Router } from 'express';
import { UserRole } from '@school/types';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

// 1) authenticate OUVRE le contexte d'établissement (auth.ts:96). Sans lui,
//    l'extension Prisma se retire (tenant-extension.ts:233) et les lectures
//    traverseraient les établissements.
// 2) requireRole verrouille l'espace sur le seul rôle OWNER, comme les espaces
//    Parent (parent-space.ts:26) et Élève (student-space.ts:25).
router.use(authenticate, requireRole(UserRole.OWNER));

// 3) Lecture seule structurelle : toute méthode autre que GET est refusée avant
//    d'atteindre le moindre handler. Ce n'est pas une redondance avec l'absence
//    de handlers d'écriture — c'est la garantie qu'aucun ajout futur ne pourra
//    introduire une écriture par inadvertance.
router.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    res.set('Allow', 'GET, HEAD, OPTIONS');
    return res.status(405).json({
      success: false,
      error: 'Méthode non autorisée',
      message: "L'espace Propriétaire est en lecture seule",
    });
  }
  next();
});
```

### 6.3 Contrat de réponse

Toutes les routes suivent l'enveloppe existante `{ success, data }`
(cf. `apps/api/src/routes/establishments.ts:145`, `apps/api/src/routes/dashboard.ts:62-73`).

**Type `Metric`** — c'est le contrat de comparaison N vs N-1 :

```ts
interface Metric {
  value: number | null;        // null = aucune ligne source (≠ 0)
  previous: number | null;     // null si compareAcademicYearId absent
  delta: number | null;        // value - previous
  deltaPct: number | null;     // null si previous vaut 0 ou null
  unit: 'count' | 'percent' | 'currency' | 'grade' | 'hours' | 'days';
}
```

**Type `Series`** — pour toute visualisation :

```ts
interface SeriesPoint { key: string; label: string; value: number | null; previous?: number | null }
interface Series { points: SeriesPoint[]; total?: number | null; unit: Metric['unit'] }
```

**Enveloppe commune à toutes les réponses `/api/owner/*`** :

```ts
interface OwnerResponse<T> {
  success: true;
  data: T;
  meta: {
    academicYear:        { id: string; name: string };
    compareAcademicYear: { id: string; name: string } | null;
    schoolType: 'PRIMAIRE' | 'COLLEGE' | 'LYCEE';
    modules: { primary: boolean; secondary: boolean };
    /** Domaines sans donnée, pour piloter les états vides §5.7. */
    unavailable: string[];   // ex. ['payroll', 'expenses']
    generatedAt: string;     // ISO 8601
  };
}
```

### 6.4 Catalogue des routes `[À CRÉER]`

Paramètres communs à toutes les routes (sauf `/context`) :
`academicYearId` (requis), `compareAcademicYearId` (optionnel),
plus les filtres locaux `L1`…`L8` de §4.0 selon la route.

| Méthode | Chemin | Query params spécifiques | `data` renvoyé | Indicateurs couverts |
| --- | --- | --- | --- | --- |
| `GET` | `/api/owner/context` | — | `{ establishment, academicYears[], currentAcademicYearId, modules, schoolType }` | référentiel du sélecteur §5.3 |
| `GET` | `/api/owner/summary` | — | `{ kpis: Record<string, Metric>, highlights: Alert[] }` | §4.h (10 KPI) + « Points d'attention » |
| `GET` | `/api/owner/enrollment` | `level`, `classId`, `cycle`, `gender` | `{ total, newcomers, returning, retentionRate, departures, byLevel, byClass, byGender, ageDistribution, byStatus, stateAssigned, occupancy }` | `EFF-01`…`EFF-13`, `EFF-15`…`EFF-18` |
| `GET` | `/api/owner/enrollment/timeline` | `years` (1-10) | `{ series: Series[] }` | `EFF-14` |
| `GET` | `/api/owner/attendance` | `level`, `classId`, `subjectId`, `semesterId`, `startDate`, `endDate` | `{ presenceRate, absenceRate, justifiedShare, lateRate, absenceHours, bySubject, byClass, halfDayRate }` | `ASS-01`…`ASS-06`, `ASS-12` |
| `GET` | `/api/owner/attendance/sessions` | idem + `teacherId` | `{ held, notHeld, coverageRate, makeupBreakdown, moveRequests, byTeacher }` | `ASS-07`…`ASS-11` |
| `GET` | `/api/owner/attendance/conduct` | `level`, `classId`, `semesterId` | `{ averageNote, distribution, averagePenalty, belowThreshold, overrides, incidents }` | `ASS-15`…`ASS-20` |
| `GET` | `/api/owner/attendance/teachers` | `teacherId`, `startDate`, `endDate` | `{ absenceHours, justifiedShare, byTeacher }` | `ASS-13`, `ASS-14` |
| `GET` | `/api/owner/results/secondary` | `semesterId`, `level`, `classId`, `subjectId` | `{ generalAverage, byLevel, byClass, bySubject, best, worst, byTeacher, coefficientEffect, subjectWeights, completeAverage, successRate, gradeDistribution, averageDistribution, stdDeviation, mentions, classRanking, bySemester, gradeVolume, evaluationTypes, bulletinCoverage }` | `SEC-01`…`SEC-21` |
| `GET` | `/api/owner/results/secondary/timeline` | `years`, `level` | `{ series: Series[] }` | `SEC-18` |
| `GET` | `/api/owner/results/primary` | `evaluationId`, `level`, `classId` | `{ evaluationCount, calendar, lockedShare, examCount, byEvaluation, byClass, byLevel, bySubject, successRate, repeatRate, unranked, mentions, distribution, classComparison, progression, levelSpread, gridCoverage, bulletinCoverage, settings }` | `PRI-01`…`PRI-15`, `PRI-17`…`PRI-20` |
| `GET` | `/api/owner/results/primary/timeline` | `years`, `level` | `{ series: Series[] }` | `PRI-16` |
| `GET` | `/api/owner/staff` | — | `{ headcount, byContract, seniority, endingContracts, accountCoverage, polyvalence, subjectCoverage, assignments, unassignedSlots, mainTeachers }` | `ENS-01`…`ENS-05`, `ENS-11`…`ENS-15` |
| `GET` | `/api/owner/staff/workload` | `teacherId`, `level`, `classId` | `{ weeklyHours, averageHours, overUnderLoad, hoursWorked, plannedVsActual }` | `ENS-06`…`ENS-10` |
| `GET` | `/api/owner/staff/payroll` | `startDate`, `endDate` | `{ grossTotal, netTotal, breakdown, deductions, socialCharges, byStatus, averageSalary, advances, corrections, costPerStudent }` | `ENS-16`…`ENS-25` |
| `GET` | `/api/owner/finance/overview` | `level`, `classId` | `{ invoiced, collected, outstanding, collectionRate, dueToDate, onScheduleRate, invoicingRate, cancelled, revenuePerStudent }` | `FIN-01`…`FIN-06`, `FIN-25`, `FIN-26`, `FIN-37` |
| `GET` | `/api/owner/finance/collection` | `level`, `classId` | `{ lateInstallments, lateAmount, averageDelay, ageing, byInstallmentNumber, studentsUpToDate }` | `FIN-07`…`FIN-10`, `FIN-17` |
| `GET` | `/api/owner/finance/revenue-breakdown` | `level`, `classId`, `paymentTypeId` | `{ byFeeType, byClass, byLevel, byPaymentMethod, byPaymentCondition, conditionStructure, feeRates, rateGap, stateAssignedGap }` | `FIN-11`…`FIN-14`, `FIN-20`…`FIN-24` |
| `GET` | `/api/owner/finance/seasonality` | — | `{ monthly: Series }` (encaissé, facturé, dépenses ; N et N-1) | `FIN-15`, `FIN-30` |
| `GET` | `/api/owner/finance/debtors` | `level` | `{ byClass: Series, concentration: Metric }` — **jamais nominatif** | `FIN-18`, `FIN-19` |
| `GET` | `/api/owner/finance/expenses` | `startDate`, `endDate` | `{ total, byCategory, pendingApproval, budgetPlanVsActual, budgetByType, budgetRealised, margin, marginRate, payrollShare }` | `FIN-27`…`FIN-29`, `FIN-31`…`FIN-36` |
| `GET` | `/api/owner/finance/timeline` | `years` | `{ series: Series[] }` | `FIN-38` |
| `GET` | `/api/owner/resources/rooms` | `startDate`, `endDate` | `{ occupancyByRoom, underused, unassignedSlots, roomsPerClass, seatOccupancy }` | `RES-01`…`RES-03`, `RES-14`, `RES-15` |
| `GET` | `/api/owner/resources/hours` | `level`, `classId`, `subjectId` | `{ bySubject, byLevel, byClass, plannedGap, byWeekday, dayRange, slots, density }` | `RES-04`…`RES-07`, `RES-10`…`RES-13` |
| `GET` | `/api/owner/resources/conflicts` | — | `{ teacherConflicts[], roomConflicts[] }` | `RES-08`, `RES-09` |

### 6.5 Codes d'erreur

| Code | Cas | Corps |
| --- | --- | --- |
| `200` | Succès, y compris avec agrégats `null` | `OwnerResponse<T>` |
| `400` | `academicYearId` absent, mal formé, ou `years` hors bornes | `{ success: false, error: '…' }` — via `validate()` (`apps/api/src/middleware/validate.ts`) et schémas Zod, comme `apps/api/src/routes/establishments.ts:118` |
| `401` | Jeton absent / invalide / compte inactif | émis par `authenticate` (`apps/api/src/middleware/auth.ts:37-77`) |
| `403` | Rôle ≠ `OWNER` | émis par `requireRole` (`apps/api/src/middleware/rbac.ts:26-31`) |
| `403` | Établissement inactif | émis par `authenticate` (`apps/api/src/middleware/auth.ts:79-85`) |
| `404` | `academicYearId` inconnu **ou appartenant à un autre établissement** — indistinguables par construction, l'extension Prisma renvoyant `null` dans les deux cas (`packages/database/src/tenant-extension.ts:246-255`) | `{ success: false, error: 'Année scolaire introuvable' }` |
| `405` | Méthode ≠ GET sur `/api/owner/*` | `{ success: false, error: 'Méthode non autorisée' }` + en-tête `Allow: GET, HEAD, OPTIONS` |
| `500` | Erreur inattendue | via `errorHandler` (`apps/api/src/middleware/errorHandler.ts`, monté `apps/api/src/index.ts:300`) |

> Le `404` indistinct est **volontaire** et cohérent avec le choix déjà fait dans
> l'extension : « un appelant ne doit pas pouvoir déduire l'existence d'une donnée
> voisine » (`packages/database/src/tenant-extension.ts:207-211`).

### 6.6 Stratégie de requêtes Prisma

**Règle absolue** : tous les services `owner` importent le client cloisonné —
`import { prisma } from '@school/database'` (`packages/database/src/index.ts:61-71`).
`unscopedPrisma` est **interdit** dans `routes/owner/**` et `services/owner/**`, et
l'instanciation d'un `new PrismaClient()` l'est tout autant : c'est précisément
l'erreur commise par `AnalyticsService` (`apps/api/src/services/analytics.service.ts:1-3`),
qui contourne le cloisonnement. Un test le vérifie (§10.2).

Choix entre agrégats Prisma et SQL brut :

| Cas | Technique | Justification |
| --- | --- | --- |
| Compteurs simples, sommes, moyennes sur une table | `count()`, `aggregate()`, `groupBy()` | Couverts par `FILTERABLE_READS` — l'extension injecte `establishment_id` (`packages/database/src/tenant-extension.ts:95-102`, `239-241`) |
| Ventilations par colonne d'une seule table (`students.gender`, `expenses.category`, `monthly_payrolls.status`) | `groupBy()` | idem |
| Ventilation par colonne d'une table **jointe** (effectif par `classes.level` depuis `inscriptions`) | `findMany({ select })` puis regroupement **en mémoire** | `groupBy` de Prisma ne sait pas grouper sur une colonne de relation |
| Calculs multi-étapes normalisés (moyennes pondérées `SEC-01`, moyennes primaires `PRI-05`) | Lecture ciblée puis calcul TypeScript | Reproduit exactement la logique de référence (`school-space.service.ts:264-292`, `primary-results.service.ts:217-268`) — **dupliquer la formule en SQL ferait diverger deux vérités** |
| Différences d'heures stockées en `VarChar` (`class_timetables.start_time`) | Calcul TypeScript après lecture | Les colonnes ne sont pas de type `Time` (`schema.prisma:1619-1620`) |
| Comparaisons N vs N-1 | **Deux requêtes parallèles** (`Promise.all`), une par année | Plus lisible qu'un `CASE WHEN` ; le coût est identique, les index sur `academic_year_id` étant déjà en place |

**`$queryRaw` — usage restreint et conditionnel.** Il n'est envisagé que pour
`RES-08`/`RES-09` (détection de chevauchements horaires, qui appelle une jointure
de la table sur elle-même) et pour `FIN-10` (vieillissement de créance). Dans ces
cas, **l'extension Prisma ne s'applique pas** — `$queryRaw` ne passe pas par
`$allOperations` (`packages/database/src/tenant-extension.ts:227-228`). Le filtre
`establishment_id` doit alors être écrit **à la main**, à partir de
`requireEstablishmentId()` (`packages/database/src/tenant.ts:64-73`), avec un
paramètre lié (jamais d'interpolation de chaîne) :

```ts
const establishmentId = requireEstablishmentId();
await prisma.$queryRaw`
  SELECT … FROM class_timetables t1
  JOIN class_timetables t2 ON t1.classroom_id = t2.classroom_id …
  WHERE t1.establishment_id = ${establishmentId}
    AND t2.establishment_id = ${establishmentId}
    AND t1.academic_year_id = ${academicYearId}
`;
```

**Recommandation** : privilégier la variante TypeScript pour `RES-08`/`RES-09`
(le volume d'un emploi du temps annuel — quelques milliers de lignes au plus —
tient largement en mémoire) et n'ouvrir `$queryRaw` qu'en cas de problème de
performance mesuré. Chaque `$queryRaw` ajouté doit être accompagné d'un test
d'isolation dédié (§10.2).

### 6.7 Pagination

Aucune route `/api/owner/*` ne renvoie de liste paginée : ce sont des agrégats.
Deux garde-fous néanmoins :

| Cas | Règle |
| --- | --- |
| Tableaux « top N » (`FIN-18`, `SEC-05`, `SEC-06`, `RES-02`) | Bornés côté serveur : `take: 10` maximum, non paramétrable par le client |
| Tableaux de détail par classe / par enseignant | Renvoyés intégralement, mais bornés à `200` lignes ; au-delà, la réponse porte `truncated: true` et l'écran affiche « affichage limité aux 200 premières lignes » |
| `years` (historique) | `z.coerce.number().int().min(1).max(10).default(5)` |
| Listes de conflits (`RES-08`, `RES-09`) | Bornées à `100`, avec `truncated` |

### 6.8 Cache et coût de calcul

| Niveau | Mécanisme | Durée | Justification |
| --- | --- | --- | --- |
| Client | React Query `staleTime` | `5 min` pour `/context` (aligné sur `useEstablishment`, `apps/web/src/lib/hooks/useEstablishment.ts:56`) ; `2 min` pour les agrégats | Le propriétaire consulte, il ne rafraîchit pas en continu |
| Client | Clé de cache incluant `academicYearId` + `compareAcademicYearId` | — | Le retour à une année déjà consultée est instantané |
| Serveur | En-tête `Cache-Control: private, max-age=60` sur les routes d'agrégat | `60 s` | `private` impérativement : la réponse est propre à un établissement |
| Serveur | **Cache mémoire pour les années closes uniquement** — `Map<clé, { data, expiresAt }>`, clé = `establishmentId:route:params` | `15 min` | Une année scolaire terminée ne bouge plus ; l'année courante n'est jamais mise en cache serveur |
| Serveur | `Promise.all` systématique entre agrégats indépendants | — | Patron déjà utilisé (`apps/api/src/routes/dashboard.ts:19-60`) |

**Discrimination année courante / année close** : une année est considérée close si
`academic_years.is_current === false` **et** que la date du jour dépasse
`end_year`-08-31 (`academic_years.end_year`, `schema.prisma:109`).

**Aucun cache partagé entre établissements** : la clé porte `establishmentId` en
préfixe, et le cache est en mémoire de processus (pas de Redis introduit pour ce
lot). Si un cache distribué est ajouté plus tard, le préfixe d'établissement dans
la clé reste la condition non négociable.

**Coût estimé des écrans les plus lourds** (établissement de 1 000 élèves,
3 trimestres, 40 matières) :

| Écran | Requêtes | Lignes lues (ordre de grandeur) | Traitement |
| --- | --- | --- | --- |
| `/owner` | ~14 (`Promise.all`), doublées si comparaison | ~5 000 | agrégats SQL, tri en mémoire négligeable |
| `/owner/resultats` (secondaire) | ~8 | `grades` : 1 000 élèves × 40 matières × 3 évals × 3 trimestres ≈ **360 000 lignes** ⚠ | **le point chaud** |
| `/owner/finance` | ~10 | `student_payments` ~8 000, `invoices` ~1 000, `installments` ~6 000 | modéré |
| `/owner/ressources` | ~4 | `class_timetables` ~1 500 | négligeable |

**Traitement du point chaud `/owner/resultats`** : ne **jamais** charger les lignes
de `grades` en mémoire pour un calcul école-entier. La moyenne par matière
(`SEC-04`) se calcule par `groupBy(['subject_id', 'max_note'])` avec `_sum` et
`_count`, la normalisation `/10 → /20` s'appliquant ensuite sur les agrégats
puisque `max_note` fait partie de la clé de regroupement. Seules les moyennes
générales par élève (`SEC-01`, `SEC-13`, `SEC-14`) nécessitent un passage au grain
élève : elles se calculent alors **classe par classe** (`groupBy(['student_id',
'subject_id', 'max_note'])` avec `where: { class_id }`), soit ~40 × 3 × 40 = 4 800
lignes par classe. C'est le seul endroit où un `$queryRaw` d'agrégation à deux
niveaux serait justifié si la mesure montrait un problème.

### 6.9 Index à ajouter `[À MODIFIER]`

Index **déjà présents** et suffisants pour l'essentiel :

| Table | Index existant | Ligne |
| --- | --- | --- |
| `inscriptions` | `academic_year_id`, `class_id`, `student_id`, `establishment_id` | `schema.prisma:623-625`, `639` |
| `grades` | `academic_year_id`, `class_id`, `subject_id`, `semester_id`, `student_id`, `teacher_id`, `evaluation_type_id`, composite `(academic_year_id, teacher_id, subject_id, semester_id)` | `schema.prisma:1771-1778` |
| `student_payments` | `academic_year_id`, `payment_date`, `status`, `custom_payment_plan_installment_id`, `(student_id, academic_year_id)` | `schema.prisma:849-854` |
| `invoices` | `class_id`, `academic_year_id`, `status` | `schema.prisma:1370-1372` |
| `custom_payment_plan_installments` | `custom_payment_plan_id`, `due_date`, `is_paid` | `schema.prisma:1339-1341` |
| `class_timetables` | `academic_year_id`, `class_id`, `day_of_week` | `schema.prisma:1635-1637` |
| `attendance_sessions` | `(academic_year_id, class_id, subject_id)`, `teacher_id`, `date` | `schema.prisma:243-245` |
| `student_absences` | 7 index dont `(academic_year_id, teacher_id, subject_id, date)` | `schema.prisma:1816-1823` |
| `conduct_grades` | `academic_year_id`, `semester_id`, `class_id`, `student_id` | `schema.prisma:1910-1913` |
| `primary_evaluations` | `academic_year_id`, `class_id`, `date` | `schema.prisma:2114-2116` |
| `primary_grades` | `evaluation_id`, `student_id`, `subject_id` | `schema.prisma:2216-2218` |
| Toutes les tables cloisonnées | `@@index([establishment_id])` | systématique |

Index **à ajouter**, dans une migration distincte de celle de l'enum :

| # | Table | Index proposé | Requête servie |
| --- | --- | --- | --- |
| I1 | `grades` | `@@index([establishment_id, academic_year_id, class_id])` | `SEC-03`, `SEC-13`, `SEC-14` — le filtre d'établissement précède toujours le reste |
| I2 | `grades` | `@@index([establishment_id, academic_year_id, subject_id])` | `SEC-04`, `SEC-05`, `SEC-06` |
| I3 | `attendance_records` | `@@index([session_id, status])` | `ASS-01`…`ASS-04` — la table n'a aujourd'hui que `@@index([student_id])` (`schema.prisma:276`) |
| I4 | `expenses` | `@@index([establishment_id, date])` | `FIN-27`, `FIN-30` — aujourd'hui seul `establishment_id` est indexé (`schema.prisma:608`) |
| I5 | `monthly_payrolls` | `@@index([establishment_id, year, month])` | `ENS-16`…`ENS-22` |
| I6 | `students` | `@@index([establishment_id, status])` | `EFF-12`, `EFF-13` |
| I7 | `class_timetables` | `@@index([establishment_id, academic_year_id, classroom_id])` | `RES-01`, `RES-09` |
| I8 | `inscriptions` | `@@index([establishment_id, academic_year_id, class_id])` | `EFF-01`…`EFF-03` — remplace avantageusement trois index séparés dans le plan |

> **`attendance_records` n'est pas une table cloisonnée** — elle ne porte pas
> `establishment_id` (`schema.prisma:263-278`). Son isolation est **transitive**,
> via `session_id → attendance_sessions.establishment_id`. Toute requête sur
> `attendance_records` doit donc **impérativement** passer par une jointure ou un
> filtre `session: { … }` sur la session, jamais lire la table à plat. Même
> remarque pour `attendance_makeup_sessions` (`schema.prisma:293-312`),
> `attendance_move_requests` (`323-349`), `invoice_lines` (`1391-1403`),
> `custom_payment_plan_installments` (`1325-1343`), `school_fee_rate_details`
> (`761-772`), `payment_condition_lines` (`2159-2175`), `primary_evaluation_subjects`
> (`2178-2192`), `primary_bulletin_releases` (`2240-2252`),
> `conduct_absence_overrides` (`1933-1958`), `teacher_subjects` (`1463-1476`),
> `teacher_remuneration` (`2314-2330`), `teacher_allowances` (`2333-2354`),
> `payroll_items` (`2536-2551`), `payroll_payments` (`2554-2570`),
> `payroll_correction_requests` (`2617-2635`), `budget_transactions` (`445-462`),
> `schedule_exceptions` (`716-727`), `teacher_evaluation_coefficients` (`1736-1748`).
> **C'est le risque d'isolation numéro un du lot** (§11-R1) : ces 19 tables ne sont
> pas protégées par l'extension Prisma, et un `findMany` direct y traverserait les
> établissements. Un test dédié le vérifie (§10.2, T-ISO-3).

---

## 7. Sécurité & permissions

### 7.1 Migration Prisma — ajout de `OWNER` à l'enum `UserRole`

#### 7.1.1 Modification du schéma `[À MODIFIER]`

`packages/database/prisma/schema.prisma:1227-1233` :

```prisma
enum UserRole {
  ADMIN
  TEACHER
  ACCOUNTANT
  STUDENT
  PARENT
  /// Propriétaire de l'établissement : accès en lecture seule aux tableaux de
  /// bord analytiques (/api/owner/*). Ne dispose d'aucun droit d'écriture et ne
  /// voit aucun écran de gestion. Un propriétaire est rattaché à un seul
  /// établissement, comme tout autre compte.
  OWNER
}
```

`OWNER` est ajouté **en fin d'énumération**. C'est important : PostgreSQL affecte
un ordre de tri aux valeurs d'enum, et insérer une valeur en milieu de liste
imposerait un `BEFORE`/`AFTER` inutile ici.

#### 7.1.2 Fichier de migration `[À CRÉER]`

`packages/database/prisma/migrations/20260816000000_add_owner_role/migration.sql` :

```sql
-- Profil « Propriétaire » : accès en lecture seule aux tableaux de bord
-- analytiques de son établissement.
--
-- Cette migration ne contient QUE l'ajout de la valeur d'enum, volontairement.
-- PostgreSQL n'autorise pas l'utilisation d'une valeur d'enum dans la même
-- transaction que sa création : toute écriture s'appuyant sur 'OWNER'
-- (seed, backfill, contrainte) doit vivre dans une migration ultérieure.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';
```

Nommage conforme au dépôt : horodatage `AAAAMMJJHHMMSS_description`, cf.
`20260808200000_add_payment_conditions`, `20260807000000_add_primary_cycle`. Le
précédent le plus proche est d'ailleurs une création d'enum :
`CREATE TYPE "SchoolCycle" AS ENUM ('PRIMAIRE', 'SECONDAIRE');`
(`packages/database/prisma/migrations/20260807000000_add_primary_cycle/migration.sql`).

#### 7.1.3 Contrainte PostgreSQL — pourquoi une migration isolée

| Contrainte | Conséquence |
| --- | --- |
| `ALTER TYPE … ADD VALUE` ne peut pas être suivi, dans la **même transaction**, d'une requête qui *utilise* la nouvelle valeur | Prisma exécute chaque fichier de migration dans une transaction ⇒ **aucune autre instruction touchant à `OWNER` dans ce fichier** |
| `IF NOT EXISTS` | Rend la migration rejouable sans erreur (utile si un correctif a déjà été appliqué à la main sur un environnement) |
| Les autres modifications de schéma (`classes.capacity`, `classrooms.capacity`, index I1-I8) | **Migrations séparées**, jouées après |

#### 7.1.4 Ordre de déploiement

| Étape | Action | Environnement | Condition de passage |
| --- | --- | --- | --- |
| 1 | Fusionner les modifications de `packages/types` (enum TS) et du schéma Prisma | — | Revue de code |
| 2 | `pnpm prisma migrate deploy` — migration `add_owner_role` | Base | Migration marquée appliquée |
| 3 | `pnpm prisma generate` — régénération du client | Build | Types Prisma incluant `OWNER` |
| 4 | Déployer **l'API** (routes `/api/owner/*`, `requireRole(OWNER)`) | API | `/api/health` OK (`apps/api/src/index.ts:198-213`) |
| 5 | Déployer **le web** (branche de menu, routes, tabbar, thème) | Web | Aucune régression sur les 5 rôles existants |
| 6 | Migration `add_capacity_columns` + `add_owner_indexes` | Base | Optionnelles, non bloquantes |
| 7 | Créer le premier compte `OWNER` (§7.7) | Applicatif | Connexion réussie, redirection vers `/owner` |

**L'ordre 2 → 4 → 5 n'est pas interchangeable.** Si le web était déployé avant
l'API, un compte `OWNER` obtiendrait `403` sur toutes ses routes. Si l'API était
déployée avant la migration, `requireRole(UserRole.OWNER)` compilerait (la
comparaison est textuelle, `apps/api/src/middleware/rbac.ts:23-25`) mais aucun
compte ne pourrait porter ce rôle en base — l'insertion échouerait sur le type
enum.

**Compatibilité descendante** : ajouter une valeur d'enum n'invalide **aucune**
ligne existante. Les 5 rôles actuels sont intacts, et un déploiement partiel
(migration jouée, API non déployée) est sans effet visible.

#### 7.1.5 Réversibilité

PostgreSQL **ne sait pas supprimer une valeur d'enum**. Le retour arrière n'est
donc pas un simple `ALTER TYPE … DROP VALUE`.

| Scénario | Procédure |
| --- | --- |
| **Rollback applicatif** (recommandé) | Redéployer les versions précédentes de l'API et du web. La valeur `OWNER` subsiste en base, inutilisée et inoffensive. Désactiver les comptes concernés : `UPDATE users SET is_active = false WHERE role = 'OWNER';` (`users.is_active`, `schema.prisma:998`) |
| **Rollback de schéma** (à n'employer qu'en cas de nécessité) | Recréation du type, sous fenêtre de maintenance, avec la garantie préalable qu'aucune ligne ne porte `OWNER` |

Script de rollback complet :

```sql
BEGIN;
-- 0) Garde-fou : refuser le rollback s'il reste des comptes propriétaires.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE role = 'OWNER') THEN
    RAISE EXCEPTION 'Des comptes OWNER existent encore — réaffectez-les avant le rollback';
  END IF;
END $$;

-- 1) Type de remplacement, sans OWNER.
CREATE TYPE "UserRole_old" AS ENUM ('ADMIN','TEACHER','ACCOUNTANT','STUDENT','PARENT');

-- 2) Bascule de la colonne.
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "UserRole_old"
  USING ("role"::text::"UserRole_old");

-- 3) Permutation des types.
DROP TYPE "UserRole";
ALTER TYPE "UserRole_old" RENAME TO "UserRole";
COMMIT;
```

`users.role` est la **seule** colonne typée `UserRole` dans tout le schéma
(`schema.prisma:992`) — la bascule ne concerne donc qu'une table.

### 7.2 Impact sur les enums TypeScript et sur tout ce qui est indexé par rôle

#### 7.2.1 Enum TypeScript `[À MODIFIER]`

`packages/types/src/index.ts:106-114` :

```ts
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  SECRETARY = 'SECRETARY',
  ACCOUNTANT = 'ACCOUNTANT',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  OWNER = 'OWNER',            // ← ajout
}
```

> Rappel de §2.1.1 : `SECRETARY` et `STAFF` n'existent pas côté Prisma. Cet écart
> est préexistant et hors-périmètre, mais il explique pourquoi le typage
> TypeScript ne suffit pas à garantir la cohérence — les tests de §10.3 vérifient
> l'alignement des deux enums sur les valeurs communes.

#### 7.2.2 Recensement exhaustif des points indexés par `UserRole`

| # | Fichier | Élément | Nature | Conséquence si oublié | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `packages/database/prisma/schema.prisma:1227-1233` | `enum UserRole` | enum PG | Impossible d'enregistrer un compte `OWNER` | `[À MODIFIER]` §7.1.1 |
| 2 | `packages/types/src/index.ts:106-114` | `enum UserRole` | enum TS | `UserRole.OWNER` inexistant à la compilation | `[À MODIFIER]` §7.2.1 |
| 3 | `apps/api/src/routes/auth.ts:39` | `z.enum(['ADMIN','TEACHER','ACCOUNTANT','STUDENT','PARENT'])` | Zod (inscription) | `POST /api/auth/register` refuse `OWNER` | `[À MODIFIER]` — ajouter `'OWNER'` |
| 4 | `apps/api/src/routes/users.ts:26` | `SYSTEM_ROLES = ['ADMIN','ACCOUNTANT']` | Liste blanche | Les comptes `OWNER` sont **invisibles** dans `GET /api/users` (filtre `role: { in: SYSTEM_ROLES }`, ligne `95`) et **non créables** depuis l'écran Utilisateurs | `[À MODIFIER]` §7.7 |
| 5 | `apps/api/src/routes/users.ts:157-159` | Déduction `customRole.isProtected ? 'ADMIN' : 'ACCOUNTANT'` | Logique | Un compte créé avec un rôle personnalisé ne peut jamais valoir `OWNER` | `[À MODIFIER]` §7.7 |
| 6 | `apps/api/src/middleware/rbac.ts:68-100` | `isAdmin`, `isTeacher`, `isAccountant`, `isStudent`, `isParent` | Helpers | Pas de `isOwner` | `[À CRÉER]` — ajouter `isOwner` par symétrie |
| 7 | `apps/api/src/middleware/auth.ts:161-179` | `authorize()` (déprécié) | Middleware | Aucune — ne pas l'utiliser | Aucune |
| 8 | `apps/web/src/components/layout/Layout.tsx:18-24` | `ROLE_LABEL: Record<string,string>` | Libellés FR | Affiche « OWNER » en brut dans le menu utilisateur (repli ligne `83`) | `[À MODIFIER]` — `OWNER: 'Propriétaire'` |
| 9 | `apps/web/src/components/layout/Layout.tsx:50-65` | Menu utilisateur : « Profil de l'établissement » → `/etablissement` | Navigation | **Fuite d'écran de gestion** — le propriétaire atteint un écran d'administration | `[À MODIFIER]` §7.5 |
| 10 | `apps/web/src/lib/navigation/use-app-navigation.tsx:91`, `142`, `184`, `326`, `407` | Chaîne de branches de menu | Navigation | Le propriétaire reçoit `defaultItems` — **le menu d'administration complet** | `[À MODIFIER]` §7.5 — **critique** |
| 11 | `apps/web/src/lib/navigation/use-app-navigation.tsx:420-474` | Calcul des `openKeys` | Navigation | Les groupes `/owner/*` ne se déplient pas | `[À MODIFIER]` |
| 12 | `apps/web/src/components/ds/nav/navModel.tsx:81-131` | `getTabbarItems()` — repli `125-130` | Tabbar mobile | **4 raccourcis vers des écrans d'administration** | `[À MODIFIER]` §5.5 — **critique** |
| 13 | `apps/web/src/lib/navigation/role-home.ts:13-22` | `roleHome()` | Redirection | Le propriétaire atterrit sur `/dashboard` | `[À MODIFIER]` — `case 'OWNER': return '/owner'` |
| 14 | `apps/web/src/lib/navigation/role-home.ts:25-32` | `isParentRole`, `isStudentRole` | Garde de routes | Pas de `isOwnerRole` | `[À CRÉER]` |
| 15 | `apps/web/src/App.tsx:161-196` | Blocs de routes Parent / Élève | Routage | Le propriétaire tombe dans le bloc d'administration (`198-275`) — **toutes les pages de gestion montées** | `[À MODIFIER]` §7.5 — **critique** |
| 16 | `apps/web/src/index.css:60-64`, `116-118`, `149-170` | `html[data-role='…']` | Thème | Accent par défaut, aucune identité visuelle | `[À MODIFIER]` §5.6 |
| 17 | `apps/web/src/theme/tokens.ts:78-80` | `getRoleAccent()` | Thème Ant | Accent bleu administratif | `[À MODIFIER]` |
| 18 | `apps/api/src/services/role-sync.service.ts:18-66` | Synchronisation des menus de rôle protégé | Rôles personnalisés | **Aucune** — `OWNER` n'utilise pas `Role`/`RoleMenu` | Aucune (§7.5) |
| 19 | `apps/api/src/routes/roles.ts:57-60` | `allowedMenuKeys()` | Rôles personnalisés | **Aucune** | Aucune (§7.5) |
| 20 | `apps/web/src/lib/navigation/menu-catalog.ts:24-83` | `MENU_CATALOG` | Écran Rôles | **Aucune** — ne pas y ajouter les clés `/owner/*` | Aucune (§7.5) |
| 21 | `packages/types/src/index.ts:18-89` | `COMMON/SECONDARY/PRIMARY/FINANCE_MENU_KEYS`, `menuKeysForSchoolType()` | Catalogue backend | **Aucune** — ne pas y ajouter les clés `/owner/*` | Aucune (§7.5) |
| 22 | `apps/api/src/routes/primary/access.ts:76-84` | `adminOnly` | Garde primaire | `OWNER` est refusé (le test est `role !== 'ADMIN'`) — **comportement souhaité** | Aucune |
| 23 | `apps/api/src/routes/analytics.ts:8-135` | `requireRole(['ADMIN','COMPTABLE'])` etc. | Autorisation | Routeur non monté, rôles inexistants | Aucune (§2.6) |
| 24 | `apps/api/src/routes/dashboard.ts:9`, `80` | `authenticate` **sans** `requireRole` | Autorisation | ⚠ **Un compte `OWNER` pourrait appeler `/api/dashboard/*`** | `[À MODIFIER]` §7.4 |
| 25 | `packages/database/src/create-admin.ts`, `verify-admin.ts`, `seed.ts` | Scripts d'amorçage | Seeds | Aucun compte `OWNER` de démonstration | `[À MODIFIER]` §9-Lot 6 |

**Aucun `switch (role)` ni `Record<UserRole, …>` exhaustif n'existe côté API** : la
comparaison de rôle y est toujours textuelle (`apps/api/src/middleware/rbac.ts:23-25`).
Aucune erreur de compilation n'alertera donc sur un point oublié — **d'où
l'exhaustivité de ce tableau, qui tient lieu de filet.** Les tests de §10.3
couvrent les points 8, 10, 12, 13, 15.

### 7.3 `authenticate` + isolation — non négociable

Chaque routeur de `apps/api/src/routes/owner/**` **doit** passer par
`router.use(authenticate, …)`. Le rappel technique, tiré du code :

1. `authenticate` est le **seul** endroit qui appelle
   `runWithEstablishment(user.establishment_id, () => next())`
   (`apps/api/src/middleware/auth.ts:96`).
2. Hors de ce contexte, `getEstablishmentId()` renvoie `null`
   (`packages/database/src/tenant.ts:54-58`).
3. L'extension Prisma se retire alors intégralement :
   `if (!establishmentId || !model || !scopedModels.has(model)) return query(args);`
   (`packages/database/src/tenant-extension.ts:233`).
4. Conséquence en **lecture** : la requête ramène les données de **tous** les
   établissements. Conséquence en **écriture** : violation de la contrainte
   `NOT NULL` sur `establishment_id` (commentaire répété du schéma, p. ex.
   `schema.prisma:136-148`).

Pour un espace en lecture seule, c'est le premier effet qui compte : **une route
`/api/owner/*` montée sans `authenticate` est une fuite de données
inter-établissements, silencieuse et sans erreur.**

Mesures de contrôle :

| Mesure | Mise en œuvre |
| --- | --- |
| Un seul point de montage | `router.use(authenticate, requireRole(UserRole.OWNER))` dans `routes/owner/index.ts` ; les sous-routeurs sont montés **sous** lui et ne redéclarent jamais de middleware |
| Garde d'exécution | Chaque service `owner` appelle `requireEstablishmentId()` (`packages/database/src/tenant.ts:64-73`) en entrée, ce qui lève explicitement si le contexte manque |
| Interdiction de `unscopedPrisma` | Règle ESLint `no-restricted-imports` sur `routes/owner/**` et `services/owner/**` |
| Interdiction de `new PrismaClient()` | Règle ESLint `no-restricted-syntax` (l'erreur existe déjà dans `analytics.service.ts:1-3`) |
| Vérification automatisée | `pnpm --filter api verify:tenant` (script existant, `apps/api/package.json`) étendu aux nouvelles routes |
| Test d'isolation | §10.2 |

**Un propriétaire = un seul établissement.** `AuthRequest.user.establishmentId`
(`apps/api/src/middleware/auth.ts:12`) est un scalaire, pas une liste. Aucune route
`/api/owner/*` n'accepte de paramètre `establishmentId`, et aucun service `owner`
ne prend d'argument d'établissement : le seul établissement lisible est celui du
jeton. C'est la même discipline que l'espace Élève, où « aucune route n'accepte
d'identifiant d'élève » (`apps/api/src/routes/student-space.ts:16-22`).

### 7.4 Refus des écritures et des routes existantes

#### 7.4.1 Sur `/api/owner/*`

Trois barrières superposées :

| Niveau | Barrière | Référence |
| --- | --- | --- |
| 1 | `requireRole(UserRole.OWNER)` — seul le propriétaire entre | `apps/api/src/middleware/rbac.ts:9-35` |
| 2 | Middleware de méthode : tout ce qui n'est ni `GET`, ni `HEAD`, ni `OPTIONS` → `405` + `Allow: GET, HEAD, OPTIONS` | §6.2 |
| 3 | Aucun handler d'écriture n'existe dans `routes/owner/**` ; aucun appel à `create`/`update`/`delete`/`upsert`/`createMany`/`updateMany`/`deleteMany` dans `services/owner/**` | vérifié par test §10.2 |

#### 7.4.2 Sur les routes existantes `[À MODIFIER]`

Un compte `OWNER` est un compte authentifié comme un autre : les routes protégées
uniquement par `authenticate` lui sont **ouvertes**. Recensement :

| Route | Garde actuelle | Risque | Action |
| --- | --- | --- | --- |
| `GET /api/dashboard/stats` | `authenticate` seul (`apps/api/src/routes/dashboard.ts:9`) | Accès à des compteurs — faible, mais hors du périmètre voulu | `[À MODIFIER]` — ajouter `requireRole('ADMIN','ACCOUNTANT','TEACHER')` |
| `GET /api/dashboard/activities` | `authenticate` seul (`dashboard.ts:80`) | ⚠ Renvoie des **noms d'élèves** et des **notes nominatives** (`dashboard.ts:87-128`) | `[À MODIFIER]` — même garde, **prioritaire** |
| `GET /api/establishments/me` | `authenticate` seul (`apps/api/src/routes/establishments.ts:142`) | Aucun — le propriétaire doit lire la fiche de son école | Aucune (usage assumé, cf. `useEstablishment`) |
| `GET /api/academic-years`, `/current`, `/:id` | `authenticate` seul (`apps/api/src/routes/academicYears.ts:45`, `76`, `104`) | Aucun — référentiel du sélecteur d'année | Aucune |
| `POST/PATCH/DELETE /api/academic-years/*` | `requireRole` présent (`academicYears.ts:133`, `186`, `234`, `262`) | Aucun | Aucune |
| Toutes les routes d'écriture métier | `requireRole('ADMIN')` ou équivalent | Aucun — `OWNER` n'y figure pas | Aucune |
| `PATCH /api/establishments/me`, logo | `requireRole('ADMIN')` (`establishments.ts:162`, `181`, `209`) | Aucun | Aucune |

**Audit à mener au moment de l'implémentation** : balayer l'ensemble de
`apps/api/src/routes/` à la recherche des routes portant `authenticate` sans
`requireRole`, et statuer sur chacune. Le tableau ci-dessus recense celles
identifiées à la rédaction ; la commande de contrôle figure en §10.2 (T-AUTZ-4).

### 7.5 Filtrage de la navigation côté web

#### 7.5.1 Branche `OWNER` dans `use-app-navigation.tsx` `[À MODIFIER]`

Insérée **avant** la branche `PARENT` (`use-app-navigation.tsx:91`), sur le modèle
exact des branches existantes — un menu **construit à part**, jamais un filtrage
du menu d'administration. Le commentaire de la branche Parent énonce la règle :
« Aucune entrée d'administration n'y apparaît : le menu est construit à part, il
ne "filtre" pas le menu admin » (`use-app-navigation.tsx:88-90`).

```tsx
if (role === 'OWNER') {
  return [
    { key: '/owner', icon: <LucideIcon icon={LayoutDashboard} />, label: "Vue d'ensemble",
      onClick: () => go('/owner') },
    { key: 'steering', icon: <LucideIcon icon={Gauge} />, label: 'Pilotage', children: [
        { key: '/owner/effectifs',   icon: <LucideIcon icon={Users} />,         label: 'Effectifs',   onClick: () => go('/owner/effectifs') },
        ...(showSecondary ? [
        { key: '/owner/assiduite',   icon: <LucideIcon icon={ClipboardCheck} />, label: 'Assiduité',   onClick: () => go('/owner/assiduite') }] : []),
        { key: '/owner/resultats',   icon: <LucideIcon icon={Trophy} />,        label: 'Résultats',   onClick: () => go('/owner/resultats') },
        { key: '/owner/enseignants', icon: <LucideIcon icon={GraduationCap} />, label: 'Enseignants', onClick: () => go('/owner/enseignants') },
      ] },
    { key: '/owner/finance',    icon: <LucideIcon icon={Wallet} />,   label: 'Finance',    onClick: () => go('/owner/finance') },
    { key: '/owner/ressources', icon: <LucideIcon icon={Building} />, label: 'Ressources', onClick: () => go('/owner/ressources') },
  ];
}
```

Le sous-bloc conditionnel `...(showSecondary ? [ … ] : [])` reprend mot pour mot
le patron employé aux lignes `276-297`, `298-322`, `350-357`, `360-373` et
`374-385` du même fichier.

`openKeys` `[À MODIFIER]` — ajouter dans l'effet (`use-app-navigation.tsx:420-474`) :

```tsx
if (
  path.startsWith('/owner/effectifs')   || path.startsWith('/owner/assiduite') ||
  path.startsWith('/owner/resultats')   || path.startsWith('/owner/enseignants')
) keys.push('steering');
```

#### 7.5.2 Garde de routes `[À MODIFIER]`

`apps/web/src/lib/navigation/role-home.ts` :

```ts
export function roleHome(role?: string | null): string {
  switch (String(role).toUpperCase()) {
    case 'PARENT':  return '/parent';
    case 'STUDENT': return '/student';
    case 'OWNER':   return '/owner';     // ← ajout
    default:        return '/dashboard';
  }
}

/** Vrai pour le rôle Propriétaire, qui dispose de son propre jeu de routes `/owner/*`. */
export function isOwnerRole(role?: string | null): boolean {
  return String(role).toUpperCase() === 'OWNER';
}
```

`apps/web/src/App.tsx` — bloc inséré à côté de ceux de Parent (`161-177`) et Élève
(`181-196`) :

```tsx
if (isOwnerRole(user?.role)) {
  return (
    <AntApp>
      <Layout>
        <Routes>
          <Route path="/owner"             element={<OwnerHomePage />} />
          <Route path="/owner/effectifs"   element={<OwnerEnrollmentPage />} />
          <Route path="/owner/assiduite"   element={<OwnerAttendancePage />} />
          <Route path="/owner/resultats"   element={<OwnerResultsPage />} />
          <Route path="/owner/enseignants" element={<OwnerStaffPage />} />
          <Route path="/owner/finance"     element={<OwnerFinancePage />} />
          <Route path="/owner/ressources"  element={<OwnerResourcesPage />} />
          <Route path="*" element={<Navigate to="/owner" replace />} />
        </Routes>
      </Layout>
    </AntApp>
  );
}
```

**C'est la garde structurante** : les pages d'administration ne sont pas
« masquées », elles **ne sont pas montées**. Une saisie manuelle de
`/people/students` dans la barre d'adresse tombe sur le `catch-all` et renvoie
vers `/owner`. C'est le même raisonnement que celui déjà écrit pour Parent :
« aucune page d'administration n'est montée ici — une route inconnue le ramène à
son espace, jamais vers le tableau de bord d'administration »
(`apps/web/src/App.tsx:158-160`).

#### 7.5.3 Menu utilisateur `[À MODIFIER]`

`apps/web/src/components/layout/Layout.tsx:50-65` — la première entrée renvoie
aujourd'hui vers `/etablissement`, écran d'administration
(`apps/web/src/App.tsx:204`). Pour `OWNER`, elle doit **disparaître**, laissant
« Changer le mot de passe » et « Déconnexion » (`Layout.tsx:66-79`).

Le changement de mot de passe est conservé : c'est une action sur son propre
compte, pas une action d'administration, et la modale existe déjà
(`apps/web/src/components/layout/ChangePasswordModal.tsx`, montée `Layout.tsx:130-141`).

#### 7.5.4 Ce que le propriétaire ne doit **jamais** voir

| Catégorie | Éléments | Motif |
| --- | --- | --- |
| **Écrans d'administration** | `/people/roles` (`App.tsx:257`), `/people/users` (`258`), `/etablissement` (`204`) | Gestion des droits et de l'identité de l'école |
| **Écrans de gestion métier** | `/academic/inscriptions` (`214`), `/academic/years` (`208`), `/academic/classes` (`210`), `/academic/subjects` (`212`), `/academic/assignments` (`213`), `/academic/coefficients` (`215`), `/academic/timetable` (`216`), `/people/classrooms` (`259`), `/primary/classes` (`229`), `/primary/evaluations` (`230`), `/finance/payment-conditions` (`243`) | Écriture, hors périmètre |
| **Écrans de saisie** | `/academic/attendance` (`217`), `/academic/class-grades` (`223`), `/academic/conduct` (`224`), `/primary/grades` (`231`), `/primary/saisie` (`240`), `/evaluations/*` (`219-221`), `/finance/payments` (`244`) | Écriture |
| **Données personnelles élèves** | Nom, prénom, date et lieu de naissance, adresse, téléphone, email, photo, groupe sanguin, allergies, notes médicales, documents (`students`, `schema.prisma:877-903`) | Données sensibles ; le propriétaire pilote, il ne consulte pas des dossiers |
| **Données personnelles parents** | `parents` en intégralité (`schema.prisma:642-676`), y compris `generated_password` (`656`) | idem |
| **Données personnelles enseignants** | `email`, `phone`, `qualifications`, `attachments`, `generated_password` (`teachers`, `schema.prisma:1409-1417`) | idem — seuls les **agrégats** de §4.e sont exposés |
| **Notes et bulletins nominatifs** | `grades` / `primary_grades` au grain élève identifié | Agrégats uniquement (§4.c, §4.d) |
| **Conduite et discipline nominatives** | `conduct_grades`, `disciplinary_incidents` au grain élève identifié (`schema.prisma:1883-1929`, `549-575`) | Agrégats uniquement |
| **Dettes nominatives** | Nom d'élève associé à un impayé | `FIN-18` est agrégé par classe (§4.f) |
| **Paie individuelle** | `monthly_payrolls` par enseignant nommé, `advance_payments` (`schema.prisma:2481-2614`) | Masse salariale agrégée uniquement (`ENS-16`…`ENS-25`) |
| **Secrets** | `users.password_hash` (`schema.prisma:991`), `students.generated_password` (`910`), `teachers.generated_password` (`1417`), `parents.generated_password` (`656`), `refresh_tokens` (`705-714`) | Jamais sélectionnés |
| **Journal d'audit** | `audit_logs` (`schema.prisma:351-382`) | Trace nominative de l'activité du personnel |

**Règle de conception applicable à tout service `owner`** : n'employer que
`count`, `aggregate`, `groupBy` et des `select` explicitement limités aux colonnes
non nominatives. **Aucun `include` d'une relation vers `Student`, `parents`,
`teachers` ou `User` ne doit ramener un nom.** Les seules identités exposées sont
celles des **classes** (`classes.name`, `schema.prisma:493`), des **matières**
(`subjects.name`, `952`), des **salles** (`classrooms.name`, `1550`) et des
**années** (`academic_years.name`, `107`).

> **Cas particulier — le nom des enseignants.** Les indicateurs `ENS-06`
> (charge horaire), `ASS-09` (couverture d'appel) et `RES-08` (conflits) n'ont de
> valeur opérationnelle que nommés. La spécification retient : **initiales +
> matière** (« M. K. — Mathématiques ») en affichage par défaut, le nom complet
> restant hors périmètre. Point à valider (§11-Q2).

### 7.6 Récapitulatif des barrières

| # | Barrière | Emplacement | Type |
| --- | --- | --- | --- |
| B1 | `authenticate` ouvre le contexte d'établissement | `routes/owner/index.ts` | Isolation |
| B2 | Extension Prisma injecte `establishment_id` | `packages/database/src/tenant-extension.ts` | Isolation |
| B3 | `requireRole(UserRole.OWNER)` | `routes/owner/index.ts` | Autorisation |
| B4 | Refus `405` de toute méthode ≠ GET | `routes/owner/index.ts` | Lecture seule |
| B5 | Aucun handler ni appel d'écriture | `routes/owner/**`, `services/owner/**` | Lecture seule |
| B6 | `select` restreints aux colonnes non nominatives | `services/owner/**` | Confidentialité |
| B7 | Jeu de routes React isolé + `catch-all` | `apps/web/src/App.tsx` | Navigation |
| B8 | Branche de menu dédiée (menu construit à part) | `use-app-navigation.tsx` | Navigation |
| B9 | Branche de tabbar dédiée | `navModel.tsx` | Navigation |
| B10 | Menu utilisateur sans lien vers `/etablissement` | `Layout.tsx` | Navigation |
| B11 | `requireRole` ajouté sur `/api/dashboard/*` | `routes/dashboard.ts` | Autorisation |

Les barrières B7 à B10 sont de **confort et de cohérence** — elles empêchent
l'accès accidentel. Les barrières B1 à B6 et B11 sont de **sécurité** : elles
tiennent même face à un appel direct à l'API, hors navigateur.

### 7.7 Création et gestion des comptes `OWNER`

#### 7.7.1 Qui crée un compte propriétaire

**L'administrateur de l'établissement**, depuis l'écran **Utilisateurs**
(`/people/users` → `PersonnelUsersPage`, `apps/web/src/App.tsx:258`), servi par
`POST /api/users` (`apps/api/src/routes/users.ts:144-183`, gardé par
`requireRole('ADMIN')` ligne `144`).

C'est le seul chemin cohérent avec l'existant : les enseignants, élèves et parents
ont leurs propres parcours de création (fiches métier), et l'écran Utilisateurs est
déjà décrit comme celui des « comptes "personnel" génériques »
(`apps/api/src/routes/users.ts:18-20`).

#### 7.7.2 Modifications requises `[À MODIFIER]`

Le mécanisme actuel **déduit** le rôle système du rôle personnalisé :
`ADMIN` si le rôle est protégé, `ACCOUNTANT` sinon
(`apps/api/src/routes/users.ts:157-159`). Ce mécanisme ne peut pas produire
`OWNER`. Deux options :

| Option | Description | Avantages | Inconvénients |
| --- | --- | --- | --- |
| **A — Champ explicite (recommandée)** | Ajouter un champ `systemRole` optionnel au formulaire, restreint à `ACCOUNTANT` ou `OWNER` ; `ADMIN` reste déduit du rôle protégé | Explicite, lisible, sans effet de bord sur les rôles personnalisés | Un champ de plus dans le formulaire |
| **B — Rôle personnalisé conventionnel** | Créer un rôle personnalisé nommé « Propriétaire » et le reconnaître par son nom | Aucun changement d'interface | Fragile (dépend d'une chaîne), et contredit la décision §1.2 point 1 |

**Option A retenue.** Modifications :

```ts
// apps/api/src/routes/users.ts
// Ligne 26 :
const SYSTEM_ROLES = ['ADMIN', 'ACCOUNTANT', 'OWNER'] as const;

// Schéma de création (lignes 40-50) — ajout :
systemRole: z.enum(['ACCOUNTANT', 'OWNER']).optional(),

// Déduction (lignes 157-159) :
const role: (typeof SYSTEM_ROLES)[number] =
  customRole.isProtected ? 'ADMIN' : (req.body.systemRole ?? 'ACCOUNTANT');
```

Le filtre de liste `where.role = { in: SYSTEM_ROLES }` (`users.ts:95`) prend alors
automatiquement en compte `OWNER` : les comptes propriétaires apparaissent dans
la liste des utilisateurs.

**Rôle personnalisé (`roleId`)** : le formulaire l'exige aujourd'hui
(`roleId: z.string().min(1, 'Rôle requis')`, `users.ts:46`). Pour un compte
`OWNER`, ce rôle personnalisé **n'a aucun effet** : la branche `OWNER` de
`use-app-navigation.tsx` s'évalue avant tout filtrage par `customRole.menuKeys`
(`use-app-navigation.tsx:409-413`). Deux voies :

- **Recommandée** : rendre `roleId` optionnel lorsque `systemRole === 'OWNER'`.
- **Repli minimal** : conserver l'obligation et laisser l'administrateur choisir
  un rôle quelconque, sans effet. Fonctionne, mais prête à confusion.

#### 7.7.3 Cycle de vie

| Opération | Route | Garde | Règle propre à `OWNER` |
| --- | --- | --- | --- |
| Création | `POST /api/users` | `requireRole('ADMIN')` (`users.ts:144`) | Mot de passe numérique ≥ 6 chiffres (`users.ts:28-31`) |
| Lecture | `GET /api/users`, `GET /api/users/:id` | `requireRole('ADMIN')` (`users.ts:91`, `124`) | Apparaît une fois `SYSTEM_ROLES` étendu |
| Modification | `PATCH /api/users/:id` | `requireRole('ADMIN')` (`users.ts:189`) | La protection « dernier administrateur actif » (`users.ts:218-219`) ne s'applique pas à `OWNER` |
| Désactivation | `PATCH … { isActive: false }` | idem | `authenticate` refuse alors la connexion (`apps/api/src/middleware/auth.ts:71-77`) |
| Suppression | `DELETE /api/users/:id` | `requireRole('ADMIN')` (`users.ts:250`) | Les garde-fous existants s'appliquent : refus de suppression de son propre compte (`users.ts:254-256`), refus si `isProtected` (`users.ts:262-264`, `schema.prisma:999`) ; le verrou « dernier administrateur actif » (`users.ts:267-272`) ne concerne pas `OWNER` |
| Réinitialisation du mot de passe | `PATCH … { password }` | idem | — |
| Changement de son propre mot de passe | route `auth` + `ChangePasswordModal` | Compte lui-même | Conservé pour `OWNER` (§7.5.3) |

#### 7.7.4 Combien de propriétaires par établissement

**Aucune limite technique** — plusieurs comptes `OWNER` peuvent coexister
(co-actionnaires, conseil d'administration). Chacun reste rattaché à **un seul**
établissement via `users.establishment_id` (`schema.prisma:1045`), conformément à
la décision §1.2 point 2.

Un propriétaire de plusieurs écoles doit donc disposer d'**un compte par
établissement**, avec des adresses email distinctes — `users.email` est unique au
niveau global (`@unique`, `schema.prisma:990`), et non par établissement. C'est
une conséquence directe de la décision arrêtée, à porter à la connaissance du
métier (§11-Q6).

---

## 8. Impacts sur l'existant — fichier par fichier

### 8.1 `packages/database`

| Fichier | Marque | Modification | Détail |
| --- | --- | --- | --- |
| `packages/database/prisma/schema.prisma` | `[À MODIFIER]` | `enum UserRole` : + `OWNER` | Ligne `1233`, après `PARENT` — §7.1.1 |
| `packages/database/prisma/schema.prisma` | `[À MODIFIER]` | `model SchoolClass` : + `capacity Int?` | Après `level` (`494`) — §4.a |
| `packages/database/prisma/schema.prisma` | `[À MODIFIER]` | `model classrooms` : + `capacity Int?` | Après `name` (`1550`) — §4.a |
| `packages/database/prisma/schema.prisma` | `[À MODIFIER]` | 8 index (I1-I8) | §6.9 |
| `…/migrations/20260816000000_add_owner_role/migration.sql` | `[À CRÉER]` | `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';` | **Seule instruction du fichier** — §7.1.3 |
| `…/migrations/20260816010000_add_capacity_columns/migration.sql` | `[À CRÉER]` | `ALTER TABLE "classes" ADD COLUMN "capacity" INTEGER;` + idem `classrooms` | Migration distincte |
| `…/migrations/20260816020000_add_owner_indexes/migration.sql` | `[À CRÉER]` | 8 `CREATE INDEX` | Migration distincte, idéalement `CONCURRENTLY` en production |
| `packages/database/src/seed.ts` | `[À MODIFIER]` | Compte `OWNER` de démonstration | §9-Lot 6 |
| `packages/database/src/create-admin.ts` | — | Aucune | Script d'amorçage administrateur |
| `packages/database/src/tenant.ts` | — | **Aucune** | Le mécanisme d'isolation est inchangé |
| `packages/database/src/tenant-extension.ts` | — | **Aucune** | idem |
| `packages/database/src/index.ts` | — | **Aucune** | idem |

### 8.2 `packages/types`

| Fichier | Marque | Modification | Détail |
| --- | --- | --- | --- |
| `packages/types/src/index.ts:106-114` | `[À MODIFIER]` | `enum UserRole` : + `OWNER = 'OWNER'` | §7.2.1 |
| `packages/types/src/index.ts:18-89` | — | **Aucune** | Les clés `/owner/*` **ne rejoignent pas** `COMMON_MENU_KEYS`, `SECONDARY_MENU_KEYS`, `PRIMARY_MENU_KEYS`, `FINANCE_MENU_KEYS` ni `menuKeysForSchoolType()` — §7.5 |
| `packages/types/src/index.ts` | `[À CRÉER]` *(optionnel)* | Types partagés `OwnerMetric`, `OwnerSeries`, `OwnerResponse` | §6.3 — permet un typage commun API/web, sur le modèle de `ApiResponse` (`packages/types/src/index.ts:273-278`) |

### 8.3 `apps/api`

| Fichier | Marque | Modification |
| --- | --- | --- |
| `apps/api/src/index.ts:66-67` | `[À MODIFIER]` | `import ownerRoutes from './routes/owner';` |
| `apps/api/src/index.ts:271` | `[À MODIFIER]` | `app.use('/api/owner', ownerRoutes);` — après `/api/student` |
| `apps/api/src/routes/owner/**` (9 fichiers) | `[À CRÉER]` | §6.1 |
| `apps/api/src/services/owner/**` (10 fichiers) | `[À CRÉER]` | §6.1 |
| `apps/api/src/middleware/rbac.ts` | `[À CRÉER]` (dans un fichier existant) | `export const isOwner = (req: AuthRequest): boolean => req.user?.role === 'OWNER';` — après `isParent` (`rbac.ts:98-100`) |
| `apps/api/src/routes/auth.ts:39` | `[À MODIFIER]` | `z.enum([… , 'OWNER'])` |
| `apps/api/src/routes/users.ts:26` | `[À MODIFIER]` | `SYSTEM_ROLES = ['ADMIN','ACCOUNTANT','OWNER']` |
| `apps/api/src/routes/users.ts:40-50` | `[À MODIFIER]` | Schéma de création : + `systemRole`, `roleId` optionnel si `OWNER` |
| `apps/api/src/routes/users.ts:52-63` | `[À MODIFIER]` | Schéma de mise à jour : idem |
| `apps/api/src/routes/users.ts:157-159` | `[À MODIFIER]` | Déduction du rôle système — §7.7.2 |
| `apps/api/src/routes/dashboard.ts:9` | `[À MODIFIER]` | + `requireRole('ADMIN','ACCOUNTANT','TEACHER')` |
| `apps/api/src/routes/dashboard.ts:80` | `[À MODIFIER]` | idem — **prioritaire** (renvoie des noms d'élèves, `dashboard.ts:87-128`) |
| `apps/api/src/services/attendance-session.service.ts` | `[À MODIFIER]` *(recommandé)* | Extraire le calcul « séances dues / tenues / non tenues » (`attendance-session.service.ts:551-666`) dans une fonction exportée réutilisable par `owner/attendance.service.ts` — §4.b |
| `apps/api/src/services/school-space.service.ts` | `[À MODIFIER]` *(recommandé)* | Exporter `normalize()` (`:28-31`), `round2()` (`:33`) et `coefficientsOf()` (`:36-45`) pour éviter de dupliquer la formule de moyenne — §4.c |
| `apps/api/src/services/primary/primary-results.service.ts` | — | **Aucune** — `computeEvaluationResults()` (`:161`) est déjà exporté et réutilisable en l'état |
| `apps/api/src/services/analytics.service.ts` | — | **Aucune** (hors-périmètre) — mais consigner en dette (§11-R2) |
| `apps/api/src/routes/analytics.ts` | — | **Aucune** — ne pas monter ce routeur |
| `apps/api/src/routes/primary/access.ts:76-84` | — | **Aucune** — `adminOnly` refuse déjà `OWNER` |
| `apps/api/src/swagger.ts` | `[À MODIFIER]` *(optionnel)* | Documenter le tag `Owner` |
| `apps/api/.eslintrc*` | `[À MODIFIER]` | `no-restricted-imports` (`unscopedPrisma`) et `no-restricted-syntax` (`new PrismaClient`) sur `**/owner/**` — §7.3 |

### 8.4 `apps/web`

| Fichier | Marque | Modification |
| --- | --- | --- |
| `apps/web/src/App.tsx` | `[À MODIFIER]` | Import de `isOwnerRole` (`:4`) ; imports des 7 pages `owner` ; bloc de routes `OWNER` inséré avant celui de Parent (`:161`) — §7.5.2 |
| `apps/web/src/lib/navigation/role-home.ts:13-22` | `[À MODIFIER]` | `case 'OWNER': return '/owner'` |
| `apps/web/src/lib/navigation/role-home.ts:25-32` | `[À CRÉER]` | `isOwnerRole()` |
| `apps/web/src/lib/navigation/use-app-navigation.tsx:91` | `[À MODIFIER]` | Branche `OWNER` insérée avant `PARENT` — §7.5.1 |
| `apps/web/src/lib/navigation/use-app-navigation.tsx:420-474` | `[À MODIFIER]` | `openKeys` pour `steering` |
| `apps/web/src/lib/navigation/use-app-navigation.tsx:2-33` | `[À MODIFIER]` | Aucun nouvel import d'icône : `LayoutDashboard` (`:19`), `Gauge` (`:16`), `Users` (`:29`), `ClipboardCheck` (`:9`), `Trophy` (`:26`), `GraduationCap` (`:23`), `Wallet` (`:31`), `Building` (`:6`) sont déjà présents |
| `apps/web/src/lib/navigation/menu-catalog.ts` | — | **Aucune** — §7.5 |
| `apps/web/src/components/layout/Layout.tsx:18-24` | `[À MODIFIER]` | `ROLE_LABEL` : + `OWNER: 'Propriétaire'` |
| `apps/web/src/components/layout/Layout.tsx:50-65` | `[À MODIFIER]` | Masquer « Profil de l'établissement » pour `OWNER` — §7.5.3 |
| `apps/web/src/components/layout/Layout.tsx:97-115` | `[À MODIFIER]` | Monter `AcademicYearPicker` dans `topbarActions` pour `OWNER` — §5.3 |
| `apps/web/src/components/ds/nav/navModel.tsx:81-131` | `[À MODIFIER]` | Branche `OWNER` dans `getTabbarItems()` + import de `Wallet` — §5.5 |
| `apps/web/src/index.css` (≈ `60-64`, `116-118`, `149-170`) | `[À MODIFIER]` | Bloc `html[data-role='owner']` clair + sombre — §5.6 |
| `apps/web/src/theme/tokens.ts:78-80` | `[À MODIFIER]` | Branche `OWNER` dans `getRoleAccent()` |
| `apps/web/src/components/theme/ThemeProvider.tsx` | — | **Aucune** — `data-role` est dérivé sans liste blanche (`:22`) |
| `apps/web/src/pages/owner/**` (7 pages) | `[À CRÉER]` | §5.1 |
| `apps/web/src/components/owner/**` (≈ 10 composants) | `[À CRÉER]` | §5.1 |
| `apps/web/src/lib/hooks/useOwner.ts` | `[À CRÉER]` | Hooks React Query, sur le modèle de `useParentSpace.ts` / `useStudentSpace.ts` |
| `apps/web/src/lib/stores/owner-filters.ts` | `[À CRÉER]` | Store Zustand du sélecteur d'année, sur le modèle de `theme-store.ts` |
| `apps/web/src/pages/PersonnelUsersPage.tsx` | `[À MODIFIER]` | Champ `systemRole` (Comptable / Propriétaire) — §7.7.2 |
| `apps/web/src/lib/api.ts` | — | **Aucune** — l'instance `api` et ses intercepteurs conviennent (`apps/web/src/lib/api.ts:11-17`) |
| `apps/web/package.json` | `[À MODIFIER]` *(conditionnel)* | Dépendance de graphiques si l'option « librairie » est retenue (§11-Q1) |

### 8.5 Fichiers explicitement **non** modifiés

| Fichier | Pourquoi |
| --- | --- |
| `apps/api/src/services/role-sync.service.ts` | `OWNER` n'utilise pas `Role`/`RoleMenu` ; la synchronisation du rôle protégé est sans objet (`role-sync.service.ts:18-39`) |
| `apps/api/src/routes/roles.ts` | idem — `allowedMenuKeys()` (`:57-60`) ne connaît pas les clés `/owner/*` et ne doit pas les connaître |
| `apps/web/src/lib/navigation/menu-catalog.ts` | L'écran Rôles ne doit pas proposer les menus du propriétaire à un rôle personnalisé |
| `packages/types/src/index.ts:18-89` | Même raison, côté backend |
| `packages/database/src/tenant*.ts` | Le mécanisme d'isolation est réutilisé tel quel, sans exception ni dérogation |
| `apps/api/src/services/establishment.service.ts` | `modules` et `levels` sont déjà exposés par `GET /api/establishments/me` (`:406-439`) |

> **Le fait que `role-sync.service.ts` et `roles.ts` ne bougent pas est un résultat
> voulu, pas un oubli** : il découle directement de la décision §1.2 point 1. Si
> une modification s'y révélait nécessaire à l'implémentation, c'est que la
> conception aurait dévié.

---

## 9. Plan d'implémentation

| Lot | Intitulé | Dépend de | Effort | Livrable |
| --- | --- | --- | --- | --- |
| 1 | Socle rôle & sécurité | — | 2 j | Enum, migration, garde d'API vide |
| 2 | Coquille front | 1 | 2 j | Menu, routes, thème, sélecteur d'année |
| 3 | Effectifs & scolarité | 1, 2 | 3 j | `/owner/effectifs` |
| 4 | Résultats pédagogiques | 1, 2 | 4 j | `/owner/resultats` (2 onglets) |
| 5 | Finance | 1, 2 | 4 j | `/owner/finance` |
| 6 | Assiduité & vie scolaire | 1, 2 | 3 j | `/owner/assiduite` |
| 7 | Enseignants & ressources | 1, 2 | 3 j | `/owner/enseignants`, `/owner/ressources` |
| 8 | Synthèse & finitions | 3-7 | 2 j | `/owner`, KPI, alertes, responsive |
| | **Total** | | **≈ 23 j** | |

Les lots 3 à 7 sont **parallélisables** une fois les lots 1 et 2 livrés.

---

### Lot 1 — Socle rôle & sécurité (2 j)

**Contenu**

- `enum UserRole` : + `OWNER` (Prisma `schema.prisma:1233` + TypeScript `packages/types/src/index.ts:114`).
- Migration `20260816000000_add_owner_role` (§7.1.2).
- `apps/api/src/routes/auth.ts:39` : + `'OWNER'` au schéma Zod.
- `apps/api/src/routes/users.ts` : `SYSTEM_ROLES`, `systemRole`, déduction (§7.7.2).
- `apps/api/src/middleware/rbac.ts` : `isOwner`.
- `apps/api/src/routes/owner/index.ts` : `authenticate` + `requireRole(OWNER)` + refus `405` + `GET /context`.
- `apps/api/src/routes/dashboard.ts:9`, `:80` : ajout de `requireRole`.
- Règles ESLint (§7.3).
- Montage dans `apps/api/src/index.ts`.

**Critères d'acceptation**

| # | Critère | Vérification |
| --- | --- | --- |
| 1.1 | La migration s'applique sur une base contenant les 5 rôles, sans perte | `prisma migrate deploy` puis `SELECT DISTINCT role FROM users` inchangé |
| 1.2 | Un compte `OWNER` peut être créé et se connecter | `POST /api/users` avec `systemRole: 'OWNER'` → `201` ; `POST /api/auth/login` → `200` |
| 1.3 | `GET /api/owner/context` renvoie `200` pour `OWNER` | test d'intégration |
| 1.4 | `GET /api/owner/context` renvoie `403` pour `ADMIN`, `TEACHER`, `ACCOUNTANT`, `STUDENT`, `PARENT` | 5 assertions |
| 1.5 | `POST`, `PATCH`, `PUT`, `DELETE` sur `/api/owner/context` renvoient `405` + `Allow: GET, HEAD, OPTIONS` | 4 assertions |
| 1.6 | `GET /api/owner/context` sans jeton renvoie `401` | 1 assertion |
| 1.7 | `GET /api/dashboard/activities` renvoie `403` pour `OWNER` | 1 assertion |
| 1.8 | `pnpm --filter api verify:tenant` passe | script existant |
| 1.9 | Aucune régression : la suite de tests existante passe | `pnpm --filter api test` |
| 1.10 | Rollback documenté et joué en environnement de recette | §7.1.5 |

---

### Lot 2 — Coquille front (2 j)

**Contenu**

- `isOwnerRole()` + `roleHome()` (`apps/web/src/lib/navigation/role-home.ts`).
- Bloc de routes `OWNER` dans `apps/web/src/App.tsx` + 7 pages vides.
- Branche de menu `OWNER` + `openKeys` (`use-app-navigation.tsx`).
- Branche tabbar `OWNER` (`navModel.tsx`).
- `ROLE_LABEL` + menu utilisateur (`Layout.tsx`).
- Thème `html[data-role='owner']` + `getRoleAccent()`.
- `AcademicYearPicker`, store `owner-filters`, hooks `useOwner`.
- Composants `OwnerSection`, `OwnerEmptyState`, `DeltaBadge`, `OwnerKpiGrid`.

**Critères d'acceptation**

| # | Critère | Vérification |
| --- | --- | --- |
| 2.1 | Après connexion, un `OWNER` atterrit sur `/owner` | manuel + test |
| 2.2 | Le menu ne contient que les 7 entrées de §5.2 | inspection du DOM |
| 2.3 | `/owner/assiduite` est absent du menu dans une école primaire pure | `modules.secondary === false` |
| 2.4 | La saisie manuelle de `/people/users`, `/people/roles`, `/etablissement`, `/academic/inscriptions` redirige vers `/owner` | 4 assertions |
| 2.5 | La tabbar mobile affiche les 4 raccourcis `/owner/*` | viewport 375 px |
| 2.6 | Le menu utilisateur ne contient pas « Profil de l'établissement » | inspection |
| 2.7 | L'accent de rôle est distinct des 5 existants, en clair et en sombre | inspection visuelle |
| 2.8 | Le sélecteur d'année persiste par URL (`?y=`, `?c=`) et par `sessionStorage` | rechargement de page |
| 2.9 | Aucune régression de navigation pour les 5 rôles existants | parcours manuel des 5 rôles |
| 2.10 | Aucun scroll horizontal du `body` de 320 px à 1920 px | inspection |

---

### Lot 3 — Effectifs & scolarité (3 j)

**Contenu** : `owner/enrollment.service.ts`, routes `GET /api/owner/enrollment` et
`/enrollment/timeline`, page `OwnerEnrollmentPage`, composants `BarChart`,
`DonutChart`, `Histogram`, `LineChart`. Migration `add_capacity_columns` +
`EFF-16`/`EFF-17` (état vide si capacité nulle).

**Indicateurs** : `EFF-01` → `EFF-18`.

**Critères d'acceptation**

| # | Critère |
| --- | --- |
| 3.1 | `EFF-01` égale exactement `SELECT COUNT(*) FROM inscriptions WHERE academic_year_id = :y AND establishment_id = :e` |
| 3.2 | `EFF-08 + EFF-09 = EFF-01` pour tout jeu de données |
| 3.3 | `EFF-10` est `null` (et non `0`) pour la première année de l'établissement |
| 3.4 | La somme des effectifs de `EFF-02` (par niveau) égale `EFF-01` |
| 3.5 | `EFF-06` calcule l'âge sur `academic_years.start_year`, pas sur la date du jour |
| 3.6 | Les 3 filtres `L1`, `L2`, `L8` se combinent et le total se recalcule |
| 3.7 | `EFF-16`/`EFF-17` affichent « Capacité non renseignée » si toutes les capacités sont nulles |
| 3.8 | La comparaison N vs N-1 affiche `delta` et `deltaPct` cohérents avec §6.3 |
| 3.9 | `/enrollment/timeline?years=5` renvoie au plus 5 points, triés par `start_year` croissant |
| 3.10 | Aucune donnée nominative dans la réponse (aucun `firstName`, `lastName`, `email`) |

---

### Lot 4 — Résultats pédagogiques (4 j)

**Contenu** : `owner/results-secondary.service.ts`,
`owner/results-primary.service.ts`, routes `/results/secondary`,
`/results/primary` et leurs `timeline`, page `OwnerResultsPage` à deux onglets
(`Tabs`, `apps/web/src/components/ds/Tabs.tsx`).

**Indicateurs** : `SEC-01` → `SEC-21`, `PRI-01` → `PRI-20`.

**Critères d'acceptation**

| # | Critère |
| --- | --- |
| 4.1 | `SEC-04` applique la normalisation `/10 → /20` à demi-poids, identique à `school-space.service.ts:28-31` |
| 4.2 | `SEC-01` reproduit, pour un élève donné, la moyenne affichée dans son bulletin (`school-space.service.ts:272-292`) — **écart toléré : 0,01** |
| 4.3 | `SEC-10` applique bien `semesters.coefficient` (T1=1, T2=2, T3=2 → /5, `schema.prisma:1661-1664`) |
| 4.4 | `PRI-05` reproduit `computeEvaluationResults()` (`primary-results.service.ts:242`) — **écart toléré : 0,01** |
| 4.5 | `PRI-05` utilise `primary_evaluations.divisor` (figé) et non `primary_class_settings.divisor` |
| 4.6 | Les élèves `is_absent` sont exclus de `PRI-05` et comptés dans `PRI-11` |
| 4.7 | Les échelles /10 et /20 ne sont jamais mélangées dans un même graphique |
| 4.8 | L'onglet « Primaire » est absent si `modules.primary === false`, et réciproquement |
| 4.9 | Si les deux modules sont actifs, les deux onglets sont présents |
| 4.10 | `SEC-16` et `PRI-14` gèrent les ex æquo (même rang, cf. `primary-results.service.ts:86`) |
| 4.11 | Aucun nom d'élève dans la réponse |
| 4.12 | `/results/secondary` répond en moins de 3 s sur le jeu de données de 1 000 élèves (§10.4) |

---

### Lot 5 — Finance (4 j)

**Contenu** : `owner/finance.service.ts`, 6 routes (§6.4), page `OwnerFinancePage`,
composants `StackedBar`, courbe superposée N/N-1.

**Indicateurs** : `FIN-01` → `FIN-38`.

**Critères d'acceptation**

| # | Critère |
| --- | --- |
| 5.1 | `FIN-01` exclut les factures `CANCELLED` (`schema.prisma:1358`) |
| 5.2 | `FIN-03 = FIN-01 − FIN-02`, à l'unité monétaire près |
| 5.3 | `FIN-04` est `null` (et non `0`) si `FIN-01` vaut `0` |
| 5.4 | Le statut de tranche reproduit exactement `studentPayment.service.ts:221-228`, `OVERDUE` prévalant |
| 5.5 | `FIN-10` ventile la totalité de `FIN-08` dans les 4 tranches d'ancienneté |
| 5.6 | `FIN-15` couvre 12 mois de septembre à août, avec superposition N-1 |
| 5.7 | `FIN-18` ne renvoie **aucun** identifiant ni nom d'élève — grain classe uniquement |
| 5.8 | Les domaines `expenses`, `budgets`, `payroll` vides renvoient `null` et alimentent `meta.unavailable` |
| 5.9 | Aucune carte n'affiche `0 FCFA` sur une source vide — l'état vide de §5.7 s'affiche |
| 5.10 | Les montants sont formatés en FCFA, séparateur de milliers français |
| 5.11 | `FIN-34` (marge) n'apparaît que si dépenses **et** paie sont alimentées |

---

### Lot 6 — Assiduité & vie scolaire (3 j)

**Contenu** : `owner/attendance.service.ts`, 4 routes, page `OwnerAttendancePage`,
extraction de la logique « séances non tenues » (§8.3). Jeux de données de test
des trois types d'école (§10.5) et compte `OWNER` de démonstration au seed.

**Indicateurs** : `ASS-01` → `ASS-20`.

**Critères d'acceptation**

| # | Critère |
| --- | --- |
| 6.1 | `ASS-01 + ASS-02 + ASS-04 = 100 %` (aux arrondis près) |
| 6.2 | `ASS-08` donne le même résultat que `GET /api/attendance-sessions/overview` sur le même périmètre |
| 6.3 | Toute lecture de `attendance_records` passe par une jointure sur `attendance_sessions` (table non cloisonnée, §6.9) |
| 6.4 | `ASS-15`…`ASS-19` sont absents si `modules.secondary === false` |
| 6.5 | `ASS-17` explicite la formule affichée (base `20` − pénalité, `conduct_settings`) |
| 6.6 | `ASS-13`/`ASS-14` affichent l'état vide si `teacher_absences` est vide |
| 6.7 | La page entière est inaccessible (menu + route) dans une école primaire pure |
| 6.8 | Aucun nom d'élève ; les enseignants n'apparaissent qu'en initiales + matière |

---

### Lot 7 — Enseignants & ressources (3 j)

**Contenu** : `owner/staff.service.ts`, `owner/resources.service.ts`, 6 routes,
pages `OwnerStaffPage` et `OwnerResourcesPage`, carte de chaleur d'occupation.

**Indicateurs** : `ENS-01` → `ENS-25`, `RES-01` → `RES-15`.

**Critères d'acceptation**

| # | Critère |
| --- | --- |
| 7.1 | `ENS-06` calcule les durées à partir des `VarChar` `start_time`/`end_time` sans erreur de fuseau |
| 7.2 | `RES-01` ne compte que les créneaux `horaires.type = 'COURS'` (`schema.prisma:1584`) |
| 7.3 | `RES-08` détecte un chevauchement réel (intervalles sécants), pas seulement une égalité d'heure de début |
| 7.4 | `RES-09` ignore les lignes à `classroom_id` nul, comptées par `RES-03` |
| 7.5 | Si `$queryRaw` est employé, le filtre `establishment_id` est explicite et paramétré (§6.6) |
| 7.6 | Les blocs paie affichent l'état vide si `monthly_payrolls` est vide |
| 7.7 | `RES-15` affiche « Capacité non renseignée » tant que `classrooms.capacity` est nul |
| 7.8 | Les listes de conflits sont bornées à 100 avec `truncated` |

---

### Lot 8 — Synthèse & finitions (2 j)

**Contenu** : `owner/summary.service.ts`, `GET /api/owner/summary`, page
`OwnerHomePage` (10 KPI + 2 graphiques + bloc « Points d'attention »), cache
serveur des années closes (§6.8), passe responsive et accessibilité.

**Critères d'acceptation**

| # | Critère |
| --- | --- |
| 8.1 | La page d'accueil affiche exactement 10 cartes, toujours renseignées (§4.h) |
| 8.2 | Le KPI #10 bascule sur `PRI-01` dans une école primaire pure |
| 8.3 | Les KPI #8 et #9 basculent entre `SEC-*` et `PRI-*` selon `modules` |
| 8.4 | Chaque « point d'attention » renvoie vers l'écran de détail correspondant |
| 8.5 | `/owner` répond en moins de 2 s sur le jeu de données de 1 000 élèves |
| 8.6 | Le cache serveur ne s'applique pas à l'année courante |
| 8.7 | Deux établissements consultant la même route ne partagent aucune entrée de cache |
| 8.8 | Contraste ≥ 4,5:1 en clair et en sombre ; navigation clavier complète ; graphiques dotés d'une alternative textuelle (tableau associé ou `aria-label`) |
| 8.9 | De 320 px à 1920 px, aucun scroll horizontal du `body` |
| 8.10 | Tous les critères des lots 1 à 7 restent satisfaits |

---

## 10. Stratégie de tests

Cadre existant : **Jest**, `pnpm --filter api test`
(`apps/api/package.json`, script `test`), fichiers dans `apps/api/src/__tests__/`
(`auth.test.ts`, `finance.test.ts`, `finance2.test.ts`, `staff.test.ts`,
`students-parents.test.ts`). Les nouveaux tests suivent la même convention.

### 10.1 Tests unitaires des formules d'agrégation

Fonctions de calcul **pures**, testées sans base — c'est la condition pour que
`services/owner/**` sépare l'extraction (Prisma) du calcul (TypeScript).

| Id | Cible | Cas couverts |
| --- | --- | --- |
| T-CALC-1 | `compare.helper.ts` | `previous = null` → `delta`/`deltaPct` `null` ; `previous = 0` → `deltaPct` `null`, `delta` défini ; valeurs négatives ; `value = null` |
| T-CALC-2 | Normalisation de note | `/20 → poids 1` ; `/10 → valeur ×2, poids 0,5` (miroir de `school-space.service.ts:28-31`) ; `max_note` exotique |
| T-CALC-3 | Moyenne pondérée `SEC-01` | Coefficient par défaut 1 si matière absente de `class_subjects` ; matière sans note exclue du dénominateur ; `Σ(coefficients) = 0` → `null` |
| T-CALC-4 | MGA `SEC-10` | `(T1 + 2×T2 + 2×T3)/5` ; trimestre manquant ; coefficients tous à 1 |
| T-CALC-5 | Moyenne primaire `PRI-05` | `Σ(notes)/divisor` arrondi 2 déc. ; `is_absent` exclu ; aucune note → `null` ; échelle /10 vs /20 |
| T-CALC-6 | Statut primaire | `ADMIS` / intermédiaire / `REDOUBLE` / `NON_CLASSE` ; seuils par défaut `scale/2` et `scale/2 − 1` (`primary-results.service.ts:203-204`) |
| T-CALC-7 | Rangs avec ex æquo | Deux élèves à égalité partagent le rang, le suivant saute (`primary-results.service.ts:84-90`) |
| T-CALC-8 | Statut de tranche | `PAID`/`PARTIAL`/`PENDING`, puis `OVERDUE` prévalant (`studentPayment.service.ts:221-228`) |
| T-CALC-9 | Taux de recouvrement | `FIN-01 = 0` → `null` ; sur-paiement (> 100 %) toléré et signalé |
| T-CALC-10 | Vieillissement `FIN-10` | Bornes 0/30/31/60/61/90/91+ ; échéance du jour → tranche 0-30 |
| T-CALC-11 | Nouveaux vs réinscrits | `EFF-08 + EFF-09 = EFF-01` ; année sans N-1 → tout est « nouveau », `EFF-10` `null` |
| T-CALC-12 | Âge | Calculé sur `academic_years.start_year`, jamais sur `Date.now()` |
| T-CALC-13 | Durées horaires | `'08:00'`/`'09:30'` → 1,5 h ; format invalide → ignoré, pas d'exception |
| T-CALC-14 | Chevauchement horaire | `[8:00,9:00[` vs `[8:30,9:30[` → conflit ; `[8:00,9:00[` vs `[9:00,10:00[` → pas de conflit |
| T-CALC-15 | Pénalité de conduite | `base_note − f(absence_hours, hours_per_point)`, borné à `[0, base_note]` (`conduct.service.ts:338-339`) |
| T-CALC-16 | Écart-type `SEC-14` | Échantillon connu ; `n = 1` → `0` ; `n = 0` → `null` |

### 10.2 Tests d'isolation multi-tenant

Le test le plus important du lot. Jeu de données : **deux établissements A et B**,
peuplés à l'identique.

| Id | Test | Attendu |
| --- | --- | --- |
| T-ISO-1 | Toutes les routes `/api/owner/*`, appelées par l'`OWNER` de A | Aucune valeur agrégée n'inclut de ligne de B — vérifié en peuplant B avec des volumes distinctifs (ex. A : 100 élèves, B : 7 élèves ; attendu strictement 100) |
| T-ISO-2 | `GET /api/owner/enrollment?academicYearId=<année de B>` | `404`, jamais les données de B (`packages/database/src/tenant-extension.ts:246-255`) |
| T-ISO-3 | **Tables non cloisonnées** — pour chacune des 19 tables de §6.9, une lecture via un service `owner` | Le résultat ne contient aucune ligne de B. Couvre en priorité `attendance_records`, `invoice_lines`, `custom_payment_plan_installments`, `payroll_items`, `payroll_payments`, `budget_transactions`, `primary_evaluation_subjects`, `conduct_absence_overrides` |
| T-ISO-4 | Aucun `unscopedPrisma`, aucun `new PrismaClient()` dans `routes/owner/**` et `services/owner/**` | Test statique par lecture des sources (ou règle ESLint en CI) |
| T-ISO-5 | Chaque `$queryRaw` de `services/owner/**` contient `establishment_id` | Test statique |
| T-ISO-6 | `pnpm --filter api verify:tenant` | Passe (script existant) |
| T-ISO-7 | Route `owner` montée **sans** `authenticate` (test négatif volontaire, sur une route jetable) | Démontre la fuite et justifie la barrière — sert de test de non-régression du montage |
| T-ISO-8 | `GET /api/owner/context` par l'`OWNER` de A | `establishment.id === A`, `academicYears` ne contient que celles de A |

### 10.3 Tests d'autorisation

| Id | Test | Attendu |
| --- | --- | --- |
| T-AUTZ-1 | Chaque route `/api/owner/*` appelée sans jeton | `401` |
| T-AUTZ-2 | Chaque route `/api/owner/*` appelée par `ADMIN`, `TEACHER`, `ACCOUNTANT`, `STUDENT`, `PARENT` | `403` (5 × N assertions) |
| T-AUTZ-3 | `POST`/`PUT`/`PATCH`/`DELETE` sur chaque route `/api/owner/*` par un `OWNER` | `405` + en-tête `Allow` |
| T-AUTZ-4 | **Balayage** : lister les routes portant `authenticate` sans `requireRole`, puis les appeler avec un jeton `OWNER` | Toute route de gestion répond `403`. Le test échoue si une route non recensée en §7.4.2 devient accessible |
| T-AUTZ-5 | `OWNER` sur `POST /api/students`, `PATCH /api/students/:id`, `DELETE /api/students/:id` | `403` |
| T-AUTZ-6 | `OWNER` sur `POST /api/grades`, `POST /api/student-payments`, `POST /api/inscriptions` | `403` |
| T-AUTZ-7 | `OWNER` sur `GET/POST/PATCH/DELETE /api/roles`, `/api/users` | `403` |
| T-AUTZ-8 | `OWNER` sur `PATCH /api/establishments/me` | `403` ; `GET /api/establishments/me` → `200` |
| T-AUTZ-9 | `OWNER` sur les routes `/api/primary/*` gardées par `adminOnly` (`routes/primary/access.ts:76-84`) | `403` |
| T-AUTZ-10 | `OWNER` sur `GET /api/dashboard/activities` | `403` après le correctif du lot 1 |
| T-AUTZ-11 | `OWNER` sur `/api/parent/*` et `/api/student/*` | `403` (`parent-space.ts:26`, `student-space.ts:25`) |
| T-AUTZ-12 | Compte `OWNER` désactivé (`isActive = false`) | `401` (`apps/api/src/middleware/auth.ts:71-77`) |
| T-AUTZ-13 | Compte `OWNER` d'un établissement inactif | `403` (`apps/api/src/middleware/auth.ts:79-85`) |

**Tests d'autorisation côté web** (React Testing Library) :

| Id | Test | Attendu |
| --- | --- | --- |
| T-WEB-1 | Rendu de `<App />` avec `user.role = 'OWNER'` | Seules les 7 routes `/owner/*` sont montées |
| T-WEB-2 | Navigation vers `/people/users`, `/people/roles`, `/etablissement`, `/academic/inscriptions` | Redirection vers `/owner` |
| T-WEB-3 | `useAppNavigation()` avec `role = 'OWNER'` | 4 entrées de premier niveau, aucune clé d'administration |
| T-WEB-4 | `getTabbarItems('OWNER')` | 4 chemins, tous préfixés `/owner` |
| T-WEB-5 | `roleHome('OWNER')` | `'/owner'` |
| T-WEB-6 | `ROLE_LABEL['OWNER']` | `'Propriétaire'` |
| T-WEB-7 | Menu utilisateur pour `OWNER` | Pas d'entrée « Profil de l'établissement » |
| T-WEB-8 | Non-régression : `useAppNavigation()` pour les 5 rôles existants | Menus identiques à l'avant-changement (instantanés) |

### 10.4 Tests de performance

| Id | Test | Seuil |
| --- | --- | --- |
| T-PERF-1 | `GET /api/owner/summary` sur le jeu « collège 1 000 élèves » | < 2 s |
| T-PERF-2 | `GET /api/owner/results/secondary` sur le même jeu | < 3 s |
| T-PERF-3 | Aucune requête `owner` ne lit plus de 50 000 lignes en mémoire | Journal de requêtes Prisma |
| T-PERF-4 | Les index I1-I8 sont effectivement utilisés | `EXPLAIN ANALYZE` sur les 5 requêtes les plus lourdes |
| T-PERF-5 | Le cache des années closes réduit le second appel d'au moins 80 % | Mesure avant/après |

### 10.5 Jeux de données de test

Quatre jeux, générés par des scripts dédiés dans `packages/database/src/seeds/`
(dossier existant : `finance.ts`, `inscriptions.ts`, `students-parents.ts`,
`teachers.ts`…), chacun **dans son propre établissement** afin de servir aussi
aux tests d'isolation.

| Jeu | `schoolType` | Contenu | Sert à |
| --- | --- | --- | --- |
| **J1 — École primaire** | `PRIMAIRE` | 6 classes CP1→CM2, 180 élèves, 4 compositions/classe + 1 examen blanc CM2, `primary_class_settings` par classe (diviseurs 5,00 à 8,50 ; échelles /10 et /20), grilles `primary_class_subjects`, notes avec `is_absent`, échéanciers et paiements, 8 enseignants titulaires, emploi du temps | `EFF-*`, `PRI-*`, `FIN-*`, `ENS-*`, `RES-*`. **Vérifie l'absence totale du domaine Assiduité** |
| **J2 — Collège** | `COLLEGE` | 12 classes 6e→3e, 480 élèves, 12 matières coefficientées, 3 trimestres (`semesters.coefficient` 1/2/2), notes `/20` **et** `/10`, `attendance_sessions` + `attendance_records`, `student_absences`, `conduct_grades` + `conduct_settings`, `bulletin_releases` partiels, factures et paiements incluant des retards de 15 à 120 j, 14 salles | `SEC-*`, `ASS-*`, `FIN-*`, `RES-*` |
| **J3 — Lycée** | `LYCEE` | 20 classes 6e→Tle, 820 élèves, 3 années scolaires consécutives (N, N-1, N-2) pour les séries pluriannuelles, `expenses`, `budgets`, `budget_lines`, `monthly_payrolls`, `teacher_hours`, `teacher_absences` | Comparaisons N vs N-1, `EFF-14`, `SEC-18`, `FIN-38`, domaines ⚠ de §2.7, performance |
| **J4 — Établissement témoin** | `COLLEGE` | Volume distinctif (7 élèves, 1 classe, 1 paiement) | **Isolation** : toute fuite se voit immédiatement dans les totaux |

Cas limites à inclure explicitement dans les jeux :

| Cas | Jeu | Vérifie |
| --- | --- | --- |
| Année scolaire sans aucune inscription | J2 | États vides, `null` ≠ `0` |
| Première année de l'établissement (aucun N-1) | J1 | `EFF-10`, `delta` `null` |
| Classe sans emploi du temps | J2 | `RES-06`, `RES-13` |
| Matière sans coefficient dans `class_subjects` | J2 | Défaut à 1 (`school-space.service.ts:43`) |
| Élève inscrit sans facture | J2 | `FIN-26` < 100 % |
| Facture `CANCELLED` | J3 | `FIN-01` l'exclut, `FIN-25` la compte |
| Composition entièrement `is_absent` | J1 | `PRI-05` `null`, `PRI-11` = 100 % |
| Enseignant sans affectation | J2 | `ENS-06` = 0, distinct de `null` |
| Salle jamais utilisée | J2 | `RES-02` |
| Conflit d'enseignant volontaire | J2 | `RES-08` |
| `classes.capacity` et `classrooms.capacity` nuls | J1, J2 | `EFF-16`, `RES-15` en état vide |
| Deux élèves ex æquo | J1, J2 | `PRI-14`, `SEC-16` |
| Note sur 10 mêlée à des notes sur 20 | J2 | `SEC-04`, normalisation |

---

## 11. Risques, questions ouvertes et décisions à valider

### 11.1 Risques

| Id | Risque | Probabilité | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| **R1** | **Fuite inter-établissements par les 19 tables non cloisonnées** (§6.9) — `attendance_records`, `invoice_lines`, `payroll_items`… ne portent pas `establishment_id` et échappent donc à l'extension Prisma | Moyenne | **Critique** | Interdiction de les lire à plat ; passage systématique par la table parente ; test T-ISO-3 couvrant les 19 ; revue de code ciblée |
| **R2** | `AnalyticsService` reste dans le dépôt avec son `new PrismaClient()` non cloisonné (`analytics.service.ts:1-3`) — un développeur pourrait le réutiliser de bonne foi | Moyenne | Élevé | Ne pas monter `routes/analytics.ts` ; consigner la dette ; envisager la suppression du fichier ou l'ajout d'un avertissement en tête |
| **R3** | Domaines ⚠ (paie, dépenses, budgets, heures, absences enseignants) **vides en production** faute d'écran de saisie monté (§2.7) — le propriétaire voit des pans entiers désespérément vides | **Élevée** | Moyen | États vides explicites (§5.7) ; `meta.unavailable` ; alerte au métier dès le cadrage ; monter les routes manquantes est **hors-périmètre** mais doit être proposé |
| **R4** | Performance de `/owner/resultats` sur `grades` (~360 000 lignes, §6.8) | Moyenne | Moyen | `groupBy` avec `max_note` dans la clé ; calcul classe par classe pour le grain élève ; index I1/I2 ; T-PERF-2 |
| **R5** | Divergence de formule entre `owner` et les écrans existants — deux vérités pour une même moyenne | Moyenne | Élevé | Réutiliser les fonctions exportées (§8.3) ; critères 4.2 et 4.4 avec tolérance 0,01 ; ne jamais réécrire une formule en SQL |
| **R6** | Migration d'enum jouée dans la même transaction qu'une écriture utilisant `OWNER` → échec PostgreSQL | Faible | Moyen | Migration isolée (§7.1.3) ; `IF NOT EXISTS` ; répétition en recette |
| **R7** | Un point indexé par rôle oublié (§7.2.2) — notamment le repli de `getTabbarItems()` (`navModel.tsx:125-130`) qui exposerait 4 écrans d'administration | Moyenne | Élevé | Tableau de recensement de §7.2.2 comme liste de contrôle ; tests T-WEB-1 à T-WEB-7 |
| **R8** | Absence de librairie de graphiques (§2.8) — SVG faits main coûteux, ou nouvelle dépendance à peser | **Élevée** | Moyen | Décision Q1 à trancher **avant** le lot 3 |
| **R9** | Rattachement des `expenses` à l'année scolaire par intervalle de dates approximatif (§4.f) | Moyenne | Faible | Q3 ; afficher la convention retenue dans l'interface |
| **R10** | Écart préexistant entre les deux enums `UserRole` (§2.1.1) aggravé par un ajout partiel | Faible | Moyen | Ajouter `OWNER` **aux deux** ; test d'alignement §10.3 |
| **R11** | Cache serveur mal cloisonné → un établissement lit les agrégats d'un autre | Faible | **Critique** | `establishmentId` en préfixe obligatoire de la clé ; `Cache-Control: private` ; critère 8.7 |
| **R12** | Exposition involontaire de données personnelles par un `include` de relation | Moyenne | Élevé | `select` explicites uniquement ; critères 3.10, 4.11, 5.7, 6.8 ; revue de code |
| **R13** | Un propriétaire multi-écoles doit gérer plusieurs comptes et plusieurs emails (§7.7.4) | Moyenne | Faible | Conséquence assumée de la décision §1.2 ; à expliciter au métier (Q6) |

### 11.2 Questions ouvertes

| Id | Question | Options | Recommandation | Bloquant pour |
| --- | --- | --- | --- | --- |
| **Q1** | Comment produire les graphiques, en l'absence de librairie ? | **(a)** SVG faits main (aucune dépendance, ~3 j de plus, contrôle total du thème) · **(b)** `recharts` (~500 ko, React, thématisable) · **(c)** `chart.js` (canvas, moins d'intégration React) | **(a)** pour les formes simples (barres, jauges, donuts, histogrammes) — le design system est déjà en CSS pur ; **(b)** à réévaluer si les courbes multi-séries s'avèrent coûteuses | Lot 3 |
| **Q2** | Quel grain d'identification est acceptable ? | **(a)** Aucun nom, tout agrégé (classe, matière, salle) · **(b)** Enseignants en initiales + matière · **(c)** Enseignants nommés · **(d)** Élèves nommés sur les impayés | **(b)** — `ENS-06`, `ASS-09`, `RES-08` perdent leur intérêt opérationnel entièrement anonymisés ; **(d)** est refusé sauf décision écrite du métier | Lots 5, 6, 7 |
| **Q3** | Comment rattacher `expenses` à une année scolaire, faute de `academic_year_id` (`schema.prisma:577-609`) ? | **(a)** Intervalle `[start_year-09-01 ; end_year-08-31]` · **(b)** Année civile · **(c)** Ajouter `academic_year_id` à `expenses` | **(a)** dans l'immédiat, **(c)** en dette de fond | Lot 5 |
| **Q4** | Faut-il aligner `FINANCE_MENU_KEYS` (`packages/types/src/index.ts:53-58`) sur le catalogue front (`menu-catalog.ts:75-82`) ? | **(a)** Hors-périmètre · **(b)** Corriger | **(a)** — sans effet sur `OWNER`, mais à consigner en dette | Aucun |
| **Q5** | Quelle teinte d'accent pour `OWNER` ? | Ardoise / bleu-gris, terre de Sienne, indigo profond… | **Ardoise / bleu-gris profond** — distincte des 5 accents existants (`apps/web/src/index.css:60-64`), et cohérente avec un profil de pilotage | Lot 2 |
| **Q6** | Un propriétaire de plusieurs écoles : un compte par école ? | **(a)** Oui, conséquence de la décision §1.2 · **(b)** Rouvrir la décision multi-établissements | **(a)** — la décision est arrêtée ; à expliciter au métier | Aucun |
| **Q7** | Faut-il exporter les tableaux de bord en PDF ? | **(a)** Non pour ce lot · **(b)** Oui, via `jspdf`/`jspdf-autotable` déjà présents (`apps/web/package.json`) ou `PDFService` (`apps/api/src/services/pdf.service.ts`) | **(a)** — non demandé ; à envisager en lot 9 si le métier le réclame | Aucun |
| **Q8** | Faut-il journaliser les consultations du propriétaire dans `audit_logs` (`schema.prisma:351-382`) ? | **(a)** Non — écriture, ce qui contredirait la lecture seule côté service · **(b)** Oui, via un middleware dédié hors des services `owner` | **(a)** — la lecture seule est un principe structurant du lot ; à rouvrir si une exigence de traçabilité apparaît | Aucun |
| **Q9** | Les seuils d'alerte (recouvrement < 60 %, occupation > 100 %, conduite < 10, réussite < 70 %) sont-ils les bons ? | Codés en dur vs paramétrables | **Codés en dur** dans ce lot, regroupés dans un unique fichier de constantes `apps/api/src/services/owner/thresholds.ts` pour être extraits ultérieurement | Lot 8 |
| **Q10** | Faut-il monter les routes `expenses`, `budgets`, `payroll`, `teacher-hours`, `teacher-absences` (§2.7) ? | **(a)** Hors-périmètre · **(b)** Lot séparé | **(a)** pour ce document, **(b)** à proposer au métier — sans elles, les domaines ⚠ resteront vides | Aucun, mais conditionne la valeur perçue |

### 11.3 Décisions à valider par le métier

| # | Décision | Pourquoi elle appartient au métier |
| --- | --- | --- |
| D1 | Le propriétaire ne voit **aucun nom d'élève**, nulle part (Q2) | Arbitrage entre pilotage et protection des données personnelles |
| D2 | Le propriétaire voit les enseignants en **initiales + matière** (Q2) | Même arbitrage, sur une population salariée |
| D3 | Le propriétaire n'accède **pas** au profil de l'établissement (§7.5.3) | Il pourrait le juger légitime en tant que financeur |
| D4 | Plusieurs propriétaires par établissement sont autorisés (§7.7.4) | Gouvernance |
| D5 | Un propriétaire multi-écoles a un compte par école (Q6) | Conséquence directe de la décision d'isolation |
| D6 | Les domaines paie / dépenses / budgets resteront **vides** tant que les écrans de saisie ne seront pas déployés (R3, Q10) | Attente à cadrer avant la livraison, sous peine de déception |
| D7 | Les seuils d'alerte retenus (Q9) | Ce sont des normes de gestion propres à l'établissement |
| D8 | Le rattachement des dépenses à l'année scolaire par intervalle septembre → août (Q3) | Convention comptable |
| D9 | Le propriétaire conserve la possibilité de changer son mot de passe (§7.5.3) | Sécurité du compte |
| D10 | Aucun export PDF dans ce lot (Q7) | Périmètre |

---

## Annexe A — Récapitulatif des indicateurs

| Domaine | Codes | Nombre | Cycles | Dont ⚠ (données possiblement vides) | Dont 🔧 (colonne à créer) |
| --- | --- | :-: | --- | :-: | :-: |
| a. Effectifs & scolarité | `EFF-01` → `EFF-19` | 19 | tous | 0 | 2 |
| b. Assiduité & vie scolaire | `ASS-01` → `ASS-20` | 20 | secondaire | 3 | 0 |
| c. Résultats secondaire | `SEC-01` → `SEC-21` | 21 | secondaire | 0 | 0 |
| d. Résultats primaire | `PRI-01` → `PRI-20` | 20 | primaire | 0 | 0 |
| e. Enseignants & personnel | `ENS-01` → `ENS-25` | 25 | tous | 13 | 0 |
| f. Finance | `FIN-01` → `FIN-38` | 38 | tous | 10 | 0 |
| g. Emploi du temps & ressources | `RES-01` → `RES-15` | 15 | tous | 0 | 1 |
| h. KPI de synthèse | 10 cartes (dérivées) | — | tous | 0 | 0 |
| **Total** | | **158** | | **26** | **3** |

## Annexe B — Récapitulatif des fichiers touchés

| Catégorie | `[À CRÉER]` | `[À MODIFIER]` | Total |
| --- | :-: | :-: | :-: |
| `packages/database` | 3 migrations | 2 (schéma, seed) | 5 |
| `packages/types` | 0 | 1 | 1 |
| `apps/api` — routes | 9 | 4 | 13 |
| `apps/api` — services | 10 | 2 | 12 |
| `apps/api` — middleware | 0 | 1 | 1 |
| `apps/api` — divers | 0 | 2 (`index.ts`, ESLint) | 2 |
| `apps/web` — pages | 7 | 2 (`App.tsx`, `PersonnelUsersPage`) | 9 |
| `apps/web` — composants | ~10 | 2 (`Layout.tsx`, `navModel.tsx`) | ~12 |
| `apps/web` — navigation / thème | 2 (hooks, store) | 4 | 6 |
| **Total** | **~41** | **~20** | **~61** |

## Annexe C — Glossaire des références de code les plus citées

| Sujet | Fichier | Lignes clés |
| --- | --- | --- |
| Enum `UserRole` Prisma | `packages/database/prisma/schema.prisma` | `1227-1233` |
| Enum `UserRole` TypeScript | `packages/types/src/index.ts` | `106-114` |
| Menus par type d'école | `packages/types/src/index.ts` | `18-89` |
| Catalogue front | `apps/web/src/lib/navigation/menu-catalog.ts` | `19-110` |
| Branches de navigation | `apps/web/src/lib/navigation/use-app-navigation.tsx` | `74-75`, `91`, `142`, `184`, `326`, `407-413`, `420-474` |
| Libellés de rôle, menu utilisateur | `apps/web/src/components/layout/Layout.tsx` | `18-24`, `50-80`, `83`, `97-115` |
| Tabbar mobile | `apps/web/src/components/ds/nav/navModel.tsx` | `81-131` |
| Routage par rôle | `apps/web/src/App.tsx` | `161-196`, `198-275` |
| Accueil par rôle | `apps/web/src/lib/navigation/role-home.ts` | `13-32` |
| Authentification + contexte tenant | `apps/api/src/middleware/auth.ts` | `29-104` (contexte `96`), `158-179` |
| Autorisation | `apps/api/src/middleware/rbac.ts` | `9-35`, `68-107` |
| Contexte d'établissement | `packages/database/src/tenant.ts` | `28-30`, `40-42`, `54-73` |
| Extension d'isolation | `packages/database/src/tenant-extension.ts` | `95-119`, `227-302`, `310` |
| Clients Prisma | `packages/database/src/index.ts` | `61-80` |
| Espace Parent | `apps/api/src/routes/parent-space.ts` | `26`, `54-95` |
| Espace Élève | `apps/api/src/routes/student-space.ts` | `16-25` |
| Lecture scolaire partagée | `apps/api/src/services/school-space.service.ts` | `5-45`, `264-292` |
| Résultats primaire | `apps/api/src/services/primary/primary-results.service.ts` | `48-99`, `161-268` |
| Statuts de paiement | `apps/api/src/services/studentPayment.service.ts` | `221-228` |
| Conduite | `apps/api/src/services/conduct.service.ts` | `14-25`, `338-339` |
| Séances non tenues | `apps/api/src/services/attendance-session.service.ts` | `551-666` |
| Analytique existante (à ne pas réutiliser) | `apps/api/src/services/analytics.service.ts` | `1-3`, `64-67`, `110-111`, `122`, `149-152` |
| Montage des routes | `apps/api/src/index.ts` | `166-282` |
| Comptes personnel | `apps/api/src/routes/users.ts` | `26`, `91-95`, `144-183`, `250-272` |
| Établissement & modules | `apps/api/src/services/establishment.service.ts` | `288-322`, `398-439` |
| Design system | `apps/web/src/components/ds/index.ts`, `Card.tsx`, `Tabs.tsx` | `2-10`, `13-45`, `8-45` |
| Styles de rôle et de thème | `apps/web/src/index.css` | `60-64`, `116-118`, `136`, `149-170`, `1777-1821` |
