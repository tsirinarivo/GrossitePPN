import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
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

/** Erreur métier « stock insuffisant » (déclenche un rollback + 422). */
class StockInsuffisant extends Error {}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const role = (session.user as { role?: string }).role ?? "agent";
  if (!["admin", "gerant", "magasinier"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = transfertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { produitId, sourceDepotId, destinationDepotId, quantiteBase, notes } = parsed.data;

  if (sourceDepotId === destinationDepotId) {
    return NextResponse.json({ error: "Source et destination identiques" }, { status: 400 });
  }

  const now = new Date();
  const ref = `TRF-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  try {
    await db.transaction(async (tx) => {
      // ── Source : décrément ATOMIQUE avec garde (jamais négatif, anti-concurrence)
      const dec = await tx
        .update(schema.stocks)
        .set({ quantiteBase: sql`${schema.stocks.quantiteBase} - ${quantiteBase}`, updatedAt: now })
        .where(
          and(
            eq(schema.stocks.produitId, produitId),
            eq(schema.stocks.depotId, sourceDepotId),
            sql`${schema.stocks.quantiteBase} >= ${quantiteBase}`
          )
        )
        .returning({ apres: schema.stocks.quantiteBase });

      if (dec.length === 0) {
        // Soit la ligne n'existe pas, soit stock insuffisant.
        throw new StockInsuffisant();
      }
      const apresSource = Number(dec[0]!.apres);
      const avantSource = apresSource + quantiteBase;

      await tx.insert(schema.mouvementsStock).values({
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

      // ── Destination : incrément ATOMIQUE (upsert additif)
      const inc = await tx
        .insert(schema.stocks)
        .values({ id: crypto.randomUUID(), produitId, depotId: destinationDepotId, quantiteBase, updatedAt: now })
        .onConflictDoUpdate({
          target: [schema.stocks.produitId, schema.stocks.depotId],
          set: { quantiteBase: sql`${schema.stocks.quantiteBase} + ${quantiteBase}`, updatedAt: now },
        })
        .returning({ apres: schema.stocks.quantiteBase });

      const apresDest = Number(inc[0]!.apres);
      const avantDest = apresDest - quantiteBase;

      await tx.insert(schema.mouvementsStock).values({
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
    });

    return NextResponse.json({ ok: true, reference: ref });
  } catch (e) {
    if (e instanceof StockInsuffisant) {
      return NextResponse.json({ error: "Stock insuffisant à la source" }, { status: 422 });
    }
    console.error("[api/stock/transferts POST]", e);
    return NextResponse.json({ error: "Erreur lors du transfert" }, { status: 500 });
  }
}
