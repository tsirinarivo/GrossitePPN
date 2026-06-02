import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit, isValidApiKey } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("X-API-Key");
  if (!isValidApiKey(apiKey)) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }

  const limit = checkRateLimit(`catalogue:${apiKey}`);
  const baseHeaders = {
    "X-RateLimit-Limit": "60",
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
  };

  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit dépassé" }, { status: 429, headers: baseHeaders });
  }

  try {
    const produits = await db
      .select({
        id: schema.produits.id,
        code: schema.produits.code,
        nom: schema.produits.nom,
        description: schema.produits.description,
        categorieId: schema.produits.categorieId,
        uniteBase: schema.produits.uniteBase,
        prix: schema.produits.prixVenteDetail,
        prixEcommerce: schema.produits.prixEcommerce,
        tauxTVA: schema.produits.tauxTVA,
        photos: schema.produits.photos,
      })
      .from(schema.produits)
      .where(eq(schema.produits.actif, true))
      .orderBy(desc(schema.produits.updatedAt))
      .limit(500);

    return NextResponse.json({
      version: "1.0",
      generatedAt: new Date().toISOString(),
      count: produits.length,
      produits,
    }, { headers: baseHeaders });
  } catch {
    return NextResponse.json({
      version: "1.0",
      generatedAt: new Date().toISOString(),
      count: 0,
      produits: [],
      demo: true,
    }, { headers: baseHeaders });
  }
}
