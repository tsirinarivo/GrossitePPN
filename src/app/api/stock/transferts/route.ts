import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const transfertSchema = z.object({
  produitId: z.string().min(1),
  sourceDepotId: z.string().min(1),
  destinationDepotId: z.string().min(1),
  quantiteBase: z.number().positive(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = transfertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { produitId, sourceDepotId, destinationDepotId, quantiteBase, notes } = parsed.data;

  if (sourceDepotId === destinationDepotId) {
    return NextResponse.json({ error: "Source et destination identiques" }, { status: 400 });
  }

  try {
    // Vérifier stock source
    const [stockSource] = await db
      .select({ quantiteBase: schema.stocks.quantiteBase })
      .from(schema.stocks)
      .where(and(eq(schema.stocks.produitId, produitId), eq(schema.stocks.depotId, sourceDepotId)))
      .limit(1);

    const avantSource = stockSource?.quantiteBase ?? 0;
    if (avantSource < quantiteBase) {
      return NextResponse.json(
        { error: `Stock insuffisant (disponible: ${avantSource})` },
        { status: 422 }
      );
    }

    const now = new Date();
    const ref = `TRF-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // ── Source: décrémenter ────────────────────────────────────────────────
    const apresSource = avantSource - quantiteBase;
    if (stockSource) {
      await db
        .update(schema.stocks)
        .set({ quantiteBase: apresSource, updatedAt: now })
        .where(and(eq(schema.stocks.produitId, produitId), eq(schema.stocks.depotId, sourceDepotId)));
    }

    await db.insert(schema.mouvementsStock).values({
      id: crypto.randomUUID(),
      produitId,
      depotId: sourceDepotId,
      type: "transfert",
      quantiteBase,
      quantiteAvant: avantSource,
      quantiteApres: apresSource,
      reference: ref,
      notes: notes ?? `Transfert vers dépôt ${destinationDepotId}`,
      userId: session.user.id,
    });

    // ── Destination: incrémenter (ou créer la ligne si absente) ───────────
    const [stockDest] = await db
      .select({ quantiteBase: schema.stocks.quantiteBase })
      .from(schema.stocks)
      .where(and(eq(schema.stocks.produitId, produitId), eq(schema.stocks.depotId, destinationDepotId)))
      .limit(1);

    const avantDest = stockDest?.quantiteBase ?? 0;
    const apresDest = avantDest + quantiteBase;

    if (stockDest) {
      await db
        .update(schema.stocks)
        .set({ quantiteBase: apresDest, updatedAt: now })
        .where(and(eq(schema.stocks.produitId, produitId), eq(schema.stocks.depotId, destinationDepotId)));
    } else {
      await db.insert(schema.stocks).values({
        id: crypto.randomUUID(),
        produitId,
        depotId: destinationDepotId,
        quantiteBase: apresDest,
      });
    }

    await db.insert(schema.mouvementsStock).values({
      id: crypto.randomUUID(),
      produitId,
      depotId: destinationDepotId,
      type: "transfert",
      quantiteBase,
      quantiteAvant: avantDest,
      quantiteApres: apresDest,
      reference: ref,
      notes: notes ?? `Transfert depuis dépôt ${sourceDepotId}`,
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true, reference: ref });
  } catch (e) {
    console.error("[api/stock/transferts POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
