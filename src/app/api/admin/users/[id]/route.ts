import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";
import { tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Role = (typeof schema.roleEnum.enumValues)[number];

const updateSchema = z.object({
  role: z.enum(schema.roleEnum.enumValues).optional(),
  actif: z.boolean().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const callerRole = (session.user as { role?: string }).role;
  if (callerRole !== "admin" && callerRole !== "gerant") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const { id } = await params;

  // Isolation tenant : on ne peut modifier qu'un utilisateur de son propre tenant.
  const callerTenant = (session.user as { tenantId?: string | null }).tenantId ?? null;
  const [target] = await db
    .select({ tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (callerTenant && target.tenantId !== callerTenant) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { role, actif, name, password } = parsed.data;

  // Update user profile fields
  const updates: Partial<{ role: Role; actif: boolean; name: string; updatedAt: Date }> = {
    updatedAt: new Date(),
  };
  if (role !== undefined) updates.role = role;
  if (actif !== undefined) updates.actif = actif;
  if (name !== undefined) updates.name = name;

  await db.update(schema.users).set(updates).where(eq(schema.users.id, id));

  // Update password in accounts table if provided
  if (password) {
    const hashed = await hashPassword(password);
    await db
      .update(schema.accounts)
      .set({ password: hashed, updatedAt: new Date() })
      .where(
        and(
          eq(schema.accounts.userId, id),
          eq(schema.accounts.providerId, "credential")
        )
      );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const callerRole = (session.user as { role?: string }).role;
  if (callerRole !== "admin" && callerRole !== "gerant") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const { id } = await params;

  // On ne se supprime jamais soi-même (évite le lock-out).
  if (id === session.user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }

  // Isolation tenant : on ne peut supprimer qu'un utilisateur de son propre tenant.
  const callerTenant = (session.user as { tenantId?: string | null }).tenantId ?? null;
  const [target] = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role, tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (callerTenant && target.tenantId !== callerTenant) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // On refuse de supprimer le dernier admin/gérant actif du tenant (évite le lock-out du tenant).
  if (target.role === "admin" || target.role === "gerant") {
    const managers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          tenantFilter(schema.users.tenantId, callerTenant),
          inArray(schema.users.role, ["admin", "gerant"]),
          eq(schema.users.actif, true),
          ne(schema.users.id, id)
        )
      );
    if (managers.length === 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer le dernier administrateur/gérant du compte." },
        { status: 409 }
      );
    }
  }

  // Suppression physique. Les comptes (accounts), sessions et sous-utilisateurs
  // sont en CASCADE. En revanche l'historique métier (commandes, livraisons,
  // retours, achats…) référence l'utilisateur en NO ACTION : si l'utilisateur a
  // une activité, la suppression est bloquée par la contrainte de clé étrangère
  // (23503). Dans ce cas on le désactive plutôt que de corrompre l'historique.
  try {
    const deleted = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    await logAudit({ action: "utilisateur.supprimer", entite: "user", entiteId: id, details: { email: target.email, role: target.role } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "23503") {
      // Contrainte FK : l'utilisateur a un historique → on le désactive.
      await db
        .update(schema.users)
        .set({ actif: false, updatedAt: new Date() })
        .where(eq(schema.users.id, id));
      await logAudit({ action: "utilisateur.desactiver", entite: "user", entiteId: id, details: { email: target.email, motif: "historique_present" } });
      return NextResponse.json(
        {
          ok: false,
          deactivated: true,
          error: "Cet utilisateur a un historique (ventes, livraisons, achats…). Il a été désactivé au lieu d'être supprimé afin de préserver l'intégrité des données.",
        },
        { status: 409 }
      );
    }
    console.error("[admin/users DELETE]", e);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
