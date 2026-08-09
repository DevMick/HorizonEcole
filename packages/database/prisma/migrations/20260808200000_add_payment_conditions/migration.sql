-- Conditions de paiement — inspirées de account.payment.term dans Odoo.
--
-- Une condition est un gabarit réutilisable qui définit le découpage temporel
-- d'un montant total en tranches (pourcentage + délai en jours depuis l'inscription).
-- Elle est affectée à une ou plusieurs classes ; à l'inscription d'un élève le
-- service CustomPaymentPlanService l'utilise pour générer automatiquement les
-- échéances du plan de paiement individuel.

CREATE TYPE "PaymentValueType" AS ENUM ('PERCENT', 'BALANCE');

CREATE TABLE "payment_conditions" (
    "id"               TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "name"             VARCHAR(200) NOT NULL,
    "description"      TEXT,
    "is_active"        BOOLEAN      NOT NULL DEFAULT TRUE,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "establishment_id" TEXT         NOT NULL,

    CONSTRAINT "payment_conditions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_conditions_establishment_id_fkey"
        FOREIGN KEY ("establishment_id")
        REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "payment_conditions_establishment_id_idx" ON "payment_conditions"("establishment_id");

CREATE TABLE "payment_condition_lines" (
    "id"                   TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
    "payment_condition_id" TEXT              NOT NULL,
    "line_number"          INTEGER           NOT NULL,
    "label"                VARCHAR(100)      NOT NULL,
    "value_type"           "PaymentValueType" NOT NULL,
    "percent"              DECIMAL(5,2),
    "delay_days"           INTEGER           NOT NULL DEFAULT 0,
    "created_at"           TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_condition_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_condition_lines_payment_condition_id_fkey"
        FOREIGN KEY ("payment_condition_id")
        REFERENCES "payment_conditions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "payment_condition_lines_payment_condition_id_idx"
    ON "payment_condition_lines"("payment_condition_id");

-- Lien classe → condition de paiement (nullable : une classe sans condition retombe
-- sur l'échéancier modèle par niveau, puis sur le paiement unique).
ALTER TABLE "classes"
    ADD COLUMN "payment_condition_id" TEXT,
    ADD CONSTRAINT "classes_payment_condition_id_fkey"
        FOREIGN KEY ("payment_condition_id")
        REFERENCES "payment_conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
