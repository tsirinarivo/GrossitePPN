import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, notInArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { broadcastMiseAJour, broadcastAnnulation } from "@/lib/sse/broadcast";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const lignes = await db
      .select({
        id: schema.lignesCommande.id,
        produitId: schema.lignesCommande.produitId,
        uniteVenteId: schema.lignesCommande.uniteVenteId,
        nom: schema.lignesCommande.nomProduit,
        unite: schema.lignesCommande.nomUnite,
        facteurConversion: schema.lignesCommande.facteurConversion,
        qte: schema.lignesCommande.quantite,
        qteBase: schema.lignesCommande.quantiteBase,
        prix: schema.lignesCommande.prixUnitaire,
        tauxRemise: schema.lignesCommande.tauxRemise,
        montantRemise: schema.lignesCommande.montantRemise,
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

function getTierFidelite(points: number): "bronze" | "argent" | "or" | "platine" {
  if (points >= 200_000) return "platine";
  if (points >= 50_000) return "or";
  if (points >= 10_000) return "argent";
  return "bronze";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const modePaiement: string = body?.modePaiement ?? "especes";

  try {
    // Atomic state transition — prevents double-validation and race conditions
    const [updated] = await db
      .update(schema.commandes)
      .set({ statut: "validee", valideeAt: new Date() })
      .where(
        and(
          eq(schema.commandes.id, id),
          notInArray(schema.commandes.statut, ["validee", "annulee"])
        )
      )
      .returning({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        depotId: schema.commandes.depotId,
        clientId: schema.commandes.clientId,
        totalHT: schema.commandes.totalHT,
        totalTVA: schema.commandes.totalTVA,
        totalTTC: schema.commandes.totalTTC,
        assujettieTV: schema.commandes.assujettieTV,
      });

    if (!updated) {
      const [existing] = await db
        .select({ statut: schema.commandes.statut })
        .from(schema.commandes)
        .where(eq(schema.commandes.id, id))
        .limit(1);
      if (!existing) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
      return NextResponse.json({ error: "Commande déjà traitée" }, { status: 409 });
    }

    // ── 1. Déduction de stock ──────────────────────────────────────────────
    if (updated.depotId) {
      const depotId = updated.depotId;
      const lignes = await db
        .select({
          produitId: schema.lignesCommande.produitId,
          quantiteBase: schema.lignesCommande.quantiteBase,
        })
        .from(schema.lignesCommande)
        .where(eq(schema.lignesCommande.commandeId, id));

      for (const ligne of lignes) {
        const [stockRow] = await db
          .select({ quantiteBase: schema.stocks.quantiteBase })
          .from(schema.stocks)
          .where(
            and(
              eq(schema.stocks.produitId, ligne.produitId),
              eq(schema.stocks.depotId, depotId)
            )
          )
          .limit(1);

        const avant = stockRow?.quantiteBase ?? 0;
        const apres = Math.max(0, avant - ligne.quantiteBase);

        if (stockRow) {
          await db
            .update(schema.stocks)
            .set({ quantiteBase: apres, updatedAt: new Date() })
            .where(
              and(
                eq(schema.stocks.produitId, ligne.produitId),
                eq(schema.stocks.depotId, depotId)
              )
            );
        }

        await db.insert(schema.mouvementsStock).values({
          id: crypto.randomUUID(),
          produitId: ligne.produitId,
          depotId,
          type: "vente",
          quantiteBase: ligne.quantiteBase,
          quantiteAvant: avant,
          quantiteApres: apres,
          reference: updated.numero,
          userId: session.user.id,
        });
      }
    }

    // ── 2. Création facture + paiement ─────────────────────────────────────
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const factureNumero = `FAC-${datePart}-${rand}`;
    const factureId = crypto.randomUUID();

    await db.insert(schema.factures).values({
      id: factureId,
      numero: factureNumero,
      commandeId: id,
      clientId: updated.clientId ?? null,
      caissierID: session.user.id,
      totalHT: updated.totalHT,
      totalTVA: updated.totalTVA,
      totalTTC: updated.totalTTC,
      totalRegle: updated.totalTTC,
      soldeRestant: 0,
      modePaiement: modePaiement as Parameters<typeof db.insert>[0] extends never ? never : "especes",
      statut: "payee",
    });

    await db.insert(schema.paiements).values({
      id: crypto.randomUUID(),
      factureId,
      mode: modePaiement as "especes",
      montant: updated.totalTTC,
      confirme: true,
    });

    // ── 3. Mise à jour stats + encours client ──────────────────────────────
    if (updated.clientId) {
      const [client] = await db
        .select({
          totalAchats: schema.clients.totalAchats,
          nbCommandes: schema.clients.nbCommandes,
          pointsFidelite: schema.clients.pointsFidelite,
          encoursCourant: schema.clients.encoursCourant,
          creditAutorise: schema.clients.creditAutorise,
        })
        .from(schema.clients)
        .where(eq(schema.clients.id, updated.clientId))
        .limit(1);

      if (client) {
        const nouveauTotal = client.totalAchats + updated.totalTTC;
        const nouveauNb = client.nbCommandes + 1;
        const nouveauPanier = Math.round(nouveauTotal / nouveauNb);

        // Encours: incrémenter si paiement à crédit, décrémenter sinon (si mode = "credit_client")
        const deltaEncours = modePaiement === "credit_client" ? updated.totalTTC : 0;
        const nouvelEncours = Math.max(0, client.encoursCourant + deltaEncours);

        // Points fidélité: 1 point par 1 000 MGA
        const pointsGagnes = Math.floor(updated.totalTTC / 1000);
        const nouveauxPoints = client.pointsFidelite + pointsGagnes;
        const nouveauTier = getTierFidelite(nouveauxPoints);

        await db.update(schema.clients).set({
          totalAchats: nouveauTotal,
          nbCommandes: nouveauNb,
          panierMoyen: nouveauPanier,
          dernierAchat: now,
          encoursCourant: nouvelEncours,
          pointsFidelite: nouveauxPoints,
          statutFidelite: nouveauTier,
          updatedAt: now,
        }).where(eq(schema.clients.id, updated.clientId));

        if (pointsGagnes > 0) {
          await db.insert(schema.transactionsFidelite).values({
            id: crypto.randomUUID(),
            clientId: updated.clientId,
            type: "gain",
            points: pointsGagnes,
            soldeApres: nouveauxPoints,
            reference: updated.numero,
            notes: `Vente ${updated.numero}`,
          });
        }
      }
    }

    broadcastAnnulation({ commandeId: id, numero: updated.numero });

    return NextResponse.json({ ok: true, factureNumero });
  } catch (e) {
    console.error("[api/caisse/commandes/[id] PATCH]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  try {
    const [commande] = await db
      .select({ id: schema.commandes.id, statut: schema.commandes.statut, numero: schema.commandes.numero })
      .from(schema.commandes)
      .where(eq(schema.commandes.id, id))
      .limit(1);

    if (!commande) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (!["soumise", "en_attente"].includes(commande.statut)) {
      return NextResponse.json({ error: "Commande déjà prise en charge, annulation impossible" }, { status: 409 });
    }

    await db
      .update(schema.commandes)
      .set({ statut: "annulee" })
      .where(eq(schema.commandes.id, id));

    broadcastAnnulation({ commandeId: id, numero: commande.numero });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/caisse/commandes/[id] DELETE]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
