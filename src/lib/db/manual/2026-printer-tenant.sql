-- Isolation imprimante par tenant — idempotent

-- Config imprimante dédiée par tenant
CREATE TABLE IF NOT EXISTS "printer_config" (
  "tenant_id" text PRIMARY KEY,
  "enabled" boolean DEFAULT false NOT NULL,
  "x_user" text,
  "x_key" text,
  "sn" text,
  "base_url" text,
  "copies" integer DEFAULT 1,
  "voice" integer DEFAULT 0,
  "header" text,
  "footer" text,
  "auto_on_facture" boolean DEFAULT true,
  "auto_on_bon_livraison" boolean DEFAULT false,
  "auto_on_reception_stock" boolean DEFAULT false,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- tenant_id sur le journal d'impression
ALTER TABLE "print_logs" ADD COLUMN IF NOT EXISTS "tenant_id" text;

-- Rattache les logs existants au tenant par défaut
UPDATE "print_logs" SET "tenant_id" = 'default' WHERE "tenant_id" IS NULL;
