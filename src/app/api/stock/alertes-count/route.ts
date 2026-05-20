import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const rows = await db
      .select({
        id: schema.produits.id,
        seuilAlerte: schema.produits.seuilAlerte,
        stockBase: sql<number>`COALESCE(SUM(${schema.stocks.quantiteBase}), 0)`,
      })
      .from(schema.produits)
      .leftJoin(schema.stocks, eq(schema.stocks.produitId, schema.produits.id))
      .where(eq(schema.produits.actif, true))
      .groupBy(schema.produits.id);

    const nbAlertes = rows.filter((p) => {
      const s = p.seuilAlerte ?? 0;
      const q = Number(p.stockBase);
      return q <= 0 || (s > 0 && q <= s);
    }).length;

    return NextResponse.json({ nbAlertes }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    console.error("[api/stock/alertes-count]", e);
    return NextResponse.json({ nbAlertes: 0 });
  }
}
