import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { scopeTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = actor.tenantId;

  const { id } = await params;

  try {
    const [facture] = await db
      .select()
      .from(schema.factures)
      .where(scopeTenant(schema.factures.tenantId, tid, eq(schema.factures.id, id)))
      .limit(1);

    if (!facture) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

    const lignes = await db
      .select()
      .from(schema.lignesCommande)
      .where(eq(schema.lignesCommande.commandeId, facture.commandeId));

    let client = null;
    if (facture.clientId) {
      const [c] = await db
        .select({
          id: schema.clients.id,
          raisonSociale: schema.clients.raisonSociale,
          telephone: schema.clients.telephone,
          encoursCourant: schema.clients.encoursCourant,
        })
        .from(schema.clients)
        .where(eq(schema.clients.id, facture.clientId))
        .limit(1);
      client = c ?? null;
    }

    // Quantités déjà retournées pour cette facture
    const dejaRetourne = await db
      .select({
        ligneCommandeId: schema.lignesRetour.ligneCommandeId,
        total: sql<number>`coalesce(sum(${schema.lignesRetour.quantite}), 0)`,
      })
      .from(schema.lignesRetour)
      .innerJoin(schema.retours, eq(schema.lignesRetour.retourId, schema.retours.id))
      .where(eq(schema.retours.factureId, id))
      .groupBy(schema.lignesRetour.ligneCommandeId);

    const dejaMap = new Map<string, number>();
    for (const r of dejaRetourne) {
      if (r.ligneCommandeId) dejaMap.set(r.ligneCommandeId, Number(r.total) || 0);
    }

    const enrichies = lignes.map((l) => {
      const dejaRet = dejaMap.get(l.id) ?? 0;
      const qtMax = Math.max(0, Number(l.quantite) - dejaRet);
      return {
        ...l,
        dejaRetourne: dejaRet,
        quantiteRetournable: qtMax,
      };
    });

    return NextResponse.json({ facture, client, lignes: enrichies });
  } catch {
    return NextResponse.json({ error: "Erreur de chargement" }, { status: 500 });
  }
}
