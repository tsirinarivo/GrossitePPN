import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql, and, gte, lt, isNull, not, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function extractVille(adresse: string | null | undefined): string {
  if (!adresse) return "Madagascar";
  const first = adresse.split(",")[0]?.trim();
  return first ?? "Madagascar";
}

function formatEta(date: Date | null | undefined): string {
  if (!date) return "—";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hhmm = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.getTime() === today.getTime()) return hhmm;
  if (d.getTime() === tomorrow.getTime()) return `Demain ${hhmm}`;
  return `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${hhmm}`;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    let dateStart: Date;
    let dateEnd: Date;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      dateStart = new Date(`${dateParam}T00:00:00.000Z`);
      dateEnd = new Date(`${dateParam}T23:59:59.999Z`);
    } else {
      const now = new Date();
      dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateEnd = new Date(dateStart.getTime() + 86400000 - 1);
    }

    // Alias for chauffeur (users joined via tournee)
    const chauffeur = schema.users;

    const rows = await db
      .select({
        id: schema.livraisons.id,
        tokenPublic: schema.livraisons.tokenPublic,
        statut: schema.livraisons.statut,
        adresseLivraison: schema.livraisons.adresseLivraison,
        motifRefus: schema.livraisons.motifRefus,
        livraisonAt: schema.livraisons.livraisonAt,
        tourneeId: schema.livraisons.tourneeId,
        commandeId: schema.livraisons.commandeId,
        commandeNumero: schema.commandes.numero,
        commandeTotalTTC: schema.commandes.totalTTC,
        clientRaisonSociale: schema.clients.raisonSociale,
        clientAdresse: schema.clients.adresse,
        tourneeDate: schema.tournees.date,
        vehiculeImmat: schema.vehicules.immatriculation,
        vehiculeModele: schema.vehicules.modele,
        chauffeurName: chauffeur.name,
      })
      .from(schema.livraisons)
      .leftJoin(schema.commandes, eq(schema.livraisons.commandeId, schema.commandes.id))
      .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
      .leftJoin(schema.tournees, eq(schema.livraisons.tourneeId, schema.tournees.id))
      .leftJoin(schema.vehicules, eq(schema.tournees.vehiculeId, schema.vehicules.id))
      .leftJoin(chauffeur, eq(schema.tournees.chauffeurId, chauffeur.id))
      .where(
        and(
          gte(schema.livraisons.createdAt, dateStart),
          lt(schema.livraisons.createdAt, dateEnd)
        )
      );

    if (rows.length === 0) {
      return NextResponse.json({
        livraisons: [],
        stats: { total: 0, enRoute: 0, livrees: 0, echecs: 0 },
      });
    }

    // Count lignesCommande per commande
    const commandeIds = rows.map((r) => r.commandeId).filter(Boolean) as string[];
    const lignesCounts =
      commandeIds.length > 0
        ? await db
            .select({
              commandeId: schema.lignesCommande.commandeId,
              count: sql<number>`COUNT(*)`.as("count"),
            })
            .from(schema.lignesCommande)
            .where(inArray(schema.lignesCommande.commandeId, commandeIds))
            .groupBy(schema.lignesCommande.commandeId)
        : [];
    const countMap = new Map(lignesCounts.map((l) => [l.commandeId, Number(l.count)]));

    const livraisons = rows.map((r, i) => {
      const adresse = r.adresseLivraison ?? r.clientAdresse ?? "";
      const ville = extractVille(r.adresseLivraison) !== "Madagascar"
        ? extractVille(r.adresseLivraison)
        : extractVille(r.clientAdresse);
      const vehicule = r.vehiculeImmat
        ? `${r.vehiculeModele ? r.vehiculeModele + " — " : ""}${r.vehiculeImmat}`
        : "Non assigné";

      return {
        id: r.id,
        numero: r.commandeNumero ?? r.id,
        client: r.clientRaisonSociale ?? "Client inconnu",
        ville,
        adresse,
        chauffeur: r.chauffeurName ?? "Non assigné",
        vehicule,
        eta: formatEta(r.tourneeDate),
        montant: r.commandeTotalTTC ?? 0,
        nbColis: countMap.get(r.commandeId) ?? 1,
        statut: r.statut,
        tokenPublic: r.tokenPublic,
        tourneeId: r.tourneeId ?? null,
        livraisonAt: r.livraisonAt ? r.livraisonAt.toISOString() : null,
        motifRefus: r.motifRefus ?? null,
        position: { x: 20 + (i * 15) % 70, y: 25 + (i * 20) % 55 },
      };
    });

    const stats = {
      total: livraisons.length,
      enRoute: livraisons.filter((l) => l.statut === "en_route").length,
      livrees: livraisons.filter((l) => l.statut === "livree").length,
      echecs: livraisons.filter((l) => l.statut === "echec" || l.statut === "refusee").length,
    };

    return NextResponse.json({ livraisons, stats });
  } catch (e) {
    console.error("[api/livraisons GET]", e);
    return NextResponse.json({ livraisons: [], stats: { total: 0, enRoute: 0, livrees: 0, echecs: 0 } });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json() as { commandeId?: string; tourneeId?: string; adresseLivraison?: string };
    const { commandeId, tourneeId, adresseLivraison } = body;

    if (!commandeId) {
      return NextResponse.json({ error: "commandeId requis" }, { status: 400 });
    }

    const [commande] = await db
      .select({ id: schema.commandes.id, statut: schema.commandes.statut, adresseLivraison: schema.commandes.adresseLivraison })
      .from(schema.commandes)
      .where(eq(schema.commandes.id, commandeId))
      .limit(1);

    if (!commande) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (commande.statut !== "validee") {
      return NextResponse.json({ error: "La commande doit être validée" }, { status: 422 });
    }

    const tokenPublic = `trk-${randomUUID().slice(0, 8)}`;
    const id = randomUUID();
    const adresse = adresseLivraison ?? commande.adresseLivraison ?? "Adresse non précisée";

    await db.insert(schema.livraisons).values({
      id,
      tokenPublic,
      commandeId,
      tourneeId: tourneeId ?? null,
      statut: "en_attente",
      adresseLivraison: adresse,
    });

    const [created] = await db
      .select()
      .from(schema.livraisons)
      .where(eq(schema.livraisons.id, id))
      .limit(1);

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[api/livraisons POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
