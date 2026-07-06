import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const tid = await getSessionTenantId();
    const depots = await db
      .select()
      .from(schema.depots)
      .where(tenantFilter(schema.depots.tenantId, tid))
      .orderBy(schema.depots.estPrincipal, schema.depots.nom);
    return NextResponse.json({ depots });
  } catch (e) {
    console.error("[api/depots GET]", e);
    return NextResponse.json({ depots: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { nom, adresse, telephone } = body;
    if (!nom?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

    // Quota du plan : nombre de dépôts limité selon la formule.
    const tenantId = (session.user as { tenantId?: string | null }).tenantId ?? null;
    if (tenantId) {
      const [t] = await db.select({ maxDepots: schema.tenants.maxDepots }).from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);
      if (t) {
        const existants = await db.select({ id: schema.depots.id }).from(schema.depots).where(eq(schema.depots.tenantId, tenantId));
        if (existants.length >= t.maxDepots) {
          return NextResponse.json({ error: `Quota de dépôts atteint (${t.maxDepots}). Passez à une formule supérieure pour en ajouter.` }, { status: 403 });
        }
      }
    }

    const id = crypto.randomUUID();
    const [depot] = await db.insert(schema.depots).values({
      id,
      tenantId,
      nom: nom.trim(),
      adresse: adresse ?? null,
      telephone: telephone ?? null,
      actif: true,
      estPrincipal: false,
    }).returning();

    return NextResponse.json({ depot }, { status: 201 });
  } catch (e) {
    console.error("[api/depots POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
