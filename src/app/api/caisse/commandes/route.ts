import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch commandes in queue: soumise or validee (waiting for cashier)
    const commandes = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        source: schema.commandes.source,
        statut: schema.commandes.statut,
        totalTTC: schema.commandes.totalTTC,
        soumiseAt: schema.commandes.soumiseAt,
        clientId: schema.commandes.clientId,
        agentId: schema.commandes.agentId,
      })
      .from(schema.commandes)
      .where(inArray(schema.commandes.statut, ["soumise", "validee"]))
      .orderBy(desc(schema.commandes.soumiseAt))
      .limit(50);

    // Resolve clients and agents names
    const clientIds = commandes.map((c) => c.clientId).filter(Boolean) as string[];
    const agentIds = commandes.map((c) => c.agentId).filter(Boolean) as string[];

    const clientsMap = new Map<string, string>();
    const agentsMap = new Map<string, string>();

    if (clientIds.length > 0) {
      const clients = await db
        .select({ id: schema.clients.id, raisonSociale: schema.clients.raisonSociale })
        .from(schema.clients)
        .where(inArray(schema.clients.id, clientIds));
      for (const c of clients) clientsMap.set(c.id, c.raisonSociale);
    }

    if (agentIds.length > 0) {
      const agents = await db
        .select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(inArray(schema.users.id, agentIds));
      for (const a of agents) agentsMap.set(a.id, a.name ?? "");
    }

    // Count lines per commande
    const lignesCount = await db
      .select({
        commandeId: schema.lignesCommande.commandeId,
      })
      .from(schema.lignesCommande)
      .where(
        inArray(
          schema.lignesCommande.commandeId,
          commandes.map((c) => c.id)
        )
      );
    const countMap = new Map<string, number>();
    for (const l of lignesCount) {
      countMap.set(l.commandeId, (countMap.get(l.commandeId) ?? 0) + 1);
    }

    const result = commandes.map((c, i) => ({
      id: c.id,
      numero: c.numero,
      client: c.clientId ? (clientsMap.get(c.clientId) ?? "Client comptoir") : "Client comptoir",
      montant: c.totalTTC,
      nbArticles: countMap.get(c.id) ?? 0,
      source: c.source as "pos_agent" | "ecommerce",
      agentNom: c.agentId ? (agentsMap.get(c.agentId) ?? undefined) : undefined,
      soumiseAt: c.soumiseAt
        ? new Date(c.soumiseAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "--:--",
      priorite: i + 1,
      statut: "en_attente" as const,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/caisse/commandes]", e);
    return NextResponse.json([]);
  }
}
