-- ════════════════════════════════════════════════════════════════════════
--  Migration manuelle : socle multi-tenant (option 1) + réconciliation retours
--  Idempotente : peut être relancée sans risque.
--  À appliquer via :  psql "$DATABASE_URL" -f src/lib/db/manual/2026-multitenant.sql
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Types enum (idempotent) ──────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "tenant_statut" AS ENUM ('essai','actif','suspendu','resilie'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "tenant_plan"   AS ENUM ('essai','standard','pro','entreprise'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "mode_remboursement" AS ENUM ('avoir_credit','remboursement_especes','remboursement_virement','remboursement_mobile'); EXCEPTION WHEN duplicate_object THEN null; END $$;
-- Si le type existait déjà avec d'autres valeurs (drift historique), on garantit les valeurs attendues :
ALTER TYPE "mode_remboursement" ADD VALUE IF NOT EXISTS 'avoir_credit';
ALTER TYPE "mode_remboursement" ADD VALUE IF NOT EXISTS 'remboursement_especes';
ALTER TYPE "mode_remboursement" ADD VALUE IF NOT EXISTS 'remboursement_virement';
ALTER TYPE "mode_remboursement" ADD VALUE IF NOT EXISTS 'remboursement_mobile';

-- ── 2. Table tenants (idempotent) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" text PRIMARY KEY NOT NULL,
  "nom" text NOT NULL,
  "slug" text NOT NULL,
  "statut" "tenant_statut" DEFAULT 'essai' NOT NULL,
  "plan" "tenant_plan" DEFAULT 'essai' NOT NULL,
  "contact_nom" text,
  "contact_email" text,
  "contact_telephone" text,
  "max_utilisateurs" integer DEFAULT 5 NOT NULL,
  "max_depots" integer DEFAULT 1 NOT NULL,
  "fin_essai_at" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
DO $$ BEGIN ALTER TABLE "tenants" ADD CONSTRAINT "tenants_slug_unique" UNIQUE ("slug"); EXCEPTION WHEN duplicate_object THEN null; WHEN duplicate_table THEN null; END $$;

-- ── 3. Colonne tenant_id (nullable) sur toutes les tables tenant-owned ───
ALTER TABLE "categories"                ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "produits"                  ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "stocks"                    ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "mouvements_stock"          ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "clients"                   ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "commandes"                 ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "factures"                  ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "sessions_caisse"           ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "entreprise"                ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "depots"                    ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "fournisseurs"              ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "bons_commande"             ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "receptions"                ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "promotions"                ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "bannieres"                 ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "listes_achat"              ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "charges_operationnelles"   ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "vehicules"                 ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "tournees"                  ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "livraisons"                ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "retours"                   ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "avoirs"                    ADD COLUMN IF NOT EXISTS "tenant_id" text;
ALTER TABLE "users"                     ADD COLUMN IF NOT EXISTS "tenant_id" text;

-- Index tenant sur les tables les plus sollicitées
CREATE INDEX IF NOT EXISTS "produits_tenant_idx"  ON "produits"  ("tenant_id");
CREATE INDEX IF NOT EXISTS "clients_tenant_idx"   ON "clients"   ("tenant_id");
CREATE INDEX IF NOT EXISTS "commandes_tenant_idx" ON "commandes" ("tenant_id");
CREATE INDEX IF NOT EXISTS "factures_tenant_idx"  ON "factures"  ("tenant_id");
CREATE INDEX IF NOT EXISTS "stocks_tenant_idx"    ON "stocks"    ("tenant_id");

-- ── 4. Réconciliation du module retours/avoirs (drift qui bloquait push) ─
ALTER TABLE "retours" ADD COLUMN IF NOT EXISTS "motif_detail" text;
ALTER TABLE "retours" ADD COLUMN IF NOT EXISTS "mode_remboursement" "mode_remboursement" DEFAULT 'avoir_credit' NOT NULL;
ALTER TABLE "retours" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

ALTER TABLE "avoirs" ADD COLUMN IF NOT EXISTS "total_ht"  integer NOT NULL DEFAULT 0;
ALTER TABLE "avoirs" ALTER COLUMN "total_ht"  DROP DEFAULT;
ALTER TABLE "avoirs" ADD COLUMN IF NOT EXISTS "total_tva" integer NOT NULL DEFAULT 0;
ALTER TABLE "avoirs" ADD COLUMN IF NOT EXISTS "total_ttc" integer NOT NULL DEFAULT 0;
ALTER TABLE "avoirs" ALTER COLUMN "total_ttc" DROP DEFAULT;
ALTER TABLE "avoirs" ADD COLUMN IF NOT EXISTS "applique_a" text;
ALTER TABLE "avoirs" ADD COLUMN IF NOT EXISTS "paiements" jsonb;
