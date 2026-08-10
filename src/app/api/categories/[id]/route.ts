import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const GESTION = ["admin", "gerant", "magasinier"];

/** Désactive une catégorie (soft-delete : préserve les produits qui la référencent). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as { role?: string }).role ?? "agent";
  if (!GESTION.includes(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const tid = await getSessionTenantId();

  const res = await db
    .update(schema.categories)
    .set({ actif: false })
    .where(and(eq(schema.categories.id, id), tenantFilter(schema.categories.tenantId, tid)))
    .returning({ id: schema.categories.id });

  if (res.length === 0) return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
