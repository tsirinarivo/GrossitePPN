import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

    // Get stock aggregated per product via SQL (avoids full-table JS scan)
    const stocks = await db
      .select({
        produitId: schema.stocks.produitId,
        total: sql<number>`SUM(${schema.stocks.quantiteBase})`.as("total"),
      })
      .from(schema.stocks)
      .groupBy(schema.stocks.produitId);

    const stockMap = new Map(stocks.map((s) => [s.produitId, s.total ?? 0]));

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

    return NextResponse.json({ produits: result, categories }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (e) {
    console.error("[api/produits]", e);
    return NextResponse.json({ produits: [], categories: [] });
  }
}

const uniteVenteSchema = z.object({
  nom: z.string().min(1),
  facteurConversion: z.coerce.number().positive(),
  prixGros: z.coerce.number().int().nonnegative().optional().nullable(),
  prixSemiGros: z.coerce.number().int().nonnegative().optional().nullable(),
  prixDetail: z.coerce.number().int().nonnegative().optional().nullable(),
  codeBarres: z.string().optional().nullable(),
  estDefaut: z.boolean().default(false),
});

const nouveauProduitSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  nomMG: z.string().optional().nullable(),
  code: z.string().min(1, "Code requis"),
  categorieId: z.string().optional().nullable(),
  marque: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  uniteBase: z.string().min(1, "Unité de base requise"),
  seuilAlerte: z.coerce.number().int().nonnegative().default(0),
  aDLC: z.boolean().default(false),
  tauxTVA: z.coerce.number().int().min(0).max(100).default(0),
  unitesVente: z.array(uniteVenteSchema).min(1),
  visibleEcommerce: z.boolean().default(false),
  prixEcommerce: z.coerce.number().int().nonnegative().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const parsed = nouveauProduitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const produitId = crypto.randomUUID();
    const now = new Date();

    await db.insert(schema.produits).values({
      id: produitId,
      code: d.code,
      nom: d.nom,
      nomMG: d.nomMG ?? null,
      description: d.description ?? null,
      categorieId: d.categorieId ?? null,
      marque: d.marque ?? null,
      uniteBase: d.uniteBase,
      seuilAlerte: d.seuilAlerte,
      aDLC: d.aDLC,
      tauxTVA: d.tauxTVA,
      visibleEcommerce: d.visibleEcommerce,
      prixEcommerce: d.prixEcommerce ?? null,
      actif: true,
      createdAt: now,
      updatedAt: now,
    });

    if (d.unitesVente.length > 0) {
      await db.insert(schema.unitesVente).values(
        d.unitesVente.map((u, i) => ({
          id: crypto.randomUUID(),
          produitId,
          nom: u.nom,
          facteurConversion: u.facteurConversion,
          prixGros: u.prixGros ?? null,
          prixSemiGros: u.prixSemiGros ?? null,
          prixDetail: u.prixDetail ?? null,
          codeBarres: u.codeBarres || null,
          estDefaut: i === 0,
          ordre: i,
        }))
      );
    }

    return NextResponse.json({ ok: true, id: produitId }, { status: 201 });
  } catch (e) {
    console.error("[api/produits POST]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Ce code produit existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
