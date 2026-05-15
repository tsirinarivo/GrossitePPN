import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const depots = await db
      .select({
        id: schema.depots.id,
        nom: schema.depots.nom,
        adresse: schema.depots.adresse,
        estPrincipal: schema.depots.estPrincipal,
        actif: schema.depots.actif,
      })
      .from(schema.depots)
      .where(eq(schema.depots.actif, true))
      .orderBy(schema.depots.estPrincipal, schema.depots.nom);

    return NextResponse.json({ depots });
  } catch (e) {
    console.error("[api/depots]", e);
    return NextResponse.json({ depots: [] });
  }
}
