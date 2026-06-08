import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { deliver } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "agent";
  if (!session?.user || (role !== "admin" && role !== "gerant")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const [webhook] = await db
    .select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.id, id))
    .limit(1);

  if (!webhook) {
    return NextResponse.json({ error: "Webhook introuvable" }, { status: 404 });
  }

  const result = await deliver(webhook, "ping", {
    message: "Test de connexion depuis GrossistePPN",
    declenchePar: session.user.name,
  });

  return NextResponse.json(result);
}
