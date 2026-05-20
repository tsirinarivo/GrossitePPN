import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql, inArray, like, or } from "drizzle-orm";
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

const VALID_SOURCES = ["pos_agent", "ecommerce", "telephone", "import"] as const;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut") ?? "";
  const source = searchParams.get("source") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  if (statut && VALID_STATUTS.includes(statut as (typeof VALID_STATUTS)[number])) {
    conditions.push(
      eq(schema.commandes.statut, statut as (typeof VALID_STATUTS)[number])
    );
  }

  if (source && VALID_SOURCES.includes(source as (typeof VALID_SOURCES)[number])) {
    conditions.push(
      eq(schema.commandes.source, source as (typeof VALID_SOURCES)[number])
    );
  }

  if (search) {
    conditions.push(
      or(
        like(schema.commandes.numero, `%${search}%`),
        like(schema.clients.raisonSociale, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Main query with joins
  const rows = await db
    .select({
      id: schema.commandes.id,
      reference: schema.commandes.numero,
      statut: schema.commandes.statut,
      source: schema.commandes.source,
      totalTTC: schema.commandes.totalTTC,
      createdAt: schema.commandes.createdAt,
      clientNom: schema.clients.raisonSociale,
      clientZone: schema.clients.zoneTournee,
      agentNom: schema.users.name,
    })
    .from(schema.commandes)
    .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
    .leftJoin(schema.users, eq(schema.commandes.agentId, schema.users.id))
    .where(where)
    .orderBy(desc(schema.commandes.createdAt))
    .limit(limit)
    .offset(offset);

  // Total count
  const totalRows = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(schema.commandes)
    .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
    .where(where);
  const total = totalRows[0]?.total ?? 0;

  // Counts per statut (for KPI bar)
  const countRows = await db
    .select({
      statut: schema.commandes.statut,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(schema.commandes)
    .groupBy(schema.commandes.statut);

  const counts: Record<string, number> = {
    brouillon: 0,
    soumise: 0,
    validee: 0,
    preparee: 0,
    en_livraison: 0,
    livree: 0,
    annulee: 0,
    refusee: 0,
  };
  for (const row of countRows) {
    if (row.statut) counts[row.statut] = row.count;
  }

  return NextResponse.json({ commandes: rows, total, counts });
}
