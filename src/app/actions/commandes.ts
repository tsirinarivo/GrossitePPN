"use server";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { broadcastCommande } from "@/lib/sse/broadcast";

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function genNumero(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

export interface LigneInput {
  produitId: string;
  uniteVenteId: string;
  nomProduit: string;
  nomUnite: string;
  facteurConversion: number;
  quantite: number;
  prixUnitaire: number;
  tauxRemise?: number;
  tauxTVA?: number;
}

export interface CreerCommandeInput {
  clientId?: string;
  agentId?: string;
  depotId?: string;
  source: "pos_agent" | "ecommerce" | "telephone" | "import";
  lignes: LigneInput[];
  notes?: string;
  adresseLivraison?: string;
  idempotencyKey?: string;
}

export async function creerCommande(input: CreerCommandeInput) {
  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await db.query.commandes.findFirst({
      where: eq(schema.commandes.idempotencyKey, input.idempotencyKey),
    });
    if (existing) return { success: true, commandeId: existing.id, numero: existing.numero };
  }

  const commandeId = genId("cmd");
  const numero = genNumero("CMD");

  let totalHT = 0;
  let totalTVA = 0;
  let totalRemise = 0;

  const lignesInsert = input.lignes.map((l) => {
    const quantiteBase = l.quantite * l.facteurConversion;
    const montantRemise = Math.round(l.prixUnitaire * l.quantite * (l.tauxRemise ?? 0) / 100);
    const ht = Math.round(l.prixUnitaire * l.quantite - montantRemise);
    const tva = Math.round(ht * (l.tauxTVA ?? 0) / 100);
    totalHT += ht;
    totalTVA += tva;
    totalRemise += montantRemise;
    return {
      id: genId("lc"),
      commandeId,
      produitId: l.produitId,
      uniteVenteId: l.uniteVenteId,
      nomProduit: l.nomProduit,
      nomUnite: l.nomUnite,
      facteurConversion: l.facteurConversion,
      quantite: l.quantite,
      quantiteBase,
      prixUnitaire: l.prixUnitaire,
      tauxRemise: l.tauxRemise ?? 0,
      montantRemise,
      tauxTVA: l.tauxTVA ?? 0,
      totalHT: ht,
      totalTVA: tva,
      totalTTC: ht + tva,
    };
  });

  const totalTTC = totalHT + totalTVA;

  await db.transaction(async (tx) => {
    await tx.insert(schema.commandes).values({
      id: commandeId,
      numero,
      clientId: input.clientId,
      agentId: input.agentId,
      depotId: input.depotId ?? "depot-tana",
      source: input.source,
      statut: "soumise",
      totalHT,
      totalTVA,
      totalTTC,
      totalRemise,
      notes: input.notes,
      adresseLivraison: input.adresseLivraison,
      idempotencyKey: input.idempotencyKey,
      soumiseAt: new Date(),
    });

    await tx.insert(schema.lignesCommande).values(lignesInsert);
  });

  // Notifier la caisse via SSE
  await broadcastCommande({ commandeId, numero, source: input.source, totalTTC, clientId: input.clientId });

  revalidatePath("/pos/caisse");

  return { success: true, commandeId, numero };
}

export async function getCommandesPourCaisse() {
  return db.query.commandes.findMany({
    where: and(
      eq(schema.commandes.statut, "soumise"),
    ),
    with: {
      client: { columns: { id: true, nom: true, palier: true } },
      lignes: true,
    },
    orderBy: [desc(schema.commandes.createdAt)],
    limit: 50,
  });
}

export async function validerCommande(commandeId: string, caissierId: string) {
  const [cmd] = await db
    .update(schema.commandes)
    .set({ statut: "validee", valideeAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.commandes.id, commandeId))
    .returning();

  if (!cmd) return { success: false, error: "Commande introuvable" };

  // Créer la facture
  const factureId = genId("fac");
  const numFacture = genNumero("FAC");

  await db.insert(schema.factures).values({
    id: factureId,
    numero: numFacture,
    commandeId,
    clientId: cmd.clientId,
    caissierID: caissierId,
    totalHT: cmd.totalHT,
    totalTVA: cmd.totalTVA,
    totalTTC: cmd.totalTTC,
    totalRegle: 0,
    soldeRestant: cmd.totalTTC,
    statut: "emise",
  });

  revalidatePath("/pos/caisse");

  return { success: true, factureId, numFacture };
}

type ModePaiement = (typeof schema.modePaiementEnum.enumValues)[number];

export async function encaisserCommande(
  factureId: string,
  paiementsInput: { mode: ModePaiement; montant: number; referenceTransaction?: string }[]
) {
  const facture = await db.query.factures.findFirst({
    where: eq(schema.factures.id, factureId),
  });
  if (!facture) return { success: false, error: "Facture introuvable" };

  const totalRegle = paiementsInput.reduce((s, p) => s + p.montant, 0);
  const soldeRestant = facture.totalTTC - totalRegle;

  await db.transaction(async (tx) => {
    await tx.insert(schema.paiements).values(
      paiementsInput.map((p) => ({
        id: genId("pay"),
        factureId,
        mode: p.mode,
        montant: p.montant,
        referenceTransaction: p.referenceTransaction,
        confirme: true,
      }))
    );

    await tx
      .update(schema.factures)
      .set({
        totalRegle,
        soldeRestant,
        statut: soldeRestant <= 0 ? "payee" : "partielle",
        updatedAt: new Date(),
      })
      .where(eq(schema.factures.id, factureId));
  });

  return { success: true, totalRegle, soldeRestant };
}
