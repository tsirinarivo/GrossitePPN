import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, gte, lte, inArray, sql, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isDemoFallbackEnabled } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

const MOIS_LABELS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars",
  "04": "Avril", "05": "Mai", "06": "Juin",
  "07": "Juillet", "08": "Août", "09": "Septembre",
  "10": "Octobre", "11": "Novembre", "12": "Décembre",
};

const STATUTS_CA: Array<typeof schema.commandes.statut.enumValues[number]> = [
  "validee", "preparee", "en_livraison", "livree",
];

type MoisBilan = {
  mois: string;       // "YYYY-MM"
  label: string;
  caHT: number;
  caTTC: number;
  nbCommandes: number;
  achatsHT: number;
  achatsTTC: number;
  charges: number;
  resultat: number;
  margeBrute: number;
  margeBrutePct: number;
};

function demoBilan(annee: number): MoisBilan[] {
  const tendances = [
    { ca: 18_500_000, achats: 11_000_000, charges: 3_800_000 },
    { ca: 21_200_000, achats: 12_800_000, charges: 3_900_000 },
    { ca: 24_500_000, achats: 14_500_000, charges: 4_100_000 },
    { ca: 22_000_000, achats: 13_200_000, charges: 4_000_000 },
    { ca: 25_800_000, achats: 15_200_000, charges: 4_300_000 },
    { ca: 28_300_000, achats: 16_500_000, charges: 4_500_000 },
    { ca: 26_700_000, achats: 15_800_000, charges: 4_400_000 },
    { ca: 24_900_000, achats: 14_700_000, charges: 4_200_000 },
    { ca: 27_500_000, achats: 16_200_000, charges: 4_500_000 },
    { ca: 30_400_000, achats: 17_900_000, charges: 4_800_000 },
    { ca: 33_200_000, achats: 19_500_000, charges: 5_100_000 },
    { ca: 36_800_000, achats: 21_500_000, charges: 5_500_000 },
  ];
  return tendances.map((t, i) => {
    const mois = String(i + 1).padStart(2, "0");
    const caHT = Math.round(t.ca / 1.2);
    const achatsHT = Math.round(t.achats / 1.2);
    const margeBrute = caHT - achatsHT;
    const resultat = margeBrute - t.charges;
    return {
      mois: `${annee}-${mois}`,
      label: `${MOIS_LABELS[mois] ?? mois} ${annee}`,
      caHT,
      caTTC: t.ca,
      nbCommandes: 80 + i * 5,
      achatsHT,
      achatsTTC: t.achats,
      charges: t.charges,
      resultat,
      margeBrute,
      margeBrutePct: caHT > 0 ? Math.round((margeBrute / caHT) * 100) : 0,
    };
  });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const annee = Number(searchParams.get("annee") ?? new Date().getFullYear());

  try {
    const debut = new Date(annee, 0, 1);
    const fin = new Date(annee, 11, 31, 23, 59, 59, 999);

    // CA mensuel
    const caRows = await db
      .select({
        mois: sql<string>`to_char(${schema.commandes.soumiseAt}, 'YYYY-MM')`,
        nbCommandes: sql<number>`count(*)::int`,
        caHT: sql<number>`coalesce(sum(${schema.commandes.totalHT}), 0)::bigint`,
        caTTC: sql<number>`coalesce(sum(${schema.commandes.totalTTC}), 0)::bigint`,
      })
      .from(schema.commandes)
      .where(
        and(
          inArray(schema.commandes.statut, STATUTS_CA),
          gte(schema.commandes.soumiseAt, debut),
          lte(schema.commandes.soumiseAt, fin)
        )
      )
      .groupBy(sql`to_char(${schema.commandes.soumiseAt}, 'YYYY-MM')`);

    // Achats mensuels (basé sur bonsCommande recu)
    const achatsRows = await db
      .select({
        mois: sql<string>`to_char(${schema.bonsCommande.dateReceptionEffective}, 'YYYY-MM')`,
        achatsHT: sql<number>`coalesce(sum(${schema.bonsCommande.totalHT}), 0)::bigint`,
        achatsTTC: sql<number>`coalesce(sum(${schema.bonsCommande.totalTTC}), 0)::bigint`,
      })
      .from(schema.bonsCommande)
      .where(
        and(
          eq(schema.bonsCommande.statut, "recu"),
          gte(schema.bonsCommande.dateReceptionEffective, debut),
          lte(schema.bonsCommande.dateReceptionEffective, fin)
        )
      )
      .groupBy(sql`to_char(${schema.bonsCommande.dateReceptionEffective}, 'YYYY-MM')`);

    // Charges mensuelles
    const chargesRows = await db
      .select({
        mois: schema.chargesOperationnelles.mois,
        total: sql<number>`coalesce(sum(${schema.chargesOperationnelles.montant}), 0)::bigint`,
      })
      .from(schema.chargesOperationnelles)
      .where(
        and(
          gte(schema.chargesOperationnelles.mois, `${annee}-01`),
          lte(schema.chargesOperationnelles.mois, `${annee}-12`)
        )
      )
      .groupBy(schema.chargesOperationnelles.mois);

    const caMap = new Map(caRows.map((r) => [r.mois, r]));
    const achatsMap = new Map(achatsRows.map((r) => [r.mois, r]));
    const chargesMap = new Map(chargesRows.map((r) => [r.mois, Number(r.total)]));

    const mois: MoisBilan[] = [];
    let totalCa = 0;

    for (let m = 1; m <= 12; m++) {
      const ms = String(m).padStart(2, "0");
      const key = `${annee}-${ms}`;
      const ca = caMap.get(key);
      const ach = achatsMap.get(key);
      const charges = chargesMap.get(key) ?? 0;
      const caHT = Number(ca?.caHT ?? 0);
      const caTTC = Number(ca?.caTTC ?? 0);
      const achatsHT = Number(ach?.achatsHT ?? 0);
      const achatsTTC = Number(ach?.achatsTTC ?? 0);
      const margeBrute = caHT - achatsHT;
      const resultat = margeBrute - charges;

      mois.push({
        mois: key,
        label: `${MOIS_LABELS[ms] ?? ms} ${annee}`,
        caHT,
        caTTC,
        nbCommandes: Number(ca?.nbCommandes ?? 0),
        achatsHT,
        achatsTTC,
        charges,
        resultat,
        margeBrute,
        margeBrutePct: caHT > 0 ? Math.round((margeBrute / caHT) * 100) : 0,
      });

      totalCa += caHT;
    }

    if (totalCa === 0) {
      if (isDemoFallbackEnabled()) {
        return NextResponse.json({ mois: demoBilan(annee), isDemo: true, annee });
      }
      return NextResponse.json({ mois, isDemo: false, annee });
    }

    return NextResponse.json({ mois, isDemo: false, annee });
  } catch {
    if (isDemoFallbackEnabled()) {
      return NextResponse.json({ mois: demoBilan(annee), isDemo: true, annee });
    }
    return NextResponse.json({ mois: [], isDemo: false, annee, error: "Erreur de chargement" });
  }
}
