import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemo() {
  return [
    { id: "demo-l1", nom: "Réappro hebdomadaire", frequence: "hebdo", nbProduits: 8, totalEstime: 1240000, createdAt: new Date().toISOString(), derniereCommandeAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: "demo-l2", nom: "Commande mensuelle riz/huile", frequence: "mensuel", nbProduits: 5, totalEstime: 3850000, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), derniereCommandeAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: "demo-l3", nom: "Essentiel quincaillerie", frequence: null, nbProduits: 12, totalEstime: 620000, createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), derniereCommandeAt: null },
  ];
}

async function getClientId(userId: string): Promise<string | null> {
  const [c] = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.userId, userId))
    .limit(1);
  return c?.id ?? null;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const clientId = await getClientId(session.user.id);
    if (!clientId) return NextResponse.json({ listes: buildDemo(), demo: true });

    const rows = await db
      .select({
        liste: schema.listesAchat,
        nbProduits: sql<number>`(SELECT COUNT(*) FROM lignes_liste_achat WHERE liste_id = ${schema.listesAchat.id})`,
      })
      .from(schema.listesAchat)
      .where(eq(schema.listesAchat.clientId, clientId))
      .orderBy(desc(schema.listesAchat.createdAt));

    if (rows.length === 0) {
      return NextResponse.json({ listes: buildDemo(), demo: true });
    }

    return NextResponse.json({
      listes: rows.map((r) => ({
        ...r.liste,
        nbProduits: Number(r.nbProduits ?? 0),
        createdAt: r.liste.createdAt.toISOString(),
        derniereCommandeAt: r.liste.derniereCommandeAt?.toISOString() ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ listes: buildDemo(), demo: true });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { nom, frequence, lignes } = body as {
    nom: string;
    frequence?: string;
    lignes: { produitId: string; uniteVenteId?: string; quantite: number }[];
  };

  if (!nom?.trim() || !Array.isArray(lignes) || lignes.length === 0) {
    return NextResponse.json({ error: "Nom et lignes requis" }, { status: 400 });
  }

  try {
    const clientId = await getClientId(session.user.id);
    if (!clientId) return NextResponse.json({ error: "Compte client requis" }, { status: 403 });

    const id = crypto.randomUUID();
    const [liste] = await db
      .insert(schema.listesAchat)
      .values({ id, clientId, nom: nom.trim(), frequence: frequence ?? null })
      .returning();

    await db.insert(schema.lignesListeAchat).values(
      lignes.map((l) => ({
        id: crypto.randomUUID(),
        listeId: id,
        produitId: l.produitId,
        uniteVenteId: l.uniteVenteId ?? null,
        quantite: l.quantite,
      }))
    );

    return NextResponse.json({ liste }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
