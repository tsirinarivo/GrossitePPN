import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Products with their total stock across all depots
    const rows = await db
      .select({
        id: schema.produits.id,
        code: schema.produits.code,
        nom: schema.produits.nom,
        nomMG: schema.produits.nomMG,
        uniteBase: schema.produits.uniteBase,
        seuilAlerte: schema.produits.seuilAlerte,
        prixAchatMoyenPondere: schema.produits.prixAchatMoyenPondere,
        prixVenteDetail: schema.produits.prixVenteDetail,
        categorieId: schema.produits.categorieId,
        stockBase: sql<number>`COALESCE(SUM(${schema.stocks.quantiteBase}), 0)`,
      })
      .from(schema.produits)
      .leftJoin(schema.stocks, eq(schema.stocks.produitId, schema.produits.id))
      .where(eq(schema.produits.actif, true))
      .groupBy(schema.produits.id);

    // Categories map
    const categories = await db.select().from(schema.categories);
    const catMap = new Map(categories.map((c) => [c.id, c.nom]));

    // Today's movements count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const mouvements = await db
      .select({
        produitId: schema.mouvementsStock.produitId,
        type: schema.mouvementsStock.type,
      })
      .from(schema.mouvementsStock)
      .where(sql`${schema.mouvementsStock.createdAt} >= ${todayISO}`);

    const mvtMap = new Map<string, { entrees: number; sorties: number }>();
    for (const m of mouvements) {
      const cur = mvtMap.get(m.produitId) ?? { entrees: 0, sorties: 0 };
      if (m.type === "entrée") cur.entrees++;
      else cur.sorties++;
      mvtMap.set(m.produitId, cur);
    }

    const produits = rows.map((p) => {
      const seuil = p.seuilAlerte ?? 0;
      const stock = Number(p.stockBase);
      const prixAchat = p.prixAchatMoyenPondere ?? 0;
      const prixVente = p.prixVenteDetail ?? 0;
      const mvt = mvtMap.get(p.id);
      return {
        id: p.id,
        code: p.code,
        nom: p.nom,
        nomMG: p.nomMG,
        categorie: p.categorieId ? (catMap.get(p.categorieId) ?? "Autre") : "Autre",
        uniteBase: p.uniteBase,
        stockBase: stock,
        seuilAlerte: seuil,
        alerteRupture: stock <= seuil && seuil > 0,
        prixAchat,
        prixVente,
        valeurStock: Math.round(stock * prixAchat),
        mouvementsJour: mvt ? mvt.entrees + mvt.sorties : 0,
        entreesJour: mvt?.entrees ?? 0,
        sortiesJour: mvt?.sorties ?? 0,
      };
    });

    // Global stats
    const valeurTotale = produits.reduce((s, p) => s + p.valeurStock, 0);
    const nbAlertes = produits.filter((p) => p.alerteRupture).length;
    const totalMvt = mouvements.length;
    const totalEntrees = mouvements.filter((m) => m.type === "entrée").length;
    const totalSorties = mouvements.filter((m) => m.type !== "entrée").length;

    return NextResponse.json({
      produits,
      stats: { valeurTotale, nbAlertes, totalMvt, totalEntrees, totalSorties },
    });
  } catch (e) {
    console.error("[api/stock]", e);
    return NextResponse.json({ produits: [], stats: { valeurTotale: 0, nbAlertes: 0, totalMvt: 0, totalEntrees: 0, totalSorties: 0 } });
  }
}
