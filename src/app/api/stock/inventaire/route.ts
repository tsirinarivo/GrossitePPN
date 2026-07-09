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
  lignes: z
    .array(
      z.object({
        produitId: z.string().min(1),
        quantiteComptee: z.number().min(0),
      })
    )
    .min(1),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const depotId = searchParams.get("depotId");

    // Fetch all active depots
    let depots = await db
      .select()
      .from(schema.depots)
      .where(eq(schema.depots.actif, true));

    if (depots.length === 0) {
      depots = [
        {
          id: "demo-1",
          tenantId: null,
          nom: "Tana-Centre",
          adresse: "Antananarivo Centre",
          telephone: null,
          responsableId: null,
          actif: true,
          estPrincipal: true,
          createdAt: new Date(),
        },
        {
          id: "demo-2",
          tenantId: null,
          nom: "Tamatave",
          adresse: "Toamasina",
          telephone: null,
          responsableId: null,
          actif: true,
          estPrincipal: false,
          createdAt: new Date(),
        },
        {
          id: "demo-3",
          tenantId: null,
          nom: "Antsirabe",
          adresse: "Antsirabe",
          telephone: null,
          responsableId: null,
          actif: true,
          estPrincipal: false,
          createdAt: new Date(),
        },
      ];
    }

    // Build join condition: filter by depot if provided
    const depotIdFilter = depotId
      ? and(
          eq(schema.stocks.produitId, schema.produits.id),
          eq(schema.stocks.depotId, depotId)
        )
      : eq(schema.stocks.produitId, schema.produits.id);

    const rows = await db
      .select({
        produitId: schema.produits.id,
        designation: schema.produits.nom,
        code: schema.produits.code,
        uniteBase: schema.produits.uniteBase,
        seuilAlerte: schema.produits.seuilAlerte,
        stockActuel: schema.stocks.quantiteBase,
        depotId: schema.stocks.depotId,
      })
      .from(schema.produits)
      .leftJoin(schema.stocks, depotIdFilter)
      .where(eq(schema.produits.actif, true))
      .orderBy(schema.produits.nom);

    return NextResponse.json({ depots, produits: rows });
  } catch (e) {
    console.error("[api/stock/inventaire GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const role = (session.user as { role?: string }).role ?? "agent";
  if (!["admin", "gerant", "magasinier"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inventaireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { depotId, lignes, notes } = parsed.data;

  try {
    const now = new Date();
    const ref = `INV-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Tout l'inventaire dans UNE transaction : all-or-nothing (pas d'état partiel).
    const ecarts = await db.transaction(async (tx) => {
      let nbEcarts = 0;
      for (const ligne of lignes) {
        const [stockRow] = await tx
          .select({ quantiteBase: schema.stocks.quantiteBase })
          .from(schema.stocks)
          .where(and(eq(schema.stocks.produitId, ligne.produitId), eq(schema.stocks.depotId, depotId)))
          .limit(1);

        const avant = stockRow?.quantiteBase ?? 0;
        const apres = ligne.quantiteComptee;

        await tx
          .insert(schema.stocks)
          .values({ id: crypto.randomUUID(), produitId: ligne.produitId, depotId, quantiteBase: apres, updatedAt: now })
          .onConflictDoUpdate({
            target: [schema.stocks.produitId, schema.stocks.depotId],
            set: { quantiteBase: apres, updatedAt: now },
          });

        const diff = apres - avant;
        if (Math.abs(diff) >= 0.001) nbEcarts++;

        await tx.insert(schema.mouvementsStock).values({
          id: crypto.randomUUID(),
          produitId: ligne.produitId,
          depotId,
          type: "inventaire",
          quantiteBase: diff,
          quantiteAvant: avant,
          quantiteApres: apres,
          reference: ref,
          notes: notes ?? `Inventaire physique ${ref}`,
          userId: session.user.id,
          createdAt: now,
        });
      }
      return nbEcarts;
    });

    return NextResponse.json({ success: true, nbLignes: lignes.length, reference: ref, ecarts });
  } catch (e) {
    console.error("[api/stock/inventaire POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
