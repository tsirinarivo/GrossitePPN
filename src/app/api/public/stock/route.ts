import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyApiKey } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

const DEMO_STOCK = [
  { code: "RIZ-MAK-25", nom: "Riz Makalioka 25kg", unite: "sac", quantite: 142, seuilAlerte: 30, disponible: true },
  { code: "HUIL-SOA-1", nom: "Huile Soavita 1L", unite: "bouteille", quantite: 18, seuilAlerte: 24, disponible: true },
  { code: "SUC-CRIS-50", nom: "Sucre cristallisé 50kg", unite: "sac", quantite: 0, seuilAlerte: 10, disponible: false },
  { code: "SAV-72-400", nom: "Savon 72% 400g", unite: "carton", quantite: 67, seuilAlerte: 20, disponible: true },
];

function withHeaders(body: unknown, partenaire: string) {
  return NextResponse.json(body, {
    headers: {
      "X-RateLimit-Limit": "1000",
      "X-RateLimit-Window": "3600",
      "X-Partner": partenaire,
      "Cache-Control": "public, max-age=30",
    },
  });
}

export async function GET(req: NextRequest) {
  const partner = await verifyApiKey(req.headers.get("x-api-key"));
  if (!partner) {
    return NextResponse.json(
      { error: "Clé API invalide ou manquante (header X-API-Key)" },
      { status: 401 }
    );
  }

  try {
    const rows = await db
      .select({
        code: schema.produits.code,
        nom: schema.produits.nom,
        unite: schema.produits.uniteBase,
        seuilAlerte: schema.produits.seuilAlerte,
        quantite: sql<number>`coalesce(sum(${schema.stocks.quantiteBase}), 0)`,
      })
      .from(schema.produits)
      .leftJoin(schema.stocks, eq(schema.stocks.produitId, schema.produits.id))
      .where(eq(schema.produits.actif, true))
      .groupBy(
        schema.produits.code,
        schema.produits.nom,
        schema.produits.uniteBase,
        schema.produits.seuilAlerte
      )
      .limit(2000);

    if (rows.length > 0) {
      const produits = rows.map((r) => {
        const quantite = Math.round(Number(r.quantite) || 0);
        return {
          code: r.code,
          nom: r.nom,
          unite: r.unite,
          quantite,
          seuilAlerte: r.seuilAlerte ?? 0,
          disponible: quantite > 0,
        };
      });
      return withHeaders(
        { genereLe: new Date().toISOString(), total: produits.length, stock: produits },
        partner.nom
      );
    }
  } catch (e) {
    console.error("[public/stock]", e instanceof Error ? e.message : e);
  }

  return withHeaders(
    { genereLe: new Date().toISOString(), total: DEMO_STOCK.length, stock: DEMO_STOCK, demo: true },
    partner.nom
  );
}
