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
    const [promo] = await db.select().from(schema.promotions).where(eq(schema.promotions.id, id)).limit(1);
    if (!promo) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const utilisations = promo.nbUtilisations ?? 0;
    const max = promo.nbUtilisationsMax ?? null;
    const tauxUsage = max ? Math.round((utilisations / max) * 100) : null;

    return NextResponse.json({
      promo,
      stats: {
        utilisations,
        max,
        tauxUsage,
        actif: promo.actif,
        joursRestants: promo.finAt ? Math.max(0, Math.round((new Date(promo.finAt).getTime() - Date.now()) / 86400000)) : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
