import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { homeForRole } from "@/lib/permissions";
import { DashboardShell } from "@/components/domain/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

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

  return (
    <DashboardShell role={role}>
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
