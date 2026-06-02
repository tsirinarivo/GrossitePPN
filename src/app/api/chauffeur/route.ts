import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemo() {
  return {
    tournee: {
      id: "demo-tour",
      date: new Date().toISOString(),
      statut: "en_cours",
      notes: "Tournée Antananarivo Sud",
    },
    livraisons: [
      { id: "dl1", ordre: 1, statut: "livree", clientNom: "Épicerie Soafia", adresse: "Lot II A 14 Ankorondrano", clientTel: "+261 34 22 123 45", commandeNumero: "CMD-2026-0341", totalTTC: 850000, livraisonAt: new Date(Date.now() - 3600000).toISOString() },
      { id: "dl2", ordre: 2, statut: "en_route", clientNom: "Bazar Ankorondrano", adresse: "Près Score Ankorondrano", clientTel: "+261 34 11 456 78", commandeNumero: "CMD-2026-0342", totalTTC: 1240000, livraisonAt: null },
      { id: "dl3", ordre: 3, statut: "preparee", clientNom: "Mini-Market Ivato", adresse: "Route d'Ivato km 7", clientTel: "+261 33 14 789 12", commandeNumero: "CMD-2026-0343", totalTTC: 450000, livraisonAt: null },
      { id: "dl4", ordre: 4, statut: "preparee", clientNom: "Restaurant La Varangue", adresse: "Avenue de l'Indépendance", clientTel: "+261 34 56 234 56", commandeNumero: "CMD-2026-0344", totalTTC: 2150000, livraisonAt: null },
    ],
  };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [tournee] = await db
      .select()
      .from(schema.tournees)
      .where(and(
        eq(schema.tournees.chauffeurId, session.user.id),
        gte(schema.tournees.date, start),
        lte(schema.tournees.date, end),
      ))
      .limit(1);

    if (!tournee) {
      return NextResponse.json(buildDemo());
    }

    const rows = await db
      .select({
        l: schema.livraisons,
        commandeNumero: schema.commandes.numero,
        clientNom: schema.clients.raisonSociale,
        clientTel: schema.clients.telephone,
        totalTTC: schema.commandes.totalTTC,
      })
      .from(schema.livraisons)
      .leftJoin(schema.commandes, eq(schema.commandes.id, schema.livraisons.commandeId))
      .leftJoin(schema.clients, eq(schema.clients.id, schema.commandes.clientId))
      .where(eq(schema.livraisons.tourneeId, tournee.id))
      .orderBy(asc(schema.livraisons.ordre));

    return NextResponse.json({
      tournee: {
        ...tournee,
        date: tournee.date.toISOString(),
      },
      livraisons: rows.map((r) => ({
        id: r.l.id,
        ordre: r.l.ordre,
        statut: r.l.statut,
        adresse: r.l.adresseLivraison,
        clientNom: r.clientNom ?? "Client comptoir",
        clientTel: r.clientTel,
        commandeNumero: r.commandeNumero,
        totalTTC: r.totalTTC ?? 0,
        livraisonAt: r.l.livraisonAt?.toISOString() ?? null,
      })),
    });
  } catch {
    return NextResponse.json(buildDemo());
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { livraisonId, statut, motif, photoPreuve } = body as {
    livraisonId: string;
    statut: "livree" | "refusee" | "echec";
    motif?: string;
    photoPreuve?: string;
  };

  if (!livraisonId || !statut) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

  try {
    const updates: Record<string, unknown> = {
      statut,
      livraisonAt: new Date(),
    };
    if (motif) updates.motifRefus = motif;
    if (photoPreuve) updates.photoPreuve = photoPreuve;

    await db
      .update(schema.livraisons)
      .set(updates as never)
      .where(eq(schema.livraisons.id, livraisonId));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
