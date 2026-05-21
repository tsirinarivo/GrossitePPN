import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  try {
    const rows = await db
      .select({
        id: schema.factures.id,
        numero: schema.factures.numero,
        commandeId: schema.factures.commandeId,
        clientId: schema.factures.clientId,
        clientNom: schema.clients.raisonSociale,
        totalTTC: schema.factures.totalTTC,
        createdAt: schema.factures.createdAt,
        statut: schema.factures.statut,
      })
      .from(schema.factures)
      .leftJoin(schema.clients, eq(schema.factures.clientId, schema.clients.id))
      .where(
        q
          ? or(
              ilike(schema.factures.numero, `%${q}%`),
              ilike(schema.clients.raisonSociale, `%${q}%`)
            )
          : undefined
      )
      .orderBy(desc(schema.factures.createdAt))
      .limit(30);

    return NextResponse.json({ factures: rows });
  } catch {
    return NextResponse.json({ factures: [] });
  }
}
