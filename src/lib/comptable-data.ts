import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, gte, lte, inArray, eq, sql } from "drizzle-orm";
import {
  venteToFec,
  achatToFec,
  demoCompteResultat,
  moisLabel,
  compteCharge,
  type FecLine,
  type CompteResultat,
} from "@/lib/comptable";

const STATUTS_VENTE = ["validee", "preparee", "en_livraison", "livree"] as const;
const STATUTS_ACHAT = ["envoye", "confirme", "partiellement_recu", "recu"] as const;

function demoFec(annee: number): FecLine[] {
  const lines: FecLine[] = [];
  let num = 1;
  for (let m = 0; m < 12; m++) {
    const ht = 9_000_000 + m * 250_000;
    const tva = Math.round(ht * 0.18);
    lines.push(
      ...venteToFec({
        numero: `CMD-DEMO-${m + 1}`,
        date: new Date(annee, m, 15),
        clientNum: "C0001",
        clientLib: "Épicerie Analakely",
        totalHT: ht,
        totalTVA: tva,
        totalTTC: ht + tva,
        ecritureNum: String(num++),
      })
    );
    const aht = 6_500_000 + m * 180_000;
    const atva = Math.round(aht * 0.18);
    lines.push(
      ...achatToFec({
        numero: `BC-DEMO-${m + 1}`,
        date: new Date(annee, m, 8),
        fournisseurNum: "F0001",
        fournisseurLib: "Grossiste Import Tamatave",
        totalHT: aht,
        totalTVA: atva,
        totalTTC: aht + atva,
        ecritureNum: String(num++),
      })
    );
  }
  return lines;
}

/**
 * Construit les écritures comptables d'une année à partir des ventes
 * (commandes validées) et des achats (bons de commande). Démo en l'absence
 * de données réelles.
 */
export async function buildAnneeFecLines(
  annee: number
): Promise<{ lines: FecLine[]; demo: boolean }> {
  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59, 999);
  const lines: FecLine[] = [];
  let ecritureNum = 1;

  try {
    const ventes = await db
      .select({
        numero: schema.commandes.numero,
        date: schema.commandes.createdAt,
        totalHT: schema.commandes.totalHT,
        totalTVA: schema.commandes.totalTVA,
        totalTTC: schema.commandes.totalTTC,
        clientCode: schema.clients.code,
        clientNom: schema.clients.raisonSociale,
      })
      .from(schema.commandes)
      .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
      .where(
        and(
          gte(schema.commandes.createdAt, debut),
          lte(schema.commandes.createdAt, fin),
          inArray(
            schema.commandes.statut,
            STATUTS_VENTE as unknown as (typeof schema.commandes.statut.enumValues)[number][]
          )
        )
      );

    for (const v of ventes) {
      lines.push(
        ...venteToFec({
          numero: v.numero,
          date: new Date(v.date),
          clientNum: v.clientCode ?? "C-DIVERS",
          clientLib: v.clientNom ?? "Client de passage",
          totalHT: v.totalHT,
          totalTVA: v.totalTVA,
          totalTTC: v.totalTTC,
          ecritureNum: String(ecritureNum++),
        })
      );
    }

    const achats = await db
      .select({
        numero: schema.bonsCommande.numero,
        date: schema.bonsCommande.createdAt,
        totalHT: schema.bonsCommande.totalHT,
        totalTVA: schema.bonsCommande.totalTVA,
        totalTTC: schema.bonsCommande.totalTTC,
        fournisseurNom: schema.fournisseurs.nom,
        fournisseurId: schema.bonsCommande.fournisseurId,
      })
      .from(schema.bonsCommande)
      .leftJoin(schema.fournisseurs, eq(schema.bonsCommande.fournisseurId, schema.fournisseurs.id))
      .where(
        and(
          gte(schema.bonsCommande.createdAt, debut),
          lte(schema.bonsCommande.createdAt, fin),
          inArray(
            schema.bonsCommande.statut,
            STATUTS_ACHAT as unknown as (typeof schema.bonsCommande.statut.enumValues)[number][]
          )
        )
      );

    for (const a of achats) {
      lines.push(
        ...achatToFec({
          numero: a.numero,
          date: new Date(a.date),
          fournisseurNum: a.fournisseurId.slice(0, 8),
          fournisseurLib: a.fournisseurNom ?? "Fournisseur",
          totalHT: a.totalHT,
          totalTVA: a.totalTVA,
          totalTTC: a.totalTTC,
          ecritureNum: String(ecritureNum++),
        })
      );
    }
  } catch (e) {
    console.error("[comptable-data]", e instanceof Error ? e.message : e);
  }

  if (lines.length === 0) {
    return { lines: demoFec(annee), demo: true };
  }
  return { lines, demo: false };
}

