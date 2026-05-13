import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(schema.entreprise).limit(1);
  const e = rows[0];
  if (!e) return NextResponse.json({});
  return NextResponse.json(e);
}

const entrepriseSchema = z.object({
  nom: z.string().min(1),
  nif: z.string().optional(),
  stat: z.string().optional(),
  rcs: z.string().optional(),
  adresse: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  siteWeb: z.string().optional(),
  assujettieTV: z.boolean(),
  tauxTVADefaut: z.number().int().min(0).max(100),
  prefixeFacture: z.string().optional(),
  ecommerceActif: z.boolean(),
  fideliteActif: z.boolean(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = entrepriseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  await db.update(schema.entreprise)
    .set({ ...d, updatedAt: new Date() })
    .where(eq(schema.entreprise.id, "singleton"));
  return NextResponse.json({ ok: true });
}
