import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/** Utilisateur de session courant, ou null. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Vrai si une session valide existe. */
export async function requireAuth(): Promise<boolean> {
  return !!(await getSessionUser());
}

/** Vrai si l'utilisateur a l'un des rôles donnés (aucun rôle passé = simple auth). */
export async function requireRoles(...roles: string[]): Promise<boolean> {
  const u = await getSessionUser();
  if (!u) return false;
  const role = (u as { role?: string }).role ?? "agent";
  return roles.length === 0 || roles.includes(role);
}
