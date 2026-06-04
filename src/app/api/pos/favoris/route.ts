import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, gte, sql, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Retourne les 12 produits les plus vendus par l'agent connecté sur les 30 derniers jours.
 * Utilisé par les boutons "favoris" du POS Agent pour ajouter en 1 clic les produits récurrents.
 *
 * Fallback : si l'agent est nouveau ou n'a pas de ventes, retourne les 12 produits les plus
 * vendus globalement sur la même période. Si rien encore, retourne les 12 produits les plus
 * récemment créés (pour ne pas avoir une UI vide).
 */
export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const debut = new Date(Date.now() - 30 * 86400000);

  try {
    // Top 12 produits vendus par cet agent sur 30j
    const topAgent = await db
      .select({
        produitId: schema.lignesCommande.produitId,
        nbVentes: sql<number>`count(*)::int`,
        qteTotale: sql<number>`coalesce(sum(${schema.lignesCommande.quantiteBase}), 0)`,
      })
      .from(schema.lignesCommande)
      .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
      .where(
        and(
          eq(schema.commandes.agentId, session.user.id),
          inArray(schema.commandes.statut, ["soumise", "validee", "preparee", "en_livraison", "livree"]),
          gte(schema.commandes.soumiseAt, debut)
        )
      )
      .groupBy(schema.lignesCommande.produitId)
      .orderBy(desc(sql`count(*)`))
      .limit(12);

    let produitIds = topAgent.map((t) => t.produitId);

    // Fallback global si pas assez de données agent
    if (produitIds.length < 6) {
      const topGlobal = await db
        .select({
          produitId: schema.lignesCommande.produitId,
          nbVentes: sql<number>`count(*)::int`,
        })
        .from(schema.lignesCommande)
        .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
        .where(
          and(
            inArray(schema.commandes.statut, ["validee", "preparee", "en_livraison", "livree"]),
            gte(schema.commandes.soumiseAt, debut)
          )
        )
        .groupBy(schema.lignesCommande.produitId)
        .orderBy(desc(sql`count(*)`))
        .limit(12);

      const idsSet = new Set(produitIds);
      for (const r of topGlobal) {
        if (!idsSet.has(r.produitId)) {
          produitIds.push(r.produitId);
          if (produitIds.length >= 12) break;
        }
      }
    }

    // Fallback final : produits récemment créés
    if (produitIds.length < 6) {
      const recents = await db
        .select({ id: schema.produits.id })
        .from(schema.produits)
        .where(eq(schema.produits.actif, true))
        .orderBy(desc(schema.produits.createdAt))
        .limit(12);
      const idsSet = new Set(produitIds);
      for (const r of recents) {
        if (!idsSet.has(r.id)) {
          produitIds.push(r.id);
          if (produitIds.length >= 12) break;
        }
      }
    }

    if (produitIds.length === 0) {
      return NextResponse.json({ favoris: [] });
    }

    // Récupère les détails produits
    const produits = await db
      .select({
        id: schema.produits.id,
        code: schema.produits.code,
        nom: schema.produits.nom,
        nomMG: schema.produits.nomMG,
        categorieId: schema.produits.categorieId,
        uniteBase: schema.produits.uniteBase,
        prixVenteDetail: schema.produits.prixVenteDetail,
        prixVenteGros: schema.produits.prixVenteGros,
        prixVenteSemiGros: schema.produits.prixVenteSemiGros,
        tauxTVA: schema.produits.tauxTVA,
        photos: schema.produits.photos,
      })
      .from(schema.produits)
      .where(inArray(schema.produits.id, produitIds));

    // Préserve l'ordre du classement
    const produitsMap = new Map(produits.map((p) => [p.id, p]));
    const ventesMap = new Map(topAgent.map((t) => [t.produitId, t]));
    const favoris = produitIds
      .map((id) => {
        const p = produitsMap.get(id);
        if (!p) return null;
        const stats = ventesMap.get(id);
        return {
          ...p,
          nbVentes: stats?.nbVentes ?? 0,
          qteTotaleVendue: Number(stats?.qteTotale ?? 0),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ favoris });
  } catch (e) {
    console.error("[/api/pos/favoris]", e);
    return NextResponse.json({ favoris: [] });
  }
}
