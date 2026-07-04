import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { inArray, or } from "drizzle-orm";

/**
 * Résout une liste de produitId potentiels (id, code, ou nom) vers les vrais
 * IDs présents en base. Filet de sécurité contre :
 *  - un panier mis en cache avant migration (IDs obsolètes)
 *  - les données de démonstration (IDs fictifs "p-riz-maka", "uv-riz-kg"…)
 *    qui provoquent sinon une violation de clé étrangère sur lignes_commande.
 *
 * Retourne `{ ok: true, ids }` avec les IDs résolus dans l'ordre d'entrée,
 * ou `{ ok: false }` si au moins une ligne ne correspond à aucun produit réel.
 */
export async function resolveProduitIds(
  lignes: { produitId?: string | null; nom?: string | null }[]
): Promise<{ ok: true; ids: string[] } | { ok: false }> {
  const wantedIds = lignes.map((l) => String(l.produitId ?? "")).filter(Boolean);
  const wantedNoms = lignes.map((l) => String(l.nom ?? "")).filter(Boolean);

  if (wantedIds.length === 0 && wantedNoms.length === 0) {
    return { ok: false };
  }

  let prodRows: { id: string; nom: string; code: string }[] = [];
  try {
    const conds = [];
    if (wantedIds.length > 0) conds.push(inArray(schema.produits.id, wantedIds));
    if (wantedIds.length > 0) conds.push(inArray(schema.produits.code, wantedIds));
    if (wantedNoms.length > 0) conds.push(inArray(schema.produits.nom, wantedNoms));
    prodRows = await db
      .select({ id: schema.produits.id, nom: schema.produits.nom, code: schema.produits.code })
      .from(schema.produits)
      .where(conds.length === 1 ? conds[0] : or(...conds));
  } catch {
    return { ok: false };
  }

  const idSet = new Set(prodRows.map((p) => p.id));
  const byCode = new Map(prodRows.map((p) => [p.code, p.id]));
  const byNom = new Map(prodRows.map((p) => [p.nom.toLowerCase(), p.id]));

  const resolved = lignes.map((l) => {
    const pid = String(l.produitId ?? "");
    if (idSet.has(pid)) return pid;
    return byCode.get(pid) ?? byNom.get(String(l.nom ?? "").toLowerCase()) ?? null;
  });

  if (resolved.some((x) => x === null)) return { ok: false };
  return { ok: true, ids: resolved as string[] };
}
