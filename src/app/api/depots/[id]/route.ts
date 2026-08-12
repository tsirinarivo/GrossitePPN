import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, ne } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { scopeTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("admin", "gerant");
  if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const tid = actor.tenantId;

  const { id } = await params;
  try {
    const body = await req.json();
    const { nom, adresse, telephone, actif, estPrincipal } = body;

    // Si on définit ce dépôt comme principal, retirer le flag des autres
    if (estPrincipal === true) {
      await db.update(schema.depots).set({ estPrincipal: false }).where(scopeTenant(schema.depots.tenantId, tid, ne(schema.depots.id, id)));
    }

    const values: Partial<typeof schema.depots.$inferInsert> = {};
    if (nom !== undefined) values.nom = nom.trim();
    if (adresse !== undefined) values.adresse = adresse || null;
    if (telephone !== undefined) values.telephone = telephone || null;
    if (actif !== undefined) values.actif = actif;
    if (estPrincipal !== undefined) values.estPrincipal = estPrincipal;

    const [depot] = await db.update(schema.depots).set(values).where(scopeTenant(schema.depots.tenantId, tid, eq(schema.depots.id, id))).returning();
    if (!depot) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json({ depot });
  } catch (e) {
    console.error("[api/depots PATCH]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("admin", "gerant");
  if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const tid = actor.tenantId;

  const { id } = await params;
  try {
    // Soft delete — désactiver uniquement
    const [depot] = await db.update(schema.depots).set({ actif: false, estPrincipal: false }).where(scopeTenant(schema.depots.tenantId, tid, eq(schema.depots.id, id))).returning();
    if (!depot) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    await logAudit({ action: "depot.desactiver", entite: "depot", entiteId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/depots DELETE]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
