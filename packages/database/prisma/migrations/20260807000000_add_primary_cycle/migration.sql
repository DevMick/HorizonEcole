-- Cycle primaire (CP1 → CM2) : discriminant de cycle sur les classes + tables
-- propres au module. Les classes existantes basculent toutes en SECONDAIRE,
-- qui est le défaut : aucun changement de comportement pour le second cycle.

-- CreateEnum
CREATE TYPE "SchoolCycle" AS ENUM ('PRIMAIRE', 'SECONDAIRE');

-- AlterTable
ALTER TABLE "classes" ADD COLUMN "cycle" "SchoolCycle" NOT NULL DEFAULT 'SECONDAIRE';

-- CreateTable
CREATE TABLE "primary_class_settings" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "divisor" DECIMAL(6,2) NOT NULL,
    "average_scale" INTEGER NOT NULL DEFAULT 20,
    "moyenne_admission" DECIMAL(5,2) NOT NULL,
    "moyenne_redoublement" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "primary_class_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "primary_class_subjects" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "max_score" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "primary_class_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "primary_evaluations" (
    "id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "date" DATE NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_exam" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "divisor" DECIMAL(6,2) NOT NULL,
    "average_scale" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "primary_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "primary_evaluation_subjects" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "max_score" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "primary_evaluation_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "primary_grades" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "note" DECIMAL(5,2),
    "is_absent" BOOLEAN NOT NULL DEFAULT false,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "primary_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "primary_bulletin_releases" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "primary_bulletin_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "primary_class_settings_class_id_key" ON "primary_class_settings"("class_id");

-- CreateIndex
CREATE INDEX "primary_class_subjects_class_id_idx" ON "primary_class_subjects"("class_id");

-- CreateIndex
CREATE INDEX "primary_class_subjects_subject_id_idx" ON "primary_class_subjects"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "primary_class_subjects_class_id_subject_id_key" ON "primary_class_subjects"("class_id", "subject_id");

-- CreateIndex
CREATE INDEX "primary_evaluations_academic_year_id_idx" ON "primary_evaluations"("academic_year_id");

-- CreateIndex
CREATE INDEX "primary_evaluations_class_id_idx" ON "primary_evaluations"("class_id");

-- CreateIndex
CREATE INDEX "primary_evaluations_date_idx" ON "primary_evaluations"("date");

-- CreateIndex
CREATE UNIQUE INDEX "primary_evaluations_academic_year_id_class_id_name_key" ON "primary_evaluations"("academic_year_id", "class_id", "name");

-- CreateIndex
CREATE INDEX "primary_evaluation_subjects_evaluation_id_idx" ON "primary_evaluation_subjects"("evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "primary_evaluation_subjects_evaluation_id_subject_id_key" ON "primary_evaluation_subjects"("evaluation_id", "subject_id");

-- CreateIndex
CREATE INDEX "primary_grades_evaluation_id_idx" ON "primary_grades"("evaluation_id");

-- CreateIndex
CREATE INDEX "primary_grades_student_id_idx" ON "primary_grades"("student_id");

-- CreateIndex
CREATE INDEX "primary_grades_subject_id_idx" ON "primary_grades"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "primary_grades_evaluation_id_student_id_subject_id_key" ON "primary_grades"("evaluation_id", "student_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "primary_bulletin_releases_evaluation_id_key" ON "primary_bulletin_releases"("evaluation_id");

-- AddForeignKey
ALTER TABLE "primary_class_settings" ADD CONSTRAINT "primary_class_settings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_class_subjects" ADD CONSTRAINT "primary_class_subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_class_subjects" ADD CONSTRAINT "primary_class_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_evaluations" ADD CONSTRAINT "primary_evaluations_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_evaluations" ADD CONSTRAINT "primary_evaluations_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_evaluation_subjects" ADD CONSTRAINT "primary_evaluation_subjects_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "primary_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_evaluation_subjects" ADD CONSTRAINT "primary_evaluation_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_grades" ADD CONSTRAINT "primary_grades_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "primary_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_grades" ADD CONSTRAINT "primary_grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_grades" ADD CONSTRAINT "primary_grades_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_grades" ADD CONSTRAINT "primary_grades_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_bulletin_releases" ADD CONSTRAINT "primary_bulletin_releases_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "primary_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_bulletin_releases" ADD CONSTRAINT "primary_bulletin_releases_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
