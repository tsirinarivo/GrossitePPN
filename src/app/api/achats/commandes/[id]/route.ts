import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
  try {
    const { id } = await params;

    const [commande] = await db
      .select({
        id: schema.bonsCommande.id,
        numero: schema.bonsCommande.numero,
        fournisseurId: schema.bonsCommande.fournisseurId,
        fournisseurNom: schema.fournisseurs.nom,
        fournisseurContact: schema.fournisseurs.contact,
        fournisseurTelephone: schema.fournisseurs.telephone,
        fournisseurEmail: schema.fournisseurs.email,
        depotId: schema.bonsCommande.depotId,
        acheteurId: schema.bonsCommande.acheteurId,
        statut: schema.bonsCommande.statut,
        totalHT: schema.bonsCommande.totalHT,
        totalTVA: schema.bonsCommande.totalTVA,
        totalTTC: schema.bonsCommande.totalTTC,
        dateCommande: schema.bonsCommande.dateCommande,
        dateLivraisonPrevue: schema.bonsCommande.dateLivraisonPrevue,
        dateReceptionEffective: schema.bonsCommande.dateReceptionEffective,
        notes: schema.bonsCommande.notes,
        conditions: schema.bonsCommande.conditions,
        referenceFournisseur: schema.bonsCommande.referenceFournisseur,
        createdAt: schema.bonsCommande.createdAt,
        updatedAt: schema.bonsCommande.updatedAt,
      })
      .from(schema.bonsCommande)
      .leftJoin(
        schema.fournisseurs,
        eq(schema.fournisseurs.id, schema.bonsCommande.fournisseurId)
      )
      .where(scopeTenant(schema.bonsCommande.tenantId, tid, eq(schema.bonsCommande.id, id)));

    if (!commande) {
      return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });
    }

    const lignes = await db
      .select()
      .from(schema.lignesBonCommande)
      .where(eq(schema.lignesBonCommande.bonCommandeId, id));

    return NextResponse.json({ commande, lignes });
  } catch (error) {
    console.error("GET /api/achats/commandes/[id]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole("admin", "gerant", "magasinier");
  if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const tid = actor.tenantId;

  try {
    const { id } = await params;
    const body = await req.json();

    const [commande] = await db
      .select()
      .from(schema.bonsCommande)
      .where(scopeTenant(schema.bonsCommande.tenantId, tid, eq(schema.bonsCommande.id, id)));

    if (!commande) {
      return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });
    }

    const { action } = body;

    if (action === "envoyer") {
      const [updated] = await db
        .update(schema.bonsCommande)
        .set({ statut: "envoye", updatedAt: new Date() })
        .where(scopeTenant(schema.bonsCommande.tenantId, tid, eq(schema.bonsCommande.id, id)))
        .returning();
      return NextResponse.json({ commande: updated });
    }

    if (action === "confirmer") {
      const [updated] = await db
        .update(schema.bonsCommande)
        .set({ statut: "confirme", updatedAt: new Date() })
        .where(scopeTenant(schema.bonsCommande.tenantId, tid, eq(schema.bonsCommande.id, id)))
        .returning();
      return NextResponse.json({ commande: updated });
    }

    if (action === "annuler") {
      const annulables = ["brouillon", "envoye", "confirme"];
      if (!annulables.includes(commande.statut)) {
        return NextResponse.json(
          { error: `Impossible d'annuler un bon de commande en statut "${commande.statut}"` },
          { status: 400 }
        );
      }
      const [updated] = await db
        .update(schema.bonsCommande)
        .set({ statut: "annule", updatedAt: new Date() })
        .where(scopeTenant(schema.bonsCommande.tenantId, tid, eq(schema.bonsCommande.id, id)))
        .returning();
      return NextResponse.json({ commande: updated });
    }

    if (action === "update_lignes") {
      if (commande.statut !== "brouillon") {
        return NextResponse.json(
          { error: "Les lignes ne peuvent être modifiées que sur un brouillon" },
          { status: 400 }
        );
      }

      type LigneInput = {
        produitId: string;
        nomProduit: string;
        nomUnite: string;
        facteurConversion: number;
        quantiteCommandee: number;
        quantiteBase: number;
        prixUnitaireHT: number;
        tauxTVA: number;
      };

      const lignes: LigneInput[] = body.lignes ?? [];

      const lignesCalculees = lignes.map((l) => {
        const totalHT = Math.round(l.quantiteCommandee * l.prixUnitaireHT);
        const totalTVA = Math.round((totalHT * (l.tauxTVA ?? 0)) / 100);
        const totalTTC = totalHT + totalTVA;
        return { ...l, totalHT, totalTVA, totalTTC };
      });

      const bcTotalHT = lignesCalculees.reduce((s, l) => s + l.totalHT, 0);
      const bcTotalTVA = lignesCalculees.reduce((s, l) => s + l.totalTVA, 0);
      const bcTotalTTC = lignesCalculees.reduce((s, l) => s + l.totalTTC, 0);

      // Delete existing lines and reinsert
      await db
        .delete(schema.lignesBonCommande)
        .where(eq(schema.lignesBonCommande.bonCommandeId, id));

      let newLignes: (typeof schema.lignesBonCommande.$inferSelect)[] = [];
      if (lignesCalculees.length > 0) {
        newLignes = await db
          .insert(schema.lignesBonCommande)
          .values(
            lignesCalculees.map((l) => ({
              id: crypto.randomUUID(),
              bonCommandeId: id,
              produitId: l.produitId,
              nomProduit: l.nomProduit,
              nomUnite: l.nomUnite,
              facteurConversion: l.facteurConversion ?? 1,
              quantiteCommandee: l.quantiteCommandee,
              quantiteRecue: 0,
              quantiteBase: l.quantiteBase,
              prixUnitaireHT: l.prixUnitaireHT,
              tauxTVA: l.tauxTVA ?? 0,
              totalHT: l.totalHT,
              totalTVA: l.totalTVA,
              totalTTC: l.totalTTC,
            }))
          )
          .returning();
      }

      const [updated] = await db
        .update(schema.bonsCommande)
        .set({
          totalHT: bcTotalHT,
          totalTVA: bcTotalTVA,
          totalTTC: bcTotalTTC,
          updatedAt: new Date(),
        })
        .where(scopeTenant(schema.bonsCommande.tenantId, tid, eq(schema.bonsCommande.id, id)))
        .returning();

      return NextResponse.json({ commande: updated, lignes: newLignes });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/achats/commandes/[id]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
