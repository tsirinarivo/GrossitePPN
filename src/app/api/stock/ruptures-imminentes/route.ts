import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, gte, sql, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Détecte les produits en rupture imminente : stock actuel < (vitesse de vente × N jours).
 *
 * Pour chaque produit actif :
 *   - vitesse_vente = quantité totale vendue sur 30j / 30
 *   - jours_restants = stock_actuel / vitesse_vente
 *   - rupture_imminente si jours_restants < seuil (par défaut 7j)
 *
 * Tri : du plus urgent (moins de jours) au moins urgent.
 *
 * Query params :
 *   - seuil : nombre de jours (défaut 7)
 *   - limit : max résultats (défaut 50)
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  const url = new URL(req.url);
  const seuil = Math.max(1, Math.min(60, Number(url.searchParams.get("seuil") ?? "7")));
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? "50")));

  const debut = new Date(Date.now() - 30 * 86400000);

  try {
    // Vitesse de vente moyenne sur 30j (toutes commandes en statut "engagé")
    const ventes30j = await db
      .select({
        produitId: schema.lignesCommande.produitId,
        qteTotale: sql<number>`coalesce(sum(${schema.lignesCommande.quantiteBase}), 0)`,
      })
      .from(schema.lignesCommande)
      .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
      .where(
        and(
          inArray(schema.commandes.statut, ["validee", "preparee", "en_livraison", "livree"]),
          gte(schema.commandes.soumiseAt, debut)
        )
      )
      .groupBy(schema.lignesCommande.produitId);

    const vitesseMap = new Map(
      ventes30j.map((v) => [v.produitId, Number(v.qteTotale) / 30])
    );

    if (vitesseMap.size === 0) {
      return NextResponse.json({
        ruptures: [],
        stats: { total: 0, criticite_3j: 0, criticite_7j: 0, criticite_14j: 0 },
      });
    }

    // Stock total par produit (tous dépôts confondus)
    const produitIds = Array.from(vitesseMap.keys());
    const stocks = await db
      .select({
        produitId: schema.stocks.produitId,
        qteTotale: sql<number>`coalesce(sum(${schema.stocks.quantiteBase}), 0)`,
      })
      .from(schema.stocks)
      .where(inArray(schema.stocks.produitId, produitIds))
      .groupBy(schema.stocks.produitId);

    const stockMap = new Map(stocks.map((s) => [s.produitId, Number(s.qteTotale)]));

    // Détails produits
    const produitsDetails = await db
      .select({
        id: schema.produits.id,
        code: schema.produits.code,
        nom: schema.produits.nom,
        uniteBase: schema.produits.uniteBase,
        categorieId: schema.produits.categorieId,
      })
      .from(schema.produits)
      .where(
        and(
          tenantFilter(schema.produits.tenantId, tid),
          inArray(schema.produits.id, produitIds),
          eq(schema.produits.actif, true)
        )
      );

    const produitsMap = new Map(produitsDetails.map((p) => [p.id, p]));

    // Calcul jours restants
    type Rupture = {
      produit: typeof produitsDetails[0];
      stockActuel: number;
      vitesseVente: number;
      joursRestants: number;
      criticite: "critique" | "urgent" | "alerte";
    };

    const ruptures: Rupture[] = [];
    for (const [id, vitesse] of vitesseMap.entries()) {
      const stockActuel = stockMap.get(id) ?? 0;
      const produit = produitsMap.get(id);
      if (!produit) continue;
      if (vitesse <= 0) continue;

      const joursRestants = stockActuel / vitesse;
      if (joursRestants >= seuil) continue;

      const criticite: "critique" | "urgent" | "alerte" =
        joursRestants < 3 ? "critique" : joursRestants < 7 ? "urgent" : "alerte";

      ruptures.push({
        produit,
        stockActuel,
        vitesseVente: Math.round(vitesse * 10) / 10,
        joursRestants: Math.round(joursRestants * 10) / 10,
        criticite,
      });
    }

    // Tri du plus urgent au moins urgent
    ruptures.sort((a, b) => a.joursRestants - b.joursRestants);

    const truncated = ruptures.slice(0, limit);

    const stats = {
      total: ruptures.length,
      criticite_3j: ruptures.filter((r) => r.joursRestants < 3).length,
      criticite_7j: ruptures.filter((r) => r.joursRestants < 7).length,
      criticite_14j: ruptures.filter((r) => r.joursRestants < 14).length,
    };

    return NextResponse.json({ ruptures: truncated, stats });
  } catch (e) {
    console.error("[/api/stock/ruptures-imminentes]", e);
    return NextResponse.json({
      ruptures: [],
      stats: { total: 0, criticite_3j: 0, criticite_7j: 0, criticite_14j: 0 },
    });
  }
}
