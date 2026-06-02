import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemoLignes(listeId: string) {
  return {
    liste: { id: listeId, nom: "Liste exemple", frequence: "hebdo", createdAt: new Date().toISOString() },
    lignes: [
      { id: "ll1", produitId: "demo-p1", produitNom: "Riz Makalioka 50kg", quantite: 5, prixUnit: 110000, emoji: "🌾" },
      { id: "ll2", produitId: "demo-p2", produitNom: "Huile Tournesol 5L", quantite: 4, prixUnit: 50000, emoji: "🛢️" },
      { id: "ll3", produitId: "demo-p3", produitNom: "Sucre 1kg", quantite: 20, prixUnit: 3000, emoji: "🍬" },
    ],
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const [liste] = await db.select().from(schema.listesAchat).where(eq(schema.listesAchat.id, id)).limit(1);
    if (!liste) {
      if (id.startsWith("demo-")) return NextResponse.json(buildDemoLignes(id));
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }

    const lignes = await db
      .select({
        id: schema.lignesListeAchat.id,
        produitId: schema.lignesListeAchat.produitId,
        produitNom: schema.produits.nom,
        quantite: schema.lignesListeAchat.quantite,
        prixUnit: schema.produits.prixVenteDetail,
      })
      .from(schema.lignesListeAchat)
      .leftJoin(schema.produits, eq(schema.produits.id, schema.lignesListeAchat.produitId))
      .where(eq(schema.lignesListeAchat.listeId, id));

    return NextResponse.json({ liste, lignes });
  } catch {
    return NextResponse.json(buildDemoLignes(id));
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  try {
    await db.delete(schema.listesAchat).where(eq(schema.listesAchat.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// PATCH pour marquer "commande créée"
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  try {
    await db.update(schema.listesAchat).set({ derniereCommandeAt: new Date() }).where(eq(schema.listesAchat.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
