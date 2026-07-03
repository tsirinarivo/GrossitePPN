import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq, type SQL, type Column } from "drizzle-orm";

/**
 * ─── Couche multi-tenant centralisée (modèle « colonne tenantId partagée ») ───
 *
 * TOUT le filtrage / marquage par tenant passe par ici. Le jour où l'on migre
 * vers « schéma par tenant » ou « base par tenant », seule cette couche change
 * (résolution du tenant + routage de connexion), pas les routes métier.
 *
 * Transition-safe : tant qu'un utilisateur n'a pas de tenant (tenantId null),
 * les helpers ne filtrent rien → le comportement mono-tenant actuel est
 * préservé. Une fois le backfill fait et les users rattachés, l'isolation
 * s'active automatiquement.
 */

export const DEFAULT_TENANT_ID = "default";

/** Tenant de l'utilisateur courant (depuis la session), ou null en transition. */
export async function getSessionTenantId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { tenantId?: string | null } | undefined;
  return u?.tenantId ?? null;
}

/**
 * Condition de filtrage tenant.
 * - tenantId absent  → `undefined` (aucun filtre : mono-tenant préservé)
 * - tenantId présent → `eq(column, tenantId)`
 */
export function tenantFilter(
  column: Column,
  tenantId: string | null | undefined
): SQL | undefined {
  if (!tenantId) return undefined;
  return eq(column, tenantId);
}

/**
 * Combine le filtre tenant avec d'autres conditions (à utiliser dans `.where()`).
 * Exemple : `.where(scopeTenant(schema.produits.tenantId, tid, eq(produits.actif, true)))`
 */
export function scopeTenant(
  column: Column,
  tenantId: string | null | undefined,
  ...conditions: (SQL | undefined)[]
): SQL | undefined {
  return and(tenantFilter(column, tenantId), ...conditions);
}

/** Ajoute `tenantId` aux valeurs d'insertion (si un tenant est actif). */
export function stampTenant<T extends Record<string, unknown>>(
  values: T,
  tenantId: string | null | undefined
): T {
  return tenantId ? ({ ...values, tenantId } as T) : values;
}
