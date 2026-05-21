import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getClientFromSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.userId, session.user.id))
    .limit(1);
  if (client) return client;
  const [sub] = await db
    .select()
    .from(schema.sousUtilisateurs)
    .where(eq(schema.sousUtilisateurs.userId, session.user.id))
    .limit(1);
  if (sub) {
    const [cl] = await db.select().from(schema.clients).where(eq(schema.clients.id, sub.clientId)).limit(1);
    return cl ?? null;
  }
  return null;
}

// ── GET /api/shop/listes/[id] ─────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getClientFromSession();
  if (!client) return NextResponse.json({ error: "Compte client requis" }, { status: 403 });

  const { id } = await params;

  try {
    const [liste] = await db
      .select()
      .from(schema.listesAchat)
      .where(and(eq(schema.listesAchat.id, id), eq(schema.listesAchat.clientId, client.id)))
      .limit(1);

    if (!liste) return NextResponse.json({ error: "Liste introuvable" }, { status: 404 });

    const lignes = await db
      .select({
        id: schema.lignesListeAchat.id,
        produitId: schema.lignesListeAchat.produitId,
        uniteVenteId: schema.lignesListeAchat.uniteVenteId,
        quantite: schema.lignesListeAchat.quantite,
        produitNom: schema.produits.nom,
        produitCode: schema.produits.code,
        prixDetail: schema.produits.prixVenteDetail,
        prixGros: schema.produits.prixVenteGros,
        prixSemiGros: schema.produits.prixVenteSemiGros,
      })
      .from(schema.lignesListeAchat)
      .leftJoin(schema.produits, eq(schema.lignesListeAchat.produitId, schema.produits.id))
      .where(eq(schema.lignesListeAchat.listeId, id));

    return NextResponse.json({ liste, lignes });
  } catch {
    return NextResponse.json({ error: "Erreur de chargement" }, { status: 500 });
  }
}

// ── PATCH /api/shop/listes/[id] ───────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getClientFromSession();
  if (!client) return NextResponse.json({ error: "Compte client requis" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body requis" }, { status: 400 });

  try {
    const updates: Record<string, unknown> = {};
    if (body.nom !== undefined) updates.nom = String(body.nom).trim();
    if (body.frequence !== undefined) updates.frequence = body.frequence;

    const [liste] = await db
      .update(schema.listesAchat)
      .set(updates)
      .where(and(eq(schema.listesAchat.id, id), eq(schema.listesAchat.clientId, client.id)))
      .returning();

    // Update lignes si fourni (remplacement complet)
    if (Array.isArray(body.lignes)) {
      await db.delete(schema.lignesListeAchat).where(eq(schema.lignesListeAchat.listeId, id));
      type LigneInput = { produitId?: string; uniteVenteId?: string; quantite?: number };
      const toInsert = (body.lignes as LigneInput[])
        .filter((l) => l.produitId && Number(l.quantite) > 0)
        .map((l) => ({
          id: crypto.randomUUID(),
          listeId: id,
          produitId: String(l.produitId),
          uniteVenteId: l.uniteVenteId ?? null,
          quantite: Number(l.quantite),
        }));
      if (toInsert.length > 0) {
        await db.insert(schema.lignesListeAchat).values(toInsert);
      }
    }

    return NextResponse.json({ liste });
  } catch {
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}

// ── DELETE /api/shop/listes/[id] ──────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getClientFromSession();
  if (!client) return NextResponse.json({ error: "Compte client requis" }, { status: 403 });

  const { id } = await params;

  try {
    await db
      .delete(schema.listesAchat)
      .where(and(eq(schema.listesAchat.id, id), eq(schema.listesAchat.clientId, client.id)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
