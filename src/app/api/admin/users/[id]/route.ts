import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Role = (typeof schema.roleEnum.enumValues)[number];

const updateSchema = z.object({
  role: z.enum(schema.roleEnum.enumValues).optional(),
  actif: z.boolean().optional(),
  name: z.string().min(1).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { role, actif, name } = parsed.data;
  const updates: Partial<{ role: Role; actif: boolean; name: string; updatedAt: Date }> = {
    updatedAt: new Date(),
  };
  if (role !== undefined) updates.role = role;
  if (actif !== undefined) updates.actif = actif;
  if (name !== undefined) updates.name = name;

  await db.update(schema.users).set(updates).where(eq(schema.users.id, id));
  return NextResponse.json({ ok: true });
}
