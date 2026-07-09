-- Index sur tenant_id — perf multi-tenant (toutes les requêtes filtrent par tenant).
-- Idempotent. À exécuter une fois en production.
-- Sur une grosse base, préférer CREATE INDEX CONCURRENTLY (hors transaction).

CREATE INDEX IF NOT EXISTS "commandes_tenant_idx"        ON "commandes" ("tenant_id");
CREATE INDEX IF NOT EXISTS "commandes_tenant_statut_idx" ON "commandes" ("tenant_id", "statut");
CREATE INDEX IF NOT EXISTS "factures_tenant_idx"         ON "factures" ("tenant_id");
CREATE INDEX IF NOT EXISTS "sessions_caisse_tenant_idx"  ON "sessions_caisse" ("tenant_id");

CREATE INDEX IF NOT EXISTS "produits_tenant_idx"         ON "produits" ("tenant_id");
CREATE INDEX IF NOT EXISTS "stocks_tenant_idx"           ON "stocks" ("tenant_id");
CREATE INDEX IF NOT EXISTS "mouvements_stock_tenant_idx" ON "mouvements_stock" ("tenant_id");
CREATE INDEX IF NOT EXISTS "categories_tenant_idx"       ON "categories" ("tenant_id");

CREATE INDEX IF NOT EXISTS "clients_tenant_idx"          ON "clients" ("tenant_id");
CREATE INDEX IF NOT EXISTS "charges_operationnelles_tenant_idx" ON "charges_operationnelles" ("tenant_id");

CREATE INDEX IF NOT EXISTS "tournees_tenant_idx"         ON "tournees" ("tenant_id");
CREATE INDEX IF NOT EXISTS "livraisons_tenant_idx"       ON "livraisons" ("tenant_id");

CREATE INDEX IF NOT EXISTS "bons_commande_tenant_idx"    ON "bons_commande" ("tenant_id");
CREATE INDEX IF NOT EXISTS "receptions_tenant_idx"       ON "receptions" ("tenant_id");

CREATE INDEX IF NOT EXISTS "depots_tenant_idx"           ON "depots" ("tenant_id");
CREATE INDEX IF NOT EXISTS "listes_achat_tenant_idx"     ON "listes_achat" ("tenant_id");
CREATE INDEX IF NOT EXISTS "print_logs_tenant_idx"       ON "print_logs" ("tenant_id");
