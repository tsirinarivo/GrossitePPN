import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function getPeriodRange(searchParams: URLSearchParams): { from: Date; to: Date; mois: string } {
  const periode = searchParams.get("periode") ?? "mois";
  const now = new Date();

  if (periode === "jour") {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to   = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to, mois: now.toISOString().slice(0, 7) };
  }
  if (periode === "7jours") {
    const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
    return { from, to: now, mois: now.toISOString().slice(0, 7) };
  }
  if (periode === "annee") {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from, to: now, mois: now.toISOString().slice(0, 7) };
  }
  if (periode === "custom") {
    const from = new Date(searchParams.get("from") ?? now.toISOString()); from.setHours(0, 0, 0, 0);
    const to   = new Date(searchParams.get("to")   ?? now.toISOString()); to.setHours(23, 59, 59, 999);
    return { from, to, mois: from.toISOString().slice(0, 7) };
  }
  // mois — par défaut
  const y = parseInt(searchParams.get("annee") ?? String(now.getFullYear()));
  const m = parseInt(searchParams.get("moisNum") ?? String(now.getMonth() + 1)) - 1;
  const from = new Date(y, m, 1);
  const to   = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { from, to, mois: `${y}-${String(m + 1).padStart(2, "0")}` };
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { from, to, mois } = getPeriodRange(new URL(req.url).searchParams);

  try {
    // ── 1. Commandes validées sur la période ──────────────────────────────────
    const commandes = await db
      .select({
        id:         schema.commandes.id,
        totalHT:    schema.commandes.totalHT,
        totalTVA:   schema.commandes.totalTVA,
        totalTTC:   schema.commandes.totalTTC,
        totalRemise:schema.commandes.totalRemise,
        valideeAt:  schema.commandes.valideeAt,
        soumiseAt:  schema.commandes.soumiseAt,
      })
      .from(schema.commandes)
      .where(
        and(
          eq(schema.commandes.statut, "validee"),
          gte(schema.commandes.soumiseAt, from),
          lte(schema.commandes.soumiseAt, to)
        )
      );

    const commandeIds = commandes.map((c) => c.id);

    // ── 2. Lignes + PUMP pour COGS et marges par catégorie ───────────────────
    const lignes = commandeIds.length > 0
      ? await db
          .select({
            commandeId: schema.lignesCommande.commandeId,
            produitId:  schema.lignesCommande.produitId,
            totalHT:    schema.lignesCommande.totalHT,
            quantiteBase: schema.lignesCommande.quantiteBase,
            pump:       schema.produits.prixAchatMoyenPondere,
            categorieId:schema.produits.categorieId,
          })
          .from(schema.lignesCommande)
          .innerJoin(schema.produits, eq(schema.lignesCommande.produitId, schema.produits.id))
          .where(inArray(schema.lignesCommande.commandeId, commandeIds))
      : [];

    // ── 3. Catégories ─────────────────────────────────────────────────────────
    const categories = await db
      .select({ id: schema.categories.id, nom: schema.categories.nom })
      .from(schema.categories);
    const catMap = new Map(categories.map((c) => [c.id, c.nom]));

    // ── 4. Charges sur le mois ────────────────────────────────────────────────
    const charges = await db
      .select()
      .from(schema.chargesOperationnelles)
      .where(eq(schema.chargesOperationnelles.mois, mois));

    // ── 5. Calcul KPIs ────────────────────────────────────────────────────────
    const caHT      = commandes.reduce((s, c) => s + c.totalHT, 0);
    const caTTC     = commandes.reduce((s, c) => s + c.totalTTC, 0);
    const tva       = commandes.reduce((s, c) => s + c.totalTVA, 0);
    const remises   = commandes.reduce((s, c) => s + c.totalRemise, 0);
    const cogs      = lignes.reduce((s, l) => s + Math.round(l.quantiteBase * (l.pump ?? 0)), 0);
    const margeB    = caHT - cogs;
    const chargesOp = charges.reduce((s, c) => s + c.montant, 0);
    const margeN    = margeB - chargesOp;

    // ── 6. Marges par catégorie ───────────────────────────────────────────────
    const catData = new Map<string, { ca: number; cogs: number; nom: string }>();
    for (const l of lignes) {
      const key = l.categorieId ?? "__aucune__";
      const nom = l.categorieId ? (catMap.get(l.categorieId) ?? "Autre") : "Sans catégorie";
      const cur = catData.get(key) ?? { ca: 0, cogs: 0, nom };
      cur.ca   += l.totalHT;
      cur.cogs += Math.round(l.quantiteBase * (l.pump ?? 0));
      catData.set(key, cur);
    }
    const margesCategorie = [...catData.entries()]
      .map(([id, d]) => ({
        id,
        nom: d.nom,
        ca: d.ca,
        cogs: d.cogs,
        margeB: d.ca - d.cogs,
        tauxMarge: d.ca > 0 ? Math.round((d.ca - d.cogs) / d.ca * 100) : 0,
      }))
      .sort((a, b) => b.ca - a.ca);

    // ── 7. Évolution journalière ──────────────────────────────────────────────
    const evoMap = new Map<string, { ca: number; cogs: number }>();
    for (const c of commandes) {
      const d = (c.soumiseAt ?? c.valideeAt);
      if (!d) continue;
      const key = new Date(d).toISOString().slice(0, 10);
      const cur = evoMap.get(key) ?? { ca: 0, cogs: 0 };
      cur.ca += c.totalHT;
      evoMap.set(key, cur);
    }
    for (const l of lignes) {
      const cmd = commandes.find((c) => c.id === l.commandeId);
      const d = cmd?.soumiseAt ?? cmd?.valideeAt;
      if (!d) continue;
      const key = new Date(d).toISOString().slice(0, 10);
      const cur = evoMap.get(key) ?? { ca: 0, cogs: 0 };
      cur.cogs += Math.round(l.quantiteBase * (l.pump ?? 0));
      evoMap.set(key, cur);
    }
    const evolution = [...evoMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        ca: v.ca,
        cogs: v.cogs,
        margeB: v.ca - v.cogs,
      }));

    // ── 8. Charges par catégorie ──────────────────────────────────────────────
    const chargesParCat = new Map<string, number>();
    for (const c of charges) {
      chargesParCat.set(c.categorie, (chargesParCat.get(c.categorie) ?? 0) + c.montant);
    }

    return NextResponse.json({
      kpi: { caHT, caTTC, tva, remises, cogs, margeB, chargesOp, margeN, nbCommandes: commandes.length },
      margesCategorie,
      evolution,
      chargesParCat: Object.fromEntries(chargesParCat),
      charges,
    });
  } catch (e) {
    console.error("[api/finances]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
