import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type AuditAction =
  | "creation"
  | "modification"
  | "suppression"
  | "connexion"
  | "export"
  | "anonymisation"
  | "annulation"
  | "remise"
  | "acces";

export type AuditEntite =
  | "client"
  | "produit"
  | "prix"
  | "commande"
  | "vente"
  | "facture"
  | "stock"
  | "utilisateur"
  | "promotion"
  | "webhook"
  | "api_key"
  | "configuration"
  | "rgpd"
  | "auth";

interface LogAuditInput {
  action: AuditAction;
  entite: AuditEntite;
  entiteId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  /** Forcer l'acteur (sinon lu depuis la session courante). */
  actor?: { id?: string | null; nom?: string | null; role?: string | null } | null;
  ipAddress?: string | null;
}

/**
 * Écrit une entrée dans le journal d'audit métier.
 *
 * Garantie : ne lève jamais d'exception — un échec d'audit ne doit pas
 * faire échouer l'action métier qui l'a déclenché.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    let actor = input.actor ?? null;
    let ip = input.ipAddress ?? null;

    if (!actor) {
      const h = await headers();
      const session = await auth.api.getSession({ headers: h });
      const u = session?.user as
        | { id?: string; name?: string; role?: string }
        | undefined;
      actor = u ? { id: u.id ?? null, nom: u.name ?? null, role: u.role ?? null } : null;
      ip =
        ip ??
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null;
    }

    await db.insert(schema.journalAudit).values({
      id: crypto.randomUUID(),
      userId: actor?.id ?? null,
      userNom: actor?.nom ?? null,
      userRole: actor?.role ?? null,
      action: input.action,
      entite: input.entite,
      entiteId: input.entiteId ?? null,
      description: input.description,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ipAddress: ip,
    });
  } catch (e) {
    console.error(
      "[audit] échec écriture journal:",
      e instanceof Error ? e.message : e
    );
  }
}
