import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyApiKey } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

const DEMO_CATALOGUE = [
  { code: "RIZ-MAK-25", nom: "Riz Makalioka 25kg", categorie: "Riz & Céréales", marque: "Makalioka", unite: "sac", prixDetail: 95000, prixGros: 88000, tauxTVA: 0 },
  { code: "HUIL-SOA-1", nom: "Huile Soavita 1L", categorie: "Huiles", marque: "Soavita", unite: "bouteille", prixDetail: 9500, prixGros: 8800, tauxTVA: 20 },
  { code: "SUC-CRIS-50", nom: "Sucre cristallisé 50kg", categorie: "Épicerie", marque: "Sucoma", unite: "sac", prixDetail: 165000, prixGros: 158000, tauxTVA: 20 },
  { code: "SAV-72-400", nom: "Savon 72% 400g", categorie: "Hygiène", marque: "Diana", unite: "carton", prixDetail: 42000, prixGros: 39000, tauxTVA: 20 },
];

function withHeaders(body: unknown, partenaire: string) {
  return NextResponse.json(body, {
    headers: {
      "X-RateLimit-Limit": "1000",
      "X-RateLimit-Window": "3600",
      "X-Partner": partenaire,
      "Cache-Control": "public, max-age=60",
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
        marque: schema.produits.marque,
        unite: schema.produits.uniteBase,
        prixDetail: schema.produits.prixVenteDetail,
        prixGros: schema.produits.prixVenteGros,
        prixEcommerce: schema.produits.prixEcommerce,
        tauxTVA: schema.produits.tauxTVA,
        categorie: schema.categories.nom,
      })
      .from(schema.produits)
      .leftJoin(schema.categories, eq(schema.produits.categorieId, schema.categories.id))
      .where(and(eq(schema.produits.actif, true), eq(schema.produits.visibleEcommerce, true)))
      .limit(1000);

    if (rows.length > 0) {
      return withHeaders(
        { genereLe: new Date().toISOString(), total: rows.length, produits: rows },
        partner.nom
      );
    }
  } catch (e) {
    console.error("[public/catalogue]", e instanceof Error ? e.message : e);
  }

  return withHeaders(
    { genereLe: new Date().toISOString(), total: DEMO_CATALOGUE.length, produits: DEMO_CATALOGUE, demo: true },
    partner.nom
  );
}
