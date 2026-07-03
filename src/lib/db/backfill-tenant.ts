/**
 * Backfill multi-tenant — rattache toutes les données existantes à un tenant
 * par défaut, puis les utilisateurs.
 *
 * À lancer UNE fois, après avoir créé les colonnes `tenant_id` :
 *   pnpm db:backfill-tenant
 *
 * Idempotent : ne touche que les lignes dont tenant_id est encore NULL.
 * Auto-suffisant : charge DATABASE_URL depuis .env / .env.production si absent
 * (le script CLI n'est pas chargé par Next, contrairement aux routes).
 */
import { readFileSync, existsSync } from "node:fs";

// ── Chargement d'environnement (avant tout import de la connexion DB) ──
if (!process.env.DATABASE_URL) {
  for (const file of [".env", ".env.production", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1]!;
      if (process.env[key]) continue;
      let val = m[2]!.trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL introuvable (.env / .env.production).");
  process.exit(1);
}

const DEFAULT_TENANT_ID = "default";

async function main() {
  // Imports dynamiques APRÈS avoir garanti DATABASE_URL
  const { db } = await import("./index");
  const schema = await import("./schema");
  const { isNull } = await import("drizzle-orm");

  const TABLES = [
    schema.categories, schema.produits, schema.stocks, schema.mouvementsStock,
    schema.clients, schema.commandes, schema.factures, schema.sessionsCaisse,
    schema.entreprise, schema.depots, schema.fournisseurs, schema.bonsCommande,
    schema.receptions, schema.promotions, schema.bannieres, schema.listesAchat,
    schema.chargesOperationnelles, schema.vehicules, schema.tournees,
    schema.livraisons, schema.retours, schema.avoirs,
  ];

  console.log("→ Création du tenant par défaut…");
  await db
    .insert(schema.tenants)
    .values({
      id: DEFAULT_TENANT_ID,
      nom: "Tenant principal",
      slug: "principal",
      statut: "actif",
      plan: "entreprise",
      maxUtilisateurs: 999,
      maxDepots: 99,
    })
    .onConflictDoNothing();

  console.log("→ Backfill des données existantes…");
  for (const table of TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = table as any;
    await db.update(t).set({ tenantId: DEFAULT_TENANT_ID }).where(isNull(t.tenantId));
  }

  console.log("→ Rattachement des utilisateurs…");
  await db
    .update(schema.users)
    .set({ tenantId: DEFAULT_TENANT_ID })
    .where(isNull(schema.users.tenantId));

  console.log("✅ Backfill terminé.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Backfill échoué:", e);
    process.exit(1);
  });
