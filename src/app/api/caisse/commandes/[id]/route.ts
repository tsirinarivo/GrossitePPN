import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { broadcastMiseAJour } from "@/lib/sse/broadcast";

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
    console.error("[api/caisse/commandes/[id] GET]", e);
    return NextResponse.json({ commande: null, lignes: [] });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { lignes, totalHT, totalTVA, totalTTC, totalRemise } = body;

    if (!lignes || lignes.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    // Vérifier que la commande existe et est encore modifiable
    const [commande] = await db
      .select({ id: schema.commandes.id, statut: schema.commandes.statut, numero: schema.commandes.numero })
      .from(schema.commandes)
      .where(eq(schema.commandes.id, id))
      .limit(1);

    if (!commande) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (commande.statut !== "soumise") {
      return NextResponse.json({ error: "Commande déjà prise en charge, modification impossible" }, { status: 409 });
    }

    // Remplacer toutes les lignes
    await db.delete(schema.lignesCommande).where(eq(schema.lignesCommande.commandeId, id));

    const lignesValues = lignes.map((l: {
      produitId: string;
      uniteId: string;
      nomProduit: string;
      nomUnite: string;
      facteurConversion: number;
      quantite: number;
      quantiteBase: number;
      prixUnitaire: number;
      tauxRemise: number;
      montantRemise: number;
      tauxTVA: number;
      totalHT: number;
      totalTVA: number;
      totalTTC: number;
      notes?: string;
    }) => ({
      id: crypto.randomUUID(),
      commandeId: id,
      produitId: l.produitId,
      uniteVenteId: l.uniteId !== "default" ? l.uniteId : null,
      nomProduit: l.nomProduit,
      nomUnite: l.nomUnite,
      facteurConversion: l.facteurConversion,
      quantite: l.quantite,
      quantiteBase: l.quantiteBase,
      prixUnitaire: Math.round(l.prixUnitaire),
      tauxRemise: l.tauxRemise,
      montantRemise: Math.round(l.montantRemise),
      tauxTVA: l.tauxTVA,
      totalHT: Math.round(l.totalHT),
      totalTVA: Math.round(l.totalTVA),
      totalTTC: Math.round(l.totalTTC),
      notes: l.notes ?? null,
    }));

    await db.insert(schema.lignesCommande).values(lignesValues);

    // Mettre à jour les totaux de la commande
    await db
      .update(schema.commandes)
      .set({
        totalHT: Math.round(totalHT ?? 0),
        totalTVA: Math.round(totalTVA ?? 0),
        totalTTC: Math.round(totalTTC ?? 0),
        totalRemise: Math.round(totalRemise ?? 0),
      })
      .where(eq(schema.commandes.id, id));

    // Notifier la caisse de la mise à jour
    broadcastMiseAJour({
      commandeId: id,
      numero: commande.numero,
      totalTTC: Math.round(totalTTC ?? 0),
      nbArticles: lignes.length,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/caisse/commandes/[id] PUT]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
