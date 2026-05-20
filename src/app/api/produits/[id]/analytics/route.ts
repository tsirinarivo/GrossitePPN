import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, gte, desc, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    // Ventes par semaine (13 dernières semaines)
    const treizeSemainesAgo = new Date();
    treizeSemainesAgo.setDate(treizeSemainesAgo.getDate() - 91);

    const ventesHebdo = await db
      .select({
        semaine: sql<string>`to_char(date_trunc('week', ${schema.commandes.valideeAt}), 'YYYY-WW')`,
        qteBase: sql<number>`SUM(${schema.lignesCommande.quantiteBase})`,
        ca: sql<number>`SUM(${schema.lignesCommande.totalHT})`,
        nbCommandes: sql<number>`COUNT(*)`,
      })
      .from(schema.lignesCommande)
      .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
      .where(and(
        eq(schema.lignesCommande.produitId, id),
        eq(schema.commandes.statut, "validee"),
        gte(schema.commandes.valideeAt, treizeSemainesAgo),
      ))
      .groupBy(sql`date_trunc('week', ${schema.commandes.valideeAt})`)
      .orderBy(sql`date_trunc('week', ${schema.commandes.valideeAt})`);

    // Stock par dépôt
    const stocksDepots = await db
      .select({
        depotId: schema.stocks.depotId,
        quantiteBase: schema.stocks.quantiteBase,
        nomDepot: schema.depots.nom,
      })
      .from(schema.stocks)
      .innerJoin(schema.depots, eq(schema.depots.id, schema.stocks.depotId))
      .where(eq(schema.stocks.produitId, id));

    // Derniers mouvements (30 dernier)
    const mouvements = await db
      .select({
        id: schema.mouvementsStock.id,
        type: schema.mouvementsStock.type,
        quantiteBase: schema.mouvementsStock.quantiteBase,
        quantiteAvant: schema.mouvementsStock.quantiteAvant,
        quantiteApres: schema.mouvementsStock.quantiteApres,
        reference: schema.mouvementsStock.reference,
        notes: schema.mouvementsStock.notes,
        createdAt: schema.mouvementsStock.createdAt,
        userId: schema.mouvementsStock.userId,
        depotId: schema.mouvementsStock.depotId,
      })
      .from(schema.mouvementsStock)
      .where(eq(schema.mouvementsStock.produitId, id))
      .orderBy(desc(schema.mouvementsStock.createdAt))
      .limit(30);

    // Résoudre noms agents
    const userIds = [...new Set(mouvements.map((m) => m.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
      ? await db.select({ id: schema.users.id, nom: schema.users.name }).from(schema.users).where(inArray(schema.users.id, userIds))
      : [];
    const usersMap = new Map(users.map((u) => [u.id, u.nom ?? ""]));

    // Résoudre noms dépôts mouvements
    const depotIds = [...new Set(mouvements.map((m) => m.depotId))];
    const depots = depotIds.length > 0
      ? await db.select({ id: schema.depots.id, nom: schema.depots.nom }).from(schema.depots).where(inArray(schema.depots.id, depotIds))
      : [];
    const depotsMap = new Map(depots.map((d) => [d.id, d.nom]));

    // KPIs globaux sur 30 jours
    const trenteJoursAgo = new Date(); trenteJoursAgo.setDate(trenteJoursAgo.getDate() - 30);
    const [kpi] = await db
      .select({
        qteTotale: sql<number>`COALESCE(SUM(${schema.lignesCommande.quantiteBase}), 0)`,
        caTotale: sql<number>`COALESCE(SUM(${schema.lignesCommande.totalHT}), 0)`,
        nbCommandes: sql<number>`COUNT(*)`,
      })
      .from(schema.lignesCommande)
      .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
      .where(and(
        eq(schema.lignesCommande.produitId, id),
        eq(schema.commandes.statut, "validee"),
        gte(schema.commandes.valideeAt, trenteJoursAgo),
      ));

    return NextResponse.json({
      ventesHebdo: ventesHebdo.map((v) => ({
        semaine: v.semaine,
        qteBase: Number(v.qteBase),
        ca: Number(v.ca),
        nbCommandes: Number(v.nbCommandes),
      })),
      stocksDepots: stocksDepots.map((s) => ({
        depotId: s.depotId,
        nomDepot: s.nomDepot,
        quantiteBase: s.quantiteBase,
      })),
      mouvements: mouvements.map((m) => ({
        ...m,
        agentNom: m.userId ? (usersMap.get(m.userId) ?? "") : "",
        nomDepot: depotsMap.get(m.depotId) ?? m.depotId,
      })),
      kpi30j: {
        qteTotale: Number(kpi?.qteTotale ?? 0),
        caTotale: Number(kpi?.caTotale ?? 0),
        nbCommandes: Number(kpi?.nbCommandes ?? 0),
      },
    });
  } catch (e) {
    console.error("[api/produits/[id]/analytics]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
