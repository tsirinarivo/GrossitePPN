import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [fournisseur] = await db
      .select()
      .from(schema.fournisseurs)
      .where(eq(schema.fournisseurs.id, id));

    if (!fournisseur) {
      return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
    }

    return NextResponse.json({ fournisseur });
  } catch (error) {
    console.error("GET /api/achats/fournisseurs/[id]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(schema.fournisseurs)
      .where(eq(schema.fournisseurs.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
    }

    const updates: Partial<typeof schema.fournisseurs.$inferInsert> = {};

    if (body.nom !== undefined) updates.nom = body.nom;
    if (body.nif !== undefined) updates.nif = body.nif;
    if (body.contact !== undefined) updates.contact = body.contact;
    if (body.telephone !== undefined) updates.telephone = body.telephone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.adresse !== undefined) updates.adresse = body.adresse;
    if (body.ville !== undefined) updates.ville = body.ville;
    if (body.conditionsPaiement !== undefined) updates.conditionsPaiement = body.conditionsPaiement;
    if (body.actif !== undefined) updates.actif = body.actif;
    if (body.notes !== undefined) updates.notes = body.notes;

    const [fournisseur] = await db
      .update(schema.fournisseurs)
      .set(updates)
      .where(eq(schema.fournisseurs.id, id))
      .returning();

    return NextResponse.json({ fournisseur });
  } catch (error) {
    console.error("PUT /api/achats/fournisseurs/[id]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
