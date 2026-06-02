import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, asc, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

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

    const livraisonsAffectees = await db
      .select({
        livraison: schema.livraisons,
        commandeNumero: schema.commandes.numero,
        clientNom: schema.clients.raisonSociale,
        clientTel: schema.clients.telephone,
        totalTTC: schema.commandes.totalTTC,
      })
      .from(schema.livraisons)
      .leftJoin(schema.commandes, eq(schema.commandes.id, schema.livraisons.commandeId))
      .leftJoin(schema.clients, eq(schema.clients.id, schema.commandes.clientId))
      .where(eq(schema.livraisons.tourneeId, id))
      .orderBy(asc(schema.livraisons.ordre));

    const livraisonsLibres = await db
      .select({
        livraison: schema.livraisons,
        commandeNumero: schema.commandes.numero,
        clientNom: schema.clients.raisonSociale,
        totalTTC: schema.commandes.totalTTC,
      })
      .from(schema.livraisons)
      .leftJoin(schema.commandes, eq(schema.commandes.id, schema.livraisons.commandeId))
      .leftJoin(schema.clients, eq(schema.clients.id, schema.commandes.clientId))
      .where(isNull(schema.livraisons.tourneeId))
      .limit(50);

    return NextResponse.json({
      tournee: {
        ...tournee,
        date: tournee.date.toISOString(),
        createdAt: tournee.createdAt.toISOString(),
      },
      livraisons: livraisonsAffectees.map((r) => ({
        ...r.livraison,
        createdAt: r.livraison.createdAt.toISOString(),
        livraisonAt: r.livraison.livraisonAt?.toISOString() ?? null,
        commandeNumero: r.commandeNumero,
        clientNom: r.clientNom ?? "Client comptoir",
        clientTel: r.clientTel ?? null,
        totalTTC: r.totalTTC ?? 0,
      })),
      libres: livraisonsLibres.map((r) => ({
        id: r.livraison.id,
        adresse: r.livraison.adresseLivraison,
        commandeNumero: r.commandeNumero,
        clientNom: r.clientNom ?? "Client comptoir",
        totalTTC: r.totalTTC ?? 0,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      tournee: { id, date: new Date().toISOString(), statut: "planifiee", notes: null, chauffeurId: null, vehiculeId: null },
      livraisons: [],
      libres: [],
      demo: true,
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const updates: Record<string, unknown> = {};
    if (body.statut !== undefined) updates.statut = body.statut;
    if (body.chauffeurId !== undefined) updates.chauffeurId = body.chauffeurId || null;
    if (body.vehiculeId !== undefined) updates.vehiculeId = body.vehiculeId || null;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.date !== undefined) updates.date = new Date(body.date);

    const [tournee] = await db
      .update(schema.tournees)
      .set(updates as never)
      .where(eq(schema.tournees.id, id))
      .returning();

    return NextResponse.json({ tournee });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
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
    // Détacher les livraisons d'abord
    await db.update(schema.livraisons).set({ tourneeId: null, ordre: 0 }).where(eq(schema.livraisons.tourneeId, id));
    await db.delete(schema.tournees).where(eq(schema.tournees.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
