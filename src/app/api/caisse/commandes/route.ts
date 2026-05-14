import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { inArray, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    // Fetch commandes in queue: soumise or validee (waiting for cashier)
    const commandes = await db
      .select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        source: schema.commandes.source,
        statut: schema.commandes.statut,
        totalTTC: schema.commandes.totalTTC,
        soumiseAt: schema.commandes.soumiseAt,
        clientId: schema.commandes.clientId,
        agentId: schema.commandes.agentId,
      })
      .from(schema.commandes)
      .where(inArray(schema.commandes.statut, ["soumise", "validee"]))
      .orderBy(desc(schema.commandes.soumiseAt))
      .limit(50);

    // Resolve clients and agents names
    const clientIds = commandes.map((c) => c.clientId).filter(Boolean) as string[];
    const agentIds = commandes.map((c) => c.agentId).filter(Boolean) as string[];

    const clientsMap = new Map<string, string>();
    const agentsMap = new Map<string, string>();

    if (clientIds.length > 0) {
      const clients = await db
        .select({ id: schema.clients.id, raisonSociale: schema.clients.raisonSociale })
        .from(schema.clients)
        .where(inArray(schema.clients.id, clientIds));
      for (const c of clients) clientsMap.set(c.id, c.raisonSociale);
    }

    if (agentIds.length > 0) {
      const agents = await db
        .select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(inArray(schema.users.id, agentIds));
      for (const a of agents) agentsMap.set(a.id, a.name ?? "");
    }

    // Count lines per commande
    const lignesCount = await db
      .select({
        commandeId: schema.lignesCommande.commandeId,
      })
      .from(schema.lignesCommande)
      .where(
        inArray(
          schema.lignesCommande.commandeId,
          commandes.map((c) => c.id)
        )
      );
    const countMap = new Map<string, number>();
    for (const l of lignesCount) {
      countMap.set(l.commandeId, (countMap.get(l.commandeId) ?? 0) + 1);
    }

    const result = commandes.map((c, i) => ({
      id: c.id,
      numero: c.numero,
      client: c.clientId ? (clientsMap.get(c.clientId) ?? "Client comptoir") : "Client comptoir",
      montant: c.totalTTC,
      nbArticles: countMap.get(c.id) ?? 0,
      source: c.source as "pos_agent" | "ecommerce",
      agentNom: c.agentId ? (agentsMap.get(c.agentId) ?? undefined) : undefined,
      soumiseAt: c.soumiseAt
        ? new Date(c.soumiseAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "--:--",
      priorite: i + 1,
      statut: "en_attente" as const,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/caisse/commandes]", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const body = await req.json();
    const { lignes, client, notes, agentId, depotId, totalHT, totalTVA, totalTTC, totalRemise } = body;

    if (!lignes || lignes.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    const numero = `CMD-${datePart}-${rand}`;
    const commandeId = crypto.randomUUID();

    await db.insert(schema.commandes).values({
      id: commandeId,
      numero,
      clientId: client?.id ?? null,
      agentId: agentId ?? null,
      depotId: depotId ?? null,
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
      produitId: string;
      uniteId: string;
      nomProduit: string;
      nomUnite: string;
      facteurConversion: number;
      quantite: number;
      quantiteBase: number;
      prixUnitaire: number;
      tauxRemise: number;
      montantRemise: number;
      tauxTVA: number;
      totalHT: number;
      totalTVA: number;
      totalTTC: number;
      notes?: string;
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

    return NextResponse.json({ ok: true, commandeId, numero }, { status: 201 });
  } catch (e) {
    console.error("[api/caisse/commandes POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
