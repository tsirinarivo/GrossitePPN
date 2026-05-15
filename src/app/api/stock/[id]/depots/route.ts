import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// GET /api/stock/[id]/depots — stock par dépôt pour un produit
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: produitId } = await params;
  try {
    // Tous les dépôts actifs
    const tousDepots = await db
      .select({ id: schema.depots.id, nom: schema.depots.nom, estPrincipal: schema.depots.estPrincipal })
      .from(schema.depots)
      .where(eq(schema.depots.actif, true));

    // Stock existant pour ce produit
    const stocksExistants = await db
      .select({ depotId: schema.stocks.depotId, quantiteBase: schema.stocks.quantiteBase })
      .from(schema.stocks)
      .where(eq(schema.stocks.produitId, produitId));

    const stockMap = new Map(stocksExistants.map((s) => [s.depotId, Number(s.quantiteBase)]));

    const result = tousDepots.map((d) => ({
      depotId: d.id,
      depotNom: d.nom,
      estPrincipal: d.estPrincipal,
      quantiteBase: stockMap.get(d.id) ?? 0,
    }));

    return NextResponse.json({ stocks: result });
  } catch (e) {
    console.error("[api/stock/[id]/depots GET]", e);
    return NextResponse.json({ stocks: [] });
  }
}

// PUT /api/stock/[id]/depots — upsert quantité pour un dépôt donné
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: produitId } = await params;
  try {
    const body = await req.json();
    const { depotId, quantiteBase } = body as { depotId: string; quantiteBase: number };

    if (!depotId) return NextResponse.json({ error: "depotId requis" }, { status: 400 });
    if (typeof quantiteBase !== "number" || quantiteBase < 0)
      return NextResponse.json({ error: "quantiteBase invalide" }, { status: 400 });

    // Upsert: insert ou update si la ligne existe déjà
    const existing = await db
      .select({ id: schema.stocks.id, quantiteBase: schema.stocks.quantiteBase })
      .from(schema.stocks)
      .where(and(eq(schema.stocks.produitId, produitId), eq(schema.stocks.depotId, depotId)));

    const quantiteAvant = existing.length > 0 ? Number(existing[0]?.quantiteBase ?? 0) : 0;

    if (existing.length > 0) {
      await db
        .update(schema.stocks)
        .set({ quantiteBase, updatedAt: new Date() })
        .where(and(eq(schema.stocks.produitId, produitId), eq(schema.stocks.depotId, depotId)));
    } else {
      await db.insert(schema.stocks).values({
        id: crypto.randomUUID(),
        produitId,
        depotId,
        quantiteBase,
      });
    }

    // Enregistrer un mouvement d'inventaire
    await db.insert(schema.mouvementsStock).values({
      id: crypto.randomUUID(),
      produitId,
      depotId,
      type: "inventaire",
      quantiteBase: Math.abs(quantiteBase - quantiteAvant),
      quantiteAvant,
      quantiteApres: quantiteBase,
      reference: "Ajustement manuel",
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/stock/[id]/depots PUT]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
