import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  if (role !== "admin" && role !== "gerant") return null;
  return { id: session.user.id, nom: session.user.name, role };
}

/** Droit d'accès / portabilité — export complet des données d'un client. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, id))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const commandes = await db
    .select({
      numero: schema.commandes.numero,
      statut: schema.commandes.statut,
      source: schema.commandes.source,
      totalTTC: schema.commandes.totalTTC,
      createdAt: schema.commandes.createdAt,
    })
    .from(schema.commandes)
    .where(eq(schema.commandes.clientId, id))
    .orderBy(desc(schema.commandes.createdAt))
    .limit(500);

  const factures = await db
    .select({
      numero: schema.factures.numero,
      statut: schema.factures.statut,
      totalTTC: schema.factures.totalTTC,
      soldeRestant: schema.factures.soldeRestant,
      createdAt: schema.factures.createdAt,
    })
    .from(schema.factures)
    .where(eq(schema.factures.clientId, id))
    .orderBy(desc(schema.factures.createdAt))
    .limit(500);

  await logAudit({
    action: "acces",
    entite: "rgpd",
    entiteId: id,
    description: `Export des données personnelles du client ${client.raisonSociale}`,
    actor,
  });

  const exportData = {
    genereLe: new Date().toISOString(),
    parUtilisateur: actor.nom,
    donneesIdentite: {
      code: client.code,
      raisonSociale: client.raisonSociale,
      nif: client.nif,
      stat: client.stat,
      telephone: client.telephone,
      email: client.email,
      adresse: client.adresse,
      geolocalisation:
        client.latitude && client.longitude
          ? { latitude: client.latitude, longitude: client.longitude }
          : null,
      zoneTournee: client.zoneTournee,
      notes: client.notes,
      creeLe: client.createdAt,
    },
    donneesCommerciales: {
      palier: client.palier,
      creditAutorise: client.creditAutorise,
      plafondCredit: client.plafondCredit,
      encoursCourant: client.encoursCourant,
      pointsFidelite: client.pointsFidelite,
      statutFidelite: client.statutFidelite,
      totalAchats: client.totalAchats,
      nbCommandes: client.nbCommandes,
    },
    commandes,
    factures,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="donnees-client-${client.code}.json"`,
    },
  });
}

/** Droit à l'effacement — anonymisation des données personnelles. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.confirm) {
    return NextResponse.json(
      { error: "Confirmation requise (confirm: true)" },
      { status: 400 }
    );
  }

  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, id))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const tag = id.slice(0, 8);
  await db
    .update(schema.clients)
    .set({
      raisonSociale: `Client anonymisé (${tag})`,
      nif: null,
      stat: null,
      telephone: null,
      email: null,
      adresse: null,
      latitude: null,
      longitude: null,
      invitationEmail: null,
      notes: null,
      ecommerceActif: false,
      actif: false,
      updatedAt: new Date(),
    })
    .where(eq(schema.clients.id, id));

  // Détacher les éventuels comptes B2B liés au profil.
  await db
    .delete(schema.sousUtilisateurs)
    .where(eq(schema.sousUtilisateurs.clientId, id));

  await logAudit({
    action: "anonymisation",
    entite: "rgpd",
    entiteId: id,
    description: `Anonymisation RGPD du client ${client.raisonSociale} (${client.code})`,
    metadata: {
      conserve: "historique commandes/factures (obligation comptable)",
      raisonSocialeOrigine: client.raisonSociale,
    },
    actor,
  });

  return NextResponse.json({ ok: true });
}
