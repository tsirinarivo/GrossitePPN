import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemoLignes(factureId: string) {
  return {
    facture: {
      id: factureId,
      numero: "FAC-2026-DEMO",
      clientId: "demo-cli-1",
      totalHT: 700000,
      totalTVA: 140000,
      totalTTC: 840000,
      createdAt: new Date().toISOString(),
    },
    client: { id: "demo-cli-1", raisonSociale: "Épicerie Soafia", adresse: "Lot II A 14 Ankorondrano" },
    lignes: [
      { id: "demo-lig-1", produitId: "demo-prod-1", nomProduit: "Riz Makalioka 50kg", nomUnite: "sac", quantite: 5, prixUnitaire: 110000, tauxTVA: 20, totalHT: 550000, totalTVA: 110000, totalTTC: 660000 },
      { id: "demo-lig-2", produitId: "demo-prod-2", nomProduit: "Huile Tournesol 5L", nomUnite: "bidon", quantite: 3, prixUnitaire: 50000, tauxTVA: 20, totalHT: 150000, totalTVA: 30000, totalTTC: 180000 },
    ],
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const [facture] = await db
      .select()
      .from(schema.factures)
      .where(eq(schema.factures.id, id))
      .limit(1);

    if (!facture) {
      if (id.startsWith("demo-")) return NextResponse.json(buildDemoLignes(id));
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    const lignes = await db
      .select()
      .from(schema.lignesCommande)
      .where(eq(schema.lignesCommande.commandeId, facture.commandeId));

    let client = null;
    if (facture.clientId) {
      const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, facture.clientId)).limit(1);
      client = c ?? null;
    }

    return NextResponse.json({ facture, lignes, client });
  } catch {
    return NextResponse.json(buildDemoLignes(id));
  }
}
