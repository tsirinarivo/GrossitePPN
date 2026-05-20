import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json() as {
      fondCaisse: number;
      totalEncaisse: number;
      totalEspeces: number;
      totalMobileMoney: number;
      totalVirements: number;
      totalCheques: number;
      ouvertureAt: string;
      rapportZ?: unknown;
    };

    const id = crypto.randomUUID();
    const [saved] = await db
      .insert(schema.sessionsCaisse)
      .values({
        id,
        caissierID: session.user.id,
        fondCaisse: Math.round(body.fondCaisse ?? 0),
        totalEncaisse: Math.round(body.totalEncaisse ?? 0),
        totalEspeces: Math.round(body.totalEspeces ?? 0),
        totalMobileMoney: Math.round(body.totalMobileMoney ?? 0),
        totalVirements: Math.round(body.totalVirements ?? 0),
        totalCheques: Math.round(body.totalCheques ?? 0),
        ouvertureAt: body.ouvertureAt ? new Date(body.ouvertureAt) : new Date(),
        fermetureAt: new Date(),
        rapportZ: body.rapportZ ?? null,
      })
      .returning();

    return NextResponse.json({ session: saved }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/caisse/sessions]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const sessions = await db
      .select()
      .from(schema.sessionsCaisse)
      .where(eq(schema.sessionsCaisse.caissierID, session.user.id))
      .orderBy(desc(schema.sessionsCaisse.ouvertureAt))
      .limit(20);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[GET /api/caisse/sessions]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
