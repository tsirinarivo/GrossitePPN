import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type EntrepriseRow = typeof schema.entreprise.$inferSelect;

/**
 * Résout les paramètres « entreprise » (société) du tenant donné.
 * - tenantId présent → sa propre ligne entreprise.
 * - sinon / introuvable → ligne legacy « singleton » (tenant par défaut).
 *
 * Chaque tenant possède désormais sa propre identité (nom, NIF, TVA, logo…)
 * utilisée sur ses factures, devis, tickets, etc.
 */
export async function getEntrepriseFor(
  tenantId: string | null | undefined
): Promise<EntrepriseRow | null> {
  if (tenantId) {
    const [row] = await db
      .select()
      .from(schema.entreprise)
      .where(eq(schema.entreprise.tenantId, tenantId))
      .limit(1);
    if (row) return row;
  }
  const [legacy] = await db
    .select()
    .from(schema.entreprise)
    .where(eq(schema.entreprise.id, "singleton"))
    .limit(1);
  return legacy ?? null;
}
