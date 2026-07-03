import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { inArray, desc, gte, lte, sql, eq, and, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  const { searchParams } = new URL(req.url);
  const periode  = searchParams.get("periode") ?? "jour";
  const statuts  = searchParams.get("statuts")?.split(",") ?? ["validee", "annulee", "soumise"];
  const dateFrom = searchParams.get("from");
  const dateTo   = searchParams.get("to");
  const clientQ  = searchParams.get("client")?.trim() ?? "";
  const agentId  = searchParams.get("agent") ?? "";

  const now = new Date();
  let from: Date;
  let to: Date = new Date(now.getTime() + 86400000);

  if (dateFrom && dateTo) {
    from = new Date(dateFrom);
    to   = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
  } else if (periode === "semaine") {
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
        totalHT: schema.commandes.totalHT,
        soumiseAt: schema.commandes.soumiseAt,
        valideeAt: schema.commandes.valideeAt,
        clientId: schema.commandes.clientId,
        agentId: schema.commandes.agentId,
        source: schema.commandes.source,
      })
      .from(schema.commandes)
      .where(and(
        tenantFilter(schema.commandes.tenantId, tid),
        inArray(schema.commandes.statut, statuts as ("validee" | "annulee" | "soumise")[]),
        gte(schema.commandes.soumiseAt, from),
        lte(schema.commandes.soumiseAt, to),
        agentId ? eq(schema.commandes.agentId, agentId) : undefined,
      ))
      .orderBy(desc(schema.commandes.soumiseAt))
      .limit(500);

    const clientIds = [...new Set(commandes.map((c) => c.clientId).filter(Boolean))] as string[];
    const agentIds  = [...new Set(commandes.map((c) => c.agentId).filter(Boolean))]  as string[];

    const [allClients, agents] = await Promise.all([
      clientIds.length > 0
        ? db.select({ id: schema.clients.id, nom: schema.clients.raisonSociale })
            .from(schema.clients).where(inArray(schema.clients.id, clientIds))
        : [] as { id: string; nom: string }[],
      agentIds.length > 0
        ? db.select({ id: schema.users.id, nom: schema.users.name })
            .from(schema.users).where(inArray(schema.users.id, agentIds))
        : [] as { id: string; nom: string | null }[],
    ]);

    const clientsMap = new Map(allClients.map((c) => [c.id, c.nom]));
    const agentsMap  = new Map(agents.map((a) => [a.id, a.nom ?? ""]));

    const commandeIds = commandes.map((c) => c.id);
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

    let result = commandes.map((c) => ({
      id: c.id,
      numero: c.numero,
      statut: c.statut,
      totalTTC: c.totalTTC,
      totalHT: c.totalHT,
      client: c.clientId ? (clientsMap.get(c.clientId) ?? "Client comptoir") : "Client comptoir",
      clientId: c.clientId,
      agent: c.agentId ? (agentsMap.get(c.agentId) ?? "") : "",
      agentId: c.agentId,
      source: c.source,
      nbArticles: countMap.get(c.id) ?? 0,
      soumiseAt: c.soumiseAt,
      valideeAt: c.valideeAt,
    }));

    // Client name filter (JS-side since client names are resolved)
    if (clientQ) {
      const q = clientQ.toLowerCase();
      result = result.filter((c) => c.client.toLowerCase().includes(q));
    }

    // KPIs
    const encaissees = result.filter((c) => c.statut === "validee");
    const totalEncaisse = encaissees.reduce((s, c) => s + c.totalTTC, 0);
    const panierMoyen = encaissees.length > 0 ? Math.round(totalEncaisse / encaissees.length) : 0;

    // Mini bar chart: CA by day (last 7 days of result)
    const caParJour: Record<string, number> = {};
    result.filter((c) => c.statut === "validee").forEach((c) => {
      if (!c.soumiseAt) return;
      const day = new Date(c.soumiseAt).toISOString().slice(0, 10);
      caParJour[day] = (caParJour[day] ?? 0) + c.totalTTC;
    });

    // All unique agents for filter dropdown
    const agentsList = agents.map((a) => ({ id: a.id, nom: a.nom ?? "" }));

    return NextResponse.json({
      commandes: result,
      totalEncaisse,
      panierMoyen,
      nbEncaissees: encaissees.length,
      caParJour,
      agentsList,
    });
  } catch (e) {
    console.error("[api/historique]", e);
    return NextResponse.json({ commandes: [], totalEncaisse: 0, panierMoyen: 0, nbEncaissees: 0, caParJour: {}, agentsList: [] });
  }
}
