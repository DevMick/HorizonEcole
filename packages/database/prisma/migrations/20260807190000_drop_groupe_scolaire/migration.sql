-- Retrait du type d'établissement « Groupe scolaire ».
--
-- Le cycle reste porté par la classe (`classes.cycle`), mais un établissement
-- relève désormais d'un seul type : Primaire, Collège ou Lycée.
--
-- Les établissements créés sous l'ancien type basculent en LYCEE — le plus
-- large des types du secondaire (6ème → Terminale). Ils ne peuvent pas rester
-- tels quels : la valeur d'énumération disparaît. Ce reclassement se corrige
-- ensuite depuis la fiche de l'établissement.

UPDATE "establishments"
SET "school_type" = 'LYCEE'
WHERE "school_type"::text = 'GROUPE_SCOLAIRE';

-- Postgres ne sait pas retirer une valeur d'une énumération : on recrée le type
-- et on y bascule la colonne.
ALTER TYPE "SchoolType" RENAME TO "SchoolType_old";

CREATE TYPE "SchoolType" AS ENUM ('PRIMAIRE', 'COLLEGE', 'LYCEE');

ALTER TABLE "establishments"
  ALTER COLUMN "school_type" TYPE "SchoolType"
  USING ("school_type"::text::"SchoolType");

DROP TYPE "SchoolType_old";
