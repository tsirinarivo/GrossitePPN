import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const GESTION = ["admin", "gerant", "magasinier"];

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "cat";
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = await getSessionTenantId();

  const rows = await db
    .select({
      id: schema.categories.id,
      nom: schema.categories.nom,
      icone: schema.categories.icone,
      ordre: schema.categories.ordre,
      actif: schema.categories.actif,
    })
    .from(schema.categories)
    .where(and(tenantFilter(schema.categories.tenantId, tid), eq(schema.categories.actif, true)))
    .orderBy(schema.categories.ordre, schema.categories.nom);

  return NextResponse.json({ categories: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as { role?: string }).role ?? "agent";
  if (!GESTION.includes(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const nom = String(body?.nom ?? "").trim();
  const icone = body?.icone ? String(body.icone).trim().slice(0, 8) : null;
  if (!nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const tid = await getSessionTenantId();
  // Slug globalement unique (contrainte DB) → base + suffixe aléatoire.
  const slug = `${slugify(nom)}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const [cat] = await db.insert(schema.categories).values({
      id: crypto.randomUUID(),
      tenantId: tid,
      nom,
      icone,
      slug,
      ordre: 0,
      actif: true,
    }).returning({ id: schema.categories.id, nom: schema.categories.nom, icone: schema.categories.icone });
    return NextResponse.json({ ok: true, categorie: cat }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json({ error: "Cette catégorie existe déjà" }, { status: 409 });
    }
    console.error("[api/categories POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
