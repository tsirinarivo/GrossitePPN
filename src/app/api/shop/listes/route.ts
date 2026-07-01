import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, or, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getClientFromSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  // Direct B2B client
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.userId, session.user.id))
    .limit(1);

  if (client) return client;

  // Sous-utilisateur
  const [sub] = await db
    .select()
    .from(schema.sousUtilisateurs)
    .where(eq(schema.sousUtilisateurs.userId, session.user.id))
    .limit(1);

  if (sub) {
    const [cl] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, sub.clientId))
      .limit(1);
    return cl ?? null;
  }

  return null;
}

// ── GET /api/shop/listes ──────────────────────────────────────────────────────
export async function GET() {
  const client = await getClientFromSession();
  if (!client) return NextResponse.json({ error: "Compte client requis" }, { status: 403 });

  try {
    const listes = await db
      .select()
      .from(schema.listesAchat)
      .where(eq(schema.listesAchat.clientId, client.id))
      .orderBy(desc(schema.listesAchat.createdAt));

    const listeIds = listes.map((l) => l.id);
    const counts = listeIds.length > 0
      ? await db
          .select({
            listeId: schema.lignesListeAchat.listeId,
            nbArticles: sql<number>`count(*)::int`,
            quantiteTotale: sql<number>`coalesce(sum(${schema.lignesListeAchat.quantite}), 0)`,
          })
          .from(schema.lignesListeAchat)
          .where(sql`${schema.lignesListeAchat.listeId} = ANY(${listeIds})`)
          .groupBy(schema.lignesListeAchat.listeId)
      : [];

    const countMap = new Map(counts.map((c) => [c.listeId, c]));

    const listesEnrichies = listes.map((l) => ({
      ...l,
      nbArticles: countMap.get(l.id)?.nbArticles ?? 0,
      quantiteTotale: Number(countMap.get(l.id)?.quantiteTotale ?? 0),
    }));

    return NextResponse.json({
      listes: listesEnrichies,
      client: { id: client.id, raisonSociale: client.raisonSociale },
    });
  } catch (e) {
    console.error("[GET /api/shop/listes]", e);
    return NextResponse.json({ listes: [], client: null });
  }
}

// ── POST /api/shop/listes ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const client = await getClientFromSession();
  if (!client) return NextResponse.json({ error: "Compte client requis" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.nom?.trim()) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  try {
    const id = crypto.randomUUID();
    const [liste] = await db
      .insert(schema.listesAchat)
      .values({
        id,
        clientId: client.id,
        nom: String(body.nom).trim(),
        frequence: body.frequence ?? null,
      })
      .returning();

    // Si lignes fournies (depuis le panier), les insérer.
    // On résout chaque produitId contre un produit réel (id/code/nom) et on
    // ignore silencieusement les articles obsolètes (évite la violation FK).
    if (Array.isArray(body.lignes) && body.lignes.length > 0) {
      type LigneInput = { produitId?: string; uniteVenteId?: string; quantite?: number; nom?: string };
      const raw = (body.lignes as LigneInput[]).filter(
        (l) => l.produitId && Number(l.quantite) > 0
      );
      const ids = raw.map((l) => String(l.produitId));
      const noms = raw.map((l) => String(l.nom ?? ""));
      let prodRows: { id: string; nom: string; code: string }[] = [];
      try {
        prodRows = await db
          .select({ id: schema.produits.id, nom: schema.produits.nom, code: schema.produits.code })
          .from(schema.produits)
          .where(
            or(
              inArray(schema.produits.id, ids),
              inArray(schema.produits.code, ids),
              inArray(schema.produits.nom, noms)
            )
          );
      } catch (e) {
        console.error("[POST /api/shop/listes] résolution produits", e);
      }
      const idSet = new Set(prodRows.map((p) => p.id));
      const byCode = new Map(prodRows.map((p) => [p.code, p.id]));
      const byNom = new Map(prodRows.map((p) => [p.nom.toLowerCase(), p.id]));

      const lignes = raw
        .map((l) => {
          const pid = String(l.produitId);
          const rid = idSet.has(pid)
            ? pid
            : byCode.get(pid) ?? byNom.get(String(l.nom ?? "").toLowerCase()) ?? null;
          if (!rid) return null;
          return {
            id: crypto.randomUUID(),
            listeId: id,
            produitId: rid,
            uniteVenteId: l.uniteVenteId ?? null,
            quantite: Number(l.quantite),
          };
        })
        .filter(Boolean) as {
        id: string;
        listeId: string;
        produitId: string;
        uniteVenteId: string | null;
        quantite: number;
      }[];

      if (lignes.length > 0) {
        await db.insert(schema.lignesListeAchat).values(lignes);
      }
    }

    return NextResponse.json({ liste }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/shop/listes]", e);
    return NextResponse.json({ error: "Erreur de création" }, { status: 500 });
  }
}
