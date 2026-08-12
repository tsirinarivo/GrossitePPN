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

export interface Actor {
  id: string;
  role: string;
  tenantId: string | null;
  email: string | null;
  name: string | null;
}

/**
 * Garde centralisée : renvoie l'acteur (avec son tenant) s'il est connecté ET
 * — si des rôles sont fournis — autorisé ; sinon `null`. À utiliser au début de
 * chaque route mutante :
 *   const actor = await requireRole("admin", "gerant");
 *   if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
 *   // ... scoper par actor.tenantId
 */
export async function requireRole(...roles: string[]): Promise<Actor | null> {
  const u = await getSessionUser();
  if (!u) return null;
  const role = (u as { role?: string }).role ?? "agent";
  if (roles.length > 0 && !roles.includes(role)) return null;
  return {
    id: u.id,
    role,
    tenantId: (u as { tenantId?: string | null }).tenantId ?? null,
    email: (u as { email?: string | null }).email ?? null,
    name: (u as { name?: string | null }).name ?? null,
  };
}
