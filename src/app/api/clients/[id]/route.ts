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
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, id))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (e) {
    console.error("[api/clients/[id] GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role: string = (session.user as any).role ?? "agent";
    const isManager = role === "admin" || role === "gerant";

    const { id } = await params;
    const body = await req.json();

    type ClientUpdate = Partial<typeof schema.clients.$inferInsert>;
    const patch: ClientUpdate = {};
    if ("raisonSociale" in body) patch.raisonSociale = body.raisonSociale;
    if ("code" in body) patch.code = body.code;
    if ("nif" in body) patch.nif = body.nif ?? null;
    if ("stat" in body) patch.stat = body.stat ?? null;
    if ("telephone" in body) patch.telephone = body.telephone ?? null;
    if ("email" in body) patch.email = body.email ?? null;
    if ("adresse" in body) patch.adresse = body.adresse ?? null;
    if ("palier" in body) patch.palier = body.palier;
    if ("notes" in body) patch.notes = body.notes ?? null;
    if ("zoneTournee" in body) patch.zoneTournee = body.zoneTournee ?? null;

    // Champs sensibles → réservés aux managers
    if (isManager) {
      if ("creditAutorise" in body) patch.creditAutorise = body.creditAutorise;
      if ("plafondCredit" in body) patch.plafondCredit = body.plafondCredit;
      if ("actif" in body) patch.actif = body.actif;
      if ("agentId" in body) patch.agentId = body.agentId ?? null;
    } else if ("creditAutorise" in body || "plafondCredit" in body || "actif" in body || "agentId" in body) {
      return NextResponse.json(
        { error: "Réassignation et droits crédit réservés aux gérants" },
        { status: 403 }
      );
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
    }

    patch.updatedAt = new Date();

    const [updated] = await db
      .update(schema.clients)
      .set(patch)
      .where(eq(schema.clients.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    return NextResponse.json({ client: updated });
  } catch (e: unknown) {
    console.error("[api/clients/[id] PATCH]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Ce code client existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
