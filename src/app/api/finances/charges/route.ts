import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const mois = new URL(req.url).searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);
  const rows = await db.select().from(schema.chargesOperationnelles)
    .where(eq(schema.chargesOperationnelles.mois, mois));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  const { libelle, categorie, montant, mois, notes } = body;
  if (!libelle || !categorie || !montant || !mois)
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  const id = crypto.randomUUID();
  await db.insert(schema.chargesOperationnelles).values({
    id, libelle, categorie, montant: Math.round(montant), mois, notes: notes ?? null,
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
