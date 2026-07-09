import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireRoles } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORIES = [
  { id: "cat-riz",    nom: "Riz",              nomMG: "Vary",                    slug: "riz",     icone: "🌾", ordre: 1 },
  { id: "cat-huile",  nom: "Huile",            nomMG: "Menaka",                  slug: "huile",   icone: "🫙", ordre: 2 },
  { id: "cat-sucre",  nom: "Sucre & Sel",      nomMG: "Siramamy & Sira",         slug: "sucre",   icone: "🍬", ordre: 3 },
  { id: "cat-savon",  nom: "Hygiène",          nomMG: "Fanadiovana",             slug: "hygiene", icone: "🧼", ordre: 4 },
  { id: "cat-lait",   nom: "Lait & Conserves", nomMG: "Ronono",                  slug: "lait",    icone: "🥛", ordre: 5 },
  { id: "cat-farine", nom: "Farine & Céréales", nomMG: "Harina",                slug: "farine",  icone: "🌾", ordre: 6 },
  { id: "cat-sel",    nom: "Sel",              nomMG: "Sira",                    slug: "sel",     icone: "🧂", ordre: 7 },
  { id: "cat-conserves", nom: "Conserves",     nomMG: "Boaty",                   slug: "conserves", icone: "🥫", ordre: 8 },
];

export async function POST() {
  if (!(await requireRoles("admin", "gerant"))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    await db
      .insert(schema.categories)
      .values(DEFAULT_CATEGORIES)
      .onConflictDoNothing();

    const rows = await db.select().from(schema.categories);
    return NextResponse.json({ ok: true, count: rows.length, categories: rows });
  } catch (e) {
    console.error("[seed-categories]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const rows = await db.select().from(schema.categories);
  return NextResponse.json({ count: rows.length, categories: rows });
}
