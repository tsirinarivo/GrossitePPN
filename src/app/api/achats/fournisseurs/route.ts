import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql, count, sum } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: schema.fournisseurs.id,
        nom: schema.fournisseurs.nom,
        nomCourt: schema.fournisseurs.nomCourt,
        nif: schema.fournisseurs.nif,
        contact: schema.fournisseurs.contact,
        telephone: schema.fournisseurs.telephone,
        email: schema.fournisseurs.email,
        adresse: schema.fournisseurs.adresse,
        ville: schema.fournisseurs.ville,
        pays: schema.fournisseurs.pays,
        conditionsPaiement: schema.fournisseurs.conditionsPaiement,
        notes: schema.fournisseurs.notes,
        actif: schema.fournisseurs.actif,
        createdAt: schema.fournisseurs.createdAt,
        nbCommandes: sql<number>`cast(count(${schema.bonsCommande.id}) as integer)`,
        totalAchats: sql<number>`coalesce(cast(sum(${schema.bonsCommande.totalTTC}) as bigint), 0)`,
        detteEnCours: sql<number>`coalesce(cast(sum(CASE WHEN ${schema.bonsCommande.statut} NOT IN ('brouillon','annule') THEN ${schema.bonsCommande.totalTTC} ELSE 0 END) as bigint), 0)`,
      })
      .from(schema.fournisseurs)
      .leftJoin(
        schema.bonsCommande,
        eq(schema.bonsCommande.fournisseurId, schema.fournisseurs.id)
      )
      .groupBy(schema.fournisseurs.id)
      .orderBy(schema.fournisseurs.nom);

    return NextResponse.json({ fournisseurs: rows });
  } catch (error) {
    console.error("GET /api/achats/fournisseurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      nom,
      nomCourt,
      nif,
      contact,
      telephone,
      email,
      adresse,
      ville,
      pays,
      conditionsPaiement,
      notes,
    } = body;

    if (!nom || typeof nom !== "string" || nom.trim() === "") {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    const id = crypto.randomUUID();

    const [fournisseur] = await db
      .insert(schema.fournisseurs)
      .values({
        id,
        nom: nom.trim(),
        nomCourt: nomCourt ?? null,
        nif: nif ?? null,
        contact: contact ?? null,
        telephone: telephone ?? null,
        email: email ?? null,
        adresse: adresse ?? null,
        ville: ville ?? null,
        pays: pays ?? "Madagascar",
        conditionsPaiement: conditionsPaiement ?? 30,
        notes: notes ?? null,
      })
      .returning();

    return NextResponse.json({ fournisseur }, { status: 201 });
  } catch (error) {
    console.error("POST /api/achats/fournisseurs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
