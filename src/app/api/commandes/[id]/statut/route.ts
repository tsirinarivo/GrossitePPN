import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const VALID_STATUTS = [
  "brouillon",
  "soumise",
  "validee",
  "preparee",
  "en_livraison",
  "livree",
  "annulee",
  "refusee",
] as const;

type StatutCommande = (typeof VALID_STATUTS)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { statut } = body as { statut: string };

  if (!statut || !VALID_STATUTS.includes(statut as StatutCommande)) {
    return NextResponse.json(
      { error: "Statut invalide", validStatuts: VALID_STATUTS },
      { status: 400 }
    );
  }

  const [commande] = await db
    .select()
    .from(schema.commandes)
    .where(eq(schema.commandes.id, id))
    .limit(1);

  if (!commande)
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const [updated] = await db
    .update(schema.commandes)
    .set({
      statut: statut as StatutCommande,
      updatedAt: new Date(),
      ...(statut === "validee" ? { valideeAt: new Date() } : {}),
      ...(statut === "soumise" ? { soumiseAt: new Date() } : {}),
    })
    .where(eq(schema.commandes.id, id))
    .returning();

  return NextResponse.json({ commande: updated });
}
