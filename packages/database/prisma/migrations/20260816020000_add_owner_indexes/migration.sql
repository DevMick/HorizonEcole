-- Index de lecture du profil « Propriétaire » (I1 à I8, §6.9 de la
-- spécification). Aucun changement de structure : uniquement des chemins
-- d'accès pour les agrégats de /api/owner/*.
--
-- ─────────────────────────────────────────────────────────────────────────
-- Deux points à connaître avant de jouer cette migration en production.
--
-- 1. L'ORDRE DES COLONNES N'EST PAS ARBITRAIRE. `establishment_id` ouvre
--    chaque index parce que c'est la colonne que l'extension Prisma injecte
--    dans *toutes* les requêtes cloisonnées : un index qui commencerait par
--    l'année scolaire ne serait pas utilisable pour un filtre d'établissement
--    seul, alors que l'inverse fonctionne (préfixe le plus à gauche).
--
-- 2. CETTE MIGRATION VERROUILLE LES TABLES EN ÉCRITURE le temps de créer les
--    index. Sur une base de taille modeste, c'est l'affaire de quelques
--    secondes. Sur une base volumineuse — `grades` et `attendance_records`
--    sont les deux à surveiller — préférez créer les index à l'avance, hors
--    transaction, avec le script fourni :
--
--        psql "$DATABASE_URL" -f scripts/create-owner-indexes-concurrently.sql
--
--    Les instructions ci-dessous portant toutes `IF NOT EXISTS`, la migration
--    devient alors un no-op instantané : elle constate que le travail est fait
--    et se marque appliquée.
--
--    `CREATE INDEX CONCURRENTLY` ne peut PAS figurer ici : PostgreSQL l'interdit
--    à l'intérieur d'une transaction, et Prisma exécute chaque fichier de
--    migration dans une transaction. D'où le script séparé.
-- ─────────────────────────────────────────────────────────────────────────

-- I1 — moyennes, distribution et écart-type par classe (SEC-03, SEC-13, SEC-14).
CREATE INDEX IF NOT EXISTS "grades_estab_year_class_idx"
  ON "grades" ("establishment_id", "academic_year_id", "class_id");

-- I2 — moyennes par matière, meilleures et plus faibles (SEC-04 → SEC-06).
CREATE INDEX IF NOT EXISTS "grades_estab_year_subject_idx"
  ON "grades" ("establishment_id", "academic_year_id", "subject_id");

-- I3 — taux de présence, d'absence et de retard (ASS-01 → ASS-04).
--
-- `attendance_records` ne porte pas d'établissement : son isolation est
-- transitive, par `session_id`. L'index part donc de cette colonne, qui est à
-- la fois la clé de jointure et le porteur du cloisonnement. La table n'avait
-- jusqu'ici qu'un index sur `student_id`, inutile pour ces agrégats.
CREATE INDEX IF NOT EXISTS "attendance_records_session_status_idx"
  ON "attendance_records" ("session_id", "status");

-- I4 — dépenses totales et saisonnalité des charges (FIN-27, FIN-30).
-- `expenses` n'a pas d'année scolaire : le filtrage se fait par intervalle de
-- dates, d'où la date en second terme.
CREATE INDEX IF NOT EXISTS "expenses_estab_date_idx"
  ON "expenses" ("establishment_id", "date");

-- I5 — masse salariale et décomposition de la paie (ENS-16 → ENS-22).
-- La fenêtre de l'année scolaire s'exprime en couples (année, mois) civils.
CREATE INDEX IF NOT EXISTS "monthly_payrolls_estab_year_month_idx"
  ON "monthly_payrolls" ("establishment_id", "year", "month");

-- I6 — sorties par statut et taux d'abandon (EFF-12, EFF-13).
CREATE INDEX IF NOT EXISTS "students_estab_status_idx"
  ON "students" ("establishment_id", "status");

-- I7 — occupation des salles et conflits de salle (RES-01, RES-09).
CREATE INDEX IF NOT EXISTS "class_timetables_estab_year_classroom_idx"
  ON "class_timetables" ("establishment_id", "academic_year_id", "classroom_id");

-- I8 — effectifs par année et par classe (EFF-01 → EFF-03). Remplace
-- avantageusement, dans le plan d'exécution, les trois index séparés existants.
CREATE INDEX IF NOT EXISTS "inscriptions_estab_year_class_idx"
  ON "inscriptions" ("establishment_id", "academic_year_id", "class_id");
