import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Role = (typeof schema.roleEnum.enumValues)[number];

export async function GET() {
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

const VALID_ROLES = schema.roleEnum.enumValues;

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(schema.roleEnum.enumValues).default("agent"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, role } = parsed.data;

  const signUpRes = await fetch(new URL("/api/auth/sign-up/email", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": req.headers.get("origin") ?? "http://localhost:3000" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!signUpRes.ok) {
    const err = await signUpRes.json().catch(() => ({}));
    return NextResponse.json({ error: err.message ?? "Erreur création compte" }, { status: 400 });
  }

  const data = await signUpRes.json();
  const userId = data.user?.id;

  if (userId && role !== "agent") {
    await db.update(schema.users).set({ role: role as Role }).where(eq(schema.users.id, userId));
  }

  return NextResponse.json({ ok: true });
}
