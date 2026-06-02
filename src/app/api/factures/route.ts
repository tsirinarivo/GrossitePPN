import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc, ilike, or, eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemoFactures() {
  return [
    { id: "demo-fac-1", numero: "FAC-2026-0201", clientId: "demo-cli-1", clientNom: "Épicerie Soafia", totalTTC: 850000, createdAt: new Date().toISOString() },
    { id: "demo-fac-2", numero: "FAC-2026-0200", clientId: "demo-cli-2", clientNom: "Bazar Ankorondrano", totalTTC: 1200000, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "demo-fac-3", numero: "FAC-2026-0199", clientId: "demo-cli-3", clientNom: "Mini-Market Ivato", totalTTC: 450000, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: "demo-fac-4", numero: "FAC-2026-0198", clientId: "demo-cli-4", clientNom: "Restaurant La Varangue", totalTTC: 2150000, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "demo-fac-5", numero: "FAC-2026-0197", clientId: "demo-cli-5", clientNom: "Hôtel Colbert", totalTTC: 3450000, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  ];
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  try {
    const conditions = [] as ReturnType<typeof eq>[];
    if (q) {
      conditions.push(
        or(
          ilike(schema.factures.numero, `%${q}%`),
          ilike(schema.clients.raisonSociale, `%${q}%`)
        ) as never
      );
    }

    const rows = await db
      .select({
        id: schema.factures.id,
        numero: schema.factures.numero,
        clientId: schema.factures.clientId,
        clientNom: schema.clients.raisonSociale,
        totalTTC: schema.factures.totalTTC,
        createdAt: schema.factures.createdAt,
      })
      .from(schema.factures)
      .leftJoin(schema.clients, eq(schema.clients.id, schema.factures.clientId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.factures.createdAt))
      .limit(30);

    if (rows.length === 0) {
      return NextResponse.json({ factures: buildDemoFactures(), demo: true });
    }

    return NextResponse.json({
      factures: rows.map((r) => ({
        ...r,
        clientNom: r.clientNom ?? "Client comptoir",
        createdAt: r.createdAt.toISOString(),
      })),
      demo: false,
    });
  } catch {
    return NextResponse.json({ factures: buildDemoFactures(), demo: true });
  }
}
