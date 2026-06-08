import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.actif !== "boolean") {
    return NextResponse.json({ error: "Champ actif requis" }, { status: 400 });
  }
  await db.update(schema.apiKeys).set({ actif: body.actif }).where(eq(schema.apiKeys.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, id));

  await logAudit({
    action: "suppression",
    entite: "api_key",
    entiteId: id,
    description: "Révocation d'une clé API",
    actor,
  });

  return NextResponse.json({ ok: true });
}
