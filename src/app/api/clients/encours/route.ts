import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, gt, sql, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Returns clients with outstanding credit, bucketed by age (based on dernierAchat)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const clients = await db
      .select({
        id: schema.clients.id,
        code: schema.clients.code,
        raisonSociale: schema.clients.raisonSociale,
        telephone: schema.clients.telephone,
        palier: schema.clients.palier,
        plafondCredit: schema.clients.plafondCredit,
        encoursCourant: schema.clients.encoursCourant,
        dernierAchat: schema.clients.dernierAchat,
        agentId: schema.clients.agentId,
        creditAutorise: schema.clients.creditAutorise,
      })
      .from(schema.clients)
      .where(
        and(
          eq(schema.clients.creditAutorise, true),
          gt(schema.clients.encoursCourant, 0)
        )
      )
      .orderBy(sql`${schema.clients.encoursCourant} DESC`);

    const now = Date.now();

    const agentIds = [...new Set(clients.map((c) => c.agentId).filter(Boolean))] as string[];
    const agentsMap = new Map<string, string>();
    if (agentIds.length > 0) {
      const agents = await db
        .select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(sql`${schema.users.id} = ANY(ARRAY[${sql.join(agentIds.map((id) => sql`${id}`), sql`, `)}])`);
      for (const a of agents) agentsMap.set(a.id, a.name ?? "");
    }

    const enriched = clients.map((c) => {
      const joursDepuis = c.dernierAchat
        ? Math.floor((now - new Date(c.dernierAchat).getTime()) / 86400000)
        : null;

      let tranche: "0-30" | "31-60" | "61-90" | "90+" = "0-30";
      if (joursDepuis === null || joursDepuis > 90) tranche = "90+";
      else if (joursDepuis > 60) tranche = "61-90";
      else if (joursDepuis > 30) tranche = "31-60";

      return {
        id: c.id,
        code: c.code,
        raisonSociale: c.raisonSociale,
        telephone: c.telephone,
        palier: c.palier,
        plafondCredit: c.plafondCredit,
        encoursCourant: c.encoursCourant,
        creditDisponible: Math.max(0, c.plafondCredit - c.encoursCourant),
        utilisationPct: c.plafondCredit > 0
          ? Math.round((c.encoursCourant / c.plafondCredit) * 100)
          : 100,
        dernierAchat: c.dernierAchat,
        joursDepuis,
        tranche,
        agentNom: c.agentId ? (agentsMap.get(c.agentId) ?? "") : "",
      };
    });

    const totalEncours = enriched.reduce((s, c) => s + c.encoursCourant, 0);
    const par0_30 = enriched.filter((c) => c.tranche === "0-30").reduce((s, c) => s + c.encoursCourant, 0);
    const par31_60 = enriched.filter((c) => c.tranche === "31-60").reduce((s, c) => s + c.encoursCourant, 0);
    const par61_90 = enriched.filter((c) => c.tranche === "61-90").reduce((s, c) => s + c.encoursCourant, 0);
    const par90plus = enriched.filter((c) => c.tranche === "90+").reduce((s, c) => s + c.encoursCourant, 0);

    return NextResponse.json({
      clients: enriched,
      stats: {
        totalEncours,
        nbClients: enriched.length,
        par0_30,
        par31_60,
        par61_90,
        par90plus,
      },
    });
  } catch (e) {
    console.error("[api/clients/encours]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
