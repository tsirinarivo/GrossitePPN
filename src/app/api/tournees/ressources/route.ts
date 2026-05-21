import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, isNull, or, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Retourne :
// - chauffeurs (users role=chauffeur)
// - vehicules actifs
// - livraisons non affectées (statut <> livree)
export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const [chauffeurs, vehicules, livraisonsLibres] = await Promise.all([
      db
        .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
        .from(schema.users)
        .where(and(eq(schema.users.role, "chauffeur"), eq(schema.users.actif, true)))
        .orderBy(asc(schema.users.name)),
      db
        .select()
        .from(schema.vehicules)
        .where(eq(schema.vehicules.actif, true))
        .orderBy(asc(schema.vehicules.immatriculation)),
      db
        .select({
          id: schema.livraisons.id,
          adresseLivraison: schema.livraisons.adresseLivraison,
          statut: schema.livraisons.statut,
          commandeId: schema.livraisons.commandeId,
          commandeNumero: schema.commandes.numero,
          commandeTotalTTC: schema.commandes.totalTTC,
          clientNom: schema.clients.raisonSociale,
        })
        .from(schema.livraisons)
        .leftJoin(schema.commandes, eq(schema.livraisons.commandeId, schema.commandes.id))
        .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
        .where(
          and(
            or(isNull(schema.livraisons.tourneeId), eq(schema.livraisons.tourneeId, "")),
            or(
              eq(schema.livraisons.statut, "en_attente"),
              eq(schema.livraisons.statut, "preparee"),
              eq(schema.livraisons.statut, "chargee")
            )
          )
        ),
    ]);

    return NextResponse.json({
      chauffeurs,
      vehicules,
      livraisonsLibres,
    });
  } catch {
    return NextResponse.json({ chauffeurs: [], vehicules: [], livraisonsLibres: [] });
  }
}
