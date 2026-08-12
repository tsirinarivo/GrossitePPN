import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { scopeTenant } from "@/lib/tenant";

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
  const actor = await requireRole("admin", "gerant", "caissier");
  if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const tid = actor.tenantId;

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
    .where(scopeTenant(schema.commandes.tenantId, tid, eq(schema.commandes.id, id)))
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
    .where(scopeTenant(schema.commandes.tenantId, tid, eq(schema.commandes.id, id)))
    .returning();

  if (!updated)
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({ commande: updated });
}
