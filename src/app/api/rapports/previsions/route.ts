import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const STATUTS_VALIDES = ["validee", "preparee", "en_livraison", "livree"] as const;
type StatutValide = typeof STATUTS_VALIDES[number];

const SAISONNALITE: number[] = [1.2, 1.15, 1.1, 1.0, 1.1, 1.15, 1.2, 1.25, 1.15, 1.0, 1.05, 1.3];
// Jan   Feb   Mar  Apr  May   Jun  Jul   Aug   Sep   Oct  Nov   Dec

const MOIS_LABELS_FR = [
  "Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];

function labelMois(moisStr: string): string {
  // moisStr: "2026-06"
  const parts = moisStr.split("-");
  const year = parts[0] ?? "";
  const monthStr = parts[1] ?? "1";
  const m = parseInt(monthStr, 10) - 1;
  return `${MOIS_LABELS_FR[m] ?? ""} ${year}`;
}

// Demo fallback data
function buildDemoData() {
  const now = new Date();
  const historique: { mois: string; label: string; ca: number; nb: number }[] = [];

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-based
    const mois = `${year}-${String(month + 1).padStart(2, "0")}`;
    const base = 10_000_000;
    const seasonal = SAISONNALITE[month] ?? 1.0;
    // Add some random-ish variation using month index
    const variation = 1 + (((month * 7 + i * 3) % 10) - 5) / 50;
    const ca = Math.round(base * seasonal * variation);
    historique.push({ mois, label: labelMois(mois), ca, nb: 30 + ((month * 3 + i) % 25) });
  }
  return historique;
}

