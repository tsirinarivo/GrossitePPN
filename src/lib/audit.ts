import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Logge une action sensible dans le journal d'audit.
 *
 * Best-effort : ne jette jamais d'erreur pour ne pas bloquer le flux principal.
 *
 * Usage :
 *   await logAudit({
 *     action: "commande.valider",
 *     entite: "commande",
 *     entiteId: id,
 *     details: { totalTTC, modePaiement },
 *   });
 */
export async function logAudit(input: {
  action: string;
  entite?: string;
  entiteId?: string;
  details?: Record<string, unknown>;
  // Override l'utilisateur (sinon récupéré depuis la session)
  userId?: string;
  userEmail?: string;
  userRole?: string;
}) {
  try {
    let userId = input.userId;
    let userEmail = input.userEmail;
    let userRole = input.userRole;
    let ip: string | null = null;
    let userAgent: string | null = null;

    if (!userId) {
      const h = await headers();
      const session = await auth.api.getSession({ headers: h });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = session?.user as any;
      userId = u?.id ?? undefined;
      userEmail = u?.email ?? undefined;
      userRole = u?.role ?? undefined;
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
      userAgent = h.get("user-agent") ?? null;
    }

    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      userRole: userRole ?? null,
      action: input.action,
      entite: input.entite ?? null,
      entiteId: input.entiteId ?? null,
      details: input.details ?? null,
      ip,
      userAgent,
    });
  } catch (e) {
    // Best-effort : on n'échoue jamais sur l'audit
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audit] log failed:", e);
    }
  }
}
