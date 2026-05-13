import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

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
