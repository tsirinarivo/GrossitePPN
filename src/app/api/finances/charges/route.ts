import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  const mois = new URL(req.url).searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);

  try {
    const charges = await db
      .select()
      .from(schema.chargesOperationnelles)
      .where(and(tenantFilter(schema.chargesOperationnelles.tenantId, tid), eq(schema.chargesOperationnelles.mois, mois)))
      .orderBy(asc(schema.chargesOperationnelles.categorie), asc(schema.chargesOperationnelles.createdAt));

    const totaux = await db
      .select({
        categorie: schema.chargesOperationnelles.categorie,
        total: sql<number>`cast(sum(${schema.chargesOperationnelles.montant}) as integer)`,
      })
      .from(schema.chargesOperationnelles)
      .where(and(tenantFilter(schema.chargesOperationnelles.tenantId, tid), eq(schema.chargesOperationnelles.mois, mois)))
      .groupBy(schema.chargesOperationnelles.categorie);

    const moisTotal = totaux.reduce((acc, row) => acc + (row.total ?? 0), 0);

    return NextResponse.json({ charges, totaux, moisTotal });
  } catch {
    return NextResponse.json({ charges: [], totaux: [], moisTotal: 0 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const tid = await getSessionTenantId();
  const body = await req.json();
  const { libelle, categorie, montant, mois, notes } = body;
  if (!libelle || !categorie || !montant || !mois)
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  try {
    const id = crypto.randomUUID();
    const [charge] = await db
      .insert(schema.chargesOperationnelles)
      .values({ id, tenantId: tid, libelle, categorie, montant: Math.round(montant), mois, notes: notes ?? null })
      .returning();
    return NextResponse.json({ charge }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Table absente — exécutez pnpm drizzle-kit push sur le VPS" },
      { status: 503 }
    );
  }
}
