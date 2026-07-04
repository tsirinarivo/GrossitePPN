import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";
import { isMasterHost } from "@/lib/tenant-host";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const h = await headers();
  if (!isMasterHost(h.get("host"))) return null;
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  if (role !== "admin") return null;
  return { id: session.user.id, nom: session.user.name, role };
}

const STATUTS = ["essai", "actif", "suspendu", "resilie"];
const PLANS = ["essai", "standard", "pro", "entreprise"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.nom === "string" && body.nom.trim()) updates.nom = body.nom.trim();
  if (STATUTS.includes(body.statut)) updates.statut = body.statut;
  if (PLANS.includes(body.plan)) updates.plan = body.plan;
  if (typeof body.contactNom === "string") updates.contactNom = body.contactNom.trim() || null;
  if (typeof body.contactEmail === "string") updates.contactEmail = body.contactEmail.trim() || null;
  if (typeof body.contactTelephone === "string") updates.contactTelephone = body.contactTelephone.trim() || null;
  if (body.maxUtilisateurs != null && Number.isFinite(Number(body.maxUtilisateurs)))
    updates.maxUtilisateurs = Number(body.maxUtilisateurs);
  if (body.maxDepots != null && Number.isFinite(Number(body.maxDepots)))
    updates.maxDepots = Number(body.maxDepots);
  if (body.finEssaiAt !== undefined)
    updates.finEssaiAt = body.finEssaiAt ? new Date(body.finEssaiAt) : null;
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;

  try {
    await db.update(schema.tenants).set(updates).where(eq(schema.tenants.id, id));
    if (body.statut && STATUTS.includes(body.statut)) {
      await logAudit({
        action: "tenant.modifier",
        entite: "tenant",
        entiteId: id,
        details: { statut: body.statut },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });
    }
    console.error("[admin/tenants] PATCH", msg);
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const [existing] = await db
    .select({ nom: schema.tenants.nom })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, id))
    .limit(1);

  await db.delete(schema.tenants).where(eq(schema.tenants.id, id));

  await logAudit({
    action: "tenant.supprimer",
    entite: "tenant",
    entiteId: id,
    details: { nom: existing?.nom ?? null },
  });

  return NextResponse.json({ ok: true });
}
