import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role ?? "agent";
  if (role !== "admin" && role !== "gerant") return null;
  return { tenantId: (session.user as { tenantId?: string | null }).tenantId ?? null };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const promotions = await db
    .select()
    .from(schema.promotions)
    .where(tenantFilter(schema.promotions.tenantId, admin.tenantId))
    .orderBy(desc(schema.promotions.createdAt));
  return NextResponse.json({ promotions });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || !body.nom || !body.type || body.valeur == null || !body.debutAt || !body.finAt) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const [promotion] = await db
    .insert(schema.promotions)
    .values({
      id,
      tenantId: admin.tenantId,
      nom: body.nom,
      code: body.code ?? null,
      type: body.type,
      valeur: body.valeur,
      typeValeur: body.typeValeur ?? "pct",
      minCommande: body.minCommande ?? 0,
      nbUtilisationsMax: body.nbUtilisationsMax ?? null,
      nbUtilisations: 0,
      debutAt: new Date(body.debutAt),
      finAt: new Date(body.finAt),
      actif: body.actif ?? true,
    })
    .returning();

  return NextResponse.json({ promotion }, { status: 201 });
}
