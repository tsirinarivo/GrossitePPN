import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, desc, sql, not } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    // Derniers bons de commande
    const bons = await db
      .select({
        id: schema.bonsCommande.id,
        numero: schema.bonsCommande.numero,
        statut: schema.bonsCommande.statut,
        totalTTC: schema.bonsCommande.totalTTC,
        dateCommande: schema.bonsCommande.dateCommande,
        dateLivraisonPrevue: schema.bonsCommande.dateLivraisonPrevue,
        dateReceptionEffective: schema.bonsCommande.dateReceptionEffective,
      })
      .from(schema.bonsCommande)
      .where(eq(schema.bonsCommande.fournisseurId, id))
      .orderBy(desc(schema.bonsCommande.createdAt))
      .limit(20);

    // Délai moyen réception (entre dateCommande et dateReceptionEffective)
    const recus = bons.filter((b) => b.dateReceptionEffective && b.dateCommande);
    const delaiMoyen = recus.length > 0
      ? Math.round(recus.reduce((s, b) => {
          const diff = new Date(b.dateReceptionEffective!).getTime() - new Date(b.dateCommande!).getTime();
          return s + diff / 86400000;
        }, 0) / recus.length)
      : null;

    // Balance : total livré mais non payé
    const totauxParStatut = await db
      .select({
        statut: schema.bonsCommande.statut,
        totalTTC: sql<number>`COALESCE(SUM(${schema.bonsCommande.totalTTC}), 0)`,
        nbBons: sql<number>`COUNT(*)`,
      })
      .from(schema.bonsCommande)
      .where(eq(schema.bonsCommande.fournisseurId, id))
      .groupBy(schema.bonsCommande.statut);

    const parStatut = Object.fromEntries(totauxParStatut.map((r) => [r.statut, { totalTTC: Number(r.totalTTC), nbBons: Number(r.nbBons) }]));

    // Total achats sur 12 mois
    const douzeMoisAgo = new Date(); douzeMoisAgo.setFullYear(douzeMoisAgo.getFullYear() - 1);
    const [kpi] = await db
      .select({ totalTTC: sql<number>`COALESCE(SUM(${schema.bonsCommande.totalTTC}), 0)`, nbBons: sql<number>`COUNT(*)` })
      .from(schema.bonsCommande)
      .where(and(
        eq(schema.bonsCommande.fournisseurId, id),
        not(eq(schema.bonsCommande.statut, "annule")),
      ));

    return NextResponse.json({
      bons: bons.map((b) => ({
        ...b,
        totalTTC: Number(b.totalTTC),
      })),
      delaiMoyen,
      parStatut,
      totalAchats12m: Number(kpi?.totalTTC ?? 0),
      nbBonsTotal: Number(kpi?.nbBons ?? 0),
    });
  } catch (e) {
    console.error("[api/achats/fournisseurs/[id]/stats]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
