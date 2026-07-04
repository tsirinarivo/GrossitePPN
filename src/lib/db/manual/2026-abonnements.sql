-- Abonnements Mobile Money + numéros marchands — idempotent

-- 1. Statut tenant "en_attente" (nouveau tenant pas encore payé)
ALTER TYPE "tenant_statut" ADD VALUE IF NOT EXISTS 'en_attente';

-- 2. Enums abonnement
DO $$ BEGIN
  CREATE TYPE "abonnement_operateur" AS ENUM ('mvola','orange_money','airtel_money');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "abonnement_statut" AS ENUM ('en_attente','valide','rejete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Table des demandes d'abonnement / paiements
CREATE TABLE IF NOT EXISTS "abonnements" (
  "id"             text PRIMARY KEY,
  "tenant_id"      text,
  "entreprise_nom" text NOT NULL,
  "slug"           text,
  "plan"           "tenant_plan" NOT NULL,
  "montant"        integer NOT NULL,
  "operateur"      "abonnement_operateur" NOT NULL,
  "telephone"      text,
  "reference"      text,
  "contact_nom"    text,
  "contact_email"  text,
  "statut"         "abonnement_statut" NOT NULL DEFAULT 'en_attente',
  "notes"          text,
  "created_at"     timestamp NOT NULL DEFAULT now(),
  "valide_at"      timestamp,
  "valide_by"      text
);
CREATE INDEX IF NOT EXISTS "abonnements_statut_idx" ON "abonnements" ("statut");

-- 4. Numéros marchands Mobile Money (singleton)
CREATE TABLE IF NOT EXISTS "paiement_config" (
  "id"            text PRIMARY KEY DEFAULT 'singleton',
  "mvola_numero"  text,
  "mvola_nom"     text,
  "orange_numero" text,
  "orange_nom"    text,
  "airtel_numero" text,
  "airtel_nom"    text,
  "instructions"  text,
  "updated_at"    timestamp NOT NULL DEFAULT now()
);
