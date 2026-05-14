import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const commandes = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        statut: schema.commandes.statut,
        totalTTC: schema.commandes.totalTTC,
        soumiseAt: schema.commandes.soumiseAt,
        clientId: schema.commandes.clientId,
      })
      .from(schema.commandes)
      .where(
        and(
          eq(schema.commandes.agentId, session.user.id),
          inArray(schema.commandes.statut, ["soumise", "validee"])
        )
      )
      .orderBy(desc(schema.commandes.soumiseAt))
      .limit(20);

    // Résoudre les noms clients
    const clientIds = commandes.map((c) => c.clientId).filter(Boolean) as string[];
    const clientsMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const clients = await db
        .select({ id: schema.clients.id, raisonSociale: schema.clients.raisonSociale })
        .from(schema.clients)
        .where(inArray(schema.clients.id, clientIds));
      for (const c of clients) clientsMap.set(c.id, c.raisonSociale);
    }

    // Compter les lignes par commande
    const lignesCount = await db
      .select({ commandeId: schema.lignesCommande.commandeId })
      .from(schema.lignesCommande)
      .where(inArray(schema.lignesCommande.commandeId, commandes.map((c) => c.id)));
    const countMap = new Map<string, number>();
    for (const l of lignesCount) {
      countMap.set(l.commandeId, (countMap.get(l.commandeId) ?? 0) + 1);
    }

    const result = commandes.map((c) => ({
      id: c.id,
      numero: c.numero,
      statut: c.statut,
      client: c.clientId ? (clientsMap.get(c.clientId) ?? "Client comptoir") : "Client comptoir",
      totalTTC: c.totalTTC,
      nbArticles: countMap.get(c.id) ?? 0,
      soumiseAt: c.soumiseAt
        ? new Date(c.soumiseAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "--:--",
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/pos/commandes]", e);
    return NextResponse.json([]);
  }
}
