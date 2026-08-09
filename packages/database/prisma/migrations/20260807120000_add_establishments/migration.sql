-- Multi-établissements : chaque donnée métier appartient désormais à une école.
--
-- Les données déjà en base sont rattachées à un établissement repris des
-- réglages actuels, de sorte que l'application existante continue de
-- fonctionner à l'identique après migration.

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PRIMAIRE', 'COLLEGE', 'LYCEE');

-- CreateTable
CREATE TABLE "establishments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "school_type" "SchoolType" NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "address" TEXT,
    "city" VARCHAR(120),
    "country" VARCHAR(120),
    "motto" VARCHAR(200),
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "establishments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "establishments_code_key" ON "establishments"("code");

-- Établissement de reprise : l'école déjà exploitée dans cette base.
INSERT INTO "establishments" ("id", "name", "code", "school_type", "email", "phone")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Collège Privé Le Souverain de Larabia',
  'souverain-larabia',
  'LYCEE',
  'admin@souverainlarabia.edu.ci',
  '01 95 77 23'
);

-- academic_years
ALTER TABLE "academic_years" ADD COLUMN "establishment_id" TEXT;
UPDATE "academic_years" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "academic_years" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "academic_years_establishment_id_idx" ON "academic_years"("establishment_id");
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- classes
ALTER TABLE "classes" ADD COLUMN "establishment_id" TEXT;
UPDATE "classes" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "classes" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "classes_establishment_id_idx" ON "classes"("establishment_id");
ALTER TABLE "classes" ADD CONSTRAINT "classes_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- students
ALTER TABLE "students" ADD COLUMN "establishment_id" TEXT;
UPDATE "students" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "students" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "students_establishment_id_idx" ON "students"("establishment_id");
ALTER TABLE "students" ADD CONSTRAINT "students_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- users
ALTER TABLE "users" ADD COLUMN "establishment_id" TEXT;
UPDATE "users" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "users" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "users_establishment_id_idx" ON "users"("establishment_id");
ALTER TABLE "users" ADD CONSTRAINT "users_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- parents
ALTER TABLE "parents" ADD COLUMN "establishment_id" TEXT;
UPDATE "parents" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "parents" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "parents_establishment_id_idx" ON "parents"("establishment_id");
ALTER TABLE "parents" ADD CONSTRAINT "parents_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- teachers
ALTER TABLE "teachers" ADD COLUMN "establishment_id" TEXT;
UPDATE "teachers" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "teachers" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "teachers_establishment_id_idx" ON "teachers"("establishment_id");
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- subjects
ALTER TABLE "subjects" ADD COLUMN "establishment_id" TEXT;
UPDATE "subjects" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "subjects" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "subjects_establishment_id_idx" ON "subjects"("establishment_id");
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- classrooms
ALTER TABLE "classrooms" ADD COLUMN "establishment_id" TEXT;
UPDATE "classrooms" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "classrooms" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "classrooms_establishment_id_idx" ON "classrooms"("establishment_id");
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- horaires
ALTER TABLE "horaires" ADD COLUMN "establishment_id" TEXT;
UPDATE "horaires" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "horaires" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "horaires_establishment_id_idx" ON "horaires"("establishment_id");
ALTER TABLE "horaires" ADD CONSTRAINT "horaires_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- payment_types
ALTER TABLE "payment_types" ADD COLUMN "establishment_id" TEXT;
UPDATE "payment_types" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "payment_types" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "payment_types_establishment_id_idx" ON "payment_types"("establishment_id");
ALTER TABLE "payment_types" ADD CONSTRAINT "payment_types_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- school_fee_rates
ALTER TABLE "school_fee_rates" ADD COLUMN "establishment_id" TEXT;
UPDATE "school_fee_rates" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "school_fee_rates" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "school_fee_rates_establishment_id_idx" ON "school_fee_rates"("establishment_id");
ALTER TABLE "school_fee_rates" ADD CONSTRAINT "school_fee_rates_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- roles
ALTER TABLE "roles" ADD COLUMN "establishment_id" TEXT;
UPDATE "roles" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "roles" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "roles_establishment_id_idx" ON "roles"("establishment_id");
ALTER TABLE "roles" ADD CONSTRAINT "roles_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- semesters
ALTER TABLE "semesters" ADD COLUMN "establishment_id" TEXT;
UPDATE "semesters" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "semesters" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "semesters_establishment_id_idx" ON "semesters"("establishment_id");
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- expenses
ALTER TABLE "expenses" ADD COLUMN "establishment_id" TEXT;
UPDATE "expenses" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "expenses" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "expenses_establishment_id_idx" ON "expenses"("establishment_id");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- budgets
ALTER TABLE "budgets" ADD COLUMN "establishment_id" TEXT;
UPDATE "budgets" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "budgets" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "budgets_establishment_id_idx" ON "budgets"("establishment_id");
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- budget_lines
ALTER TABLE "budget_lines" ADD COLUMN "establishment_id" TEXT;
UPDATE "budget_lines" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "budget_lines" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "budget_lines_establishment_id_idx" ON "budget_lines"("establishment_id");
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- payroll_settings
ALTER TABLE "payroll_settings" ADD COLUMN "establishment_id" TEXT;
UPDATE "payroll_settings" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "payroll_settings" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "payroll_settings_establishment_id_idx" ON "payroll_settings"("establishment_id");
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- conduct_settings
ALTER TABLE "conduct_settings" ADD COLUMN "establishment_id" TEXT;
UPDATE "conduct_settings" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "conduct_settings" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "conduct_settings_establishment_id_idx" ON "conduct_settings"("establishment_id");
ALTER TABLE "conduct_settings" ADD CONSTRAINT "conduct_settings_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- audit_logs
ALTER TABLE "audit_logs" ADD COLUMN "establishment_id" TEXT;
UPDATE "audit_logs" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "audit_logs" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "audit_logs_establishment_id_idx" ON "audit_logs"("establishment_id");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- custom_payment_plans
ALTER TABLE "custom_payment_plans" ADD COLUMN "establishment_id" TEXT;
UPDATE "custom_payment_plans" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "custom_payment_plans" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "custom_payment_plans_establishment_id_idx" ON "custom_payment_plans"("establishment_id");
ALTER TABLE "custom_payment_plans" ADD CONSTRAINT "custom_payment_plans_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- invoices
ALTER TABLE "invoices" ADD COLUMN "establishment_id" TEXT;
UPDATE "invoices" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "invoices" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "invoices_establishment_id_idx" ON "invoices"("establishment_id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- evaluation_types
ALTER TABLE "evaluation_types" ADD COLUMN "establishment_id" TEXT;
UPDATE "evaluation_types" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "evaluation_types" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "evaluation_types_establishment_id_idx" ON "evaluation_types"("establishment_id");
ALTER TABLE "evaluation_types" ADD CONSTRAINT "evaluation_types_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- primary_evaluations
ALTER TABLE "primary_evaluations" ADD COLUMN "establishment_id" TEXT;
UPDATE "primary_evaluations" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "primary_evaluations" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "primary_evaluations_establishment_id_idx" ON "primary_evaluations"("establishment_id");
ALTER TABLE "primary_evaluations" ADD CONSTRAINT "primary_evaluations_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- attendances
ALTER TABLE "attendances" ADD COLUMN "establishment_id" TEXT;
UPDATE "attendances" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "attendances" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "attendances_establishment_id_idx" ON "attendances"("establishment_id");
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- attendance_sessions
ALTER TABLE "attendance_sessions" ADD COLUMN "establishment_id" TEXT;
UPDATE "attendance_sessions" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "attendance_sessions" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "attendance_sessions_establishment_id_idx" ON "attendance_sessions"("establishment_id");
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- attendance_summaries
ALTER TABLE "attendance_summaries" ADD COLUMN "establishment_id" TEXT;
UPDATE "attendance_summaries" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "attendance_summaries" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "attendance_summaries_establishment_id_idx" ON "attendance_summaries"("establishment_id");
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- schedules
ALTER TABLE "schedules" ADD COLUMN "establishment_id" TEXT;
UPDATE "schedules" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "schedules" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "schedules_establishment_id_idx" ON "schedules"("establishment_id");
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- class_timetables
ALTER TABLE "class_timetables" ADD COLUMN "establishment_id" TEXT;
UPDATE "class_timetables" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "class_timetables" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "class_timetables_establishment_id_idx" ON "class_timetables"("establishment_id");
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- inscriptions
ALTER TABLE "inscriptions" ADD COLUMN "establishment_id" TEXT;
UPDATE "inscriptions" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "inscriptions" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "inscriptions_establishment_id_idx" ON "inscriptions"("establishment_id");
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- grades
ALTER TABLE "grades" ADD COLUMN "establishment_id" TEXT;
UPDATE "grades" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "grades" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "grades_establishment_id_idx" ON "grades"("establishment_id");
ALTER TABLE "grades" ADD CONSTRAINT "grades_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- student_payments
ALTER TABLE "student_payments" ADD COLUMN "establishment_id" TEXT;
UPDATE "student_payments" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "student_payments" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "student_payments_establishment_id_idx" ON "student_payments"("establishment_id");
ALTER TABLE "student_payments" ADD CONSTRAINT "student_payments_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- monthly_payrolls
ALTER TABLE "monthly_payrolls" ADD COLUMN "establishment_id" TEXT;
UPDATE "monthly_payrolls" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "monthly_payrolls" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "monthly_payrolls_establishment_id_idx" ON "monthly_payrolls"("establishment_id");
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- advance_payments
ALTER TABLE "advance_payments" ADD COLUMN "establishment_id" TEXT;
UPDATE "advance_payments" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "advance_payments" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "advance_payments_establishment_id_idx" ON "advance_payments"("establishment_id");
ALTER TABLE "advance_payments" ADD CONSTRAINT "advance_payments_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- teacher_absences
ALTER TABLE "teacher_absences" ADD COLUMN "establishment_id" TEXT;
UPDATE "teacher_absences" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "teacher_absences" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "teacher_absences_establishment_id_idx" ON "teacher_absences"("establishment_id");
ALTER TABLE "teacher_absences" ADD CONSTRAINT "teacher_absences_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- teacher_hours
ALTER TABLE "teacher_hours" ADD COLUMN "establishment_id" TEXT;
UPDATE "teacher_hours" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "teacher_hours" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "teacher_hours_establishment_id_idx" ON "teacher_hours"("establishment_id");
ALTER TABLE "teacher_hours" ADD CONSTRAINT "teacher_hours_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- disciplinary_incidents
ALTER TABLE "disciplinary_incidents" ADD COLUMN "establishment_id" TEXT;
UPDATE "disciplinary_incidents" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "disciplinary_incidents" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "disciplinary_incidents_establishment_id_idx" ON "disciplinary_incidents"("establishment_id");
ALTER TABLE "disciplinary_incidents" ADD CONSTRAINT "disciplinary_incidents_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- student_absences
ALTER TABLE "student_absences" ADD COLUMN "establishment_id" TEXT;
UPDATE "student_absences" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "student_absences" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "student_absences_establishment_id_idx" ON "student_absences"("establishment_id");
ALTER TABLE "student_absences" ADD CONSTRAINT "student_absences_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- conduct_grades
ALTER TABLE "conduct_grades" ADD COLUMN "establishment_id" TEXT;
UPDATE "conduct_grades" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "conduct_grades" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "conduct_grades_establishment_id_idx" ON "conduct_grades"("establishment_id");
ALTER TABLE "conduct_grades" ADD CONSTRAINT "conduct_grades_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- bulletin_releases
ALTER TABLE "bulletin_releases" ADD COLUMN "establishment_id" TEXT;
UPDATE "bulletin_releases" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "bulletin_releases" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "bulletin_releases_establishment_id_idx" ON "bulletin_releases"("establishment_id");
ALTER TABLE "bulletin_releases" ADD CONSTRAINT "bulletin_releases_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- class_subjects
ALTER TABLE "class_subjects" ADD COLUMN "establishment_id" TEXT;
UPDATE "class_subjects" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "class_subjects" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "class_subjects_establishment_id_idx" ON "class_subjects"("establishment_id");
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- student_parents
ALTER TABLE "student_parents" ADD COLUMN "establishment_id" TEXT;
UPDATE "student_parents" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "student_parents" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "student_parents_establishment_id_idx" ON "student_parents"("establishment_id");
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- teacher_class_assignments
ALTER TABLE "teacher_class_assignments" ADD COLUMN "establishment_id" TEXT;
UPDATE "teacher_class_assignments" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "teacher_class_assignments" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "teacher_class_assignments_establishment_id_idx" ON "teacher_class_assignments"("establishment_id");
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- class_main_teachers
ALTER TABLE "class_main_teachers" ADD COLUMN "establishment_id" TEXT;
UPDATE "class_main_teachers" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "class_main_teachers" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "class_main_teachers_establishment_id_idx" ON "class_main_teachers"("establishment_id");
ALTER TABLE "class_main_teachers" ADD CONSTRAINT "class_main_teachers_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- primary_class_settings
ALTER TABLE "primary_class_settings" ADD COLUMN "establishment_id" TEXT;
UPDATE "primary_class_settings" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "primary_class_settings" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "primary_class_settings_establishment_id_idx" ON "primary_class_settings"("establishment_id");
ALTER TABLE "primary_class_settings" ADD CONSTRAINT "primary_class_settings_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- primary_class_subjects
ALTER TABLE "primary_class_subjects" ADD COLUMN "establishment_id" TEXT;
UPDATE "primary_class_subjects" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "primary_class_subjects" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "primary_class_subjects_establishment_id_idx" ON "primary_class_subjects"("establishment_id");
ALTER TABLE "primary_class_subjects" ADD CONSTRAINT "primary_class_subjects_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- primary_grades
ALTER TABLE "primary_grades" ADD COLUMN "establishment_id" TEXT;
UPDATE "primary_grades" SET "establishment_id" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "primary_grades" ALTER COLUMN "establishment_id" SET NOT NULL;
CREATE INDEX "primary_grades_establishment_id_idx" ON "primary_grades"("establishment_id");
ALTER TABLE "primary_grades" ADD CONSTRAINT "primary_grades_establishment_id_fkey"
  FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Unicités rendues propres à l'établissement.
--
-- Elles étaient globales : deux écoles n'auraient pas pu avoir chacune une
-- « 6ème 1 », une matière « MATH » ou une année « 2025-2026 ». `users.email`
-- reste volontairement unique sur toute la plateforme — c'est lui qui identifie
-- un compte à la connexion, sans avoir à désigner son école.
-- ---------------------------------------------------------------------------

DROP INDEX "academic_years_name_key";
CREATE UNIQUE INDEX "academic_years_establishment_id_name_key" ON "academic_years"("establishment_id", "name");

DROP INDEX "classes_name_key";
CREATE UNIQUE INDEX "classes_establishment_id_name_key" ON "classes"("establishment_id", "name");

DROP INDEX "students_student_number_key";
CREATE UNIQUE INDEX "students_establishment_id_student_number_key" ON "students"("establishment_id", "student_number");

DROP INDEX "subjects_code_key";
CREATE UNIQUE INDEX "subjects_establishment_id_code_key" ON "subjects"("establishment_id", "code");

DROP INDEX "roles_name_key";
CREATE UNIQUE INDEX "roles_establishment_id_name_key" ON "roles"("establishment_id", "name");

DROP INDEX "invoices_invoice_number_key";
CREATE UNIQUE INDEX "invoices_establishment_id_invoice_number_key" ON "invoices"("establishment_id", "invoice_number");

DROP INDEX "teachers_email_key";
CREATE UNIQUE INDEX "teachers_establishment_id_email_key" ON "teachers"("establishment_id", "email");

DROP INDEX "classrooms_name_key";
CREATE UNIQUE INDEX "classrooms_establishment_id_name_key" ON "classrooms"("establishment_id", "name");

DROP INDEX "horaires_start_time_end_time_key";
CREATE UNIQUE INDEX "horaires_establishment_id_start_time_end_time_key" ON "horaires"("establishment_id", "start_time", "end_time");

DROP INDEX "payment_types_level_name_key";
CREATE UNIQUE INDEX "payment_types_establishment_id_level_name_key" ON "payment_types"("establishment_id", "level", "name");

DROP INDEX "school_fee_rates_level_is_for_state_assigned_key";
CREATE UNIQUE INDEX "school_fee_rates_establishment_id_level_is_for_state_assigned_key" ON "school_fee_rates"("establishment_id", "level", "is_for_state_assigned");
