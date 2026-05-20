import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { libelle, categorie, montant, mois, notes } = body;

  try {
    const [charge] = await db
      .update(schema.chargesOperationnelles)
      .set({
        libelle,
        categorie,
        montant: Math.round(montant),
        mois,
        notes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.chargesOperationnelles.id, id))
      .returning();
    return NextResponse.json({ charge });
  } catch {
    return NextResponse.json(
      { error: "Table absente — exécutez pnpm drizzle-kit push sur le VPS" },
      { status: 503 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  try {
    await db.delete(schema.chargesOperationnelles).where(eq(schema.chargesOperationnelles.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Table absente" }, { status: 503 });
  }
}
