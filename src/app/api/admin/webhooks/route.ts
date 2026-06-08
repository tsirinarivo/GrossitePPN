import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateSecret, isValidEvent, WEBHOOK_EVENTS } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  if (role !== "admin" && role !== "gerant") return null;
  return { id: session.user.id, nom: session.user.name, role };
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const rows = await db
      .select()
      .from(schema.webhooks)
      .orderBy(desc(schema.webhooks.createdAt));
    return NextResponse.json({ webhooks: rows, events: WEBHOOK_EVENTS });
  } catch {
    return NextResponse.json({ webhooks: [], events: WEBHOOK_EVENTS });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.nom || !body?.url) {
    return NextResponse.json({ error: "Nom et URL requis" }, { status: 400 });
  }
  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  const evenements: string[] = Array.isArray(body.evenements)
    ? body.evenements.filter((e: string) => isValidEvent(e))
    : [];

  const id = crypto.randomUUID();
  const secret = generateSecret();
  const [webhook] = await db
    .insert(schema.webhooks)
    .values({
      id,
      nom: body.nom,
      url: body.url,
      secret,
      evenements,
      actif: body.actif ?? true,
    })
    .returning();

  await logAudit({
    action: "creation",
    entite: "webhook",
    entiteId: id,
    description: `Création webhook « ${body.nom} » → ${body.url}`,
    metadata: { evenements },
    actor,
  });

  return NextResponse.json({ webhook }, { status: 201 });
}
