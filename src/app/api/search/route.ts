import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { ilike, or, eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ produits: [], clients: [], commandes: [] });

  const pattern = `%${q}%`;

  try {
    const [produits, clients, commandes] = await Promise.all([
      db.select({
        id: schema.produits.id,
        code: schema.produits.code,
        nom: schema.produits.nom,
        uniteBase: schema.produits.uniteBase,
      })
        .from(schema.produits)
        .where(and(
          tenantFilter(schema.produits.tenantId, tid),
          or(ilike(schema.produits.nom, pattern), ilike(schema.produits.code, pattern)),
          eq(schema.produits.actif, true)
        ))
        .limit(5),

      db.select({
        id: schema.clients.id,
        code: schema.clients.code,
        raisonSociale: schema.clients.raisonSociale,
        telephone: schema.clients.telephone,
        palier: schema.clients.palier,
      })
        .from(schema.clients)
        .where(and(
          tenantFilter(schema.clients.tenantId, tid),
          or(ilike(schema.clients.raisonSociale, pattern), ilike(schema.clients.code, pattern))
        ))
        .limit(5),

      db.select({
        id: schema.commandes.id,
        numero: schema.commandes.numero,
        statut: schema.commandes.statut,
        totalTTC: schema.commandes.totalTTC,
        createdAt: schema.commandes.createdAt,
      })
        .from(schema.commandes)
        .where(and(
          tenantFilter(schema.commandes.tenantId, tid),
          ilike(schema.commandes.numero, pattern)
        ))
        .orderBy(desc(schema.commandes.createdAt))
        .limit(5),
    ]);

    return NextResponse.json({ produits, clients, commandes });
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ produits: [], clients: [], commandes: [] });
  }
}
