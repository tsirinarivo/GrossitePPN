import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Role = (typeof schema.roleEnum.enumValues)[number];

// admin (super-admin plateforme) et gérant (propriétaire de tenant) gèrent
// chacun les utilisateurs de LEUR tenant.
async function requireManager() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const user = await db.select({ role: schema.users.role, tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  const role = user[0]?.role;
  if (role !== "admin" && role !== "gerant") return null;
  return { id: session.user.id, tenantId: user[0]?.tenantId ?? null, role };
}

export async function GET() {
  const mgr = await requireManager();
  if (!mgr) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const users = await db.select({
    id: schema.users.id,
    name: schema.users.name,
    email: schema.users.email,
    role: schema.users.role,
    actif: schema.users.actif,
    createdAt: schema.users.createdAt,
  })
    .from(schema.users)
    .where(tenantFilter(schema.users.tenantId, mgr.tenantId))
    .orderBy(schema.users.createdAt);
  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(schema.roleEnum.enumValues).default("agent"),
});

export async function POST(req: NextRequest) {
  const admin = await requireManager();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { name, email, password, role } = parsed.data;

  // Quota du plan : nombre d'utilisateurs limité selon la formule.
  if (admin.tenantId) {
    const [t] = await db.select({ maxUtilisateurs: schema.tenants.maxUtilisateurs }).from(schema.tenants).where(eq(schema.tenants.id, admin.tenantId)).limit(1);
    if (t) {
      const existants = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.tenantId, admin.tenantId));
      if (existants.length >= t.maxUtilisateurs) {
        return NextResponse.json({ error: `Quota d'utilisateurs atteint (${t.maxUtilisateurs}). Passez à une formule supérieure pour en ajouter.` }, { status: 403 });
      }
    }
  }

  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    const userId = result?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Erreur création du compte" }, { status: 500 });
    }

    // Nouveau compte : rôle + rattachement au tenant du créateur
    await db.update(schema.users)
      .set({ role: role as Role, tenantId: admin.tenantId })
      .where(eq(schema.users.id, userId));

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/users] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
