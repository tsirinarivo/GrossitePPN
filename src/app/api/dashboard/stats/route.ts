import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, gte, inArray, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const now = new Date();
    const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── CA + commandes du jour ─────────────────────────────────────────────
    const [statsJour] = await db
      .select({
        caJour: sql<number>`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`,
        nbCommandes: sql<number>`COUNT(*)`,
      })
      .from(schema.commandes)
      .where(
        and(
          eq(schema.commandes.statut, "validee"),
          gte(schema.commandes.valideeAt, debutJour)
        )
      );

    // ── CA hier (pour comparaison) ─────────────────────────────────────────
    const debutHier = new Date(debutJour.getTime() - 86400000);
    const [statsHier] = await db
      .select({
        caHier: sql<number>`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`,
      })
      .from(schema.commandes)
      .where(
        and(
          eq(schema.commandes.statut, "validee"),
          gte(schema.commandes.valideeAt, debutHier),
          sql`${schema.commandes.valideeAt} < ${debutJour.toISOString()}`
        )
      );

    // ── Clients actifs ce mois ─────────────────────────────────────────────
    const clientsActifsRows = await db
      .select({ nbClientsActifs: sql<number>`COUNT(DISTINCT ${schema.commandes.clientId})` })
      .from(schema.commandes)
      .where(
        and(
          inArray(schema.commandes.statut, ["validee", "soumise"]),
          gte(schema.commandes.createdAt, debutMois),
          sql`${schema.commandes.clientId} IS NOT NULL`
        )
      );
    const nbClientsActifs = clientsActifsRows[0]?.nbClientsActifs ?? 0;

    // ── Alertes stock ──────────────────────────────────────────────────────
    const alertesRows = await db
      .select({
        id: schema.produits.id,
        seuilAlerte: schema.produits.seuilAlerte,
        stockBase: sql<number>`COALESCE(SUM(${schema.stocks.quantiteBase}), 0)`,
      })
      .from(schema.produits)
      .leftJoin(schema.stocks, eq(schema.stocks.produitId, schema.produits.id))
      .where(eq(schema.produits.actif, true))
      .groupBy(schema.produits.id);

    const nbAlertes = alertesRows.filter((p) => {
      const s = p.seuilAlerte ?? 0;
      const q = Number(p.stockBase);
      return q <= 0 || (s > 0 && q <= s);
    }).length;

    // ── Activité récente ───────────────────────────────────────────────────
    const commandesRecentes = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        statut: schema.commandes.statut,
        source: schema.commandes.source,
        totalTTC: schema.commandes.totalTTC,
        clientId: schema.commandes.clientId,
        createdAt: schema.commandes.createdAt,
        valideeAt: schema.commandes.valideeAt,
      })
      .from(schema.commandes)
      .where(gte(schema.commandes.createdAt, debutJour))
      .orderBy(desc(schema.commandes.createdAt))
      .limit(10);

    const clientIds = commandesRecentes.map((c) => c.clientId).filter(Boolean) as string[];
    const clientsMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const clients = await db
        .select({ id: schema.clients.id, raisonSociale: schema.clients.raisonSociale })
        .from(schema.clients)
        .where(inArray(schema.clients.id, clientIds));
      for (const c of clients) clientsMap.set(c.id, c.raisonSociale);
    }

    const activiteRecente = commandesRecentes.map((c) => ({
      id: c.id,
      type: c.statut === "validee" ? "paiement" : "commande",
      label: c.clientId ? (clientsMap.get(c.clientId) ?? "Client comptoir") : "Client comptoir",
      montant: c.totalTTC,
      source: c.source === "ecommerce" ? "WEB" : c.source === "pos_agent" ? "POS" : "CAISSE",
      heure: (c.valideeAt ?? c.createdAt)
        ? new Date(c.valideeAt ?? c.createdAt!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "--:--",
    }));

    // ── Commandes en attente à la caisse ──────────────────────────────────
    const enAttenteRows = await db
      .select({ nbEnAttente: sql<number>`COUNT(*)` })
      .from(schema.commandes)
      .where(eq(schema.commandes.statut, "soumise"));
    const nbEnAttente = enAttenteRows[0]?.nbEnAttente ?? 0;

    const caJour = Number(statsJour?.caJour ?? 0);
    const caHier = Number(statsHier?.caHier ?? 0);
    const evolution = caHier > 0 ? Math.round(((caJour - caHier) / caHier) * 1000) / 10 : null;

    return NextResponse.json({
      caJour,
      caHier,
      evolution,
      nbCommandes: Number(statsJour?.nbCommandes ?? 0),
      nbClientsActifs: Number(nbClientsActifs ?? 0),
      nbAlertes,
      nbEnAttente: Number(nbEnAttente ?? 0),
      activiteRecente,
    });
  } catch (e) {
    console.error("[api/dashboard/stats]", e);
    return NextResponse.json({
      caJour: 0, caHier: 0, evolution: null,
      nbCommandes: 0, nbClientsActifs: 0, nbAlertes: 0, nbEnAttente: 0,
      activiteRecente: [],
    });
  }
}
