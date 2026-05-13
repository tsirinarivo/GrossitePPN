import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const lignes = await db
      .select({
        id: schema.lignesCommande.id,
        nom: schema.lignesCommande.nomProduit,
        unite: schema.lignesCommande.nomUnite,
        qte: schema.lignesCommande.quantite,
        prix: schema.lignesCommande.prixUnitaire,
        total: schema.lignesCommande.totalHT,
        tauxTVA: schema.lignesCommande.tauxTVA,
        totalTTC: schema.lignesCommande.totalTTC,
      })
      .from(schema.lignesCommande)
      .where(eq(schema.lignesCommande.commandeId, id));

    const commande = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        totalHT: schema.commandes.totalHT,
        totalTVA: schema.commandes.totalTVA,
        totalTTC: schema.commandes.totalTTC,
        assujettieTV: schema.commandes.assujettieTV,
      })
      .from(schema.commandes)
      .where(eq(schema.commandes.id, id))
      .limit(1);

    return NextResponse.json({ commande: commande[0] ?? null, lignes });
  } catch (e) {
    console.error("[api/caisse/commandes/[id]]", e);
    return NextResponse.json({ commande: null, lignes: [] });
  }
}
