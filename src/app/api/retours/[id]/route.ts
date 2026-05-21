import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const [retour] = await db
      .select()
      .from(schema.retours)
      .where(eq(schema.retours.id, id))
      .limit(1);

    if (!retour) return NextResponse.json({ error: "Retour introuvable" }, { status: 404 });

    const lignes = await db
      .select()
      .from(schema.lignesRetour)
      .where(eq(schema.lignesRetour.retourId, id));

    let client = null;
    if (retour.clientId) {
      const [c] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, retour.clientId))
        .limit(1);
      client = c ?? null;
    }

    let facture = null;
    if (retour.factureId) {
      const [f] = await db
        .select()
        .from(schema.factures)
        .where(eq(schema.factures.id, retour.factureId))
        .limit(1);
      facture = f ?? null;
    }

    const [avoir] = await db
      .select()
      .from(schema.avoirs)
      .where(eq(schema.avoirs.retourId, id))
      .limit(1);

    return NextResponse.json({ retour, lignes, client, facture, avoir: avoir ?? null });
  } catch {
    return NextResponse.json({ error: "Retour introuvable" }, { status: 404 });
  }
}
