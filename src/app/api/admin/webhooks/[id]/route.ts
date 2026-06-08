import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isValidEvent } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  if (role !== "admin" && role !== "gerant") return null;
  return { id: session.user.id, nom: session.user.name, role };
}

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
  if (typeof body.nom === "string") updates.nom = body.nom;
  if (typeof body.url === "string") {
    try {
      new URL(body.url);
      updates.url = body.url;
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }
  }
  if (typeof body.actif === "boolean") updates.actif = body.actif;
  if (Array.isArray(body.evenements)) {
    updates.evenements = body.evenements.filter((e: string) => isValidEvent(e));
  }

  await db.update(schema.webhooks).set(updates).where(eq(schema.webhooks.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const [existing] = await db
    .select({ nom: schema.webhooks.nom })
    .from(schema.webhooks)
    .where(eq(schema.webhooks.id, id))
    .limit(1);

  await db.delete(schema.webhooks).where(eq(schema.webhooks.id, id));

  await logAudit({
    action: "suppression",
    entite: "webhook",
    entiteId: id,
    description: `Suppression webhook « ${existing?.nom ?? id} »`,
    actor,
  });

  return NextResponse.json({ ok: true });
}
