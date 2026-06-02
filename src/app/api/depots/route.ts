import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        depot: schema.depots,
        nbProduits: sql<number>`(SELECT COUNT(DISTINCT produit_id) FROM stocks WHERE depot_id = ${schema.depots.id})`,
        stockTotal: sql<number>`(SELECT COALESCE(SUM(quantite_base), 0) FROM stocks WHERE depot_id = ${schema.depots.id})`,
      })
      .from(schema.depots)
      .orderBy(schema.depots.estPrincipal, schema.depots.nom);

    return NextResponse.json({
      depots: rows.map((r) => ({
        ...r.depot,
        nbProduits: Number(r.nbProduits ?? 0),
        stockTotal: Number(r.stockTotal ?? 0),
      })),
    });
  } catch (e) {
    console.error("[api/depots GET]", e);
    return NextResponse.json({ depots: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { nom, adresse, telephone } = body;
    if (!nom?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    const id = crypto.randomUUID();
    const [depot] = await db.insert(schema.depots).values({
      id,
      nom: nom.trim(),
      adresse: adresse ?? null,
      telephone: telephone ?? null,
      actif: true,
      estPrincipal: false,
    }).returning();

    return NextResponse.json({ depot }, { status: 201 });
  } catch (e) {
    console.error("[api/depots POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
