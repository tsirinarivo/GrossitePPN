import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // Find the client linked to this user
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.userId, session.user.id))
      .limit(1);

    if (!client || !client.ecommerceActif) {
      return NextResponse.json({ error: "Compte e-commerce non activé" }, { status: 403 });
    }

    const membres = await db
      .select({
        id: schema.sousUtilisateurs.id,
        userId: schema.sousUtilisateurs.userId,
        nom: schema.users.name,
        email: schema.users.email,
        peutCommander: schema.sousUtilisateurs.peutCommander,
        peutVoirFactures: schema.sousUtilisateurs.peutVoirFactures,
        peutGererEquipe: schema.sousUtilisateurs.peutGererEquipe,
        createdAt: schema.sousUtilisateurs.createdAt,
      })
      .from(schema.sousUtilisateurs)
      .innerJoin(schema.users, eq(schema.sousUtilisateurs.userId, schema.users.id))
      .where(eq(schema.sousUtilisateurs.clientId, client.id))
      .orderBy(desc(schema.sousUtilisateurs.createdAt));

    return NextResponse.json({
      membres,
      client: { raisonSociale: client.raisonSociale, id: client.id },
    });
  } catch (error) {
    console.error("[GET /api/clients/equipe]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const membreId = searchParams.get("membreId");

  if (!membreId) {
    return NextResponse.json({ error: "membreId requis" }, { status: 400 });
  }

  try {
    // Find the client linked to this user
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.userId, session.user.id))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    // Delete the sous-utilisateur (only if it belongs to this client)
    await db
      .delete(schema.sousUtilisateurs)
      .where(eq(schema.sousUtilisateurs.id, membreId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/clients/equipe]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
