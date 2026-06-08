import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateApiKey } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  if (role !== "admin" && role !== "gerant") return null;
  return { id: session.user.id, nom: session.user.name, role };
}

/** Masque une clé pour l'affichage : ppn_abcd…wxyz */
function maskKey(cle: string): string {
  if (cle.length <= 12) return cle;
  return `${cle.slice(0, 8)}…${cle.slice(-4)}`;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const rows = await db
      .select()
      .from(schema.apiKeys)
      .orderBy(desc(schema.apiKeys.createdAt));
    return NextResponse.json({
      keys: rows.map((k) => ({
        id: k.id,
        nom: k.nom,
        cleMasquee: maskKey(k.cle),
        actif: k.actif,
        nbAppels: k.nbAppels,
        derniereUtilisationAt: k.derniereUtilisationAt,
        createdAt: k.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ keys: [] });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.nom) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const cle = generateApiKey();
  await db.insert(schema.apiKeys).values({ id, nom: body.nom, cle });

  await logAudit({
    action: "creation",
    entite: "api_key",
    entiteId: id,
    description: `Création clé API « ${body.nom} »`,
    actor,
  });

  // La clé complète n'est renvoyée qu'une seule fois, à la création.
  return NextResponse.json({ id, nom: body.nom, cle }, { status: 201 });
}
