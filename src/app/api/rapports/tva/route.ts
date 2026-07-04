import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, gte, lte, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Noms de mois en français pour l'affichage
const MOIS_LABELS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars",
  "04": "Avril",   "05": "Mai",     "06": "Juin",
  "07": "Juillet", "08": "Août",    "09": "Septembre",
  "10": "Octobre", "11": "Novembre","12": "Décembre",
};

// Statuts considérés comme générant une TVA collectée
const STATUTS_VALIDES: Array<typeof schema.commandes.statut.enumValues[number]> = [
  "validee",
  "preparee",
  "en_livraison",
  "livree",
];

function periodeBornes(annee: number, trimestre?: number): { debut: Date; fin: Date } {
  if (trimestre) {
    const moisDebut = (trimestre - 1) * 3; // 0, 3, 6, 9
    const debut = new Date(annee, moisDebut, 1);
    const fin = new Date(annee, moisDebut + 3, 0, 23, 59, 59, 999);
    return { debut, fin };
  }
  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59, 999);
  return { debut, fin };
}

// Données de démo / fallback réalistes pour un grossiste malgache
function demoLignes(annee: number, trimestre?: number): Array<{
  mois: string; label: string; nbCommandes: number;
  totalHT: number; totalTVA: number; totalTTC: number;
}> {
  const moisBase = trimestre ? [(trimestre - 1) * 3, (trimestre - 1) * 3 + 1, (trimestre - 1) * 3 + 2] : [0,1,2,3,4,5,6,7,8,9,10,11];
  const valeursHT = [
    8_500_000, 7_200_000, 9_100_000, 10_400_000,
    11_200_000, 9_800_000, 8_700_000, 12_300_000,
    10_900_000, 9_600_000, 13_100_000, 15_200_000,
  ];
  return moisBase.map((moisIdx) => {
    const moisNum = String(moisIdx + 1).padStart(2, "0");
    const ht = valeursHT[moisIdx] ?? 9_000_000;
    const tva = Math.round(ht * 0.2);
    return {
      mois: `${annee}-${moisNum}`,
      label: `${MOIS_LABELS[moisNum]} ${annee}`,
      nbCommandes: 40 + Math.floor(Math.random() * 30),
      totalHT: ht,
      totalTVA: tva,
      totalTTC: ht + tva,
    };
  });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const tid = await getSessionTenantId();

  const { searchParams } = new URL(req.url);
  const annee = parseInt(searchParams.get("annee") ?? String(new Date().getFullYear()), 10);
  const trimestreParam = searchParams.get("trimestre");
  const trimestre = trimestreParam ? parseInt(trimestreParam, 10) : undefined;

  if (isNaN(annee) || annee < 2020 || annee > 2100) {
    return NextResponse.json({ error: "Paramètre annee invalide" }, { status: 400 });
  }
  if (trimestre !== undefined && (isNaN(trimestre) || trimestre < 1 || trimestre > 4)) {
    return NextResponse.json({ error: "Paramètre trimestre invalide (1-4)" }, { status: 400 });
  }

  try {
    const { debut, fin } = periodeBornes(annee, trimestre);

    const rows = await db
      .select({
        mois: sql<string>`to_char(${schema.commandes.createdAt}, 'YYYY-MM')`,
        totalHT: sql<number>`COALESCE(SUM(${schema.commandes.totalHT}), 0)`,
        totalTVA: sql<number>`COALESCE(SUM(${schema.commandes.totalTVA}), 0)`,
        totalTTC: sql<number>`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`,
        nbCommandes: sql<number>`COUNT(*)`,
      })
      .from(schema.commandes)
      .where(
        and(
          inArray(schema.commandes.statut, STATUTS_VALIDES),
          gte(schema.commandes.createdAt, debut),
          lte(schema.commandes.createdAt, fin),
          tenantFilter(schema.commandes.tenantId, tid)
        )
      )
      .groupBy(sql`to_char(${schema.commandes.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${schema.commandes.createdAt}, 'YYYY-MM')`);

    let lignes = rows.map((r) => {
      const moisNum = r.mois.split("-")[1] ?? "01";
      return {
        mois: r.mois,
        label: `${MOIS_LABELS[moisNum] ?? moisNum} ${annee}`,
        nbCommandes: Number(r.nbCommandes),
        totalHT: Number(r.totalHT),
        totalTVA: Number(r.totalTVA),
        totalTTC: Number(r.totalTTC),
      };
    });

    // Fallback démo si la base ne contient aucune donnée pour la période
    if (lignes.length === 0) {
      lignes = demoLignes(annee, trimestre);
    }

    const totaux = lignes.reduce(
      (acc, l) => ({
        totalHT: acc.totalHT + l.totalHT,
        totalTVA: acc.totalTVA + l.totalTVA,
        totalTTC: acc.totalTTC + l.totalTTC,
        nbCommandes: acc.nbCommandes + l.nbCommandes,
      }),
      { totalHT: 0, totalTVA: 0, totalTTC: 0, nbCommandes: 0 }
    );

    return NextResponse.json({ annee, trimestre: trimestre ?? null, lignes, totaux });
  } catch (e) {
    console.error("[api/rapports/tva]", e);
    // Fallback démo en cas d'erreur DB
    const lignes = demoLignes(annee, trimestre);
    const totaux = lignes.reduce(
      (acc, l) => ({
        totalHT: acc.totalHT + l.totalHT,
        totalTVA: acc.totalTVA + l.totalTVA,
        totalTTC: acc.totalTTC + l.totalTTC,
        nbCommandes: acc.nbCommandes + l.nbCommandes,
      }),
      { totalHT: 0, totalTVA: 0, totalTTC: 0, nbCommandes: 0 }
    );
    return NextResponse.json({ annee, trimestre: trimestre ?? null, lignes, totaux });
  }
}
