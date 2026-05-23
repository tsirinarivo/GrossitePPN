import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type MotifRetour =
  | "defectueux"
  | "non_conforme"
  | "erreur_livraison"
  | "date_peremption"
  | "geste_commercial"
  | "autre";

type ModeRemb =
  | "avoir_credit"
  | "remboursement_especes"
  | "remboursement_virement"
  | "remboursement_mobile";

type LigneInput = {
  ligneCommandeId?: string;
  produitId?: string;
  nomProduit: string;
  nomUnite: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA?: number;
  motifLigne?: string;
};

// ── GET /api/retours ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 500);

  try {
    const rows = await db
      .select({
        id: schema.retours.id,
        numero: schema.retours.numero,
        clientId: schema.retours.clientId,
        factureId: schema.retours.factureId,
        motif: schema.retours.motif,
        motifDetail: schema.retours.motifDetail,
        modeRemboursement: schema.retours.modeRemboursement,
        statut: schema.retours.statut,
        totalHT: schema.retours.totalHT,
        totalTVA: schema.retours.totalTVA,
        totalTTC: schema.retours.totalTTC,
        createdAt: schema.retours.createdAt,
        clientNom: schema.clients.raisonSociale,
        factureNumero: schema.factures.numero,
      })
      .from(schema.retours)
      .leftJoin(schema.clients, eq(schema.retours.clientId, schema.clients.id))
      .leftJoin(schema.factures, eq(schema.retours.factureId, schema.factures.id))
      .where(clientId ? eq(schema.retours.clientId, clientId) : undefined)
      .orderBy(desc(schema.retours.createdAt))
      .limit(limit);

    const totalRembourse = rows.reduce((s, r) => s + (r.totalTTC ?? 0), 0);
    const totalAvoir = rows
      .filter((r) => r.modeRemboursement === "avoir_credit")
      .reduce((s, r) => s + (r.totalTTC ?? 0), 0);
    const totalEspeces = rows
      .filter((r) => r.modeRemboursement !== "avoir_credit")
      .reduce((s, r) => s + (r.totalTTC ?? 0), 0);

    return NextResponse.json({
      retours: rows,
      stats: {
        total: rows.length,
        totalRembourse,
        totalAvoir,
        totalEspeces,
      },
    });
  } catch {
    return NextResponse.json({
      retours: [],
      stats: { total: 0, totalRembourse: 0, totalAvoir: 0, totalEspeces: 0 },
    });
  }
}

