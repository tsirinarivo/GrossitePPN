import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// ── GET /api/tournees/[id] ───────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const [tournee] = await db
      .select()
      .from(schema.tournees)
      .where(eq(schema.tournees.id, id))
      .limit(1);

    if (!tournee) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });

    let chauffeur = null;
    if (tournee.chauffeurId) {
      const [c] = await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
        })
        .from(schema.users)
        .where(eq(schema.users.id, tournee.chauffeurId))
        .limit(1);
      chauffeur = c ?? null;
    }

    let vehicule = null;
    if (tournee.vehiculeId) {
      const [v] = await db
        .select()
        .from(schema.vehicules)
        .where(eq(schema.vehicules.id, tournee.vehiculeId))
        .limit(1);
      vehicule = v ?? null;
    }

    // Livraisons affectées
    const livraisons = await db
      .select({
        id: schema.livraisons.id,
        ordre: schema.livraisons.ordre,
        statut: schema.livraisons.statut,
        adresseLivraison: schema.livraisons.adresseLivraison,
        livraisonAt: schema.livraisons.livraisonAt,
        commandeId: schema.livraisons.commandeId,
        commandeNumero: schema.commandes.numero,
        commandeTotalTTC: schema.commandes.totalTTC,
        clientNom: schema.clients.raisonSociale,
        clientTelephone: schema.clients.telephone,
      })
      .from(schema.livraisons)
      .leftJoin(schema.commandes, eq(schema.livraisons.commandeId, schema.commandes.id))
      .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
      .where(eq(schema.livraisons.tourneeId, id))
      .orderBy(asc(schema.livraisons.ordre));

    return NextResponse.json({ tournee, chauffeur, vehicule, livraisons });
  } catch {
    return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
  }
}

// ── PATCH /api/tournees/[id] ─────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { date, chauffeurId, vehiculeId, statut, notes } = body as {
    date?: string;
    chauffeurId?: string | null;
    vehiculeId?: string | null;
    statut?: string;
    notes?: string;
  };

  try {
    const updates: Record<string, unknown> = {};
    if (date !== undefined) updates.date = new Date(date);
    if (chauffeurId !== undefined) updates.chauffeurId = chauffeurId;
    if (vehiculeId !== undefined) updates.vehiculeId = vehiculeId;
    if (statut !== undefined) updates.statut = statut;
    if (notes !== undefined) updates.notes = notes;

    const [tournee] = await db
      .update(schema.tournees)
      .set(updates)
      .where(eq(schema.tournees.id, id))
      .returning();

    return NextResponse.json({ tournee });
  } catch {
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}

// ── DELETE /api/tournees/[id] ────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    // Détacher les livraisons
    await db
      .update(schema.livraisons)
      .set({ tourneeId: null, ordre: 0 })
      .where(eq(schema.livraisons.tourneeId, id));

    await db.delete(schema.tournees).where(eq(schema.tournees.id, id));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
