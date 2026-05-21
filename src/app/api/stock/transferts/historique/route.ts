import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  try {
    // Récupère tous les mouvements de type transfert, groupés par référence
    const dateLimit = new Date(Date.now() - 90 * 86400000);

    const rows = await db
      .select({
        id: schema.mouvementsStock.id,
        produitId: schema.mouvementsStock.produitId,
        depotId: schema.mouvementsStock.depotId,
        quantiteBase: schema.mouvementsStock.quantiteBase,
        quantiteAvant: schema.mouvementsStock.quantiteAvant,
        quantiteApres: schema.mouvementsStock.quantiteApres,
        reference: schema.mouvementsStock.reference,
        notes: schema.mouvementsStock.notes,
        createdAt: schema.mouvementsStock.createdAt,
        userId: schema.mouvementsStock.userId,
        produitNom: schema.produits.nom,
        produitCode: schema.produits.code,
        depotNom: schema.depots.nom,
      })
      .from(schema.mouvementsStock)
      .leftJoin(schema.produits, eq(schema.mouvementsStock.produitId, schema.produits.id))
      .leftJoin(schema.depots, eq(schema.mouvementsStock.depotId, schema.depots.id))
      .where(
        and(
          eq(schema.mouvementsStock.type, "transfert"),
          gte(schema.mouvementsStock.createdAt, dateLimit)
        )
      )
      .orderBy(desc(schema.mouvementsStock.createdAt))
      .limit(limit * 2);

    // Grouper par référence (source = quantité diminue, dest = quantité augmente)
    type Transfert = {
      reference: string;
      produitId: string;
      produitNom: string;
      produitCode: string;
      quantite: number;
      sourceDepotId: string | null;
      sourceDepotNom: string | null;
      destDepotId: string | null;
      destDepotNom: string | null;
      notes: string | null;
      createdAt: string;
    };

    const grouped = new Map<string, Transfert>();

    for (const r of rows) {
      const ref = r.reference ?? "—";
      const isSource = r.quantiteApres < r.quantiteAvant;
      const existing = grouped.get(ref) ?? {
        reference: ref,
        produitId: r.produitId,
        produitNom: r.produitNom ?? "—",
        produitCode: r.produitCode ?? "—",
        quantite: r.quantiteBase,
        sourceDepotId: null,
        sourceDepotNom: null,
        destDepotId: null,
        destDepotNom: null,
        notes: r.notes,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      };
      if (isSource) {
        existing.sourceDepotId = r.depotId;
        existing.sourceDepotNom = r.depotNom ?? "—";
      } else {
        existing.destDepotId = r.depotId;
        existing.destDepotNom = r.depotNom ?? "—";
      }
      grouped.set(ref, existing);
    }

    const transferts = Array.from(grouped.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);

    return NextResponse.json({ transferts });
  } catch {
    return NextResponse.json({ transferts: [] });
  }
}
