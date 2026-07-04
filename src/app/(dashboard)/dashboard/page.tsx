import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { homeForRole } from "@/lib/permissions";

/**
 * Accueil de l'espace ERP. Redirige vers la page d'accueil du rôle
 * (ex: caissier → /pos/caisse, gérant → /rapports).
 */
export default async function DashboardHome() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  redirect(homeForRole(role));
}
