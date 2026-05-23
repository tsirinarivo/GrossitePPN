import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq, gte, desc, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type MouvementType = "entree" | "vente" | "transfert" | "casse" | "inventaire" | "reservation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") ?? "3mois";
  const filtreType = searchParams.get("type") ?? "all"; // all | entree | vente | transfert | casse | inventaire
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const now = new Date();
  let debut: Date;
  if (periode === "semaine") {
    debut = new Date(now.getTime() - 7 * 86400000);
  } else if (periode === "mois") {
    debut = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (periode === "annee") {
    debut = new Date(now.getFullYear(), 0, 1);
  } else if (periode === "12mois") {
    debut = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  } else {
    // 3mois par défaut
    debut = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  }

  try {
    // ── Produit ─────────────────────────────────────────────────────────────
    const [produit] = await db
      .select()
      .from(schema.produits)
      .where(eq(schema.produits.id, id))
      .limit(1);

    if (!produit) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    // ── 1) Mouvements stock ─────────────────────────────────────────────────
    const mouvementsRaw = await db
      .select({
        id: schema.mouvementsStock.id,
        type: schema.mouvementsStock.type,
        quantiteBase: schema.mouvementsStock.quantiteBase,
        quantiteAvant: schema.mouvementsStock.quantiteAvant,
        quantiteApres: schema.mouvementsStock.quantiteApres,
        reference: schema.mouvementsStock.reference,
        notes: schema.mouvementsStock.notes,
        createdAt: schema.mouvementsStock.createdAt,
        userId: schema.mouvementsStock.userId,
        depotId: schema.mouvementsStock.depotId,
      })
      .from(schema.mouvementsStock)
      .where(
        and(
          eq(schema.mouvementsStock.produitId, id),
          gte(schema.mouvementsStock.createdAt, debut),
          filtreType !== "all" ? eq(schema.mouvementsStock.type, filtreType) : undefined
        )
      )
      .orderBy(desc(schema.mouvementsStock.createdAt))
      .limit(limit);

    const userIds = [...new Set(mouvementsRaw.map((m) => m.userId).filter(Boolean))] as string[];
    const depotIdsM = [...new Set(mouvementsRaw.map((m) => m.depotId))];

    const [usersList, depotsList] = await Promise.all([
      userIds.length > 0
        ? db.select({ id: schema.users.id, nom: schema.users.name })
            .from(schema.users).where(inArray(schema.users.id, userIds))
        : Promise.resolve([] as { id: string; nom: string | null }[]),
      depotIdsM.length > 0
        ? db.select({ id: schema.depots.id, nom: schema.depots.nom })
            .from(schema.depots).where(inArray(schema.depots.id, depotIdsM))
        : Promise.resolve([] as { id: string; nom: string }[]),
    ]);
    const usersMap = new Map(usersList.map((u) => [u.id, u.nom ?? ""]));
    const depotsMap = new Map(depotsList.map((d) => [d.id, d.nom]));

    const mouvements = mouvementsRaw.map((m) => ({
      ...m,
      agentNom: m.userId ? usersMap.get(m.userId) ?? "" : "",
      nomDepot: depotsMap.get(m.depotId) ?? m.depotId,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    }));

    // ── 2) Ventes : dernières lignes + top clients ──────────────────────────
    const ventes = await db
      .select({
        ligneId: schema.lignesCommande.id,
        commandeId: schema.commandes.id,
        numeroCommande: schema.commandes.numero,
        quantiteBase: schema.lignesCommande.quantiteBase,
        prixUnitaire: schema.lignesCommande.prixUnitaire,
        totalTTC: schema.lignesCommande.totalTTC,
        clientId: schema.commandes.clientId,
        clientNom: schema.clients.raisonSociale,
        valideeAt: schema.commandes.valideeAt,
        statut: schema.commandes.statut,
      })
      .from(schema.lignesCommande)
      .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
      .leftJoin(schema.clients, eq(schema.clients.id, schema.commandes.clientId))
      .where(
        and(
          eq(schema.lignesCommande.produitId, id),
          gte(schema.commandes.soumiseAt, debut)
        )
      )
      .orderBy(desc(schema.commandes.soumiseAt))
      .limit(limit);

    // Top clients agrégés
    const topClientsMap = new Map<string, { nom: string; nbCommandes: number; qte: number; ca: number }>();
    for (const v of ventes) {
      if (!v.clientId) continue;
      const cur = topClientsMap.get(v.clientId) ?? {
        nom: v.clientNom ?? "Client inconnu",
        nbCommandes: 0,
        qte: 0,
        ca: 0,
      };
      cur.nbCommandes++;
      cur.qte += Number(v.quantiteBase) || 0;
      cur.ca += Number(v.totalTTC) || 0;
      topClientsMap.set(v.clientId, cur);
    }
    const topClients = Array.from(topClientsMap.entries())
      .map(([id, v]) => ({ clientId: id, ...v }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);

    // ── 3) Achats : derniers BCs + top fournisseurs + prix achat ───────────
    const achats = await db
      .select({
        ligneBCId: schema.lignesBonCommande.id,
        bonCommandeId: schema.bonsCommande.id,
        numeroBC: schema.bonsCommande.numero,
        quantiteCommandee: schema.lignesBonCommande.quantiteCommandee,
        quantiteRecue: schema.lignesBonCommande.quantiteRecue,
        quantiteBase: schema.lignesBonCommande.quantiteBase,
        prixUnitaireHT: schema.lignesBonCommande.prixUnitaireHT,
        totalHT: schema.lignesBonCommande.totalHT,
        statut: schema.bonsCommande.statut,
        dateCommande: schema.bonsCommande.dateCommande,
        dateReception: schema.bonsCommande.dateReceptionEffective,
        fournisseurId: schema.bonsCommande.fournisseurId,
        fournisseurNom: schema.fournisseurs.nom,
      })
      .from(schema.lignesBonCommande)
      .innerJoin(schema.bonsCommande, eq(schema.bonsCommande.id, schema.lignesBonCommande.bonCommandeId))
      .leftJoin(schema.fournisseurs, eq(schema.fournisseurs.id, schema.bonsCommande.fournisseurId))
      .where(
        and(
          eq(schema.lignesBonCommande.produitId, id),
          gte(schema.bonsCommande.createdAt, debut)
        )
      )
      .orderBy(desc(schema.bonsCommande.createdAt))
      .limit(limit);

    const topFournMap = new Map<string, { nom: string; nbBC: number; qte: number; montant: number; prixMin: number; prixMax: number }>();
    for (const a of achats) {
      if (!a.fournisseurId) continue;
      const cur = topFournMap.get(a.fournisseurId) ?? {
        nom: a.fournisseurNom ?? "Fournisseur inconnu",
        nbBC: 0,
        qte: 0,
        montant: 0,
        prixMin: Number.POSITIVE_INFINITY,
        prixMax: 0,
      };
      cur.nbBC++;
      cur.qte += Number(a.quantiteBase) || 0;
      cur.montant += Number(a.totalHT) || 0;
      const pu = Number(a.prixUnitaireHT) || 0;
      if (pu > 0) {
        cur.prixMin = Math.min(cur.prixMin, pu);
        cur.prixMax = Math.max(cur.prixMax, pu);
      }
      topFournMap.set(a.fournisseurId, cur);
    }
    const topFournisseurs = Array.from(topFournMap.entries())
      .map(([id, v]) => ({
        fournisseurId: id,
        ...v,
        prixMin: v.prixMin === Number.POSITIVE_INFINITY ? 0 : v.prixMin,
      }))
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 10);

    // ── 4) Évolution prix achat moyen par mois ─────────────────────────────
    const evolPrixRows = await db
      .select({
        mois: sql<string>`to_char(${schema.bonsCommande.dateCommande}, 'YYYY-MM')`,
        prixMoyen: sql<number>`coalesce(avg(${schema.lignesBonCommande.prixUnitaireHT}), 0)`,
        qteTotale: sql<number>`coalesce(sum(${schema.lignesBonCommande.quantiteBase}), 0)`,
      })
      .from(schema.lignesBonCommande)
      .innerJoin(schema.bonsCommande, eq(schema.bonsCommande.id, schema.lignesBonCommande.bonCommandeId))
      .where(
        and(
          eq(schema.lignesBonCommande.produitId, id),
          gte(schema.bonsCommande.dateCommande, debut)
        )
      )
      .groupBy(sql`to_char(${schema.bonsCommande.dateCommande}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${schema.bonsCommande.dateCommande}, 'YYYY-MM')`);

    const evolutionPrix = evolPrixRows.map((r) => ({
      mois: r.mois,
      prixMoyen: Math.round(Number(r.prixMoyen) || 0),
      qte: Number(r.qteTotale) || 0,
    }));

    // ── 5) Synthèse globale ────────────────────────────────────────────────
    const synthese = {
      nbMouvements: mouvements.length,
      nbVentes: ventes.length,
      qteVendue: ventes.reduce((s, v) => s + (Number(v.quantiteBase) || 0), 0),
      caVentes: ventes.reduce((s, v) => s + (Number(v.totalTTC) || 0), 0),
      nbAchats: achats.length,
      qteAchetee: achats.reduce((s, a) => s + (Number(a.quantiteBase) || 0), 0),
      coutAchats: achats.reduce((s, a) => s + (Number(a.totalHT) || 0), 0),
      prixAchatMoyen:
        achats.length > 0
          ? Math.round(
              achats.reduce((s, a) => s + (Number(a.prixUnitaireHT) || 0), 0) / achats.length
            )
          : 0,
      nbCasse: mouvements.filter((m) => m.type === "casse").length,
      qteCasse: mouvements
        .filter((m) => m.type === "casse")
        .reduce((s, m) => s + (Number(m.quantiteBase) || 0), 0),
      nbInventaires: mouvements.filter((m) => m.type === "inventaire").length,
      nbTransferts: mouvements.filter((m) => m.type === "transfert").length,
    };

    return NextResponse.json({
      produit: {
        id: produit.id,
        nom: produit.nom,
        code: produit.code,
        uniteBase: produit.uniteBase,
        prixVenteDetail: produit.prixVenteDetail,
        prixVenteGros: produit.prixVenteGros,
        prixVenteSemiGros: produit.prixVenteSemiGros,
      },
      synthese,
      mouvements,
      ventes: ventes.map((v) => ({
        ...v,
        valideeAt: v.valideeAt instanceof Date ? v.valideeAt.toISOString() : v.valideeAt,
      })),
      topClients,
      achats: achats.map((a) => ({
        ...a,
        dateCommande: a.dateCommande instanceof Date ? a.dateCommande.toISOString() : a.dateCommande,
        dateReception: a.dateReception instanceof Date ? a.dateReception.toISOString() : a.dateReception,
      })),
      topFournisseurs,
      evolutionPrix,
      periode,
    });
  } catch (e) {
    console.error("[api/produits/[id]/historique]", e);
    return NextResponse.json({ error: "Erreur de chargement" }, { status: 500 });
  }
}
