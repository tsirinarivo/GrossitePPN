import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const setupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

/** Crée le premier compte admin — refusé si des utilisateurs existent déjà */
export async function POST(req: NextRequest) {
  // Vérifier qu'aucun utilisateur n'existe
  const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Setup déjà effectué. Utilisez /admin pour gérer les comptes." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password } });
    const userId = result?.user?.id;
    if (!userId) throw new Error("Création du compte échouée");

    await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, userId));

    console.log(`[setup] Premier admin créé : ${email}`);
    return NextResponse.json({ ok: true, email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[setup]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Indique si le setup initial a été effectué */
export async function GET() {
  const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  return NextResponse.json({ setupDone: existing.length > 0 });
}