// ── POST /api/retours ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const {
    factureId,
    motif,
    motifDetail,
    modeRemboursement,
    notes,
    lignes,
  } = body as {
    factureId?: string;
    motif: MotifRetour;
    motifDetail?: string;
    modeRemboursement: ModeRemb;
    notes?: string;
    lignes: LigneInput[];
  };

  if (!motif || !modeRemboursement || !Array.isArray(lignes) || lignes.length === 0) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  // Dérive clientId/commandeId depuis la facture (pas de confiance au body)
  let clientId: string | null = null;
  let commandeId: string | null = null;
  if (factureId) {
    const [facture] = await db
      .select({ clientId: schema.factures.clientId, commandeId: schema.factures.commandeId })
      .from(schema.factures)
      .where(eq(schema.factures.id, factureId))
      .limit(1);
    if (!facture) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }
    clientId = facture.clientId;
    commandeId = facture.commandeId;
  }

  // Compute totals — refuse les valeurs négatives ou nulles
  let totalHT = 0;
  let totalTVA = 0;
  let totalTTC = 0;

  type LigneCalculee = LigneInput & {
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
  };
  const lignesData: LigneCalculee[] = [];
  for (const l of lignes) {
    const qte = Number(l.quantite) || 0;
    const pu = Math.round(Number(l.prixUnitaire) || 0);
    const tva = Math.max(0, Math.min(100, Number(l.tauxTVA ?? 0)));

    if (qte <= 0) {
      return NextResponse.json(
        { error: `Quantité invalide pour ${l.nomProduit ?? "ligne"} (doit être > 0)` },
        { status: 400 }
      );
    }
    if (pu < 0) {
      return NextResponse.json(
        { error: `Prix unitaire négatif refusé pour ${l.nomProduit ?? "ligne"}` },
        { status: 400 }
      );
    }

    const ht = Math.round(qte * pu);
    const montantTVA = Math.round(ht * (tva / 100));
    const ttc = ht + montantTVA;
    totalHT += ht;
    totalTVA += montantTVA;
    totalTTC += ttc;

    lignesData.push({
      ...l,
      quantite: qte,
      prixUnitaire: pu,
      tauxTVA: Math.round(tva),
      totalHT: ht,
      totalTVA: montantTVA,
      totalTTC: ttc,
    });
  }

  try {
    // Numéro retour
    const year = new Date().getFullYear();
    const countRow = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.retours);
    const seq = String((countRow[0]?.c ?? 0) + 1).padStart(4, "0");
    const numero = `RET-${year}-${seq}`;

    const retourId = crypto.randomUUID();
    const userId = (session.user as { id?: string })?.id ?? null;

    const [retour] = await db
      .insert(schema.retours)
      .values({
        id: retourId,
        numero,
        factureId: factureId ?? null,
        commandeId: commandeId ?? null,
        clientId: clientId ?? null,
        agentId: userId,
        motif,
        motifDetail: motifDetail ?? null,
        modeRemboursement,
        statut: "valide",
        totalHT,
        totalTVA,
        totalTTC,
        notes: notes ?? null,
      })
      .returning();

    // Insert lignes
    if (lignesData.length > 0) {
      await db.insert(schema.lignesRetour).values(
        lignesData.map((l) => ({
          id: crypto.randomUUID(),
          retourId,
          ligneCommandeId: l.ligneCommandeId ?? null,
          produitId: l.produitId ?? null,
          nomProduit: l.nomProduit,
          nomUnite: l.nomUnite,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          tauxTVA: l.tauxTVA,
          totalHT: l.totalHT,
          totalTVA: l.totalTVA,
          totalTTC: l.totalTTC,
          motifLigne: l.motifLigne ?? null,
        }))
      );
    }

    // Avoir si avoir_credit
    let avoir: typeof schema.avoirs.$inferSelect | null = null;
    if (modeRemboursement === "avoir_credit") {
      const countAvoir = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.avoirs);
      const avoirSeq = String((countAvoir[0]?.c ?? 0) + 1).padStart(4, "0");
      const [created] = await db
        .insert(schema.avoirs)
        .values({
          id: crypto.randomUUID(),
          numero: `AV-${year}-${avoirSeq}`,
          retourId,
          factureId: factureId ?? null,
          clientId: clientId ?? null,
          totalHT,
          totalTVA,
          totalTTC,
          statut: "emis",
        })
        .returning();
      avoir = created ?? null;

      // Diminue l'encours du client si crédit
      if (clientId) {
        await db
          .update(schema.clients)
          .set({
            encoursCourant: sql`GREATEST(COALESCE(${schema.clients.encoursCourant}, 0) - ${totalTTC}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(schema.clients.id, clientId));
      }
    }

    // ── Réintégration stock pour chaque ligne avec produitId ───────────────
    // On crédite le dépôt principal (ou n'importe quel actif si pas de principal)
    try {
      const lignesAvecProduit = lignesData.filter((l) => l.produitId);
      if (lignesAvecProduit.length > 0) {
        const [depotCible] = await db
          .select({ id: schema.depots.id })
          .from(schema.depots)
          .where(eq(schema.depots.actif, true))
          .orderBy(sql`${schema.depots.estPrincipal} DESC NULLS LAST`)
          .limit(1);

        if (depotCible) {
          for (const l of lignesAvecProduit) {
            const [stockRow] = await db
              .select({ id: schema.stocks.id, quantiteBase: schema.stocks.quantiteBase })
              .from(schema.stocks)
              .where(
                and(
                  eq(schema.stocks.produitId, l.produitId!),
                  eq(schema.stocks.depotId, depotCible.id)
                )
              )
              .limit(1);

            const avant = stockRow?.quantiteBase ?? 0;
            const apres = avant + l.quantite;

            if (stockRow) {
              await db
                .update(schema.stocks)
                .set({ quantiteBase: apres, updatedAt: new Date() })
                .where(eq(schema.stocks.id, stockRow.id));
            } else {
              await db.insert(schema.stocks).values({
                id: crypto.randomUUID(),
                produitId: l.produitId!,
                depotId: depotCible.id,
                quantiteBase: apres,
              });
            }

            await db.insert(schema.mouvementsStock).values({
              id: crypto.randomUUID(),
              produitId: l.produitId!,
              depotId: depotCible.id,
              type: "retour",
              quantiteBase: l.quantite,
              quantiteAvant: avant,
              quantiteApres: apres,
              reference: numero,
              notes: `Retour client — motif: ${motif}`,
              userId,
            });
          }
        }
      }
    } catch (stockErr) {
      // Best-effort : on ne bloque pas la création du retour si le stock échoue
      console.error("[retour] Erreur réintégration stock:", stockErr);
    }

    await logAudit({
      action: "retour.creer",
      entite: "retour",
      entiteId: retourId,
      details: { numero, totalTTC, motif, modeRemboursement, clientId, factureId, avoirNumero: avoir?.numero },
    });

    return NextResponse.json({ retour, avoir }, { status: 201 });
  } catch (e) {
    console.error("Erreur création retour:", e);
    return NextResponse.json(
      { error: "Table absente — exécutez pnpm drizzle-kit push sur le VPS" },
      { status: 503 }
    );
  }
}
