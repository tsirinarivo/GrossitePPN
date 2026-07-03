/**
 * Backfill multi-tenant — rattache toutes les données existantes à un tenant
 * par défaut, puis les utilisateurs.
 *
 * À lancer UNE fois, après le `drizzle-kit push` qui crée les colonnes
 * `tenant_id` :  `pnpm tsx src/lib/db/backfill-tenant.ts`
 *
 * Idempotent : peut être relancé sans risque (ne touche que les lignes dont
 * tenant_id est encore NULL).
 */
import { db } from "./index";
import * as schema from "./schema";
import { isNull } from "drizzle-orm";

// Doit rester identique à DEFAULT_TENANT_ID de "@/lib/tenant"
const DEFAULT_TENANT_ID = "default";

// Tables portant une colonne tenant_id (top-level tenant-owned)
const TABLES = [
  schema.categories,
  schema.produits,
  schema.stocks,
  schema.mouvementsStock,
  schema.clients,
  schema.commandes,
  schema.factures,
  schema.sessionsCaisse,
  schema.entreprise,
  schema.depots,
  schema.fournisseurs,
  schema.bonsCommande,
  schema.receptions,
  schema.promotions,
  schema.bannieres,
  schema.listesAchat,
  schema.chargesOperationnelles,
  schema.vehicules,
  schema.tournees,
  schema.livraisons,
  schema.retours,
  schema.avoirs,
] as const;

async function main() {
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
    const res = await db
      .update(t)
      .set({ tenantId: DEFAULT_TENANT_ID })
      .where(isNull(t.tenantId));
    console.log(`   ✓ ${t[Symbol.for("drizzle:Name")] ?? "table"} mis à jour`);
    void res;
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
