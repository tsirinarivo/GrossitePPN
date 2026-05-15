import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      bonCommandeId,
      depotId,
      notes,
      lignes = [],
    }: {
      bonCommandeId: string;
      depotId?: string;
      notes?: string;
      lignes: {
        ligneBCId: string;
        produitId: string;
        quantiteRecue: number;
        quantiteBase: number;
        numeroLot?: string;
        anomalie?: string;
      }[];
    } = body;

    if (!bonCommandeId) {
      return NextResponse.json({ error: "bonCommandeId est requis" }, { status: 400 });
    }
    if (!depotId) {
      return NextResponse.json({ error: "depotId est requis" }, { status: 400 });
    }
    const safeDepotId: string = depotId;
    if (!lignes.length) {
      return NextResponse.json({ error: "Au moins une ligne est requise" }, { status: 400 });
    }

    // Verify BC exists and is in a receivable status
    const [bc] = await db
      .select()
      .from(schema.bonsCommande)
      .where(eq(schema.bonsCommande.id, bonCommandeId));

    if (!bc) {
      return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });
    }

    if (bc.statut !== "confirme" && bc.statut !== "partiellement_recu") {
      return NextResponse.json(
        {
          error: `Impossible de réceptionner un bon de commande en statut "${bc.statut}". Il doit être "confirme" ou "partiellement_recu".`,
        },
        { status: 400 }
      );
    }

    // Generate numero REC-{YYYY}-{NNNN}
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    const [maxRow] = await db
      .select({
        maxNumero: sql<string>`max(${schema.receptions.numero})`,
      })
      .from(schema.receptions)
      .where(sql`${schema.receptions.numero} like ${prefix + "%"}`);

    let nextSeq = 1;
    if (maxRow?.maxNumero) {
      const parts = maxRow.maxNumero.split("-");
      const lastPart = parts[parts.length - 1] ?? "";
      const lastSeq = parseInt(lastPart, 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    const numero = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    const receptionId = crypto.randomUUID();

    // Insert reception header
    const [reception] = await db
      .insert(schema.receptions)
      .values({
        id: receptionId,
        numero,
        bonCommandeId,
        depotId: safeDepotId,
        receptionneurId: session.user.id,
        statut: "complete",
        notes: notes ?? null,
      })
      .returning();

    // Insert reception lines
    await db.insert(schema.lignesReception).values(
      lignes.map((l) => ({
        id: crypto.randomUUID(),
        receptionId,
        ligneBCId: l.ligneBCId,
        produitId: l.produitId,
        quantiteRecue: l.quantiteRecue,
        quantiteBase: l.quantiteBase,
        numeroLot: l.numeroLot ?? null,
        anomalie: l.anomalie ?? null,
      }))
    );

    // Update quantiteRecue on each BC line and create stock movements
    for (const l of lignes) {
      // Update BC line received quantity
      await db
        .execute(
          sql`UPDATE lignes_bon_commande SET quantite_recue = quantite_recue + ${l.quantiteRecue} WHERE id = ${l.ligneBCId}`
        );

      // Get current stock for movement tracking
      const [currentStock] = await db
        .select({ quantiteBase: schema.stocks.quantiteBase })
        .from(schema.stocks)
        .where(
          sql`${schema.stocks.produitId} = ${l.produitId} AND ${schema.stocks.depotId} = ${safeDepotId}`
        );

      const quantiteAvant = currentStock?.quantiteBase ?? 0;
      const quantiteApres = quantiteAvant + l.quantiteBase;

      // Upsert stock
      await db
        .execute(
          sql`
            INSERT INTO stocks (id, produit_id, depot_id, quantite_base, updated_at)
            VALUES (${crypto.randomUUID()}, ${l.produitId}, ${safeDepotId}, ${l.quantiteBase}, now())
            ON CONFLICT (produit_id, depot_id)
            DO UPDATE SET quantite_base = stocks.quantite_base + ${l.quantiteBase}, updated_at = now()
          `
        );

      // Create stock movement
      await db.insert(schema.mouvementsStock).values({
        id: crypto.randomUUID(),
        produitId: l.produitId,
        depotId: safeDepotId,
        type: "entrée",
        quantiteBase: l.quantiteBase,
        quantiteAvant,
        quantiteApres,
        reference: numero,
        notes: `Réception ${numero} — BC ${bc.numero}`,
        userId: session.user.id,
      });
    }

    // Fetch updated BC lines to check if fully received
    const allBcLignes = await db
      .select({
        quantiteCommandee: schema.lignesBonCommande.quantiteCommandee,
        quantiteRecue: schema.lignesBonCommande.quantiteRecue,
      })
      .from(schema.lignesBonCommande)
      .where(eq(schema.lignesBonCommande.bonCommandeId, bonCommandeId));

    const toutRecu = allBcLignes.every(
      (ligne) => ligne.quantiteRecue >= ligne.quantiteCommandee
    );

    const newStatut = toutRecu ? "recu" : "partiellement_recu";

    await db
      .update(schema.bonsCommande)
      .set({
        statut: newStatut,
        dateReceptionEffective: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.bonsCommande.id, bonCommandeId));

    return NextResponse.json({ reception }, { status: 201 });
  } catch (error) {
    console.error("POST /api/achats/receptions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
