import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(schema.entreprise).limit(1);
  const e = rows[0];
  const p = (e?.parametres ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    enabled: !!p["xprintEnabled"],
    user: p["xprintUser"] ?? "",
    key: p["xprintKey"] ?? "",
    sn: p["xprintSn"] ?? "",
    baseUrl: p["xprintBaseUrl"] ?? "https://open.xpyun.net/api/openapi/xprinter",
    copies: p["xprintCopies"] ?? 1,
    voice: p["xprintVoice"] ?? 0,
    header: p["xprintHeader"] ?? "",
    footer: p["xprintFooter"] ?? "",
    autoOnFacture: p["xprintAutoOnFacture"] !== false,
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
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const rows = await db.select().from(schema.entreprise).limit(1);
  const current = (rows[0]?.parametres ?? {}) as Record<string, unknown>;

  const updated = {
    ...current,
    xprintEnabled: d.enabled,
    xprintUser: d.user,
    xprintKey: d.key,
    xprintSn: d.sn,
    xprintBaseUrl: d.baseUrl,
    xprintCopies: d.copies,
    xprintVoice: d.voice,
    xprintHeader: d.header,
    xprintFooter: d.footer,
    xprintAutoOnFacture: d.autoOnFacture,
  };

  await db.update(schema.entreprise).set({
    parametres: updated,
    updatedAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
