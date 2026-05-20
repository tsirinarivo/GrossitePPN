import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role ?? "agent";
  return role === "admin" || role === "gerant";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.nom !== undefined) updates.nom = body.nom;
  if (body.valeur !== undefined) updates.valeur = body.valeur;
  if (body.actif !== undefined) updates.actif = body.actif;
  if (body.finAt !== undefined) updates.finAt = new Date(body.finAt);
  if (body.code !== undefined) updates.code = body.code;
  if (body.type !== undefined) updates.type = body.type;
  if (body.typeValeur !== undefined) updates.typeValeur = body.typeValeur;
  if (body.minCommande !== undefined) updates.minCommande = body.minCommande;
  if (body.nbUtilisationsMax !== undefined) updates.nbUtilisationsMax = body.nbUtilisationsMax;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const [promotion] = await db
    .update(schema.promotions)
    .set(updates)
    .where(eq(schema.promotions.id, id))
    .returning();

  if (!promotion) return NextResponse.json({ error: "Promotion introuvable" }, { status: 404 });
  return NextResponse.json({ promotion });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  await db.delete(schema.promotions).where(eq(schema.promotions.id, id));
  return NextResponse.json({ ok: true });
}
