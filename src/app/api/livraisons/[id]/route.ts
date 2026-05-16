import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json() as {
      statut?: string;
      motifRefus?: string;
      tourneeId?: string;
      livraisonAt?: string;
    };

    const [existing] = await db
      .select({ id: schema.livraisons.id })
      .from(schema.livraisons)
      .where(eq(schema.livraisons.id, id))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Livraison introuvable" }, { status: 404 });

    type LivraisonUpdate = {
      statut?: typeof schema.livraisons.$inferInsert["statut"];
      motifRefus?: string | null;
      tourneeId?: string | null;
      livraisonAt?: Date | null;
    };

    const update: LivraisonUpdate = {};

    if (body.statut !== undefined) {
      const allowed = ["en_attente", "preparee", "chargee", "en_route", "livree", "refusee", "echec"] as const;
      if (!allowed.includes(body.statut as typeof allowed[number])) {
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      }
      update.statut = body.statut as typeof schema.livraisons.$inferInsert["statut"];

      if (body.statut === "livree") {
        update.livraisonAt = body.livraisonAt ? new Date(body.livraisonAt) : new Date();
      }
    }

    if (body.motifRefus !== undefined) update.motifRefus = body.motifRefus;
    if (body.tourneeId !== undefined) update.tourneeId = body.tourneeId;
    if (body.livraisonAt !== undefined && body.statut !== "livree") {
      update.livraisonAt = new Date(body.livraisonAt);
    }

    await db
      .update(schema.livraisons)
      .set(update)
      .where(eq(schema.livraisons.id, id));

    const [updated] = await db
      .select()
      .from(schema.livraisons)
      .where(eq(schema.livraisons.id, id))
      .limit(1);

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[api/livraisons/[id] PATCH]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
