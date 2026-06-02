import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, max } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Affecter une livraison à la tournée
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { livraisonId } = await req.json();
  if (!livraisonId) return NextResponse.json({ error: "ID livraison requis" }, { status: 400 });

  try {
    const rows = await db
      .select({ maxOrdre: max(schema.livraisons.ordre) })
      .from(schema.livraisons)
      .where(eq(schema.livraisons.tourneeId, id));
    const maxOrdre = rows[0]?.maxOrdre ?? 0;

    await db
      .update(schema.livraisons)
      .set({ tourneeId: id, ordre: Number(maxOrdre) + 1 })
      .where(eq(schema.livraisons.id, livraisonId));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// Réordonner les livraisons (PATCH avec tableau ordonné d'IDs)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { order } = await req.json() as { order: string[] };
  if (!Array.isArray(order)) return NextResponse.json({ error: "Ordre requis" }, { status: 400 });

  try {
    for (let i = 0; i < order.length; i++) {
      const livId = order[i]!;
      await db
        .update(schema.livraisons)
        .set({ ordre: i + 1 })
        .where(eq(schema.livraisons.id, livId));
    }
    void id;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// Détacher une livraison
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  const livraisonId = url.searchParams.get("livraisonId");
  if (!livraisonId) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  void params;
  try {
    await db
      .update(schema.livraisons)
      .set({ tourneeId: null, ordre: 0 })
      .where(eq(schema.livraisons.id, livraisonId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
