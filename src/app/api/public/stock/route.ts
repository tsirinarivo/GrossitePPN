import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { checkRateLimit, isValidApiKey } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("X-API-Key");
  if (!isValidApiKey(apiKey)) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }

  const limit = checkRateLimit(`stock:${apiKey}`);
  const baseHeaders = {
    "X-RateLimit-Limit": "60",
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
  };

  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit dépassé" }, { status: 429, headers: baseHeaders });
  }

  const url = new URL(req.url);
  const codeProduit = url.searchParams.get("code");

  try {
    const condition = codeProduit
      ? and(eq(schema.produits.actif, true), eq(schema.produits.code, codeProduit))
      : eq(schema.produits.actif, true);

    const rows = await db
      .select({
        produitId: schema.produits.id,
        code: schema.produits.code,
        nom: schema.produits.nom,
        stockTotal: sql<number>`COALESCE(SUM(${schema.stocks.quantiteBase}), 0)`,
      })
      .from(schema.produits)
      .leftJoin(schema.stocks, eq(schema.stocks.produitId, schema.produits.id))
      .where(condition)
      .groupBy(schema.produits.id, schema.produits.code, schema.produits.nom)
      .limit(500);

    return NextResponse.json({
      version: "1.0",
      generatedAt: new Date().toISOString(),
      count: rows.length,
      stocks: rows.map((r) => ({
        ...r,
        stockTotal: Number(r.stockTotal ?? 0),
        disponible: Number(r.stockTotal ?? 0) > 0,
      })),
    }, { headers: baseHeaders });
  } catch {
    return NextResponse.json({
      version: "1.0",
      generatedAt: new Date().toISOString(),
      count: 0,
      stocks: [],
      demo: true,
    }, { headers: baseHeaders });
  }
}
