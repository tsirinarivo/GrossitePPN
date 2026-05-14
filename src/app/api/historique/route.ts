import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { inArray, desc, gte, lte, sql, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") ?? "jour";
  const statuts = searchParams.get("statuts")?.split(",") ?? ["validee", "annulee", "soumise"];

  const now = new Date();
  let from: Date;
  if (periode === "semaine") {
    from = new Date(now); from.setDate(now.getDate() - 7);
  } else if (periode === "mois") {
    from = new Date(now); from.setDate(1); from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now); from.setHours(0, 0, 0, 0);
  }

  try {
    const commandes = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        statut: schema.commandes.statut,
        totalTTC: schema.commandes.totalTTC,
        soumiseAt: schema.commandes.soumiseAt,
        valideeAt: schema.commandes.valideeAt,
        clientId: schema.commandes.clientId,
        agentId: schema.commandes.agentId,
        source: schema.commandes.source,
      })
      .from(schema.commandes)
      .where(
        inArray(schema.commandes.statut, statuts as ("validee" | "annulee" | "soumise")[])
      )
      .orderBy(desc(schema.commandes.soumiseAt))
      .limit(200);

    // Filtrer par date côté JS (plus simple que d'ajouter une clause AND)
    const filtered = commandes.filter((c) => {
      const d = c.soumiseAt ? new Date(c.soumiseAt) : null;
      return d && d >= from;
    });

    // Résoudre noms clients et agents
    const clientIds = [...new Set(filtered.map((c) => c.clientId).filter(Boolean))] as string[];
    const agentIds  = [...new Set(filtered.map((c) => c.agentId).filter(Boolean))]  as string[];

    const [clients, agents] = await Promise.all([
      clientIds.length > 0
        ? db.select({ id: schema.clients.id, nom: schema.clients.raisonSociale })
            .from(schema.clients).where(inArray(schema.clients.id, clientIds))
        : [],
      agentIds.length > 0
        ? db.select({ id: schema.users.id, nom: schema.users.name })
            .from(schema.users).where(inArray(schema.users.id, agentIds))
        : [],
    ]);

    const clientsMap = new Map(clients.map((c) => [c.id, c.nom]));
    const agentsMap  = new Map(agents.map((a)  => [a.id, a.nom ?? ""]));

    // Compter lignes par commande
    const commandeIds = filtered.map((c) => c.id);
    const counts = commandeIds.length > 0
      ? await db
          .select({
            commandeId: schema.lignesCommande.commandeId,
            count: sql<number>`COUNT(*)`.as("count"),
          })
          .from(schema.lignesCommande)
          .where(inArray(schema.lignesCommande.commandeId, commandeIds))
          .groupBy(schema.lignesCommande.commandeId)
      : [];
    const countMap = new Map(counts.map((l) => [l.commandeId, Number(l.count)]));

    const result = filtered.map((c) => ({
      id: c.id,
      numero: c.numero,
      statut: c.statut,
      totalTTC: c.totalTTC,
      client: c.clientId ? (clientsMap.get(c.clientId) ?? "Client comptoir") : "Client comptoir",
      agent: c.agentId ? (agentsMap.get(c.agentId) ?? "") : "",
      source: c.source,
      nbArticles: countMap.get(c.id) ?? 0,
      soumiseAt: c.soumiseAt,
      valideeAt: c.valideeAt,
    }));

    // KPIs
    const encaissees = result.filter((c) => c.statut === "validee");
    const totalEncaisse = encaissees.reduce((s, c) => s + c.totalTTC, 0);
    const panierMoyen = encaissees.length > 0 ? Math.round(totalEncaisse / encaissees.length) : 0;

    return NextResponse.json({ commandes: result, totalEncaisse, panierMoyen, nbEncaissees: encaissees.length });
  } catch (e) {
    console.error("[api/historique]", e);
    return NextResponse.json({ commandes: [], totalEncaisse: 0, panierMoyen: 0, nbEncaissees: 0 });
  }
}
