import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Returns products in ProduitPOS shape for the POS agent */
export async function GET() {
  try {
    const produits = await db
      .select({
        id: schema.produits.id,
        code: schema.produits.code,
        nom: schema.produits.nom,
        nomMG: schema.produits.nomMG,
        categorieId: schema.produits.categorieId,
        uniteBase: schema.produits.uniteBase,
        tauxTVA: schema.produits.tauxTVA,
        photos: schema.produits.photos,
      })
      .from(schema.produits)
      .where(eq(schema.produits.actif, true));

    const categories = await db
      .select({
        id: schema.categories.id,
        nom: schema.categories.nom,
        nomMG: schema.categories.nomMG,
        slug: schema.categories.slug,
        icone: schema.categories.icone,
      })
      .from(schema.categories)
      .where(eq(schema.categories.actif, true));

    const unites = await db
      .select()
      .from(schema.unitesVente);

    // Get stock (sum across all depots)
    const stocks = await db
      .select({
        produitId: schema.stocks.produitId,
        quantiteBase: schema.stocks.quantiteBase,
      })
      .from(schema.stocks);

    // Aggregate stock per product
    const stockMap = new Map<string, number>();
    for (const s of stocks) {
      stockMap.set(s.produitId, (stockMap.get(s.produitId) ?? 0) + s.quantiteBase);
    }

    // Group units by product
    const unitesMap = new Map<string, typeof unites>();
    for (const u of unites) {
      const arr = unitesMap.get(u.produitId) ?? [];
      arr.push(u);
      unitesMap.set(u.produitId, arr);
    }

    const result = produits.map((p) => ({
      id: p.id,
      code: p.code,
      nom: p.nom,
      nomMG: p.nomMG,
      categorieId: p.categorieId,
      uniteBase: p.uniteBase,
      tauxTVA: p.tauxTVA,
      photo: Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : undefined,
      stockDisponible: stockMap.get(p.id) ?? 0,
      unitesVente: (unitesMap.get(p.id) ?? [])
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
        .map((u) => ({
          id: u.id,
          nom: u.nom,
          facteurConversion: u.facteurConversion,
          prixGros: u.prixGros,
          prixSemiGros: u.prixSemiGros,
          prixDetail: u.prixDetail,
          codeBarres: u.codeBarres,
        })),
    }));

    return NextResponse.json({ produits: result, categories });
  } catch (e) {
    console.error("[api/produits]", e);
    return NextResponse.json({ produits: [], categories: [] });
  }
}
