import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const commandes = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        statut: schema.commandes.statut,
        totalTTC: schema.commandes.totalTTC,
        soumiseAt: schema.commandes.soumiseAt,
        clientId: schema.commandes.clientId,
      })
      .from(schema.commandes)
      .where(
        and(
          eq(schema.commandes.agentId, session.user.id),
          inArray(schema.commandes.statut, ["soumise", "validee"])
        )
      )
      .orderBy(desc(schema.commandes.soumiseAt))
      .limit(20);

    // Résoudre les noms clients
    const clientIds = commandes.map((c) => c.clientId).filter(Boolean) as string[];
    const clientsMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const clients = await db
        .select({ id: schema.clients.id, raisonSociale: schema.clients.raisonSociale })
        .from(schema.clients)
        .where(inArray(schema.clients.id, clientIds));
      for (const c of clients) clientsMap.set(c.id, c.raisonSociale);
    }

    // Compter les lignes par commande
    const lignesCount = await db
      .select({ commandeId: schema.lignesCommande.commandeId })
      .from(schema.lignesCommande)
      .where(inArray(schema.lignesCommande.commandeId, commandes.map((c) => c.id)));
    const countMap = new Map<string, number>();
    for (const l of lignesCount) {
      countMap.set(l.commandeId, (countMap.get(l.commandeId) ?? 0) + 1);
    }

    const result = commandes.map((c) => ({
      id: c.id,
      numero: c.numero,
      statut: c.statut,
      client: c.clientId ? (clientsMap.get(c.clientId) ?? "Client comptoir") : "Client comptoir",
      totalTTC: c.totalTTC,
      nbArticles: countMap.get(c.id) ?? 0,
      soumiseAt: c.soumiseAt
        ? new Date(c.soumiseAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "--:--",
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/pos/commandes]", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { lignes, client, notes, depotId, totalHT, totalTVA, totalTTC, totalRemise } = body;

    if (!lignes || lignes.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    // L'agent est TOUJOURS celui de la session — on ignore tout agentId fourni dans le body
    const agentId = session.user.id;

    // Vérification limite crédit client
    if (client?.id) {
      const [clientDB] = await db
        .select({ plafondCredit: schema.clients.plafondCredit, encoursCourant: schema.clients.encoursCourant, creditAutorise: schema.clients.creditAutorise })
        .from(schema.clients)
        .where(eq(schema.clients.id, client.id))
        .limit(1);
      if (clientDB?.creditAutorise) {
        const disponible = (clientDB.plafondCredit ?? 0) - (clientDB.encoursCourant ?? 0);
        if (disponible < 0) {
          return NextResponse.json({
            error: "Plafond crédit dépassé",
            creditDisponible: 0,
            plafond: clientDB.plafondCredit,
            encours: clientDB.encoursCourant,
          }, { status: 422 });
        }
      }
    }

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    const numero = `CMD-${datePart}-${rand}`;
    const commandeId = crypto.randomUUID();

    await db.insert(schema.commandes).values({
      id: commandeId,
      tenantId: (session.user as { tenantId?: string | null }).tenantId ?? null,
      numero,
      clientId: client?.id || null,
      agentId,
      depotId: (depotId && depotId !== "default") ? depotId : null,
      source: "pos_agent",
      statut: "soumise",
      totalHT: Math.round(totalHT ?? 0),
      totalTVA: Math.round(totalTVA ?? 0),
      totalTTC: Math.round(totalTTC ?? 0),
      totalRemise: Math.round(totalRemise ?? 0),
      notes: notes || null,
      soumiseAt: now,
    });

    const lignesValues = lignes.map((l: {
      produitId: string; uniteId: string; nomProduit: string; nomUnite: string;
      facteurConversion: number; quantite: number; quantiteBase: number;
      prixUnitaire: number; tauxRemise: number; montantRemise: number;
      tauxTVA: number; totalHT: number; totalTVA: number; totalTTC: number; notes?: string;
    }) => ({
      id: crypto.randomUUID(),
      commandeId,
      produitId: l.produitId,
      uniteVenteId: l.uniteId !== "default" ? l.uniteId : null,
      nomProduit: l.nomProduit,
      nomUnite: l.nomUnite,
      facteurConversion: l.facteurConversion,
      quantite: l.quantite,
      quantiteBase: l.quantiteBase,
      prixUnitaire: Math.round(l.prixUnitaire),
      tauxRemise: l.tauxRemise,
      montantRemise: Math.round(l.montantRemise),
      tauxTVA: l.tauxTVA,
      totalHT: Math.round(l.totalHT),
      totalTVA: Math.round(l.totalTVA),
      totalTTC: Math.round(l.totalTTC),
      notes: l.notes ?? null,
    }));

    await db.insert(schema.lignesCommande).values(lignesValues);

    const { broadcastCommande } = await import("@/lib/sse/broadcast");
    await broadcastCommande({
      commandeId,
      numero,
      source: "pos_agent",
      totalTTC: Math.round(totalTTC ?? 0),
      clientId: client?.id ?? null,
    });

    return NextResponse.json({ ok: true, commandeId, numero }, { status: 201 });
  } catch (e) {
    console.error("[api/pos/commandes POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
