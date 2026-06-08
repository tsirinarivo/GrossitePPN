import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Role = (typeof schema.roleEnum.enumValues)[number];

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return false;
  const user = await db.select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  return user[0]?.role === "admin";
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const users = await db.select({
    id: schema.users.id,
    name: schema.users.name,
    email: schema.users.email,
    role: schema.users.role,
    actif: schema.users.actif,
    createdAt: schema.users.createdAt,
  }).from(schema.users).orderBy(schema.users.createdAt);
  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(schema.roleEnum.enumValues).default("agent"),
});

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { name, email, password, role } = parsed.data;

  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    const userId = result?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Erreur création du compte" }, { status: 500 });
    }

    if (role !== "agent") {
      await db.update(schema.users)
        .set({ role: role as Role })
        .where(eq(schema.users.id, userId));
    }

    await logAudit({
      action: "creation",
      entite: "utilisateur",
      entiteId: userId,
      description: `Création du compte ${name} (${email})`,
      metadata: { role },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/users] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
