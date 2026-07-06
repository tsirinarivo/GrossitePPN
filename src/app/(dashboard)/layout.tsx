import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { homeForRole } from "@/lib/permissions";
import { parseHost } from "@/lib/tenant-host";
import { DashboardShell } from "@/components/domain/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role: string = (session.user as any).role ?? "agent";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actif: boolean = (session.user as any).actif ?? true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userTenantId: string | null = (session.user as any).tenantId ?? null;
  const isSuperAdmin = role === "admin";

  if (!actif) {
    redirect("/login?error=compte_desactive");
  }

  const { kind, slug } = parseHost(h.get("host"));

  // Console master = coquille dédiée à la gestion plateforme (pas de menu ERP).
  const isMaster = kind === "master";
  if (isMaster && !isSuperAdmin) {
    redirect("/login?error=reserve_admin");
  }

  // ── Isolation stricte sur un sous-domaine tenant ──────────────────────────
  // (le super-admin passe partout, notamment pour l'impersonation)
  if (kind === "tenant" && slug && !isSuperAdmin) {
    const [tenant] = await db
      .select({ id: schema.tenants.id, statut: schema.tenants.statut })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug))
      .limit(1);

    if (!tenant) {
      redirect("/login?error=espace_inconnu");
    }
    // L'utilisateur doit appartenir à CE tenant (transition-safe : on ne bloque
    // que si son tenantId est défini et ne correspond pas).
    if (userTenantId && userTenantId !== tenant.id) {
      redirect("/login?error=mauvais_espace");
    }
    // Espace désactivé (paiement stoppé / résilié).
    if (tenant.statut === "suspendu" || tenant.statut === "resilie") {
      redirect("/login?error=espace_inactif");
    }
  }

  return (
    <DashboardShell role={role} isMaster={isMaster}>
      {children}
    </DashboardShell>
  );
}

/** Utilitaire réutilisable dans les page.tsx serveur */
export async function requireRole(...allowed: string[]): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role: string = (session.user as any).role ?? "agent";
  if (allowed.length > 0 && !allowed.includes(role)) {
    redirect(homeForRole(role));
  }
  return role;
}
