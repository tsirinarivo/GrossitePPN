import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const depots = await db
      .select()
      .from(schema.depots)
      .orderBy(schema.depots.estPrincipal, schema.depots.nom);

    // Agrégation par dépôt
    const stocksAgg = await db
      .select({
        depotId: schema.stocks.depotId,
        nbProduits: sql<number>`count(distinct ${schema.stocks.produitId})::int`,
        totalQuantite: sql<number>`coalesce(sum(${schema.stocks.quantiteBase}), 0)`,
        valeur: sql<number>`coalesce(sum(${schema.stocks.quantiteBase} * coalesce(${schema.produits.prixVenteDetail}, 0)), 0)::int`,
      })
      .from(schema.stocks)
      .innerJoin(schema.produits, eq(schema.stocks.produitId, schema.produits.id))
      .groupBy(schema.stocks.depotId);

    const aggMap = new Map(stocksAgg.map((s) => [s.depotId, s]));

    const depotsEnrichis = depots.map((d) => {
      const agg = aggMap.get(d.id);
      return {
        ...d,
        nbProduits: agg?.nbProduits ?? 0,
        totalQuantite: Number(agg?.totalQuantite ?? 0),
        valeur: Number(agg?.valeur ?? 0),
      };
    });

    const totaux = depotsEnrichis.reduce(
      (acc, d) => ({
        nbProduits: acc.nbProduits + d.nbProduits,
        totalQuantite: acc.totalQuantite + d.totalQuantite,
        valeur: acc.valeur + d.valeur,
      }),
      { nbProduits: 0, totalQuantite: 0, valeur: 0 }
    );

    return NextResponse.json({ depots: depotsEnrichis, totaux });
  } catch (e) {
    console.error("[stock-consolide]", e);
    return NextResponse.json({ depots: [], totaux: { nbProduits: 0, totalQuantite: 0, valeur: 0 } });
  }
}
