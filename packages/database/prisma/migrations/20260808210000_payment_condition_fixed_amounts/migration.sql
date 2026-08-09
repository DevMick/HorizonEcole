-- Remplacement du modèle pourcentage+délai par montants fixes + dates calendaires.
--
-- Chaque tranche définit maintenant :
--   • amount   : montant fixe en devise locale (CFA)
--   • due_date : date calendaire exacte de l'échéance
--
-- Les anciennes colonnes (value_type, percent, delay_days) deviennent nullables
-- pour conserver la compatibilité des données existantes.

ALTER TABLE "payment_condition_lines"
  ADD COLUMN "amount"   DECIMAL(12,2),
  ADD COLUMN "due_date" DATE;

-- Rendre value_type nullable (les nouvelles lignes n'en ont plus besoin)
ALTER TABLE "payment_condition_lines"
  ALTER COLUMN "value_type" DROP NOT NULL;

-- Rendre delay_days nullable
ALTER TABLE "payment_condition_lines"
  ALTER COLUMN "delay_days" DROP DEFAULT,
  ALTER COLUMN "delay_days" DROP NOT NULL;
