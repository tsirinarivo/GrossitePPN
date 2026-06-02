import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemoTournees() {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString();
  const make = (offset: number, statut: string, chauffeur: string, nb: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return {
      id: `demo-tour-${offset}`,
      date: fmt(d),
      statut,
      chauffeurId: `demo-user-${chauffeur.replace(/\s/g, "")}`,
      chauffeurNom: chauffeur,
      vehiculeId: null,
      immatriculation: `TAA-${100 + offset * 10}-A`,
      notes: null,
      createdAt: fmt(d),
      nbLivraisons: nb,
    };
  };
  return [
    make(0, "en_cours", "Rakoto Jean", 8),
    make(1, "planifiee", "Rasolofo Hery", 12),
    make(-1, "terminee", "Andry Tiana", 10),
    make(-2, "terminee", "Rakoto Jean", 9),
  ];
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  try {
    const conditions = [];
    if (from) conditions.push(gte(schema.tournees.date, new Date(from)));
    if (to) conditions.push(lte(schema.tournees.date, new Date(to)));

    const rows = await db
      .select({
        tournee: schema.tournees,
        chauffeurNom: schema.users.name,
        immatriculation: schema.vehicules.immatriculation,
        nbLivraisons: sql<number>`(SELECT COUNT(*) FROM livraisons WHERE tournee_id = ${schema.tournees.id})`,
      })
      .from(schema.tournees)
      .leftJoin(schema.users, eq(schema.users.id, schema.tournees.chauffeurId))
      .leftJoin(schema.vehicules, eq(schema.vehicules.id, schema.tournees.vehiculeId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.tournees.date))
      .limit(50);

    if (rows.length === 0) {
      return NextResponse.json({ tournees: buildDemoTournees(), demo: true });
    }

    return NextResponse.json({
      tournees: rows.map((r) => ({
        ...r.tournee,
        date: r.tournee.date.toISOString(),
        createdAt: r.tournee.createdAt.toISOString(),
        chauffeurNom: r.chauffeurNom ?? null,
        immatriculation: r.immatriculation ?? null,
        nbLivraisons: Number(r.nbLivraisons ?? 0),
      })),
      demo: false,
    });
  } catch {
    return NextResponse.json({ tournees: buildDemoTournees(), demo: true });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { date, chauffeurId, vehiculeId, notes } = body;
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
        notes: notes ?? null,
        statut: "planifiee",
      })
      .returning();
    return NextResponse.json({ tournee }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
