import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const statut = searchParams.get("statut");

    const query = db
      .select({
        id: schema.bonsCommande.id,
        numero: schema.bonsCommande.numero,
        fournisseurId: schema.bonsCommande.fournisseurId,
        fournisseurNom: schema.fournisseurs.nom,
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
        nbLignes: sql<number>`cast(count(${schema.lignesBonCommande.id}) as integer)`,
      })
      .from(schema.bonsCommande)
      .leftJoin(
        schema.fournisseurs,
        eq(schema.fournisseurs.id, schema.bonsCommande.fournisseurId)
      )
      .leftJoin(
        schema.lignesBonCommande,
        eq(schema.lignesBonCommande.bonCommandeId, schema.bonsCommande.id)
      )
      .groupBy(schema.bonsCommande.id, schema.fournisseurs.id)
      .orderBy(desc(schema.bonsCommande.createdAt));

    let commandes;
    if (statut) {
      commandes = await query.where(
        eq(schema.bonsCommande.statut, statut as typeof schema.bonsCommande.$inferSelect.statut)
      );
    } else {
      commandes = await query;
    }

    return NextResponse.json({ commandes });
  } catch (error) {
    console.error("GET /api/achats/commandes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      fournisseurId,
      depotId,
      dateLivraisonPrevue,
      notes,
      conditions,
      referenceFournisseur,
      lignes = [],
    } = body;

    if (!fournisseurId) {
      return NextResponse.json({ error: "fournisseurId est requis" }, { status: 400 });
    }

    // Generate numero BC-{YYYY}-{NNNN}
    const year = new Date().getFullYear();
    const prefix = `BC-${year}-`;

    const [maxRow] = await db
      .select({
        maxNumero: sql<string>`max(${schema.bonsCommande.numero})`,
      })
      .from(schema.bonsCommande)
      .where(sql`${schema.bonsCommande.numero} like ${prefix + "%"}`);

    let nextSeq = 1;
    if (maxRow?.maxNumero) {
      const parts = maxRow.maxNumero.split("-");
      const lastPart = parts[parts.length - 1] ?? "";
      const lastSeq = parseInt(lastPart, 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    const numero = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // Calculate line totals
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

    const lignesCalculees = (lignes as LigneInput[]).map((l) => {
      const totalHT = Math.round(l.quantiteCommandee * l.prixUnitaireHT);
      const totalTVA = Math.round((totalHT * (l.tauxTVA ?? 0)) / 100);
      const totalTTC = totalHT + totalTVA;
      return { ...l, totalHT, totalTVA, totalTTC };
    });

    const bcTotalHT = lignesCalculees.reduce((s, l) => s + l.totalHT, 0);
    const bcTotalTVA = lignesCalculees.reduce((s, l) => s + l.totalTVA, 0);
    const bcTotalTTC = lignesCalculees.reduce((s, l) => s + l.totalTTC, 0);

    const bcId = crypto.randomUUID();

    const [commande] = await db
      .insert(schema.bonsCommande)
      .values({
        id: bcId,
        numero,
        fournisseurId,
        depotId: depotId ?? null,
        acheteurId: session.user.id,
        statut: "brouillon",
        totalHT: bcTotalHT,
        totalTVA: bcTotalTVA,
        totalTTC: bcTotalTTC,
        dateLivraisonPrevue: dateLivraisonPrevue ? new Date(dateLivraisonPrevue) : null,
        notes: notes ?? null,
        conditions: conditions ?? null,
        referenceFournisseur: referenceFournisseur ?? null,
      })
      .returning();

    let insertedLignes: (typeof schema.lignesBonCommande.$inferSelect)[] = [];
    if (lignesCalculees.length > 0) {
      insertedLignes = await db
        .insert(schema.lignesBonCommande)
        .values(
          lignesCalculees.map((l) => ({
            id: crypto.randomUUID(),
            bonCommandeId: bcId,
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

    return NextResponse.json({ commande, lignes: insertedLignes }, { status: 201 });
  } catch (error) {
    console.error("POST /api/achats/commandes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
