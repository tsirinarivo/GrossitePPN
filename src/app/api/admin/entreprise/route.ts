import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function requireAdminOrGerant() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role ?? "agent";
  return role === "admin" || role === "gerant";
}

export async function GET() {
  if (!await requireAdminOrGerant()) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
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
  if (!await requireAdminOrGerant()) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = entrepriseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  await db
    .insert(schema.entreprise)
    .values({ id: "singleton", ...d, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.entreprise.id,
      set: { ...d, updatedAt: new Date() },
    });
  return NextResponse.json({ ok: true });
}
