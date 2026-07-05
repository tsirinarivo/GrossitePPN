import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isMasterHost, ROOT_DOMAIN } from "@/lib/tenant-host";
import { logAudit } from "@/lib/audit";
import { IMPERSONATE_PREFIX } from "@/lib/auth/impersonation";

export const dynamic = "force-dynamic";

async function requireMasterAdmin() {
  const h = await headers();
  if (!isMasterHost(h.get("host"))) return null;
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  return role === "admin" ? session.user : null;
}

/** Génère un lien d'impersonation vers l'espace d'un tenant (super-admin). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireMasterAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id)).limit(1);
  if (!tenant) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  if (!tenant.slug) return NextResponse.json({ error: "Tenant sans slug" }, { status: 400 });

  // Choix du compte à incarner : gérant du tenant en priorité.
  const membres = await db
    .select({ id: schema.users.id, role: schema.users.role, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenant.id));
  let target =
    membres.find((u) => u.role === "gerant") ??
    membres.find((u) => u.role === "admin") ??
    membres[0] ??
    null;

  // Aucun compte encore → on le crée (sans email, juste pour l'accès).
  if (!target && tenant.contactEmail) {
    try {
      const { ensureTenantAdmin } = await import("@/lib/tenant-account");
      const admin = await ensureTenantAdmin(tenant);
      if (admin?.email) {
        const [u] = await db.select({ id: schema.users.id, role: schema.users.role, email: schema.users.email })
          .from(schema.users).where(eq(schema.users.email, admin.email)).limit(1);
        target = u ?? null;
      }
    } catch (e) {
      console.error("[impersonate] ensureTenantAdmin", e);
    }
  }

  if (!target) {
    return NextResponse.json({ error: "Aucun compte à incarner pour ce tenant (ajoutez un utilisateur d'abord)." }, { status: 400 });
  }

  // Jeton à usage unique (3 min) stocké dans `verifications`.
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const now = new Date();
  await db.insert(schema.verifications).values({
    id: crypto.randomUUID(),
    identifier: `${IMPERSONATE_PREFIX}${token}`,
    value: target.id,
    expiresAt: new Date(now.getTime() + 3 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });

  await logAudit({
    action: "tenant.impersonate",
    entite: "tenant",
    entiteId: tenant.id,
    details: { slug: tenant.slug, cibleUserId: target.id, cibleEmail: target.email },
  });

  const url = `https://${tenant.slug}.${ROOT_DOMAIN}/api/auth/impersonation/consume?token=${token}&callbackURL=${encodeURIComponent("/dashboard")}`;
  return NextResponse.json({ url });
}