const DEMO_TOP_PRODUITS = [
  { designation: "Riz Makalioka", qteTotal: 1250, caTotal: 18_750_000 },
  { designation: "Huile Tiko 5L", qteTotal: 890, caTotal: 14_240_000 },
  { designation: "Sucre cristal", qteTotal: 1100, caTotal: 11_000_000 },
  { designation: "Sel iodé", qteTotal: 2300, caTotal: 5_750_000 },
  { designation: "Savon Protex", qteTotal: 760, caTotal: 4_560_000 },
  { designation: "Lait Gloria", qteTotal: 430, caTotal: 8_600_000 },
  { designation: "Farine de blé", qteTotal: 680, caTotal: 6_120_000 },
  { designation: "Huile palme", qteTotal: 540, caTotal: 4_320_000 },
];

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  const { searchParams } = new URL(req.url);
  const annee = parseInt(searchParams.get("annee") ?? String(new Date().getFullYear()), 10);

  try {
    // Query CA mensuel 24 derniers mois
    const caParMoisRaw = await db.select({
      mois: sql<string>`to_char(date_trunc('month', ${schema.commandes.createdAt}), 'YYYY-MM')`,
      ca: sql<number>`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`,
      nb: sql<number>`COUNT(*)`,
    }).from(schema.commandes)
      .where(and(
        inArray(schema.commandes.statut, STATUTS_VALIDES as unknown as StatutValide[]),
        gte(schema.commandes.createdAt, new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000)),
        tenantFilter(schema.commandes.tenantId, tid)
      ))
      .groupBy(sql`to_char(date_trunc('month', ${schema.commandes.createdAt}), 'YYYY-MM')`)
      .orderBy(sql`to_char(date_trunc('month', ${schema.commandes.createdAt}), 'YYYY-MM')`);

    // Query top produits 90j — use nomProduit and totalTTC (actual schema fields)
    const topProduitsRaw = await db.select({
      designation: schema.lignesCommande.nomProduit,
      qteTotal: sql<number>`SUM(${schema.lignesCommande.quantiteBase})`,
      caTotal: sql<number>`SUM(${schema.lignesCommande.totalTTC})`,
    }).from(schema.lignesCommande)
      .innerJoin(schema.commandes, eq(schema.lignesCommande.commandeId, schema.commandes.id))
      .where(and(
        inArray(schema.commandes.statut, STATUTS_VALIDES as unknown as StatutValide[]),
        gte(schema.commandes.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
        tenantFilter(schema.commandes.tenantId, tid)
      ))
      .groupBy(schema.lignesCommande.nomProduit)
      .orderBy(desc(sql`SUM(${schema.lignesCommande.totalTTC})`))
      .limit(8);

    const isDemo = caParMoisRaw.length === 0;

    const historiqueRaw = isDemo ? buildDemoData() : caParMoisRaw.map((r) => ({
      mois: r.mois,
      label: labelMois(r.mois),
      ca: Number(r.ca),
      nb: Number(r.nb),
    }));

    const topProduits = (isDemo || topProduitsRaw.length === 0)
      ? DEMO_TOP_PRODUITS
      : topProduitsRaw.map((r) => ({
          designation: r.designation,
          qteTotal: Number(r.qteTotal),
          caTotal: Number(r.caTotal),
        }));

    // Build a map: month-number (1-12) -> list of CAs
    const caByMonth: Map<number, number[]> = new Map();
    for (const row of historiqueRaw) {
      const mPart = row.mois.split("-")[1];
      const m = parseInt(mPart ?? "1", 10);
      if (!caByMonth.has(m)) caByMonth.set(m, []);
      caByMonth.get(m)!.push(row.ca);
    }

    // Average monthly CA overall
    const allCAs = historiqueRaw.map((r) => r.ca);
    const moyenneMensuelle = allCAs.length > 0
      ? Math.round(allCAs.reduce((s, v) => s + v, 0) / allCAs.length)
      : 0;

    // Croissance 3m and 12m
    const sorted = [...historiqueRaw].sort((a, b) => a.mois.localeCompare(b.mois));
    const last3 = sorted.slice(-3);
    const prev3 = sorted.slice(-6, -3);
    const last12 = sorted.slice(-12);
    const prev12 = sorted.slice(-24, -12);

    const avg = (arr: { ca: number }[]) =>
      arr.length > 0 ? arr.reduce((s, r) => s + r.ca, 0) / arr.length : 0;

    const avgLast3 = avg(last3);
    const avgPrev3 = avg(prev3);
    const avgLast12 = avg(last12);
    const avgPrev12 = avg(prev12);

    const croissance3m = avgPrev3 > 0
      ? Math.round(((avgLast3 - avgPrev3) / avgPrev3) * 1000) / 10
      : 0;
    const croissance12m = avgPrev12 > 0
      ? Math.round(((avgLast12 - avgPrev12) / avgPrev12) * 1000) / 10
      : 0;

    // Build previsions next 6 months
    const now = new Date();
    const previsions: {
      mois: string;
      label: string;
      caPrevision: number;
      facteurSaisonnier: number;
      confiance: "haute" | "moyenne" | "faible";
    }[] = [];

    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-based
      const moisStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      const facteur = SAISONNALITE[month] ?? 1.0;
      const caPrevision = Math.round(moyenneMensuelle * facteur);

      const dataPoints = caByMonth.get(month + 1) ?? [];
      const confiance: "haute" | "moyenne" | "faible" =
        dataPoints.length >= 3 ? "haute" : dataPoints.length >= 1 ? "moyenne" : "faible";

      previsions.push({
        mois: moisStr,
        label: labelMois(moisStr),
        caPrevision,
        facteurSaisonnier: facteur,
        confiance,
      });
    }

    // Best forecast month
    const firstPrevision = previsions[0];
    const meilleurMois = firstPrevision
      ? previsions.reduce(
          (best, p) => (p.caPrevision > best.caPrevision ? p : best),
          firstPrevision
        )
      : null;

    return NextResponse.json({
      historique: historiqueRaw,
      previsions,
      topProduits,
      tendance: {
        croissance3m,
        croissance12m,
        moyenneMensuelle,
        meilleurMois: meilleurMois
          ? { label: meilleurMois.label, ca: meilleurMois.caPrevision }
          : null,
      },
      annee,
      demo: isDemo,
    });
  } catch (error) {
    console.error("[GET /api/rapports/previsions]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
