-- Création des index du profil « Propriétaire » SANS verrouiller les tables.
--
-- À jouer **avant** `prisma migrate deploy` sur une base volumineuse. La
-- migration `20260816020000_add_owner_indexes` porte les mêmes instructions
-- avec `IF NOT EXISTS` : une fois ce script passé, elle constate que le travail
-- est fait et se marque appliquée sans rien verrouiller.
--
-- Usage :
--     psql "$DATABASE_URL" -f packages/database/scripts/create-owner-indexes-concurrently.sql
--
-- ─────────────────────────────────────────────────────────────────────────
-- Pourquoi un fichier séparé plutôt qu'une migration Prisma
--
-- `CREATE INDEX CONCURRENTLY` ne peut pas s'exécuter dans une transaction, et
-- Prisma exécute chaque migration dans une transaction. Ce script doit donc
-- être lancé à la main, avec un client qui n'ouvre pas de transaction — c'est
-- le cas de `psql` en mode autocommit, son défaut.
--
-- ⚠ N'enveloppez pas ces instructions dans BEGIN/COMMIT : PostgreSQL refuserait
-- avec « CREATE INDEX CONCURRENTLY cannot run inside a transaction block ».
--
-- ⚠ Une création CONCURRENTLY qui échoue (interruption, conflit) laisse un
-- index INVALIDE en place. Il ne sert à rien mais occupe de l'espace, et
-- `IF NOT EXISTS` le considérera comme existant. Pour les repérer après coup :
--
--     SELECT c.relname
--       FROM pg_index i
--       JOIN pg_class c ON c.oid = i.indexrelid
--      WHERE NOT i.indisvalid;
--
-- Un index invalide se supprime par `DROP INDEX CONCURRENTLY <nom>;` avant de
-- relancer sa création.
-- ─────────────────────────────────────────────────────────────────────────

-- I1 — moyennes, distribution et écart-type par classe (SEC-03, SEC-13, SEC-14).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "grades_estab_year_class_idx"
  ON "grades" ("establishment_id", "academic_year_id", "class_id");

-- I2 — moyennes par matière (SEC-04 → SEC-06).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "grades_estab_year_subject_idx"
  ON "grades" ("establishment_id", "academic_year_id", "subject_id");

-- I3 — taux de présence, d'absence et de retard (ASS-01 → ASS-04).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "attendance_records_session_status_idx"
  ON "attendance_records" ("session_id", "status");

-- I4 — dépenses et saisonnalité des charges (FIN-27, FIN-30).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "expenses_estab_date_idx"
  ON "expenses" ("establishment_id", "date");

-- I5 — masse salariale (ENS-16 → ENS-22).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "monthly_payrolls_estab_year_month_idx"
  ON "monthly_payrolls" ("establishment_id", "year", "month");

-- I6 — sorties par statut et taux d'abandon (EFF-12, EFF-13).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "students_estab_status_idx"
  ON "students" ("establishment_id", "status");

-- I7 — occupation des salles et conflits de salle (RES-01, RES-09).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "class_timetables_estab_year_classroom_idx"
  ON "class_timetables" ("establishment_id", "academic_year_id", "classroom_id");

-- I8 — effectifs par année et par classe (EFF-01 → EFF-03).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "inscriptions_estab_year_class_idx"
  ON "inscriptions" ("establishment_id", "academic_year_id", "class_id");
