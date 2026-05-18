import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const inventaireSchema = z.object({
  depotId: z.string().min(1),
  lignes: z.array(z.object({
    produitId: z.string().min(1),
    quantiteComptee: z.number().min(0),
  })).min(1),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = inventaireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { depotId, lignes, notes } = parsed.data;

  try {
    const now = new Date();
    const ref = `INV-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    let ecarts = 0;

    for (const ligne of lignes) {
      const [stockRow] = await db
        .select({ quantiteBase: schema.stocks.quantiteBase })
        .from(schema.stocks)
        .where(and(eq(schema.stocks.produitId, ligne.produitId), eq(schema.stocks.depotId, depotId)))
        .limit(1);

      const avant = stockRow?.quantiteBase ?? 0;
      const apres = ligne.quantiteComptee;

      if (Math.abs(apres - avant) < 0.001) continue; // aucun écart, skip

      ecarts++;

      // Ajuster le stock
      if (stockRow) {
        await db
          .update(schema.stocks)
          .set({ quantiteBase: apres, updatedAt: now })
          .where(and(eq(schema.stocks.produitId, ligne.produitId), eq(schema.stocks.depotId, depotId)));
      } else {
        await db.insert(schema.stocks).values({
          id: crypto.randomUUID(),
          produitId: ligne.produitId,
          depotId,
          quantiteBase: apres,
        });
      }

      await db.insert(schema.mouvementsStock).values({
        id: crypto.randomUUID(),
        produitId: ligne.produitId,
        depotId,
        type: "inventaire",
        quantiteBase: Math.abs(apres - avant),
        quantiteAvant: avant,
        quantiteApres: apres,
        reference: ref,
        notes: notes ?? `Inventaire physique ${ref}`,
        userId: session.user.id,
      });
    }

    return NextResponse.json({ ok: true, reference: ref, ecarts });
  } catch (e) {
    console.error("[api/stock/inventaire POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
