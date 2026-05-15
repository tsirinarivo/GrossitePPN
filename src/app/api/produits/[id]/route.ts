import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const rows = await db
      .select({
        id: schema.produits.id,
        code: schema.produits.code,
        nom: schema.produits.nom,
        nomMG: schema.produits.nomMG,
        description: schema.produits.description,
        descriptionMG: schema.produits.descriptionMG,
        categorieId: schema.produits.categorieId,
        categorieNom: schema.categories.nom,
        marque: schema.produits.marque,
        uniteBase: schema.produits.uniteBase,
        prixAchatMoyenPondere: schema.produits.prixAchatMoyenPondere,
        prixVenteGros: schema.produits.prixVenteGros,
        prixVenteSemiGros: schema.produits.prixVenteSemiGros,
        prixVenteDetail: schema.produits.prixVenteDetail,
        tauxTVA: schema.produits.tauxTVA,
        exonereTVA: schema.produits.exonereTVA,
        seuilAlerte: schema.produits.seuilAlerte,
        actif: schema.produits.actif,
        visibleEcommerce: schema.produits.visibleEcommerce,
        prixEcommerce: schema.produits.prixEcommerce,
      })
      .from(schema.produits)
      .leftJoin(schema.categories, eq(schema.produits.categorieId, schema.categories.id))
      .where(eq(schema.produits.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const unitesVente = await db
      .select()
      .from(schema.unitesVente)
      .where(eq(schema.unitesVente.produitId, id))
      .orderBy(schema.unitesVente.ordre);

    return NextResponse.json({ produit: rows[0], unitesVente });
  } catch (e) {
    console.error("[api/produits/[id] GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

const ALLOWED_FIELDS = new Set([
  "nom",
  "nomMG",
  "code",
  "description",
  "descriptionMG",
  "categorieId",
  "marque",
  "uniteBase",
  "prixAchatMoyenPondere",
  "prixVenteGros",
  "prixVenteSemiGros",
  "prixVenteDetail",
  "tauxTVA",
  "exonereTVA",
  "seuilAlerte",
  "actif",
  "visibleEcommerce",
  "prixEcommerce",
]);

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const rows = await db
      .update(schema.produits)
      .set(updates as Partial<typeof schema.produits.$inferInsert>)
      .where(eq(schema.produits.id, id))
      .returning();

    if (rows.length === 0) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    return NextResponse.json({ produit: rows[0] });
  } catch (e) {
    console.error("[api/produits/[id] PATCH]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Ce code produit existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
