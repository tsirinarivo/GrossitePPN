import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemo() {
  return [
    { id: "p1", produitId: "demo-p1", produitNom: "Riz Makalioka 50kg", quantite: 245, seuil: 50, valeur: 26950000 },
    { id: "p2", produitId: "demo-p2", produitNom: "Huile Tournesol 5L", quantite: 132, seuil: 30, valeur: 6600000 },
    { id: "p3", produitId: "demo-p3", produitNom: "Sucre cristallisé 1kg", quantite: 580, seuil: 100, valeur: 1740000 },
    { id: "p4", produitId: "demo-p4", produitNom: "Sel iodé 500g", quantite: 24, seuil: 60, valeur: 36000 },
    { id: "p5", produitId: "demo-p5", produitNom: "Lait en poudre 1kg", quantite: 87, seuil: 25, valeur: 2610000 },
  ];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const rows = await db
      .select({
        id: schema.stocks.id,
        produitId: schema.stocks.produitId,
        produitNom: schema.produits.nom,
        quantite: schema.stocks.quantiteBase,
        seuil: schema.produits.seuilAlerte,
        prixAchat: schema.produits.prixAchatMoyenPondere,
      })
      .from(schema.stocks)
      .leftJoin(schema.produits, eq(schema.produits.id, schema.stocks.produitId))
      .where(eq(schema.stocks.depotId, id))
      .orderBy(desc(schema.stocks.quantiteBase))
      .limit(500);

    if (rows.length === 0) {
      return NextResponse.json({ stock: buildDemo(), demo: true });
    }

    return NextResponse.json({
      stock: rows.map((r) => ({
        ...r,
        valeur: Math.round((r.quantite ?? 0) * (r.prixAchat ?? 0)),
      })),
      demo: false,
    });
  } catch {
    return NextResponse.json({ stock: buildDemo(), demo: true });
  }
}