/** Calcule le compte de résultat d'un mois (démo si aucune donnée réelle). */
export async function computeCompteResultat(mois: string): Promise<CompteResultat> {
  const [annee, m] = mois.split("-").map(Number);
  const debut = new Date(annee!, m! - 1, 1);
  const fin = new Date(annee!, m!, 0, 23, 59, 59, 999);

  try {
    const [ventes] = await db
      .select({
        ht: sql<number>`coalesce(sum(${schema.commandes.totalHT}), 0)`,
        tva: sql<number>`coalesce(sum(${schema.commandes.totalTVA}), 0)`,
      })
      .from(schema.commandes)
      .where(
        and(
          gte(schema.commandes.createdAt, debut),
          lte(schema.commandes.createdAt, fin),
          inArray(
            schema.commandes.statut,
            STATUTS_VENTE as unknown as (typeof schema.commandes.statut.enumValues)[number][]
          )
        )
      );

    const [achats] = await db
      .select({
        ht: sql<number>`coalesce(sum(${schema.bonsCommande.totalHT}), 0)`,
        tva: sql<number>`coalesce(sum(${schema.bonsCommande.totalTVA}), 0)`,
      })
      .from(schema.bonsCommande)
      .where(
        and(
          gte(schema.bonsCommande.createdAt, debut),
          lte(schema.bonsCommande.createdAt, fin),
          inArray(
            schema.bonsCommande.statut,
            STATUTS_ACHAT as unknown as (typeof schema.bonsCommande.statut.enumValues)[number][]
          )
        )
      );

    const chargesRows = await db
      .select({
        categorie: schema.chargesOperationnelles.categorie,
        montant: sql<number>`coalesce(sum(${schema.chargesOperationnelles.montant}), 0)`,
      })
      .from(schema.chargesOperationnelles)
      .where(eq(schema.chargesOperationnelles.mois, mois))
      .groupBy(schema.chargesOperationnelles.categorie);

    const caHT = Number(ventes?.ht ?? 0);
    const tvaCollectee = Number(ventes?.tva ?? 0);
    const achatsHT = Number(achats?.ht ?? 0);
    const tvaDeductible = Number(achats?.tva ?? 0);
    const charges = chargesRows.map((c) => ({
      categorie: c.categorie,
      libelle: compteCharge(c.categorie).lib,
      montant: Number(c.montant),
    }));
    const totalCharges = charges.reduce((s, c) => s + c.montant, 0);

    if (caHT === 0 && achatsHT === 0 && totalCharges === 0) {
      return demoCompteResultat(mois);
    }

    const margeBrute = caHT - achatsHT;
    return {
      mois,
      label: moisLabel(mois),
      caHT,
      tvaCollectee,
      achatsHT,
      tvaDeductible,
      margeBrute,
      charges,
      totalCharges,
      resultat: margeBrute - totalCharges,
      tvaNette: tvaCollectee - tvaDeductible,
      demo: false,
    };
  } catch (e) {
    console.error("[computeCompteResultat]", e instanceof Error ? e.message : e);
    return demoCompteResultat(mois);
  }
}
