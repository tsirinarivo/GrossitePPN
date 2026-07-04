import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, gte, lt, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") ?? "mois";

  const now = new Date();
  let debut: Date;
  if (periode === "7jours") { debut = new Date(now.getTime() - 7 * 86400000); }
  else if (periode === "annee") { debut = new Date(now.getFullYear(), 0, 1); }
  else { debut = new Date(now.getFullYear(), now.getMonth(), 1); }

  try {
    // Lignes des commandes validées sur la période
    const lignes = await db
      .select({
        produitId: schema.lignesCommande.produitId,
        nomProduit: schema.lignesCommande.nomProduit,
        totalHT: sql<number>`SUM(${schema.lignesCommande.totalHT})`,
        totalTTC: sql<number>`SUM(${schema.lignesCommande.totalTTC})`,
        quantiteBase: sql<number>`SUM(${schema.lignesCommande.quantiteBase})`,
        nbVentes: sql<number>`COUNT(*)`,
      })
      .from(schema.lignesCommande)
      .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
      .where(
        and(
          eq(schema.commandes.statut, "validee"),
          gte(schema.commandes.valideeAt, debut),
          tenantFilter(schema.commandes.tenantId, tid)
        )
      )
      .groupBy(schema.lignesCommande.produitId, schema.lignesCommande.nomProduit)
      .orderBy(sql`SUM(${schema.lignesCommande.totalHT}) DESC`)
      .limit(100);

    // Prix d'achat courant par produit
    const produitIds = lignes.map((l) => l.produitId);
    const prixAchats = produitIds.length > 0
      ? await db
          .select({
            id: schema.produits.id,
            prixAchat: schema.produits.prixAchatMoyenPondere,
            categorieId: schema.produits.categorieId,
            uniteBase: schema.produits.uniteBase,
          })
          .from(schema.produits)
          .where(and(inArray(schema.produits.id, produitIds), tenantFilter(schema.produits.tenantId, tid)))
      : [];

    const prixMap = new Map(prixAchats.map((p) => [p.id, p]));

    // Catégories
    const cats = await db.select({ id: schema.categories.id, nom: schema.categories.nom }).from(schema.categories);
    const catMap = new Map(cats.map((c) => [c.id, c.nom]));

    const produits = lignes.map((l) => {
      const info = prixMap.get(l.produitId);
      const ca = Number(l.totalHT);
      const cogs = (info?.prixAchat ?? 0) * Number(l.quantiteBase);
      const marge = ca - cogs;
      const tauxMarge = ca > 0 ? Math.round((marge / ca) * 100) : 0;
      return {
        produitId: l.produitId,
        nom: l.nomProduit,
        categorie: info?.categorieId ? (catMap.get(info.categorieId) ?? "Autre") : "Autre",
        uniteBase: info?.uniteBase ?? "",
        ca,
        caTTC: Number(l.totalTTC),
        cogs: Math.round(cogs),
        marge: Math.round(marge),
        tauxMarge,
        quantiteBase: Number(l.quantiteBase),
        nbVentes: Number(l.nbVentes),
      };
    });

    const totalCA = produits.reduce((s, p) => s + p.ca, 0);
    const totalCOGS = produits.reduce((s, p) => s + p.cogs, 0);
    const totalMarge = produits.reduce((s, p) => s + p.marge, 0);

    // Top marges / flop marges
    const sorted = [...produits].sort((a, b) => b.tauxMarge - a.tauxMarge);
    const topMarges = sorted.slice(0, 5);
    const flopMarges = sorted.slice(-5).reverse();

    return NextResponse.json({
      periode,
      produits,
      topMarges,
      flopMarges,
      totaux: {
        ca: totalCA,
        cogs: totalCOGS,
        marge: totalMarge,
        tauxMarge: totalCA > 0 ? Math.round((totalMarge / totalCA) * 100) : 0,
      },
    });
  } catch (e) {
    console.error("[api/rapports/marges-produits]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
