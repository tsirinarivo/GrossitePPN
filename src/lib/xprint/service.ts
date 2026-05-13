import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { xprintSend, xprintQueryOrder, buildDefaultConfig, xprintErrorMessage, type XprintConfig } from "./client";

export async function loadXprintConfig(): Promise<XprintConfig | null> {
  const rows = await db.select().from(schema.entreprise).limit(1);
  const e = rows[0];
  if (!e) return null;

  const p = (e.parametres ?? {}) as Record<string, unknown>;
  if (!p["xprintEnabled"]) return null;

  const user = String(p["xprintUser"] ?? "");
  const key = String(p["xprintKey"] ?? "");
  const sn = String(p["xprintSn"] ?? "");
  if (!user || !key || !sn) return null;

  return buildDefaultConfig({
    user,
    key,
    baseUrl: p["xprintBaseUrl"] ? String(p["xprintBaseUrl"]) : undefined,
    sn,
    copies: typeof p["xprintCopies"] === "number" ? p["xprintCopies"] : 1,
    voice: typeof p["xprintVoice"] === "number" ? p["xprintVoice"] : 0,
    header: p["xprintHeader"] ? String(p["xprintHeader"]) : null,
    footer: p["xprintFooter"] ? String(p["xprintFooter"]) : null,
    autoOnFacture: p["xprintAutoOnFacture"] !== false,
  });
}

function generateId(): string {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function sendPrintAndLog(
  content: string,
  meta: { kind: string; relatedId?: string | null; copies?: number },
): Promise<{ ok: boolean; orderId?: string; errorMessage?: string }> {
  const cfg = await loadXprintConfig();
  if (!cfg) return { ok: false, errorMessage: "Imprimante non configurée" };

  if (Buffer.byteLength(content, "utf-8") > 4096) {
    return { ok: false, errorMessage: "Contenu > 4096 bytes" };
  }

  const copies = meta.copies ?? cfg.copies;
  const res = await xprintSend(cfg, content, copies);

  const logId = generateId();
  await db.insert(schema.printLogs).values({
    id: logId,
    sn: cfg.sn,
    kind: meta.kind,
    relatedId: meta.relatedId ?? null,
    content: content.slice(0, 500),
    copies,
    status: res.ok ? "pending" : "failed",
    orderId: res.orderId ?? null,
    error: res.ok ? null : `[${res.code}] ${xprintErrorMessage(res.code, res.msg)}`,
    failedAt: res.ok ? null : new Date(),
  });

  // Poll à 15s pour mettre à jour le statut
  if (res.ok && res.orderId) {
    const orderId = res.orderId;
    setTimeout(() => {
      xprintQueryOrder(cfg, orderId)
        .then((done) => {
          if (done) {
            db.update(schema.printLogs)
              .set({ status: "printed" })
              .where(and(eq(schema.printLogs.id, logId), eq(schema.printLogs.status, "pending")))
              .catch(() => {});
          }
        })
        .catch(() => {});
    }, 15_000);
  }

  return {
    ok: res.ok,
    orderId: res.orderId,
    errorMessage: res.ok ? undefined : xprintErrorMessage(res.code, res.msg),
  };
}

/** Auto-impression après validation d'une facture */
export async function autoPrintFacture(factureId: string, content: string): Promise<void> {
  try {
    const cfg = await loadXprintConfig();
    if (!cfg?.autoOnFacture) return;
    await sendPrintAndLog(content, { kind: "facture", relatedId: factureId, copies: cfg.copies });
  } catch (e) {
    console.warn("[xprint] autoPrintFacture failed:", e);
  }
}
