import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Item de catalogue tel que consommé par la boutique. */
export interface CatalogueItem {
  id: string;          // UUID réel (clé étrangère valide pour les commandes)
  slug: string;        // = code produit (résolution fiche produit)
  nom: string;
  nomMG: string | null;
  cat: string;         // slug de catégorie
  catLabel: string;
  prix: number;
  unite: string;
  prixCarton: number | null;
  uniteCarton: string | null;
  stock: "ok" | "limite" | "rupture";
  stockQte: number;
  qteMinCommande: number;
  emoji: string;
  vedette: boolean;
  description: string | null;
  marque: string | null;
}

const EMOJI_MAP: Array<[RegExp, string]> = [
  [/riz|vary|cereal/i, "🌾"],
  [/huile|menaka/i, "🫙"],
  [/sucre|siramamy/i, "🍬"],
  [/savon|hygien|savony/i, "🧼"],
  [/lait|ronono|yaourt/i, "🥛"],
  [/farine|harina/i, "🌾"],
  [/sel|sira/i, "🧂"],
  [/conserv|tomate|sardine|boite|boaty/i, "🥫"],
  [/haricot|tsaramaso|legum|pois/i, "🫘"],
  [/poisson|trozona/i, "🐟"],
  [/eau|boisson|jus/i, "🥤"],
  [/pate|spaghetti|nouille/i, "🍝"],
];

function emojiFor(nom: string, catNom: string): string {
  const hay = `${nom} ${catNom}`;
  for (const [re, e] of EMOJI_MAP) if (re.test(hay)) return e;
  return "📦";
}

export async function GET() {
  try {
    // On privilégie les produits explicitement visibles en boutique ;
    // s'il n'y en a aucun, on retombe sur tous les produits actifs
    // (pour que la vitrine ne soit jamais vide quand la DB a des produits).
    const rowsVisibles = await selectProduits(true);
    const rows = rowsVisibles.length > 0 ? rowsVisibles : await selectProduits(false);

    if (rows.length === 0) {
      // DB sans produit → la boutique utilisera son jeu de démonstration.
      return NextResponse.json({ produits: [], demo: true });
    }

    // Stock total par produit pour le badge disponibilité
    const stockRows = await db
      .select({
        produitId: schema.stocks.produitId,
        total: sql<number>`coalesce(sum(${schema.stocks.quantiteBase}), 0)`,
      })
      .from(schema.stocks)
      .groupBy(schema.stocks.produitId);
    const stockMap = new Map(stockRows.map((s) => [s.produitId, Number(s.total)]));

    const produits: CatalogueItem[] = rows.map((r) => {
      const total = stockMap.get(r.id) ?? 0;
      const seuil = r.seuilAlerte ?? 0;
      const stock: CatalogueItem["stock"] =
        total <= 0 ? "rupture" : total <= seuil ? "limite" : "ok";
      const prix =
        r.prixEcommerce ?? r.prixVenteDetail ?? r.prixVenteGros ?? 0;
      const catLabel = r.catNom ?? "Autre";
      return {
        id: r.id,
        slug: r.code,
        nom: r.nom,
        nomMG: r.nomMG,
        cat: r.catSlug ?? "autre",
        catLabel,
        prix,
        unite: r.uniteBase,
        prixCarton: null,
        uniteCarton: null,
        stock,
        stockQte: Math.max(0, Math.round(total)),
        qteMinCommande: 1,
        emoji: emojiFor(r.nom, catLabel),
        vedette: false,
        description: r.descriptionEcommerce ?? r.description ?? null,
        marque: r.marque ?? null,
      };
    });

    return NextResponse.json({ produits, demo: false });
  } catch (e) {
    console.error("[api/shop/catalogue]", e instanceof Error ? e.message : e);
    return NextResponse.json({ produits: [], demo: true });
  }
}

function selectProduits(visiblesSeulement: boolean) {
  const cond = visiblesSeulement
    ? and(eq(schema.produits.actif, true), eq(schema.produits.visibleEcommerce, true))
    : eq(schema.produits.actif, true);
  return db
    .select({
      id: schema.produits.id,
      code: schema.produits.code,
      nom: schema.produits.nom,
      nomMG: schema.produits.nomMG,
      uniteBase: schema.produits.uniteBase,
      prixEcommerce: schema.produits.prixEcommerce,
      prixVenteDetail: schema.produits.prixVenteDetail,
      prixVenteGros: schema.produits.prixVenteGros,
      seuilAlerte: schema.produits.seuilAlerte,
      description: schema.produits.description,
      descriptionEcommerce: schema.produits.descriptionEcommerce,
      marque: schema.produits.marque,
      catSlug: schema.categories.slug,
      catNom: schema.categories.nom,
    })
    .from(schema.produits)
    .leftJoin(schema.categories, eq(schema.produits.categorieId, schema.categories.id))
    .where(cond)
    .limit(500);
}
