import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { scopeTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("admin", "gerant", "comptable");
  if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const tid = actor.tenantId;

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
      .where(scopeTenant(schema.chargesOperationnelles.tenantId, tid, eq(schema.chargesOperationnelles.id, id)))
      .returning();
    if (!charge) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json({ charge });
  } catch {
    return NextResponse.json(
      { error: "Table absente — exécutez pnpm drizzle-kit push sur le VPS" },
      { status: 503 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("admin", "gerant", "comptable");
  if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const tid = actor.tenantId;

  const { id } = await params;
  try {
    const deleted = await db
      .delete(schema.chargesOperationnelles)
      .where(scopeTenant(schema.chargesOperationnelles.tenantId, tid, eq(schema.chargesOperationnelles.id, id)))
      .returning();
    if (deleted.length === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Table absente" }, { status: 503 });
  }
}
