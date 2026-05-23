import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, gte, desc, sql, inArray, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") ?? "mois";
  const filtreType = searchParams.get("type") ?? "all";
  const filtreDepot = searchParams.get("depot") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 1000);

  const now = new Date();
  let debut: Date;
  if (periode === "jour") {
    debut = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (periode === "semaine") {
    debut = new Date(now.getTime() - 7 * 86400000);
  } else if (periode === "mois") {
    debut = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (periode === "trimestre") {
    debut = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  } else {
    debut = new Date(now.getFullYear(), 0, 1);
  }

  try {
    // Récupère mouvements avec joins produit + dépôt + user
    const rows = await db
      .select({
        id: schema.mouvementsStock.id,
        type: schema.mouvementsStock.type,
        quantiteBase: schema.mouvementsStock.quantiteBase,
        quantiteAvant: schema.mouvementsStock.quantiteAvant,
        quantiteApres: schema.mouvementsStock.quantiteApres,
        reference: schema.mouvementsStock.reference,
        notes: schema.mouvementsStock.notes,
        createdAt: schema.mouvementsStock.createdAt,
        userId: schema.mouvementsStock.userId,
        produitId: schema.mouvementsStock.produitId,
        produitNom: schema.produits.nom,
        produitCode: schema.produits.code,
        produitUnite: schema.produits.uniteBase,
        depotId: schema.mouvementsStock.depotId,
        depotNom: schema.depots.nom,
      })
      .from(schema.mouvementsStock)
      .leftJoin(schema.produits, eq(schema.mouvementsStock.produitId, schema.produits.id))
      .leftJoin(schema.depots, eq(schema.mouvementsStock.depotId, schema.depots.id))
      .where(
        and(
          gte(schema.mouvementsStock.createdAt, debut),
          filtreType !== "all" ? eq(schema.mouvementsStock.type, filtreType) : undefined,
          filtreDepot ? eq(schema.mouvementsStock.depotId, filtreDepot) : undefined,
          q
            ? or(
                ilike(schema.produits.nom, `%${q}%`),
                ilike(schema.produits.code, `%${q}%`),
                ilike(schema.mouvementsStock.reference, `%${q}%`)
              )
            : undefined
        )
      )
      .orderBy(desc(schema.mouvementsStock.createdAt))
      .limit(limit);

    // Users
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
      ? await db.select({ id: schema.users.id, nom: schema.users.name })
          .from(schema.users).where(inArray(schema.users.id, userIds))
      : [];
    const usersMap = new Map(users.map((u) => [u.id, u.nom ?? ""]));

    const mouvements = rows.map((r) => ({
      ...r,
      agentNom: r.userId ? usersMap.get(r.userId) ?? "" : "",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));

    // Stats par type
    const statsParType = {
      entree: 0,
      vente: 0,
      transfert: 0,
      casse: 0,
      inventaire: 0,
      reservation: 0,
    } as Record<string, number>;

    for (const m of mouvements) {
      statsParType[m.type] = (statsParType[m.type] ?? 0) + 1;
    }

    // Total mouvements + agrégats
    const totalMouvements = mouvements.length;
    const totalEntrees = mouvements
      .filter((m) => m.type === "entree")
      .reduce((s, m) => s + (Number(m.quantiteBase) || 0), 0);
    const totalSorties = mouvements
      .filter((m) => m.type === "vente" || m.type === "casse")
      .reduce((s, m) => s + (Number(m.quantiteBase) || 0), 0);

    // Liste des dépôts pour filtre
    const depots = await db
      .select({ id: schema.depots.id, nom: schema.depots.nom })
      .from(schema.depots)
      .where(eq(schema.depots.actif, true));

    return NextResponse.json({
      mouvements,
      stats: {
        total: totalMouvements,
        parType: statsParType,
        totalEntrees,
        totalSorties,
      },
      depots,
    });
  } catch {
    return NextResponse.json({
      mouvements: [],
      stats: { total: 0, parType: {}, totalEntrees: 0, totalSorties: 0 },
      depots: [],
    });
  }
}
