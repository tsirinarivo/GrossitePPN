import crypto from "crypto";

const DEFAULT_BASE_URL = "https://open.xpyun.net/api/openapi/xprinter";

export interface XprintConfig {
  user: string;
  key: string;
  baseUrl: string;
  sn: string;
  copies: number;
  voice: number;
  header: string | null;
  footer: string | null;
  autoOnFacture: boolean;
}

interface XprintResponse<T> {
  ok: boolean;
  code: number;
  msg: string;
  data: T | null;
}

function sign(user: string, key: string, timestamp: string): string {
  return crypto.createHash("sha1").update(user + key + timestamp).digest("hex");
}

export async function callXprint<T>(
  cfg: Pick<XprintConfig, "user" | "key" | "baseUrl">,
  action: string,
  privateParams: Record<string, unknown>,
): Promise<XprintResponse<T>> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = {
    ...privateParams,
    user: cfg.user,
    timestamp,
    sign: sign(cfg.user, cfg.key, timestamp),
    debug: "0",
  };

  try {
    const res = await fetch(`${cfg.baseUrl}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json;charset=UTF-8" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, code: -100, msg: "Réponse invalide", data: null };
    return { ok: data.code === 0, code: data.code, msg: data.msg, data: data.data ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, code: -1, msg, data: null };
  }
}

export async function xprintSend(
  cfg: XprintConfig,
  content: string,
  copies = 1,
): Promise<{ ok: boolean; orderId?: string; code: number; msg: string }> {
  const res = await callXprint<string>(cfg, "print", {
    sn: cfg.sn,
    content,
    copies,
    mode: 1, // file d'attente si hors ligne
  });
  return {
    ok: res.ok,
    orderId: typeof res.data === "string" ? res.data : undefined,
    code: res.code,
    msg: res.msg,
  };
}

export async function xprintStatus(
  cfg: Pick<XprintConfig, "user" | "key" | "baseUrl" | "sn">,
): Promise<{ online: boolean; anomalie: boolean; raw: number | null }> {
  const res = await callXprint<number>(cfg, "queryPrinterStatus", { sn: cfg.sn });
  if (!res.ok || res.data === null) return { online: false, anomalie: false, raw: null };
  return {
    online: res.data === 1,
    anomalie: res.data === 2,
    raw: res.data,
  };
}

export async function xprintQueryOrder(
  cfg: Pick<XprintConfig, "user" | "key" | "baseUrl">,
  orderId: string,
): Promise<boolean> {
  const res = await callXprint<boolean>(cfg, "queryOrderState", { orderId });
  return res.ok && res.data === true;
}

/** Codes d'erreur xpyun documentés — section 11 */
const XPYUN_ERRORS: Record<number, string> = {
  1002: "Signature invalide (vérifier User et UserKEY)",
  1003: "Timestamp invalide (décalage horloge serveur)",
  1006: "Numéro de série (SN) inconnu ou non rattaché au compte",
  1007: "Contenu trop long (> 4096 bytes)",
  1008: "Imprimante hors ligne",
  1010: "Limite de débit dépassée — réessayer dans quelques secondes",
};

export function xprintErrorMessage(code: number, defaultMsg: string): string {
  return XPYUN_ERRORS[code] ?? defaultMsg;
}

export function buildDefaultConfig(partial: Partial<XprintConfig>): XprintConfig {
  return {
    user: partial.user ?? "",
    key: partial.key ?? "",
    baseUrl: partial.baseUrl ?? DEFAULT_BASE_URL,
    sn: partial.sn ?? "",
    copies: partial.copies ?? 1,
    voice: partial.voice ?? 0,
    header: partial.header ?? null,
    footer: partial.footer ?? null,
    autoOnFacture: partial.autoOnFacture ?? true,
  };
}
