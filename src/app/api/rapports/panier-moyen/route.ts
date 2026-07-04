import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, gte, inArray, sql, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isDemoFallbackEnabled } from "@/lib/demo-mode";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Tranche = { tranche: string; nbCommandes: number; ttcSum: number };
type DuoProduit = {
  produitA: string;
  produitB: string;
  cooccurrences: number;
  pctCoOcc: number;
};

const STATUTS_VALIDES = ["validee", "preparee", "en_livraison", "livree"] as const;

const TRANCHES: { min: number; max: number; label: string }[] = [
  { min: 0, max: 50_000, label: "< 50k" },
  { min: 50_000, max: 100_000, label: "50k - 100k" },
  { min: 100_000, max: 250_000, label: "100k - 250k" },
  { min: 250_000, max: 500_000, label: "250k - 500k" },
  { min: 500_000, max: 1_000_000, label: "500k - 1M" },
  { min: 1_000_000, max: Infinity, label: "> 1M" },
];

const DEMO_TRANCHES: Tranche[] = [
  { tranche: "< 50k", nbCommandes: 42, ttcSum: 1_580_000 },
  { tranche: "50k - 100k", nbCommandes: 68, ttcSum: 5_240_000 },
  { tranche: "100k - 250k", nbCommandes: 95, ttcSum: 15_870_000 },
  { tranche: "250k - 500k", nbCommandes: 54, ttcSum: 18_500_000 },
  { tranche: "500k - 1M", nbCommandes: 28, ttcSum: 19_200_000 },
  { tranche: "> 1M", nbCommandes: 12, ttcSum: 18_400_000 },
];

