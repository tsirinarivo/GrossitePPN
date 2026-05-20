import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const DEMO_CLIENTS = [
  { clientId: "demo-1", raisonSociale: "Épicerie Centrale Tana", code: "CLI001", palier: "gros", ville: "Antananarivo", nbCommandes: 24, caTTC: 18_500_000, panierMoyen: 770_833, derniereCommande: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { clientId: "demo-2", raisonSociale: "Commerce Rakotondrabe", code: "CLI002", palier: "demi_gros", ville: "Antananarivo", nbCommandes: 18, caTTC: 12_300_000, panierMoyen: 683_333, derniereCommande: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { clientId: "demo-3", raisonSociale: "Supérette du Port", code: "CLI003", palier: "gros", ville: "Tamatave", nbCommandes: 15, caTTC: 9_750_000, panierMoyen: 650_000, derniereCommande: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { clientId: "demo-4", raisonSociale: "Marché Analakely SARL", code: "CLI004", palier: "detail", ville: "Antananarivo", nbCommandes: 8, caTTC: 4_200_000, panierMoyen: 525_000, derniereCommande: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
  { clientId: "demo-5", raisonSociale: "GMS Mahajanga", code: "CLI005", palier: "gros", ville: "Mahajanga", nbCommandes: 12, caTTC: 8_900_000, panierMoyen: 741_667, derniereCommande: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { clientId: "demo-6", raisonSociale: "Boutique Fiana Express", code: "CLI006", palier: "demi_gros", ville: "Fianarantsoa", nbCommandes: 6, caTTC: 3_100_000, panierMoyen: 516_667, derniereCommande: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString() },
  { clientId: "demo-7", raisonSociale: "Ravitaillement Côte Est", code: "CLI007", palier: "gros", ville: "Tamatave", nbCommandes: 9, caTTC: 6_450_000, panierMoyen: 716_667, derniereCommande: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString() },
  { clientId: "demo-8", raisonSociale: "Mini-Marché Rasoamanarivo", code: "CLI008", palier: "detail", ville: "Antananarivo", nbCommandes: 3, caTTC: 1_200_000, panierMoyen: 400_000, derniereCommande: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() },
];

function scoreRecence(daysSinceLastOrder: number): number {
  if (daysSinceLastOrder < 7) return 5;
  if (daysSinceLastOrder < 30) return 4;
  if (daysSinceLastOrder < 60) return 3;
  if (daysSinceLastOrder < 90) return 2;
  return 1;
}

function scoreFrequence(nbCommandes: number): number {
  if (nbCommandes >= 10) return 5;
  if (nbCommandes >= 5) return 4;
  if (nbCommandes >= 3) return 3;
  if (nbCommandes >= 2) return 2;
  return 1;
}

function computeRFM(rows: Array<{
  clientId: string | null;
  raisonSociale: string;
  code: string;
  palier: string | null;
  ville: string | null;
  nbCommandes: number;
  caTTC: number;
  panierMoyen: number;
  derniereCommande: string;
}>) {
  const now = Date.now();
  const n = rows.length;

  // Rank by CA for Montant score
  const sorted = [...rows].sort((a, b) => Number(b.caTTC) - Number(a.caTTC));
  const rankMap = new Map<string, number>();
  sorted.forEach((r, i) => {
    rankMap.set(r.clientId ?? i.toString(), i + 1);
  });

  return rows.map((r) => {
    const daysSince = Math.floor((now - new Date(r.derniereCommande).getTime()) / (1000 * 60 * 60 * 24));
    const rank = rankMap.get(r.clientId ?? "") ?? n;
    const pct = rank / n;

    const recence = scoreRecence(daysSince);
    const frequence = scoreFrequence(Number(r.nbCommandes));
    const montant = pct <= 0.2 ? 5 : pct <= 0.4 ? 4 : pct <= 0.6 ? 3 : pct <= 0.8 ? 2 : 1;

    const rfmScore = recence + frequence + montant;
    const segment =
      rfmScore >= 12 ? "Champions" :
      rfmScore >= 9 ? "Fidèles" :
      rfmScore >= 6 ? "Potentiel" :
      "À risque";

    return {
      ...r,
      nbCommandes: Number(r.nbCommandes),
      caTTC: Number(r.caTTC),
      panierMoyen: Number(r.panierMoyen),
      rfmScore,
      recence,
      frequence,
      montant,
      segment,
      daysSinceLastOrder: daysSince,
    };
  });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") ?? "mois";

  const now = new Date();
  let debutPeriode: Date;
  if (periode === "trimestre") {
    const quarter = Math.floor(now.getMonth() / 3);
    debutPeriode = new Date(now.getFullYear(), quarter * 3, 1);
  } else if (periode === "annee") {
    debutPeriode = new Date(now.getFullYear(), 0, 1);
  } else {
    // mois (default)
    debutPeriode = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  try {
    const rows = await db.select({
      clientId: schema.commandes.clientId,
      raisonSociale: schema.clients.raisonSociale,
      code: schema.clients.code,
      palier: schema.clients.palier,
      ville: schema.clients.zoneTournee,
      nbCommandes: sql<number>`COUNT(*)`,
      caTTC: sql<number>`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`,
      panierMoyen: sql<number>`COALESCE(AVG(${schema.commandes.totalTTC}), 0)`,
      derniereCommande: sql<string>`MAX(${schema.commandes.createdAt})`,
    }).from(schema.commandes)
      .innerJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
      .where(and(
        inArray(schema.commandes.statut, ["validee", "preparee", "en_livraison", "livree", "partiellement_livree"] as const),
        gte(schema.commandes.createdAt, debutPeriode)
      ))
      .groupBy(schema.commandes.clientId, schema.clients.raisonSociale, schema.clients.code, schema.clients.palier, schema.clients.zoneTournee)
      .orderBy(desc(sql`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`))
      .limit(50);

    if (rows.length === 0) {
      const clients = computeRFM(DEMO_CLIENTS as Parameters<typeof computeRFM>[0]);
      const champions = clients.filter((c) => c.segment === "Champions");
      const totaux = {
        nbClients: clients.length,
        caTTC: clients.reduce((s, c) => s + c.caTTC, 0),
        panierMoyen: Math.round(clients.reduce((s, c) => s + c.panierMoyen, 0) / clients.length),
      };
      return NextResponse.json({
        clients,
        totaux,
        periode,
        demo: true,
        pctChampions: Math.round((champions.length / clients.length) * 100),
      });
    }

    const clients = computeRFM(rows.map((r) => ({
      clientId: r.clientId,
      raisonSociale: r.raisonSociale,
      code: r.code,
      palier: r.palier,
      ville: r.ville,
      nbCommandes: Number(r.nbCommandes),
      caTTC: Number(r.caTTC),
      panierMoyen: Number(r.panierMoyen),
      derniereCommande: String(r.derniereCommande),
    })));

    const champions = clients.filter((c) => c.segment === "Champions");
    const totaux = {
      nbClients: clients.length,
      caTTC: clients.reduce((s, c) => s + c.caTTC, 0),
      panierMoyen: clients.length > 0 ? Math.round(clients.reduce((s, c) => s + c.panierMoyen, 0) / clients.length) : 0,
    };

    return NextResponse.json({
      clients,
      totaux,
      periode,
      pctChampions: clients.length > 0 ? Math.round((champions.length / clients.length) * 100) : 0,
    });
  } catch (error) {
    console.error("[GET /api/rapports/clients]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
