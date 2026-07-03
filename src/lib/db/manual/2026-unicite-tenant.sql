-- Unicité des codes PAR tenant (au lieu de global) — idempotent
-- Prérequis : le backfill tenant a été exécuté (tenant_id non NULL).

-- 1. Retire l'unicité GLOBALE du code produit
ALTER TABLE "produits" DROP CONSTRAINT IF EXISTS "produits_code_unique";
ALTER TABLE "produits" DROP CONSTRAINT IF EXISTS "produits_code_key";

-- 2. Retire l'unicité GLOBALE du code client
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_code_unique";
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_code_key";

-- 3. Unicité composite (tenant_id, code)
CREATE UNIQUE INDEX IF NOT EXISTS "produits_tenant_code_uidx" ON "produits" ("tenant_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "clients_tenant_code_uidx"  ON "clients"  ("tenant_id", "code");
