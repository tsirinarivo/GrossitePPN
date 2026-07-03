import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  try {
    // Stock total par produit (somme tous dépôts)
    const stocksTotaux = await db
      .select({
        produitId: schema.stocks.produitId,
        stockTotal: sql<number>`SUM(${schema.stocks.quantiteBase})`,
      })
      .from(schema.stocks)
      .groupBy(schema.stocks.produitId);

    // Valeur stock par dépôt
    const stockParDepot = await db
      .select({
        depotId: schema.stocks.depotId,
        nomDepot: schema.depots.nom,
        valeur: sql<number>`SUM(${schema.stocks.quantiteBase} * COALESCE(${schema.produits.prixAchatMoyenPondere}, 0))`,
        qteTotale: sql<number>`SUM(${schema.stocks.quantiteBase})`,
      })
      .from(schema.stocks)
      .innerJoin(schema.depots, eq(schema.depots.id, schema.stocks.depotId))
      .innerJoin(schema.produits, eq(schema.produits.id, schema.stocks.produitId))
      .groupBy(schema.stocks.depotId, schema.depots.nom);

    // Infos produits
    const produitIds = stocksTotaux.map((s) => s.produitId);
    const [produitsList, categories] = await Promise.all([
      produitIds.length > 0
        ? db.select({
            id: schema.produits.id,
            code: schema.produits.code,
            nom: schema.produits.nom,
            uniteBase: schema.produits.uniteBase,
            seuilAlerte: schema.produits.seuilAlerte,
            prixAchatMoyenPondere: schema.produits.prixAchatMoyenPondere,
            categorieId: schema.produits.categorieId,
          }).from(schema.produits).where(and(tenantFilter(schema.produits.tenantId, tid), inArray(schema.produits.id, produitIds)))
        : [],
      db.select({ id: schema.categories.id, nom: schema.categories.nom }).from(schema.categories),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c.nom]));
    const prodMap = new Map(produitsList.map((p) => [p.id, p]));

    // Ventes des 30 derniers jours (pour rotation)
    const trenteJoursAgo = new Date(); trenteJoursAgo.setDate(trenteJoursAgo.getDate() - 30);
    const ventes30j = produitIds.length > 0
      ? await db
          .select({
            produitId: schema.lignesCommande.produitId,
            qteTotale: sql<number>`SUM(${schema.lignesCommande.quantiteBase})`,
          })
          .from(schema.lignesCommande)
          .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
          .where(and(
            inArray(schema.lignesCommande.produitId, produitIds),
            eq(schema.commandes.statut, "validee"),
            gte(schema.commandes.valideeAt, trenteJoursAgo),
          ))
          .groupBy(schema.lignesCommande.produitId)
      : [];

    const ventesMap = new Map(ventes30j.map((v) => [v.produitId, Number(v.qteTotale)]));

    const produits = stocksTotaux.map((s) => {
      const p = prodMap.get(s.produitId);
      if (!p) return null;

      const stock = Number(s.stockTotal);
      const ventes = ventesMap.get(s.produitId) ?? 0;
      const vMoyJour = ventes / 30;
      // Rotation : nb de fois où le stock se renouvelle par mois
      const rotation = stock > 0 && ventes > 0 ? Math.round((ventes / stock) * 10) / 10 : 0;
      // Jours de stock restants
      const joursStock = vMoyJour > 0 ? Math.round(stock / vMoyJour) : null;
      // Seuil cible = 30 jours de vente (réapprovisionnement suggéré)
      const stockCible = Math.round(vMoyJour * 30);
      const qteReappro = Math.max(0, stockCible - stock);
      const valeurStock = stock * (p.prixAchatMoyenPondere ?? 0);

      return {
        produitId: s.produitId,
        code: p.code,
        nom: p.nom,
        uniteBase: p.uniteBase,
        categorie: p.categorieId ? (catMap.get(p.categorieId) ?? "Autre") : "Autre",
        stock,
        seuilAlerte: p.seuilAlerte ?? 0,
        sousAlerte: stock <= (p.seuilAlerte ?? 0),
        ventes30j: ventes,
        vMoyJour: Math.round(vMoyJour * 100) / 100,
        rotation,
        joursStock,
        stockCible,
        qteReappro,
        valeurStock: Math.round(valeurStock),
        prixAchat: p.prixAchatMoyenPondere ?? 0,
      };
    }).filter(Boolean);

    const totalValeurStock = produits.reduce((s, p) => s + (p?.valeurStock ?? 0), 0);
    const nbSousAlerte = produits.filter((p) => p?.sousAlerte).length;
    const nbAReappro = produits.filter((p) => (p?.qteReappro ?? 0) > 0).length;

    return NextResponse.json({
      produits,
      stockParDepot: stockParDepot.map((d) => ({ ...d, valeur: Number(d.valeur), qteTotale: Number(d.qteTotale) })),
      totaux: {
        valeurStock: totalValeurStock,
        nbProduits: produits.length,
        nbSousAlerte,
        nbAReappro,
      },
    });
  } catch (e) {
    console.error("[api/stock/analyse]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
