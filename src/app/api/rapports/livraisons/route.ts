import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, gte, lte, and, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type ChauffeurStat = {
  chauffeurId: string;
  nom: string;
  nbLivraisons: number;
  nbLivrees: number;
  nbEchecs: number;
  tauxPonctualite: number;
  tauxReussite: number;
  kmParcourus: number;
  coutMoyenParLivraison: number;
};

type MotifEchec = { motif: string; count: number };

const COUT_BASE_LIVRAISON = 8500; // Ar par livraison (carburant + main d'œuvre estimé)
const KM_MOYEN_TOURNEE = 25; // km moyens par tournée (estimation)

const DEMO_CHAUFFEURS: ChauffeurStat[] = [
  { chauffeurId: "demo-1", nom: "Rakoto Jean", nbLivraisons: 47, nbLivrees: 44, nbEchecs: 1, tauxPonctualite: 92, tauxReussite: 94, kmParcourus: 1175, coutMoyenParLivraison: 8950 },
  { chauffeurId: "demo-2", nom: "Rasoa Anita", nbLivraisons: 39, nbLivrees: 37, nbEchecs: 1, tauxPonctualite: 88, tauxReussite: 95, kmParcourus: 975, coutMoyenParLivraison: 8400 },
  { chauffeurId: "demo-3", nom: "Hery Mamy", nbLivraisons: 34, nbLivrees: 30, nbEchecs: 3, tauxPonctualite: 78, tauxReussite: 88, kmParcourus: 850, coutMoyenParLivraison: 9200 },
  { chauffeurId: "demo-4", nom: "Tiana Razafy", nbLivraisons: 28, nbLivrees: 27, nbEchecs: 0, tauxPonctualite: 96, tauxReussite: 96, kmParcourus: 700, coutMoyenParLivraison: 8100 },
];

