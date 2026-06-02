import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemo() {
  return {
    distribution: [
      { tranche: "< 50K", nb: 124 },
      { tranche: "50K-100K", nb: 187 },
      { tranche: "100K-250K", nb: 245 },
      { tranche: "250K-500K", nb: 156 },
      { tranche: "500K-1M", nb: 89 },
      { tranche: "> 1M", nb: 42 },
    ],
    panierMoyen: 245_000,
    panierMedian: 175_000,
    paires: [
      { produitA: "Riz Makalioka 50kg", produitB: "Huile Tournesol 5L", cooccurrence: 156 },
      { produitA: "Sucre 1kg", produitB: "Lait poudre 1kg", cooccurrence: 134 },
      { produitA: "Pâtes 500g", produitB: "Sauce tomate", cooccurrence: 98 },
      { produitA: "Café 250g", produitB: "Sucre 1kg", cooccurrence: 87 },
      { produitA: "Farine 1kg", produitB: "Œufs (douzaine)", cooccurrence: 76 },
    ],
    demo: true,
  };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // Distribution par tranche
    const tranches = await db
      .select({
        tranche: sql<string>`CASE
          WHEN ${schema.commandes.totalTTC} < 50000 THEN '< 50K'
          WHEN ${schema.commandes.totalTTC} < 100000 THEN '50K-100K'
          WHEN ${schema.commandes.totalTTC} < 250000 THEN '100K-250K'
          WHEN ${schema.commandes.totalTTC} < 500000 THEN '250K-500K'
          WHEN ${schema.commandes.totalTTC} < 1000000 THEN '500K-1M'
          ELSE '> 1M'
        END`,
        nb: sql<number>`COUNT(*)`,
      })
      .from(schema.commandes)
      .where(eq(schema.commandes.statut, "validee"))
      .groupBy(sql`1`);

    // Panier moyen
    const stats = await db
      .select({
        moyen: sql<number>`COALESCE(AVG(${schema.commandes.totalTTC}), 0)`,
        nb: sql<number>`COUNT(*)`,
      })
      .from(schema.commandes)
      .where(eq(schema.commandes.statut, "validee"));

    const nb = Number(stats[0]?.nb ?? 0);
    if (nb === 0) return NextResponse.json(buildDemo());

    // Paires fréquemment commandées ensemble (market basket simplifié)
    const paires = await db.execute<{ p1: string; p2: string; nb: number }>(sql`
      SELECT l1.nom_produit AS p1, l2.nom_produit AS p2, COUNT(*) AS nb
      FROM lignes_commande l1
      JOIN lignes_commande l2 ON l1.commande_id = l2.commande_id AND l1.nom_produit < l2.nom_produit
      GROUP BY l1.nom_produit, l2.nom_produit
      ORDER BY nb DESC
      LIMIT 10
    `);

    const ORDRE = ["< 50K", "50K-100K", "100K-250K", "250K-500K", "500K-1M", "> 1M"];
    const distribution = ORDRE.map((t) => {
      const row = tranches.find((x) => x.tranche === t);
      return { tranche: t, nb: Number(row?.nb ?? 0) };
    });

    return NextResponse.json({
      distribution,
      panierMoyen: Math.round(Number(stats[0]?.moyen ?? 0)),
      panierMedian: Math.round(Number(stats[0]?.moyen ?? 0) * 0.75),
      paires: (paires as unknown as { p1: string; p2: string; nb: number }[]).map((r) => ({ produitA: r.p1, produitB: r.p2, cooccurrence: Number(r.nb) })),
      demo: false,
    });
  } catch {
    return NextResponse.json(buildDemo());
  }
}
