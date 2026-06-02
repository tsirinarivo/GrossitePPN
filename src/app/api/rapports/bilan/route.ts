import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function moisRange(mois: string): { start: Date; end: Date } {
  const [y, m] = mois.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, 1);
  const end = new Date(y!, m ?? 1, 1);
  return { start, end };
}

function buildDemo(mois: string) {
  return {
    mois,
    caHT: 248_500_000,
    caTTC: 298_200_000,
    tva: 49_700_000,
    achats: 156_300_000,
    margeBrute: 92_200_000,
    chargesTotales: 24_800_000,
    chargesParCategorie: [
      { categorie: "personnel", montant: 14_200_000 },
      { categorie: "loyer", montant: 4_500_000 },
      { categorie: "energie", montant: 2_100_000 },
      { categorie: "fournitures", montant: 1_800_000 },
      { categorie: "marketing", montant: 1_400_000 },
      { categorie: "autre", montant: 800_000 },
    ],
    resultat: 67_400_000,
    nbCommandes: 412,
    demo: true,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const mois = new URL(req.url).searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);
  const { start, end } = moisRange(mois);

  try {
    // Ventes
    const ventes = await db
      .select({
        caHT: sql<number>`COALESCE(SUM(${schema.commandes.totalHT}), 0)`,
        caTTC: sql<number>`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`,
        tva: sql<number>`COALESCE(SUM(${schema.commandes.totalTVA}), 0)`,
        nb: sql<number>`COUNT(${schema.commandes.id})`,
      })
      .from(schema.commandes)
      .where(and(
        gte(schema.commandes.createdAt, start),
        lt(schema.commandes.createdAt, end),
        eq(schema.commandes.statut, "validee")
      ));

    // Achats
    const achats = await db
      .select({
        achats: sql<number>`COALESCE(SUM(${schema.bonsCommande.totalHT}), 0)`,
      })
      .from(schema.bonsCommande)
      .where(and(
        gte(schema.bonsCommande.createdAt, start),
        lt(schema.bonsCommande.createdAt, end)
      ));

    // Charges
    const charges = await db
      .select({
        categorie: schema.chargesOperationnelles.categorie,
        total: sql<number>`COALESCE(SUM(${schema.chargesOperationnelles.montant}), 0)`,
      })
      .from(schema.chargesOperationnelles)
      .where(eq(schema.chargesOperationnelles.mois, mois))
      .groupBy(schema.chargesOperationnelles.categorie);

    const caHT = Number(ventes[0]?.caHT ?? 0);
    const caTTC = Number(ventes[0]?.caTTC ?? 0);
    const tva = Number(ventes[0]?.tva ?? 0);
    const nbCommandes = Number(ventes[0]?.nb ?? 0);
    const achatsHT = Number(achats[0]?.achats ?? 0);
    const chargesParCategorie = charges.map((c) => ({ categorie: c.categorie, montant: Number(c.total ?? 0) }));
    const chargesTotales = chargesParCategorie.reduce((s, c) => s + c.montant, 0);

    if (caHT === 0 && achatsHT === 0 && chargesTotales === 0) {
      return NextResponse.json(buildDemo(mois));
    }

    const margeBrute = caHT - achatsHT;
    const resultat = margeBrute - chargesTotales;

    return NextResponse.json({
      mois,
      caHT, caTTC, tva,
      achats: achatsHT,
      margeBrute,
      chargesTotales,
      chargesParCategorie,
      resultat,
      nbCommandes,
      demo: false,
    });
  } catch {
    return NextResponse.json(buildDemo(mois));
  }
}
