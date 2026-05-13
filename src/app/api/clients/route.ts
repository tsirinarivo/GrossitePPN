import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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
