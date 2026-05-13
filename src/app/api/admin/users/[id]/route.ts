import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  role: z.string().optional(),
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
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.role !== undefined) updates["role"] = parsed.data.role;
  if (parsed.data.actif !== undefined) updates["actif"] = parsed.data.actif;
  if (parsed.data.name !== undefined) updates["name"] = parsed.data.name;

  await db.update(schema.users).set(updates).where(eq(schema.users.id, id));
  return NextResponse.json({ ok: true });
}
