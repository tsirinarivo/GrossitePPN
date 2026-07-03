import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId } from "@/lib/tenant";
import { getEntrepriseFor } from "@/lib/entreprise";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "default";

async function requireManager() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role ?? "agent";
  if (role !== "admin" && role !== "gerant") return null;
  const tenantId = await getSessionTenantId();
  return { tenantId };
}

export async function GET() {
  const mgr = await requireManager();
  if (!mgr) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const e = await getEntrepriseFor(mgr.tenantId);
  return NextResponse.json(e ?? {});
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
  const mgr = await requireManager();
  if (!mgr) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = entrepriseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const tid = mgr.tenantId;

  // Ligne entreprise existante pour ce tenant ?
  const existing = tid
    ? (await db.select({ id: schema.entreprise.id }).from(schema.entreprise).where(eq(schema.entreprise.tenantId, tid)).limit(1))[0]
    : undefined;

  if (existing) {
    await db.update(schema.entreprise).set({ ...d, updatedAt: new Date() }).where(eq(schema.entreprise.id, existing.id));
  } else if (tid == null || tid === DEFAULT_TENANT_ID) {
    // Tenant par défaut → ligne singleton legacy
    await db
      .insert(schema.entreprise)
      .values({ id: "singleton", tenantId: tid ?? DEFAULT_TENANT_ID, ...d, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.entreprise.id, set: { ...d, updatedAt: new Date() } });
  } else {
    // Nouveau tenant → nouvelle ligne dédiée
    await db.insert(schema.entreprise).values({ id: crypto.randomUUID(), tenantId: tid, ...d, updatedAt: new Date() });
  }

  return NextResponse.json({ ok: true });
}
