import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { scopeTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// ── POST /api/tournees/[id]/affecter ─────────────────────────────────────────
// body: { livraisonIds: string[] } — ordre = position dans le tableau
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole("admin", "gerant", "chauffeur");
  if (!actor) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const tid = actor.tenantId;

  const { id } = await params;
  const body = await req.json();
  const { livraisonIds } = body as { livraisonIds: string[] };

  if (!Array.isArray(livraisonIds)) {
    return NextResponse.json({ error: "livraisonIds requis (tableau)" }, { status: 400 });
  }

  try {
    // Vérifie que la tournée existe
    const [tournee] = await db
      .select()
      .from(schema.tournees)
      .where(scopeTenant(schema.tournees.tenantId, tid, eq(schema.tournees.id, id)))
      .limit(1);

    if (!tournee) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });

    // Détacher les livraisons précédemment affectées qui ne sont plus dans la liste
    if (livraisonIds.length > 0) {
      const existantes = await db
        .select({ id: schema.livraisons.id })
        .from(schema.livraisons)
        .where(scopeTenant(schema.livraisons.tenantId, tid, eq(schema.livraisons.tourneeId, id)));

      const aDetacher = existantes
        .map((l) => l.id)
        .filter((lid) => !livraisonIds.includes(lid));

      if (aDetacher.length > 0) {
        await db
          .update(schema.livraisons)
          .set({ tourneeId: null, ordre: 0 })
          .where(scopeTenant(schema.livraisons.tenantId, tid, inArray(schema.livraisons.id, aDetacher)));
      }
    } else {
      // Vider la tournée
      await db
        .update(schema.livraisons)
        .set({ tourneeId: null, ordre: 0 })
        .where(scopeTenant(schema.livraisons.tenantId, tid, eq(schema.livraisons.tourneeId, id)));
    }

    // Affecter et ordonner
    for (let i = 0; i < livraisonIds.length; i++) {
      const lid = livraisonIds[i];
      if (!lid) continue;
      await db
        .update(schema.livraisons)
        .set({ tourneeId: id, ordre: i + 1 })
        .where(scopeTenant(schema.livraisons.tenantId, tid, eq(schema.livraisons.id, lid)));
    }

    return NextResponse.json({ ok: true, count: livraisonIds.length });
  } catch (e) {
    console.error("[affecter]", e);
    return NextResponse.json({ error: "Erreur d'affectation" }, { status: 500 });
  }
}
