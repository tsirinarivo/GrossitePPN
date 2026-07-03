import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, scopeTenant, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  try {
    const { searchParams } = new URL(req.url);
    const depotId = searchParams.get("depotId");

    // Products with stock — filtered by depot if provided, otherwise all depots
    const stockJoinCond = depotId
      ? and(eq(schema.stocks.produitId, schema.produits.id), eq(schema.stocks.depotId, depotId))
      : eq(schema.stocks.produitId, schema.produits.id);

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
      .leftJoin(schema.stocks, stockJoinCond)
      .where(scopeTenant(schema.produits.tenantId, tid, eq(schema.produits.actif, true)))
      .groupBy(schema.produits.id);

    // Categories map
    const categories = await db
      .select()
      .from(schema.categories)
      .where(tenantFilter(schema.categories.tenantId, tid));
    const catMap = new Map(categories.map((c) => [c.id, c.nom]));

    // Today's movements (filtered by depot if provided)
    const mvtWhere = depotId
      ? and(
          sql`${schema.mouvementsStock.createdAt} >= CURRENT_DATE`,
          eq(schema.mouvementsStock.depotId, depotId)
        )
      : sql`${schema.mouvementsStock.createdAt} >= CURRENT_DATE`;

    const mouvements = await db
      .select({
        produitId: schema.mouvementsStock.produitId,
        type: schema.mouvementsStock.type,
      })
      .from(schema.mouvementsStock)
      .where(and(tenantFilter(schema.mouvementsStock.tenantId, tid), mvtWhere));

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
        alerteRupture: stock <= 0 || (seuil > 0 && stock <= seuil),
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
