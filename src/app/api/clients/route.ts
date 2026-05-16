import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await db
      .select({
        id: schema.clients.id,
        code: schema.clients.code,
        raisonSociale: schema.clients.raisonSociale,
        telephone: schema.clients.telephone,
        email: schema.clients.email,
        adresse: schema.clients.adresse,
        palier: schema.clients.palier,
        creditAutorise: schema.clients.creditAutorise,
        plafondCredit: schema.clients.plafondCredit,
        encoursCourant: schema.clients.encoursCourant,
        pointsFidelite: schema.clients.pointsFidelite,
        statutFidelite: schema.clients.statutFidelite,
        totalAchats: schema.clients.totalAchats,
        nbCommandes: schema.clients.nbCommandes,
        panierMoyen: schema.clients.panierMoyen,
        dernierAchat: schema.clients.dernierAchat,
        actif: schema.clients.actif,
        notes: schema.clients.notes,
        createdAt: schema.clients.createdAt,
      })
      .from(schema.clients)
      .orderBy(desc(schema.clients.totalAchats));

    return NextResponse.json(clients);
  } catch (e) {
    console.error("[api/clients]", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { raisonSociale, code, nif, stat, telephone, email, adresse, palier, creditAutorise, plafondCredit, notes, agentId } = body;

    if (!raisonSociale || !code) {
      return NextResponse.json({ error: "Raison sociale et code sont requis" }, { status: 400 });
    }

    const id = crypto.randomUUID();

    const [inserted] = await db.insert(schema.clients).values({
      id,
      code: String(code).trim(),
      raisonSociale: String(raisonSociale).trim(),
      nif: nif ?? null,
      stat: stat ?? null,
      telephone: telephone ?? null,
      email: email ?? null,
      adresse: adresse ?? null,
      palier: palier ?? "detail",
      creditAutorise: creditAutorise ?? false,
      plafondCredit: plafondCredit ?? 0,
      notes: notes ?? null,
      agentId: agentId ?? null,
    }).returning();

    return NextResponse.json({ client: inserted }, { status: 201 });
  } catch (e: unknown) {
    console.error("[api/clients POST]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Ce code client existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
