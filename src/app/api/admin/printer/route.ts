import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "default";
const DEFAULT_BASE_URL = "https://open.xpyun.net/api/openapi/xprinter";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  if (role !== "admin" && role !== "gerant") return null;
  return session;
}

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const tid = (await getSessionTenantId()) ?? DEFAULT_TENANT_ID;

  // Config dédiée au tenant
  const [row] = await db
    .select()
    .from(schema.printerConfig)
    .where(eq(schema.printerConfig.tenantId, tid))
    .limit(1);

  if (row) {
    return NextResponse.json({
      enabled: row.enabled,
      user: row.xUser ?? "",
      key: row.xKey ?? "",
      sn: row.sn ?? "",
      baseUrl: row.baseUrl ?? DEFAULT_BASE_URL,
      copies: row.copies ?? 1,
      voice: row.voice ?? 0,
      header: row.header ?? "",
      footer: row.footer ?? "",
      autoOnFacture: row.autoOnFacture !== false,
      autoOnBonLivraison: row.autoOnBonLivraison === true,
      autoOnReceptionStock: row.autoOnReceptionStock === true,
    });
  }

  // Repli legacy (entreprise.parametres) uniquement pour le tenant par défaut
  if (tid === DEFAULT_TENANT_ID) {
    const rows = await db.select().from(schema.entreprise).limit(1);
    const p = (rows[0]?.parametres ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      enabled: !!p["xprintEnabled"],
      user: p["xprintUser"] ?? "",
      key: p["xprintKey"] ?? "",
      sn: p["xprintSn"] ?? "",
      baseUrl: p["xprintBaseUrl"] ?? DEFAULT_BASE_URL,
      copies: p["xprintCopies"] ?? 1,
      voice: p["xprintVoice"] ?? 0,
      header: p["xprintHeader"] ?? "",
      footer: p["xprintFooter"] ?? "",
      autoOnFacture: p["xprintAutoOnFacture"] !== false,
      autoOnBonLivraison: p["xprintAutoOnBonLivraison"] === true,
      autoOnReceptionStock: p["xprintAutoOnReceptionStock"] === true,
    });
  }

  // Nouveau tenant → config vide
  return NextResponse.json({
    enabled: false, user: "", key: "", sn: "", baseUrl: DEFAULT_BASE_URL,
    copies: 1, voice: 0, header: "", footer: "",
    autoOnFacture: true, autoOnBonLivraison: false, autoOnReceptionStock: false,
  });
}

const configSchema = z.object({
  enabled: z.boolean(),
  user: z.string(),
  key: z.string(),
  sn: z.string(),
  baseUrl: z.string().url().optional(),
  copies: z.number().int().min(1).max(5).default(1),
  voice: z.number().int().min(0).max(15).default(0),
  header: z.string().max(500).default(""),
  footer: z.string().max(500).default(""),
  autoOnFacture: z.boolean().default(true),
  autoOnBonLivraison: z.boolean().default(false),
  autoOnReceptionStock: z.boolean().default(false),
});

export async function PUT(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const tid = (await getSessionTenantId()) ?? DEFAULT_TENANT_ID;

  const body = await req.json().catch(() => null);
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const values = {
    tenantId: tid,
    enabled: d.enabled,
    xUser: d.user,
    xKey: d.key,
    sn: d.sn,
    baseUrl: d.baseUrl ?? DEFAULT_BASE_URL,
    copies: d.copies,
    voice: d.voice,
    header: d.header,
    footer: d.footer,
    autoOnFacture: d.autoOnFacture,
    autoOnBonLivraison: d.autoOnBonLivraison,
    autoOnReceptionStock: d.autoOnReceptionStock,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.printerConfig)
    .values(values)
    .onConflictDoUpdate({ target: schema.printerConfig.tenantId, set: values });

  return NextResponse.json({ ok: true });
}
