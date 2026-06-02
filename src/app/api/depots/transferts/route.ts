import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemoTransferts() {
  const today = new Date();
  return [
    { id: "t1", date: new Date(today.getTime() - 86400000).toISOString(), produitNom: "Riz Makalioka 50kg", depotSourceNom: "Dépôt central", depotDestNom: "Dépôt Toamasina", quantite: 50, reference: "TRF-2026-0024", notes: null },
    { id: "t2", date: new Date(today.getTime() - 2 * 86400000).toISOString(), produitNom: "Huile Tournesol 5L", depotSourceNom: "Dépôt central", depotDestNom: "Dépôt Mahajanga", quantite: 24, reference: "TRF-2026-0023", notes: "Réappro hebdo" },
    { id: "t3", date: new Date(today.getTime() - 3 * 86400000).toISOString(), produitNom: "Sucre 1kg", depotSourceNom: "Dépôt Toamasina", depotDestNom: "Dépôt central", quantite: 120, reference: "TRF-2026-0022", notes: null },
  ];
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // On récupère les paires de mouvements de type "transfert" (sortie + entrée même référence)
    const rows = await db
      .select({
        m: schema.mouvementsStock,
        produitNom: schema.produits.nom,
        depotNom: schema.depots.nom,
      })
      .from(schema.mouvementsStock)
      .leftJoin(schema.produits, eq(schema.produits.id, schema.mouvementsStock.produitId))
      .leftJoin(schema.depots, eq(schema.depots.id, schema.mouvementsStock.depotId))
      .where(eq(schema.mouvementsStock.type, "transfert"))
      .orderBy(desc(schema.mouvementsStock.createdAt))
      .limit(200);

    // Group by reference (TRF-XXX)
    const byRef = new Map<string, { date: string; reference: string; produitNom: string; sourceNom: string | null; destNom: string | null; quantite: number; notes: string | null }>();
    for (const r of rows) {
      const ref = r.m.reference ?? r.m.id;
      const existing = byRef.get(ref);
      const isSortie = r.m.quantiteBase < 0;
      if (!existing) {
        byRef.set(ref, {
          date: r.m.createdAt.toISOString(),
          reference: ref,
          produitNom: r.produitNom ?? "—",
          sourceNom: isSortie ? r.depotNom : null,
          destNom: !isSortie ? r.depotNom : null,
          quantite: Math.abs(r.m.quantiteBase),
          notes: r.m.notes,
        });
      } else {
        if (isSortie) existing.sourceNom = r.depotNom;
        else existing.destNom = r.depotNom;
      }
    }

    const transferts = Array.from(byRef.values()).map((t, i) => ({
      id: `tr-${i}`,
      ...t,
      depotSourceNom: t.sourceNom ?? "—",
      depotDestNom: t.destNom ?? "—",
    }));

    if (transferts.length === 0) {
      return NextResponse.json({ transferts: buildDemoTransferts(), demo: true });
    }

    return NextResponse.json({ transferts, demo: false });
  } catch {
    return NextResponse.json({ transferts: buildDemoTransferts(), demo: true });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { produitId, depotSourceId, depotDestId, quantite, notes } = body;

  if (!produitId || !depotSourceId || !depotDestId || !quantite || quantite <= 0) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }
  if (depotSourceId === depotDestId) {
    return NextResponse.json({ error: "Dépôts source et destination identiques" }, { status: 400 });
  }

  try {
    // Stock source actuel
    const [source] = await db
      .select()
      .from(schema.stocks)
      .where(and(eq(schema.stocks.produitId, produitId), eq(schema.stocks.depotId, depotSourceId)))
      .limit(1);

    const qtySource = source?.quantiteBase ?? 0;
    if (qtySource < quantite) {
      return NextResponse.json({ error: `Stock insuffisant (${qtySource} disponible)` }, { status: 400 });
    }

    const [dest] = await db
      .select()
      .from(schema.stocks)
      .where(and(eq(schema.stocks.produitId, produitId), eq(schema.stocks.depotId, depotDestId)))
      .limit(1);
    const qtyDest = dest?.quantiteBase ?? 0;

    const annee = new Date().getFullYear();
    const seq = Date.now().toString().slice(-5);
    const ref = `TRF-${annee}-${seq}`;

    // Sortie source
    if (source) {
      await db
        .update(schema.stocks)
        .set({ quantiteBase: qtySource - quantite, updatedAt: new Date() })
        .where(eq(schema.stocks.id, source.id));
    }

    // Entrée destination (créer si n'existe pas)
    if (dest) {
      await db
        .update(schema.stocks)
        .set({ quantiteBase: qtyDest + quantite, updatedAt: new Date() })
        .where(eq(schema.stocks.id, dest.id));
    } else {
      await db.insert(schema.stocks).values({
        id: crypto.randomUUID(),
        produitId,
        depotId: depotDestId,
        quantiteBase: quantite,
      });
    }

    // Mouvements
    await db.insert(schema.mouvementsStock).values([
      {
        id: crypto.randomUUID(),
        produitId,
        depotId: depotSourceId,
        type: "transfert",
        quantiteBase: -Math.abs(quantite),
        quantiteAvant: qtySource,
        quantiteApres: qtySource - quantite,
        reference: ref,
        notes: notes ?? null,
        userId: session.user.id,
      },
      {
        id: crypto.randomUUID(),
        produitId,
        depotId: depotDestId,
        type: "transfert",
        quantiteBase: Math.abs(quantite),
        quantiteAvant: qtyDest,
        quantiteApres: qtyDest + quantite,
        reference: ref,
        notes: notes ?? null,
        userId: session.user.id,
      },
    ]);

    void sql;
    return NextResponse.json({ ok: true, reference: ref }, { status: 201 });
  } catch (e) {
    console.error("POST transferts", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
