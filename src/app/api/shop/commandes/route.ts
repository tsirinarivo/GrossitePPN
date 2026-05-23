import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json([]);

    // Find the client linked to this user
    const clientRows = await db
      .select({ id: schema.clients.id })
      .from(schema.clients)
      .where(eq(schema.clients.userId, session.user.id))
      .limit(1);

    if (clientRows.length === 0) return NextResponse.json([]);
    const clientId = clientRows[0]!.id;

    const commandes = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        statut: schema.commandes.statut,
        totalTTC: schema.commandes.totalTTC,
        createdAt: schema.commandes.createdAt,
        soumiseAt: schema.commandes.soumiseAt,
      })
      .from(schema.commandes)
      .where(eq(schema.commandes.clientId, clientId))
      .orderBy(desc(schema.commandes.createdAt))
      .limit(20);

    // Get lines for summary
    const lignes = await db
      .select({
        commandeId: schema.lignesCommande.commandeId,
        nomProduit: schema.lignesCommande.nomProduit,
        quantite: schema.lignesCommande.quantite,
        nomUnite: schema.lignesCommande.nomUnite,
      })
      .from(schema.lignesCommande)
      .where(
        inArray(
          schema.lignesCommande.commandeId,
          commandes.map((c) => c.id)
        )
      );

    const lignesMap = new Map<string, typeof lignes>();
    for (const l of lignes) {
      const arr = lignesMap.get(l.commandeId) ?? [];
      arr.push(l);
      lignesMap.set(l.commandeId, arr);
    }

    // Get facture IDs for validated orders
    const commandeIds = commandes.map((c) => c.id);
    const factureRows = commandeIds.length > 0
      ? await db.select({ commandeId: schema.factures.commandeId, id: schema.factures.id })
          .from(schema.factures).where(inArray(schema.factures.commandeId, commandeIds))
      : [];
    const factureMap = new Map(factureRows.map((f) => [f.commandeId, f.id]));

    const result = commandes.map((c) => {
      const ls = lignesMap.get(c.id) ?? [];
      return {
        id: c.id,
        numero: c.numero,
        date: new Date(c.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        montant: c.totalTTC,
        nbArticles: ls.length,
        statut: c.statut,
        factureId: factureMap.get(c.id) ?? null,
        produits: ls.slice(0, 3).map(
          (l) => `${l.nomProduit} ×${l.quantite} ${l.nomUnite}`
        ),
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/shop/commandes]", e);
    return NextResponse.json([]);
  }
}

// ── POST /api/shop/commandes ──────────────────────────────────────────────────
// Crée une commande B2B depuis le checkout boutique
type LigneInput = {
  produitId: string;
  nom: string;
  unite?: string;
  qte: number;
  prixUnit: number;
};

type CheckoutBody = {
  lignes: LigneInput[];
  adresse: string;
  quartier?: string;
  telephone?: string;
  notes?: string;
  creneau?: string;
  modePaiement: string;
  codePromo?: string;
};

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as CheckoutBody | null;
  if (!body || !Array.isArray(body.lignes) || body.lignes.length === 0) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }
  if (!body.adresse?.trim()) {
    return NextResponse.json({ error: "Adresse de livraison requise" }, { status: 400 });
  }
  if (!body.modePaiement) {
    return NextResponse.json({ error: "Mode de paiement requis" }, { status: 400 });
  }

  // Récupère le client B2B lié au user (direct ou sous-utilisateur)
  let client = null as typeof schema.clients.$inferSelect | null;
  const [direct] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.userId, session.user.id))
    .limit(1);
  if (direct) {
    client = direct;
  } else {
    const [sub] = await db
      .select()
      .from(schema.sousUtilisateurs)
      .where(eq(schema.sousUtilisateurs.userId, session.user.id))
      .limit(1);
    if (sub && sub.peutCommander) {
      const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, sub.clientId)).limit(1);
      client = c ?? null;
    }
  }

  if (!client) {
    return NextResponse.json({ error: "Compte B2B requis pour commander" }, { status: 403 });
  }

  // Calcule totaux à partir du panier (côté serveur, on ne fait pas confiance au client)
  let totalHT = 0;
  for (const l of body.lignes) {
    const qte = Number(l.qte);
    const pu = Math.round(Number(l.prixUnit));
    if (!Number.isFinite(qte) || qte <= 0) {
      return NextResponse.json(
        { error: `Quantité invalide pour ${l.nom ?? "article"} (doit être > 0)` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(pu) || pu < 0) {
      return NextResponse.json(
        { error: `Prix invalide pour ${l.nom ?? "article"}` },
        { status: 400 }
      );
    }
    totalHT += qte * pu;
  }
  if (totalHT <= 0) {
    return NextResponse.json({ error: "Montant total invalide" }, { status: 400 });
  }

  // Application code promo serveur-side
  let promotionId: string | null = null;
  let remisePromo = 0;
  if (body.codePromo?.trim()) {
    const code = body.codePromo.trim().toUpperCase();
    const [promo] = await db
      .select()
      .from(schema.promotions)
      .where(eq(sql`UPPER(${schema.promotions.code})`, code))
      .limit(1);

    if (promo) {
      const now = new Date();
      const valide =
        promo.actif &&
        now >= new Date(promo.debutAt) &&
        now <= new Date(promo.finAt) &&
        (!promo.nbUtilisationsMax || (promo.nbUtilisations ?? 0) < promo.nbUtilisationsMax) &&
        (!promo.minCommande || totalHT >= promo.minCommande);

      if (valide) {
        promotionId = promo.id;
        if (promo.typeValeur === "pct") {
          remisePromo = Math.round((totalHT * promo.valeur) / 100);
        } else {
          remisePromo = Math.min(totalHT, Math.round(promo.valeur));
        }
      }
    }
  }

  const totalApresRemise = Math.max(0, totalHT - remisePromo);

  // Vérification plafond crédit si paiement crédit
  if (body.modePaiement === "credit" || body.modePaiement === "credit_client") {
    if (!client.creditAutorise) {
      return NextResponse.json({ error: "Crédit non autorisé pour ce compte" }, { status: 422 });
    }
    const disponible = (client.plafondCredit ?? 0) - (client.encoursCourant ?? 0);
    if (totalApresRemise > disponible) {
      return NextResponse.json(
        { error: `Plafond crédit dépassé (disponible : ${disponible} MGA)` },
        { status: 422 }
      );
    }
  }

  try {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    const numero = `WEB-${datePart}-${rand}`;
    const commandeId = crypto.randomUUID();

    const adresseComplete = [body.adresse, body.quartier].filter(Boolean).join(", ");

    // Map mode de paiement vers l'enum DB
    const modeMap: Record<string, "especes" | "mvola" | "orange_money" | "airtel_money" | "virement" | "cheque" | "credit_client"> = {
      especes: "especes",
      mvola: "mvola",
      orange_money: "orange_money",
      airtel_money: "airtel_money",
      virement: "virement",
      credit: "credit_client",
      credit_client: "credit_client",
    };
    const modePaiementDb = modeMap[body.modePaiement] ?? "especes";

    // Créneau livraison (matin = 9h, aprem = 15h, urgent = +1h)
    let creneauLivraison: Date | null = null;
    if (body.creneau === "matin") {
      const c = new Date(now); c.setDate(c.getDate() + 1); c.setHours(9, 0, 0, 0);
      creneauLivraison = c;
    } else if (body.creneau === "aprem") {
      const c = new Date(now); c.setDate(c.getDate() + 1); c.setHours(15, 0, 0, 0);
      creneauLivraison = c;
    } else if (body.creneau === "urgent") {
      const c = new Date(now.getTime() + 60 * 60 * 1000);
      creneauLivraison = c;
    }

    await db.insert(schema.commandes).values({
      id: commandeId,
      numero,
      clientId: client.id,
      agentId: session.user.id,
      source: "ecommerce",
      statut: "soumise",
      totalHT: totalApresRemise,
      totalTVA: 0,
      totalTTC: totalApresRemise,
      totalRemise: remisePromo,
      adresseLivraison: adresseComplete || null,
      creneauLivraison,
      notesLivraison: body.notes ?? null,
      notes: promotionId ? `Promo ${body.codePromo}` : null,
      soumiseAt: now,
    });

    const lignesValues = body.lignes.map((l) => {
      const qte = Number(l.qte) || 0;
      const pu = Math.round(Number(l.prixUnit) || 0);
      const ht = qte * pu;
      return {
        id: crypto.randomUUID(),
        commandeId,
        produitId: l.produitId,
        uniteVenteId: null,
        nomProduit: l.nom,
        nomUnite: l.unite ?? "unité",
        facteurConversion: 1,
        quantite: qte,
        quantiteBase: qte,
        prixUnitaire: pu,
        tauxRemise: 0,
        montantRemise: 0,
        tauxTVA: 0,
        totalHT: ht,
        totalTVA: 0,
        totalTTC: ht,
      };
    });

    if (lignesValues.length > 0) {
      await db.insert(schema.lignesCommande).values(lignesValues);
    }

    // Incrémente compteur d'utilisations du code promo (si appliqué)
    if (promotionId) {
      await db
        .update(schema.promotions)
        .set({ nbUtilisations: sql`${schema.promotions.nbUtilisations} + 1` })
        .where(eq(schema.promotions.id, promotionId));
    }

    // Broadcast SSE pour la caisse
    try {
      const { broadcastCommande } = await import("@/lib/sse/broadcast");
      await broadcastCommande({
        commandeId,
        numero,
        source: "ecommerce",
        totalTTC: totalApresRemise,
        clientId: client.id,
      });
    } catch {
      // SSE optionnel, ne bloque pas
    }

    return NextResponse.json({
      ok: true,
      commandeId,
      numero,
      total: totalApresRemise,
      remise: remisePromo,
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/shop/commandes]", e);
    return NextResponse.json({ error: "Erreur lors de la création de la commande" }, { status: 500 });
  }
}
