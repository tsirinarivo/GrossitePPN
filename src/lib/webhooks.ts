import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/** Catalogue des événements émis par la plateforme. */
export const WEBHOOK_EVENTS = [
  { key: "commande.creee", label: "Commande créée", description: "Une nouvelle commande est enregistrée (POS ou boutique)" },
  { key: "commande.validee", label: "Commande validée", description: "Une commande passe au statut validée" },
  { key: "commande.livree", label: "Commande livrée", description: "Une livraison est marquée livrée" },
  { key: "facture.emise", label: "Facture émise", description: "Une facture est générée" },
  { key: "paiement.recu", label: "Paiement reçu", description: "Un encaissement est confirmé" },
  { key: "stock.bas", label: "Stock bas", description: "Un produit passe sous son seuil d'alerte" },
] as const;

export type WebhookEventKey = (typeof WEBHOOK_EVENTS)[number]["key"];

export function isValidEvent(key: string): key is WebhookEventKey {
  return WEBHOOK_EVENTS.some((e) => e.key === key);
}

/** Génère un secret de signature pour un nouveau webhook. */
export function generateSecret(): string {
  return "whsec_" + randomBytes(24).toString("hex");
}

/** Génère une clé d'API partenaire. */
export function generateApiKey(): string {
  return "ppn_" + randomBytes(24).toString("hex");
}

/** Signature HMAC SHA-256 du corps, encodée en hex. */
export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Diffuse un événement vers tous les webhooks abonnés et actifs.
 *
 * Conçu pour être appelé sans `await` bloquant : toutes les erreurs sont
 * capturées, l'action métier déclenchante ne doit jamais échouer à cause d'un
 * webhook.
 */
export async function dispatchEvent(
  evenement: WebhookEventKey,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const cibles = await db
      .select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.actif, true));

    const abonnes = cibles.filter((w) =>
      Array.isArray(w.evenements) && (w.evenements as string[]).includes(evenement)
    );
    if (abonnes.length === 0) return;

    const timestamp = new Date().toISOString();
    await Promise.allSettled(
      abonnes.map((w) => deliver(w, evenement, data, timestamp))
    );
  } catch (e) {
    console.error("[webhooks] dispatch error:", e instanceof Error ? e.message : e);
  }
}

interface WebhookRow {
  id: string;
  url: string;
  secret: string;
}

/** Effectue un envoi unitaire et journalise le résultat. */
export async function deliver(
  webhook: WebhookRow,
  evenement: string,
  data: Record<string, unknown>,
  timestamp = new Date().toISOString()
): Promise<{ succes: boolean; statusCode: number | null; erreur: string | null }> {
  const body = JSON.stringify({ evenement, timestamp, data });
  const signature = signPayload(webhook.secret, body);
  const start = Date.now();

  let statusCode: number | null = null;
  let succes = false;
  let erreur: string | null = null;

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "GrossistePPN-Webhooks/1.0",
        "X-Webhook-Event": evenement,
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Timestamp": timestamp,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    statusCode = res.status;
    succes = res.ok;
    if (!res.ok) erreur = `HTTP ${res.status}`;
  } catch (e) {
    erreur = e instanceof Error ? e.message : String(e);
  }

  const dureeMs = Date.now() - start;

  try {
    await db.insert(schema.webhookDeliveries).values({
      id: crypto.randomUUID(),
      webhookId: webhook.id,
      evenement,
      payload: body,
      statusCode,
      succes,
      erreur,
      dureeMs,
    });
    await db
      .update(schema.webhooks)
      .set({
        dernierStatut: statusCode,
        dernierSucces: succes,
        derniereTentativeAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.webhooks.id, webhook.id));
    // Incrément compteurs via lecture/écriture simple (volumes faibles).
    const [w] = await db
      .select({ nbEnvois: schema.webhooks.nbEnvois, nbEchecs: schema.webhooks.nbEchecs })
      .from(schema.webhooks)
      .where(eq(schema.webhooks.id, webhook.id))
      .limit(1);
    if (w) {
      await db
        .update(schema.webhooks)
        .set({
          nbEnvois: w.nbEnvois + 1,
          nbEchecs: w.nbEchecs + (succes ? 0 : 1),
        })
        .where(eq(schema.webhooks.id, webhook.id));
    }
  } catch (e) {
    console.error("[webhooks] journalisation:", e instanceof Error ? e.message : e);
  }

  return { succes, statusCode, erreur };
}

/**
 * Vérifie une clé d'API partenaire (header `X-API-Key`).
 * Incrémente le compteur d'appels. Retourne la clé valide ou null.
 */
export async function verifyApiKey(
  key: string | null
): Promise<{ id: string; nom: string } | null> {
  if (!key) return null;
  try {
    const [row] = await db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.cle, key), eq(schema.apiKeys.actif, true)))
      .limit(1);
    if (!row) return null;
    await db
      .update(schema.apiKeys)
      .set({ nbAppels: row.nbAppels + 1, derniereUtilisationAt: new Date() })
      .where(eq(schema.apiKeys.id, row.id));
    return { id: row.id, nom: row.nom };
  } catch (e) {
    console.error("[webhooks] verifyApiKey:", e instanceof Error ? e.message : e);
    return null;
  }
}