const DEMO_DUOS: DuoProduit[] = [
  { produitA: "Riz Makalioka 25kg", produitB: "Huile palme 5L", cooccurrences: 18, pctCoOcc: 62 },
  { produitA: "Sucre cristal 25kg", produitB: "Lait concentré 397g", cooccurrences: 14, pctCoOcc: 48 },
  { produitA: "Farine T55 10kg", produitB: "Huile palme 5L", cooccurrences: 12, pctCoOcc: 41 },
  { produitA: "Pâtes spaghetti 500g", produitB: "Sauce tomate 400g", cooccurrences: 11, pctCoOcc: 75 },
  { produitA: "Café Robusta 250g", produitB: "Sucre cristal 25kg", cooccurrences: 9, pctCoOcc: 30 },
];

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  const periode = new URL(req.url).searchParams.get("periode") ?? "3mois";

  const now = new Date();
  let debut: Date;
  if (periode === "mois") {
    debut = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (periode === "annee") {
    debut = new Date(now.getFullYear(), 0, 1);
  } else if (periode === "12mois") {
    debut = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  } else {
    debut = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  }

  try {
    const commandes = await db
      .select({
        id: schema.commandes.id,
        totalTTC: schema.commandes.totalTTC,
      })
      .from(schema.commandes)
      .where(
        and(
          inArray(schema.commandes.statut, [...STATUTS_VALIDES] as unknown as ("validee" | "preparee" | "en_livraison" | "livree")[]),
          gte(schema.commandes.soumiseAt, debut),
          tenantFilter(schema.commandes.tenantId, tid)
        )
      );

    if (commandes.length === 0) {
      if (isDemoFallbackEnabled()) {
        return NextResponse.json({
          tranches: DEMO_TRANCHES,
          duos: DEMO_DUOS,
          stats: { total: 299, panierMoyen: 261_000, panierMedian: 175_000, panierMin: 8_500, panierMax: 2_450_000 },
          isDemo: true,
        });
      }
      return NextResponse.json({
        tranches: TRANCHES.map((t) => ({ tranche: t.label, nbCommandes: 0, ttcSum: 0 })),
        duos: [],
        stats: { total: 0, panierMoyen: 0, panierMedian: 0, panierMin: 0, panierMax: 0 },
        isDemo: false,
      });
    }

    // Tranches
    const tranches: Tranche[] = TRANCHES.map((t) => ({
      tranche: t.label,
      nbCommandes: 0,
      ttcSum: 0,
    }));

    for (const c of commandes) {
      const ttc = c.totalTTC ?? 0;
      const idx = TRANCHES.findIndex((t) => ttc >= t.min && ttc < t.max);
      if (idx >= 0) {
        tranches[idx]!.nbCommandes++;
        tranches[idx]!.ttcSum += ttc;
      }
    }

    // Stats
    const tousMontants = commandes.map((c) => c.totalTTC ?? 0).sort((a, b) => a - b);
    const total = tousMontants.length;
    const sum = tousMontants.reduce((s, n) => s + n, 0);
    const panierMoyen = Math.round(sum / total);
    const mid = Math.floor(total / 2);
    const panierMedian = total % 2 === 0
      ? Math.round(((tousMontants[mid - 1] ?? 0) + (tousMontants[mid] ?? 0)) / 2)
      : tousMontants[mid] ?? 0;

    // Market basket — top duos
    const cIds = commandes.map((c) => c.id);
    const lignes = cIds.length > 0
      ? await db
          .select({
            commandeId: schema.lignesCommande.commandeId,
            produitId: schema.lignesCommande.produitId,
            nomProduit: schema.lignesCommande.nomProduit,
          })
          .from(schema.lignesCommande)
          .innerJoin(schema.commandes, eq(schema.lignesCommande.commandeId, schema.commandes.id))
          .where(and(inArray(schema.lignesCommande.commandeId, cIds), tenantFilter(schema.commandes.tenantId, tid)))
      : [];

    // Build commande → set produits
    const cmdToProduits = new Map<string, Set<string>>();
    const produitNom = new Map<string, string>();
    for (const l of lignes) {
      const set = cmdToProduits.get(l.commandeId) ?? new Set();
      set.add(l.produitId);
      cmdToProduits.set(l.commandeId, set);
      produitNom.set(l.produitId, l.nomProduit);
    }

    // Comptage occurrences produit
    const occProduit = new Map<string, number>();
    for (const set of cmdToProduits.values()) {
      for (const p of set) {
        occProduit.set(p, (occProduit.get(p) ?? 0) + 1);
      }
    }

    // Comptage paires
    const occPaires = new Map<string, number>();
    for (const set of cmdToProduits.values()) {
      const list = Array.from(set);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]!;
          const b = list[j]!;
          const key = a < b ? `${a}__${b}` : `${b}__${a}`;
          occPaires.set(key, (occPaires.get(key) ?? 0) + 1);
        }
      }
    }

    const duos: DuoProduit[] = Array.from(occPaires.entries())
      .map(([key, count]) => {
        const [a, b] = key.split("__") as [string, string];
        const occA = occProduit.get(a) ?? 0;
        const pctCoOcc = occA > 0 ? Math.round((count / occA) * 100) : 0;
        return {
          produitA: produitNom.get(a) ?? "—",
          produitB: produitNom.get(b) ?? "—",
          cooccurrences: count,
          pctCoOcc,
        };
      })
      .filter((d) => d.cooccurrences >= 2)
      .sort((a, b) => b.cooccurrences - a.cooccurrences)
      .slice(0, 12);

    return NextResponse.json({
      tranches,
      duos,
      stats: {
        total,
        panierMoyen,
        panierMedian,
        panierMin: tousMontants[0] ?? 0,
        panierMax: tousMontants[tousMontants.length - 1] ?? 0,
      },
      isDemo: false,
    });
  } catch {
    if (isDemoFallbackEnabled()) {
      return NextResponse.json({
        tranches: DEMO_TRANCHES,
        duos: DEMO_DUOS,
        stats: { total: 299, panierMoyen: 261_000, panierMedian: 175_000, panierMin: 8_500, panierMax: 2_450_000 },
        isDemo: true,
      });
    }
    return NextResponse.json({
      tranches: [], duos: [],
      stats: { total: 0, panierMoyen: 0, panierMedian: 0, panierMin: 0, panierMax: 0 },
      isDemo: false,
    });
  }
}