const DEMO_MOTIFS: MotifEchec[] = [
  { motif: "Client absent", count: 4 },
  { motif: "Adresse introuvable", count: 2 },
  { motif: "Refus du client", count: 1 },
  { motif: "Marchandise endommagée", count: 1 },
];

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const periode = new URL(req.url).searchParams.get("periode") ?? "mois";

  const now = new Date();
  let debut: Date;
  if (periode === "semaine") {
    debut = new Date(now.getTime() - 7 * 86400000);
  } else if (periode === "trimestre") {
    debut = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  } else if (periode === "annee") {
    debut = new Date(now.getFullYear(), 0, 1);
  } else {
    debut = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  try {
    // Toutes les livraisons de la période (via tournee.date)
    const livraisons = await db
      .select({
        id: schema.livraisons.id,
        statut: schema.livraisons.statut,
        motifRefus: schema.livraisons.motifRefus,
        livraisonAt: schema.livraisons.livraisonAt,
        createdAt: schema.livraisons.createdAt,
        tourneeId: schema.livraisons.tourneeId,
        chauffeurId: schema.tournees.chauffeurId,
        tourneeDate: schema.tournees.date,
        chauffeurNom: schema.users.name,
      })
      .from(schema.livraisons)
      .leftJoin(schema.tournees, eq(schema.livraisons.tourneeId, schema.tournees.id))
      .leftJoin(schema.users, eq(schema.tournees.chauffeurId, schema.users.id))
      .where(gte(schema.livraisons.createdAt, debut));

    if (livraisons.length === 0) {
      return NextResponse.json({
        chauffeurs: DEMO_CHAUFFEURS,
        motifsEchecs: DEMO_MOTIFS,
        synthese: {
          total: DEMO_CHAUFFEURS.reduce((s, c) => s + c.nbLivraisons, 0),
          livrees: DEMO_CHAUFFEURS.reduce((s, c) => s + c.nbLivrees, 0),
          echecs: DEMO_CHAUFFEURS.reduce((s, c) => s + c.nbEchecs, 0),
          tauxReussite: 93,
          tauxPonctualite: 89,
          kmTotal: DEMO_CHAUFFEURS.reduce((s, c) => s + c.kmParcourus, 0),
          coutTotal: DEMO_CHAUFFEURS.reduce((s, c) => s + c.nbLivraisons * c.coutMoyenParLivraison, 0),
          coutMoyenLivraison: COUT_BASE_LIVRAISON,
        },
        isDemo: true,
      });
    }

    // Agrégation par chauffeur
    type Agg = { livraisons: typeof livraisons; chauffeurNom: string | null };
    const aggregations = new Map<string, Agg>();

    for (const liv of livraisons) {
      const cId = liv.chauffeurId ?? "_no_driver";
      const a = aggregations.get(cId) ?? { livraisons: [], chauffeurNom: liv.chauffeurNom };
      a.livraisons.push(liv);
      if (liv.chauffeurNom) a.chauffeurNom = liv.chauffeurNom;
      aggregations.set(cId, a);
    }

    const chauffeurs: ChauffeurStat[] = [];
    for (const [chauffeurId, { livraisons: livs, chauffeurNom }] of aggregations) {
      if (chauffeurId === "_no_driver") continue;
      const nb = livs.length;
      const livrees = livs.filter((l) => l.statut === "livree");
      const echecs = livs.filter((l) => l.statut === "echec" || l.statut === "refusee").length;

      // Ponctualité : livraison effectuée dans la journée prévue (tourneeDate)
      let ponctuel = 0;
      let comptePonctuel = 0;
      for (const l of livrees) {
        if (l.livraisonAt && l.tourneeDate) {
          comptePonctuel++;
          const livDate = new Date(l.livraisonAt);
          const prevue = new Date(l.tourneeDate);
          const diff = livDate.getTime() - prevue.getTime();
          // Ponctuel si dans la journée prévue (±12h)
          if (Math.abs(diff) <= 12 * 3600_000) ponctuel++;
        }
      }
      const tauxPonctualite = comptePonctuel > 0 ? Math.round((ponctuel / comptePonctuel) * 100) : 0;
      const tauxReussite = nb > 0 ? Math.round((livrees.length / nb) * 100) : 0;

      // Nb tournées uniques pour ce chauffeur
      const tourneeIds = new Set(livs.map((l) => l.tourneeId).filter(Boolean));
      const kmParcourus = tourneeIds.size * KM_MOYEN_TOURNEE;
      const coutMoyenParLivraison = COUT_BASE_LIVRAISON;

      chauffeurs.push({
        chauffeurId,
        nom: chauffeurNom ?? "Chauffeur inconnu",
        nbLivraisons: nb,
        nbLivrees: livrees.length,
        nbEchecs: echecs,
        tauxPonctualite,
        tauxReussite,
        kmParcourus,
        coutMoyenParLivraison,
      });
    }

    chauffeurs.sort((a, b) => b.nbLivraisons - a.nbLivraisons);

    // Motifs d'échec agrégés
    const motifsMap = new Map<string, number>();
    for (const l of livraisons) {
      if (l.statut === "echec" || l.statut === "refusee") {
        const m = (l.motifRefus ?? "Non précisé").trim() || "Non précisé";
        motifsMap.set(m, (motifsMap.get(m) ?? 0) + 1);
      }
    }
    const motifsEchecs: MotifEchec[] = Array.from(motifsMap.entries())
      .map(([motif, count]) => ({ motif, count }))
      .sort((a, b) => b.count - a.count);

    const total = livraisons.length;
    const livreesTotal = livraisons.filter((l) => l.statut === "livree").length;
    const echecsTotal = livraisons.filter((l) => l.statut === "echec" || l.statut === "refusee").length;
    const kmTotal = chauffeurs.reduce((s, c) => s + c.kmParcourus, 0);
    const coutTotal = total * COUT_BASE_LIVRAISON;

    const tauxReussite = total > 0 ? Math.round((livreesTotal / total) * 100) : 0;
    const tauxPonctualiteGlobal = chauffeurs.length > 0
      ? Math.round(chauffeurs.reduce((s, c) => s + c.tauxPonctualite, 0) / chauffeurs.length)
      : 0;

    return NextResponse.json({
      chauffeurs,
      motifsEchecs,
      synthese: {
        total,
        livrees: livreesTotal,
        echecs: echecsTotal,
        tauxReussite,
        tauxPonctualite: tauxPonctualiteGlobal,
        kmTotal,
        coutTotal,
        coutMoyenLivraison: COUT_BASE_LIVRAISON,
      },
      isDemo: false,
    });
  } catch {
    return NextResponse.json({
      chauffeurs: DEMO_CHAUFFEURS,
      motifsEchecs: DEMO_MOTIFS,
      synthese: {
        total: 148,
        livrees: 138,
        echecs: 5,
        tauxReussite: 93,
        tauxPonctualite: 89,
        kmTotal: 3700,
        coutTotal: 1_258_000,
        coutMoyenLivraison: 8500,
      },
      isDemo: true,
    });
  }
}
