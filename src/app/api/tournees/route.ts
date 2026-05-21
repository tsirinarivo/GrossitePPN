import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, gte, lte, and, asc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// ── GET /api/tournees ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const statut = searchParams.get("statut");

  let dateStart: Date;
  let dateEnd: Date;
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    dateStart = new Date(`${dateParam}T00:00:00.000Z`);
    dateEnd = new Date(`${dateParam}T23:59:59.999Z`);
  } else {
    const now = new Date();
    dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    dateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59);
  }

  try {
    const rows = await db
      .select({
        id: schema.tournees.id,
        date: schema.tournees.date,
        chauffeurId: schema.tournees.chauffeurId,
        vehiculeId: schema.tournees.vehiculeId,
        statut: schema.tournees.statut,
        notes: schema.tournees.notes,
        createdAt: schema.tournees.createdAt,
        chauffeurName: schema.users.name,
        vehiculeImmat: schema.vehicules.immatriculation,
        vehiculeModele: schema.vehicules.modele,
      })
      .from(schema.tournees)
      .leftJoin(schema.users, eq(schema.tournees.chauffeurId, schema.users.id))
      .leftJoin(schema.vehicules, eq(schema.tournees.vehiculeId, schema.vehicules.id))
      .where(
        and(
          gte(schema.tournees.date, dateStart),
          lte(schema.tournees.date, dateEnd),
          statut ? eq(schema.tournees.statut, statut) : undefined
        )
      )
      .orderBy(asc(schema.tournees.date));

    // Compter livraisons par tournée
    const tourneeIds = rows.map((r) => r.id);
    const counts = tourneeIds.length > 0
      ? await db
          .select({
            tourneeId: schema.livraisons.tourneeId,
            total: sql<number>`count(*)::int`,
            livrees: sql<number>`sum(case when ${schema.livraisons.statut} = 'livree' then 1 else 0 end)::int`,
            echecs: sql<number>`sum(case when ${schema.livraisons.statut} = 'echec' or ${schema.livraisons.statut} = 'refusee' then 1 else 0 end)::int`,
          })
          .from(schema.livraisons)
          .where(sql`${schema.livraisons.tourneeId} = ANY(${tourneeIds})`)
          .groupBy(schema.livraisons.tourneeId)
      : [];

    const countMap = new Map(counts.map((c) => [c.tourneeId, c]));

    const tournees = rows.map((r) => {
      const c = countMap.get(r.id);
      return {
        ...r,
        nbLivraisons: c?.total ?? 0,
        nbLivrees: c?.livrees ?? 0,
        nbEchecs: c?.echecs ?? 0,
      };
    });

    return NextResponse.json({ tournees });
  } catch {
    return NextResponse.json({ tournees: [] });
  }
}

// ── POST /api/tournees ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { date, chauffeurId, vehiculeId, notes } = body as {
    date: string;
    chauffeurId?: string;
    vehiculeId?: string;
    notes?: string;
  };

  if (!date) return NextResponse.json({ error: "Date requise" }, { status: 400 });

  try {
    const id = crypto.randomUUID();
    const [tournee] = await db
      .insert(schema.tournees)
      .values({
        id,
        date: new Date(date),
        chauffeurId: chauffeurId ?? null,
        vehiculeId: vehiculeId ?? null,
        statut: "planifiee",
        notes: notes ?? null,
      })
      .returning();
    return NextResponse.json({ tournee }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Table absente — exécutez pnpm drizzle-kit push sur le VPS" },
      { status: 503 }
    );
  }
}
