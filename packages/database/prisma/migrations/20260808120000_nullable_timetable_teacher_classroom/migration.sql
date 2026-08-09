-- Emploi du temps primaire : enseignant et salle facultatifs.
--
-- Dans les écoles primaires, l'enseignant titulaire prend en charge toutes les
-- activités de sa classe ; il n'y a donc pas d'enseignant ni de salle affectés
-- créneau par créneau. On rend les deux colonnes nullables pour que la table
-- class_timetables serve les deux modes (secondaire et primaire) sans duplication.
--
-- L'onDelete passe de CASCADE à SET NULL : supprimer un enseignant ou une salle
-- ne doit plus effacer tout l'emploi du temps, juste déréférencer la ligne.
ALTER TABLE "class_timetables"
  ALTER COLUMN "teacher_id"   DROP NOT NULL,
  ALTER COLUMN "classroom_id" DROP NOT NULL;

-- Recréer les clés étrangères avec ON DELETE SET NULL (elles étaient CASCADE).
ALTER TABLE "class_timetables" DROP CONSTRAINT IF EXISTS "class_timetables_teacher_id_fkey";
ALTER TABLE "class_timetables" DROP CONSTRAINT IF EXISTS "class_timetables_classroom_id_fkey";

ALTER TABLE "class_timetables"
  ADD CONSTRAINT "class_timetables_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "class_timetables"
  ADD CONSTRAINT "class_timetables_classroom_id_fkey"
    FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
