import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type FournisseurStat = {
  id: string;
  nom: string;
  ville: string | null;
  contact: string | null;
  telephone: string | null;
  nbBC: number;
  totalAchats: number;
  totalRecu: number;
  delaiMoyenJours: number | null;
  tauxConformite: number | null; // 0-100
  retardsCount: number;
  tauxRetard: number | null; // 0-100
};

const DEMO: FournisseurStat[] = [
  {
    id: "demo-1",
    nom: "Riz du Bétsibôka",
    ville: "Mahajanga",
    contact: "Rabe",
    telephone: "+261 32 04 11 11",
    nbBC: 14,
    totalAchats: 142_500_000,
    totalRecu: 138_000_000,
    delaiMoyenJours: 4.2,
    tauxConformite: 97,
    retardsCount: 1,
    tauxRetard: 7,
  },
  {
    id: "demo-2",
    nom: "Huileries Itasy",
    ville: "Antananarivo",
    contact: "Ranja",
    telephone: "+261 34 12 33 22",
    nbBC: 9,
    totalAchats: 78_200_000,
    totalRecu: 75_000_000,
    delaiMoyenJours: 5.8,
    tauxConformite: 96,
    retardsCount: 2,
    tauxRetard: 22,
  },
  {
    id: "demo-3",
    nom: "Sucrerie de Brickaville",
    ville: "Toamasina",
    contact: "Naina",
    telephone: "+261 32 88 14 90",
    nbBC: 7,
    totalAchats: 54_700_000,
    totalRecu: 49_500_000,
    delaiMoyenJours: 7.4,
    tauxConformite: 90,
    retardsCount: 3,
    tauxRetard: 43,
  },
  {
    id: "demo-4",
    nom: "Conserves Antsirabe",
    ville: "Antsirabe",
    contact: "Aina",
    telephone: "+261 34 56 22 11",
    nbBC: 5,
    totalAchats: 28_400_000,
    totalRecu: 28_400_000,
    delaiMoyenJours: 3.2,
    tauxConformite: 100,
    retardsCount: 0,
    tauxRetard: 0,
  },
];

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const periode = new URL(req.url).searchParams.get("periode") ?? "3mois";

  const now = new Date();
  let debut: Date;
  if (periode === "mois") {
    debut = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (periode === "annee") {
    debut = new Date(now.getFullYear(), 0, 1);
  } else if (periode === "12mois") {
    debut = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  } else {
    // 3mois par défaut
    debut = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  }

  try {
    const bcsRows = await db
      .select({
        id: schema.bonsCommande.id,
        fournisseurId: schema.bonsCommande.fournisseurId,
        statut: schema.bonsCommande.statut,
        totalTTC: schema.bonsCommande.totalTTC,
        dateCommande: schema.bonsCommande.dateCommande,
        dateLivraisonPrevue: schema.bonsCommande.dateLivraisonPrevue,
        dateReceptionEffective: schema.bonsCommande.dateReceptionEffective,
      })
      .from(schema.bonsCommande)
      .where(gte(schema.bonsCommande.createdAt, debut));

    if (bcsRows.length === 0) {
      return NextResponse.json({ fournisseurs: DEMO, isDemo: true });
    }

    // Fournisseurs concernés
    const fournIds = Array.from(new Set(bcsRows.map((b) => b.fournisseurId)));
    const fournRows = await db
      .select()
      .from(schema.fournisseurs)
      .where(inArray(schema.fournisseurs.id, fournIds));

    const fournMap = new Map(fournRows.map((f) => [f.id, f]));

    // Pour chaque BC reçu : conformité = quantite_recue / quantite_commandee (par ligne)
    const bcIds = bcsRows.map((b) => b.id);
    const lignes = bcIds.length > 0
      ? await db
          .select({
            bcId: schema.lignesBonCommande.bonCommandeId,
            qteCommandee: schema.lignesBonCommande.quantiteCommandee,
            qteRecue: schema.lignesBonCommande.quantiteRecue,
          })
          .from(schema.lignesBonCommande)
          .where(inArray(schema.lignesBonCommande.bonCommandeId, bcIds))
      : [];

    const conformiteParBC = new Map<string, { sumCmd: number; sumRecu: number }>();
    for (const l of lignes) {
      const cur = conformiteParBC.get(l.bcId) ?? { sumCmd: 0, sumRecu: 0 };
      cur.sumCmd += Number(l.qteCommandee) || 0;
      cur.sumRecu += Number(l.qteRecue) || 0;
      conformiteParBC.set(l.bcId, cur);
    }

    // Agrégation par fournisseur
    type Agg = {
      nbBC: number;
      totalAchats: number;
      totalRecu: number;
      delaiSum: number;
      delaiCount: number;
      retardsCount: number;
      receptionsCount: number;
      conformiteSum: number;
      conformiteCount: number;
    };

    const agg = new Map<string, Agg>();

    for (const bc of bcsRows) {
      const a = agg.get(bc.fournisseurId) ?? {
        nbBC: 0,
        totalAchats: 0,
        totalRecu: 0,
        delaiSum: 0,
        delaiCount: 0,
        retardsCount: 0,
        receptionsCount: 0,
        conformiteSum: 0,
        conformiteCount: 0,
      };
      a.nbBC += 1;
      a.totalAchats += bc.totalTTC ?? 0;

      const isRecu = bc.statut === "recu" || bc.statut === "partiellement_recu";
      if (isRecu && bc.dateReceptionEffective && bc.dateCommande) {
        const reception = new Date(bc.dateReceptionEffective).getTime();
        const commande = new Date(bc.dateCommande).getTime();
        const delai = Math.max(0, (reception - commande) / 86400000);
        a.delaiSum += delai;
        a.delaiCount += 1;
        a.receptionsCount += 1;
        a.totalRecu += bc.totalTTC ?? 0;

        // Retard ?
        if (bc.dateLivraisonPrevue) {
          const prevue = new Date(bc.dateLivraisonPrevue).getTime();
          if (reception > prevue + 86400000) {
            a.retardsCount += 1;
          }
        }

        // Conformité par BC
        const conf = conformiteParBC.get(bc.id);
        if (conf && conf.sumCmd > 0) {
          const pct = Math.min(100, (conf.sumRecu / conf.sumCmd) * 100);
          a.conformiteSum += pct;
          a.conformiteCount += 1;
        }
      }

      agg.set(bc.fournisseurId, a);
    }

    const fournisseurs: FournisseurStat[] = Array.from(agg.entries())
      .map(([fournId, a]) => {
        const f = fournMap.get(fournId);
        return {
          id: fournId,
          nom: f?.nom ?? "Fournisseur inconnu",
          ville: f?.ville ?? null,
          contact: f?.contact ?? null,
          telephone: f?.telephone ?? null,
          nbBC: a.nbBC,
          totalAchats: a.totalAchats,
          totalRecu: a.totalRecu,
          delaiMoyenJours: a.delaiCount > 0 ? Math.round((a.delaiSum / a.delaiCount) * 10) / 10 : null,
          tauxConformite: a.conformiteCount > 0 ? Math.round(a.conformiteSum / a.conformiteCount) : null,
          retardsCount: a.retardsCount,
          tauxRetard: a.receptionsCount > 0 ? Math.round((a.retardsCount / a.receptionsCount) * 100) : null,
        };
      })
      .sort((x, y) => y.totalAchats - x.totalAchats);

    return NextResponse.json({ fournisseurs, isDemo: false });
  } catch {
    return NextResponse.json({ fournisseurs: DEMO, isDemo: true });
  }
}
