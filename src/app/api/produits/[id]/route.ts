import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { scopeTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const actor = await requireRole();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = actor.tenantId;
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
      .where(scopeTenant(schema.produits.tenantId, tid, eq(schema.produits.id, id)))
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
  const actor = await requireRole("admin", "gerant", "magasinier");
  if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const { id } = await params;
    const tid = actor.tenantId;
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

    // categorieId est une clé étrangère : "" (aucune catégorie) doit devenir NULL,
    // sinon violation de contrainte FK (Key (categorie_id)=() not present).
    if (updates.categorieId === "") updates.categorieId = null;

    updates.updatedAt = new Date();

    const rows = await db
      .update(schema.produits)
      .set(updates as Partial<typeof schema.produits.$inferInsert>)
      .where(scopeTenant(schema.produits.tenantId, tid, eq(schema.produits.id, id)))
      .returning();

    if (rows.length === 0) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    // Sync unitesVente if provided
    if (Array.isArray(body.unitesVente)) {
      const incoming = body.unitesVente as Array<{
        id?: string;
        nom: string;
        facteurConversion: number;
        prixGros?: number | null;
        prixSemiGros?: number | null;
        prixDetail?: number | null;
        prixAchat?: number | null;
        codeBarres?: string | null;
        estDefaut?: boolean;
        ordre?: number;
      }>;

      const existantes = await db
        .select({ id: schema.unitesVente.id })
        .from(schema.unitesVente)
        .where(eq(schema.unitesVente.produitId, id));

      const idsExistants = new Set(existantes.map((u) => u.id));
      const idsIncoming = new Set(incoming.filter((u) => u.id).map((u) => u.id as string));

      // Delete removed units
      const aSupprimer = [...idsExistants].filter((uid) => !idsIncoming.has(uid));
      if (aSupprimer.length > 0) {
        await db.delete(schema.unitesVente).where(inArray(schema.unitesVente.id, aSupprimer));
      }

      // Upsert each unit
      for (let i = 0; i < incoming.length; i++) {
        const u = incoming[i]!;
        const vals = {
          produitId: id,
          nom: u.nom,
          facteurConversion: u.facteurConversion,
          prixGros: u.prixGros ?? null,
          prixSemiGros: u.prixSemiGros ?? null,
          prixDetail: u.prixDetail ?? null,
          prixAchat: u.prixAchat ?? null,
          codeBarres: u.codeBarres || null,
          estDefaut: u.estDefaut ?? i === 0,
          ordre: u.ordre ?? i,
        };
        if (u.id && idsExistants.has(u.id)) {
          await db.update(schema.unitesVente).set(vals).where(eq(schema.unitesVente.id, u.id));
        } else {
          await db.insert(schema.unitesVente).values({ id: crypto.randomUUID(), ...vals });
        }
      }
    }

    const unitesVente = await db
      .select()
      .from(schema.unitesVente)
      .where(eq(schema.unitesVente.produitId, id))
      .orderBy(schema.unitesVente.ordre);

    return NextResponse.json({ produit: rows[0], unitesVente });
  } catch (e) {
    console.error("[api/produits/[id] PATCH]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Ce code produit existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
