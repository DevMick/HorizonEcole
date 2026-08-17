-- Capacité des classes et des salles, base des indicateurs de remplissage
-- (EFF-16 « Occupation d'une classe », EFF-17 « Classes en sur/sous-effectif »).
--
-- Colonnes nullables et sans valeur par défaut, volontairement : une capacité
-- inconnue doit rester inconnue. Un défaut à 0 ferait apparaître toutes les
-- classes en surcharge, et un défaut arbitraire (30, 40…) produirait des taux
-- d'occupation faux mais crédibles — le pire des deux mondes pour un tableau de
-- bord de pilotage.
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "classrooms" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
