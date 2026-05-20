import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, gte, lt, inArray, sql, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const [year, month, day] = dateParam.split("-").map(Number);
  const debut = new Date(year!, month! - 1, day!);
  const fin = new Date(year!, month! - 1, day! + 1);

  try {
    // ── Commandes validées du jour ─────────────────────────────────────────
    const commandes = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        totalHT: schema.commandes.totalHT,
        totalTVA: schema.commandes.totalTVA,
        totalTTC: schema.commandes.totalTTC,
        totalRemise: schema.commandes.totalRemise,
        agentId: schema.commandes.agentId,
        clientId: schema.commandes.clientId,
        valideeAt: schema.commandes.valideeAt,
      })
      .from(schema.commandes)
      .where(
        and(
          eq(schema.commandes.statut, "validee"),
          gte(schema.commandes.valideeAt, debut),
          lt(schema.commandes.valideeAt, fin)
        )
      );

    const commandeIds = commandes.map((c) => c.id);

    // ── Paiements par mode ─────────────────────────────────────────────────
    const paiementsRaw =
      commandeIds.length > 0
        ? await db
            .select({
              mode: schema.paiements.mode,
              montant: sql<number>`SUM(${schema.paiements.montant})`,
              count: sql<number>`COUNT(*)`,
            })
            .from(schema.paiements)
            .innerJoin(schema.factures, eq(schema.factures.id, schema.paiements.factureId))
            .where(inArray(schema.factures.commandeId, commandeIds))
            .groupBy(schema.paiements.mode)
        : [];

    const parMode: Record<string, { montant: number; count: number }> = {};
    for (const p of paiementsRaw) {
      parMode[p.mode] = { montant: Number(p.montant), count: Number(p.count) };
    }

    // ── Lignes vendues → top produits ──────────────────────────────────────
    const lignesVendues =
      commandeIds.length > 0
        ? await db
            .select({
              produitId: schema.lignesCommande.produitId,
              nomProduit: schema.lignesCommande.nomProduit,
              totalQteBase: sql<number>`SUM(${schema.lignesCommande.quantiteBase})`,
              totalTTC: sql<number>`SUM(${schema.lignesCommande.totalTTC})`,
            })
            .from(schema.lignesCommande)
            .where(inArray(schema.lignesCommande.commandeId, commandeIds))
            .groupBy(schema.lignesCommande.produitId, schema.lignesCommande.nomProduit)
            .orderBy(sql`SUM(${schema.lignesCommande.totalTTC}) DESC`)
            .limit(10)
        : [];

    // ── Agents actifs ──────────────────────────────────────────────────────
    const agentIds = [...new Set(commandes.map((c) => c.agentId).filter(Boolean))] as string[];
    const agentsMap = new Map<string, string>();
    if (agentIds.length > 0) {
      const agents = await db
        .select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(inArray(schema.users.id, agentIds));
      for (const a of agents) agentsMap.set(a.id, a.name ?? "");
    }

    const agentsActifs = agentIds.map((id) => ({
      id,
      nom: agentsMap.get(id) ?? id,
      nbCommandes: commandes.filter((c) => c.agentId === id).length,
      ca: commandes.filter((c) => c.agentId === id).reduce((s, c) => s + c.totalTTC, 0),
    }));

    // ── Totaux globaux ─────────────────────────────────────────────────────
    const totalHT = commandes.reduce((s, c) => s + c.totalHT, 0);
    const totalTVA = commandes.reduce((s, c) => s + c.totalTVA, 0);
    const totalTTC = commandes.reduce((s, c) => s + c.totalTTC, 0);
    const totalRemise = commandes.reduce((s, c) => s + c.totalRemise, 0);

    return NextResponse.json({
      date: dateParam,
      nbCommandes: commandes.length,
      totalHT,
      totalTVA,
      totalTTC,
      totalRemise,
      parMode,
      topProduits: lignesVendues.map((l) => ({
        produitId: l.produitId,
        nom: l.nomProduit,
        qteBase: Number(l.totalQteBase),
        ca: Number(l.totalTTC),
      })),
      agentsActifs,
    });
  } catch (e) {
    console.error("[api/caisse/rapport-z]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
