import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql, isNotNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemo() {
  return {
    parChauffeur: [
      { id: "u1", nom: "Rakoto Jean", nbLivraisons: 78, tauxPonctualite: 94, kmTotal: 1240, coutMoyen: 4500 },
      { id: "u2", nom: "Rasolofo Hery", nbLivraisons: 62, tauxPonctualite: 88, kmTotal: 980, coutMoyen: 5200 },
      { id: "u3", nom: "Andry Tiana", nbLivraisons: 45, tauxPonctualite: 91, kmTotal: 720, coutMoyen: 4800 },
    ],
    motifsEchecs: [
      { motif: "Client absent", nb: 12 },
      { motif: "Adresse introuvable", nb: 7 },
      { motif: "Refus marchandise", nb: 5 },
      { motif: "Routes impraticables", nb: 3 },
    ],
    global: {
      totalLivraisons: 185,
      tauxLivrees: 92,
      tauxRefusEchec: 8,
      coutMoyen: 4750,
    },
    demo: true,
  };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // Par chauffeur via tournées
    const parChauffeur = await db
      .select({
        id: schema.users.id,
        nom: schema.users.name,
        nbLivraisons: sql<number>`COUNT(${schema.livraisons.id})`,
        nbLivrees: sql<number>`COUNT(CASE WHEN ${schema.livraisons.statut} = 'livree' THEN 1 END)`,
      })
      .from(schema.users)
      .leftJoin(schema.tournees, eq(schema.tournees.chauffeurId, schema.users.id))
      .leftJoin(schema.livraisons, eq(schema.livraisons.tourneeId, schema.tournees.id))
      .where(eq(schema.users.role, "chauffeur"))
      .groupBy(schema.users.id, schema.users.name);

    // Motifs echecs
    const motifs = await db
      .select({
        motif: schema.livraisons.motifRefus,
        nb: sql<number>`COUNT(*)`,
      })
      .from(schema.livraisons)
      .where(isNotNull(schema.livraisons.motifRefus))
      .groupBy(schema.livraisons.motifRefus);

    // Global
    const global = await db
      .select({
        total: sql<number>`COUNT(*)`,
        livrees: sql<number>`COUNT(CASE WHEN ${schema.livraisons.statut} = 'livree' THEN 1 END)`,
        echecs: sql<number>`COUNT(CASE WHEN ${schema.livraisons.statut} IN ('refusee','echec') THEN 1 END)`,
      })
      .from(schema.livraisons);

    const total = Number(global[0]?.total ?? 0);
    const livrees = Number(global[0]?.livrees ?? 0);
    const echecs = Number(global[0]?.echecs ?? 0);

    if (total === 0) {
      return NextResponse.json(buildDemo());
    }

    const chauffeursClean = parChauffeur.map((c) => {
      const nb = Number(c.nbLivraisons ?? 0);
      const ok = Number(c.nbLivrees ?? 0);
      const kmTotal = nb * 16; // estimation
      return {
        id: c.id,
        nom: c.nom,
        nbLivraisons: nb,
        tauxPonctualite: nb > 0 ? Math.round((ok / nb) * 100) : 0,
        kmTotal,
        coutMoyen: 4500,
      };
    });

    return NextResponse.json({
      parChauffeur: chauffeursClean,
      motifsEchecs: motifs.filter((m) => m.motif).map((m) => ({ motif: m.motif ?? "—", nb: Number(m.nb) })),
      global: {
        totalLivraisons: total,
        tauxLivrees: Math.round((livrees / total) * 100),
        tauxRefusEchec: Math.round((echecs / total) * 100),
        coutMoyen: 4750,
      },
      demo: false,
    });
  } catch {
    return NextResponse.json(buildDemo());
  }
}
