import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

  if (!actif) {
    redirect("/login?error=compte_desactive");
  }

  // Console master = coquille dédiée à la gestion plateforme (pas de menu ERP).
  const isMaster = parseHost(h.get("host")).kind === "master";
  // La console master est réservée au super-admin plateforme.
  if (isMaster && role !== "admin") {
    redirect("/login?error=reserve_admin");
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
