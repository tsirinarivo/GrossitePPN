import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, notInArray, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // Find commandeIds already assigned to a livraison
    const existingLivraisons = await db
      .select({ commandeId: schema.livraisons.commandeId })
      .from(schema.livraisons);

    const assignedIds = existingLivraisons.map((l) => l.commandeId);

    // Query validée commandes not yet assigned
    const baseQuery = db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        totalTTC: schema.commandes.totalTTC,
        adresseLivraison: schema.commandes.adresseLivraison,
        clientId: schema.commandes.clientId,
      })
      .from(schema.commandes)
      .where(eq(schema.commandes.statut, "validee"));

    const commandes = assignedIds.length > 0
      ? await db
          .select({
            id: schema.commandes.id,
            numero: schema.commandes.numero,
            totalTTC: schema.commandes.totalTTC,
            adresseLivraison: schema.commandes.adresseLivraison,
            clientId: schema.commandes.clientId,
          })
          .from(schema.commandes)
          .where(
            eq(schema.commandes.statut, "validee")
          )
      : await baseQuery;

    // Filter out assigned ones in JS since notInArray requires non-empty
    const filtered = assignedIds.length > 0
      ? commandes.filter((c) => !assignedIds.includes(c.id))
      : commandes;

    if (filtered.length === 0) {
      return NextResponse.json([]);
    }

    // Resolve client names
    const clientIds = filtered.map((c) => c.clientId).filter(Boolean) as string[];
    const clientsMap = new Map<string, string>();

    if (clientIds.length > 0) {
      const clients = await db
        .select({ id: schema.clients.id, raisonSociale: schema.clients.raisonSociale })
        .from(schema.clients)
        .where(inArray(schema.clients.id, clientIds));
      for (const c of clients) clientsMap.set(c.id, c.raisonSociale);
    }

    const result = filtered.map((c) => ({
      id: c.id,
      numero: c.numero,
      clientNom: c.clientId ? (clientsMap.get(c.clientId) ?? "Client inconnu") : "Client comptoir",
      totalTTC: c.totalTTC,
      adresseLivraison: c.adresseLivraison ?? null,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/livraisons/commandes-disponibles GET]", e);
    return NextResponse.json([]);
  }
}
