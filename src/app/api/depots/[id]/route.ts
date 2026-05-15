import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { nom, adresse, telephone, actif, estPrincipal } = body;

    // Si on définit ce dépôt comme principal, retirer le flag des autres
    if (estPrincipal === true) {
      await db.update(schema.depots).set({ estPrincipal: false }).where(ne(schema.depots.id, id));
    }

    const values: Partial<typeof schema.depots.$inferInsert> = {};
    if (nom !== undefined) values.nom = nom.trim();
    if (adresse !== undefined) values.adresse = adresse || null;
    if (telephone !== undefined) values.telephone = telephone || null;
    if (actif !== undefined) values.actif = actif;
    if (estPrincipal !== undefined) values.estPrincipal = estPrincipal;

    const [depot] = await db.update(schema.depots).set(values).where(eq(schema.depots.id, id)).returning();
    return NextResponse.json({ depot });
  } catch (e) {
    console.error("[api/depots PATCH]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  try {
    // Soft delete — désactiver uniquement
    await db.update(schema.depots).set({ actif: false, estPrincipal: false }).where(eq(schema.depots.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/depots DELETE]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
