import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, gte, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isDemoFallbackEnabled } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

const DEMO_VENDEURS = [
  { userId: "demo-1", nom: "Ravo Rakoto", email: "ravo@grossiteppn.mg", nbCommandes: 87, caTTC: 12_450_000, caHT: 10_375_000, panierMoyen: 143_103 },
  { userId: "demo-2", nom: "Hery Andriamahefa", email: "hery@grossiteppn.mg", nbCommandes: 64, caTTC: 9_200_000, caHT: 7_666_667, panierMoyen: 143_750 },
  { userId: "demo-3", nom: "Tina Rasoanaivo", email: "tina@grossiteppn.mg", nbCommandes: 52, caTTC: 6_750_000, caHT: 5_625_000, panierMoyen: 129_808 },
  { userId: "demo-4", nom: "Fidy Ratsimbazafy", email: "fidy@grossiteppn.mg", nbCommandes: 38, caTTC: 4_100_000, caHT: 3_416_667, panierMoyen: 107_895 },
];

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role: string = (session.user as any).role ?? "agent";
  if (!["admin", "gerant", "comptable", "marketing"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") ?? "mois";

  const now = new Date();
  let debutPeriode: Date;
  if (periode === "7jours") {
    debutPeriode = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (periode === "annee") {
    debutPeriode = new Date(now.getFullYear(), 0, 1);
  } else {
    // mois (default)
    debutPeriode = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  try {
    const rows = await db
      .select({
        userId: schema.commandes.agentId,
        nom: schema.users.name,
        email: schema.users.email,
        nbCommandes: sql<number>`COUNT(*)`,
        caTTC: sql<number>`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`,
        caHT: sql<number>`COALESCE(SUM(${schema.commandes.totalHT}), 0)`,
        panierMoyen: sql<number>`COALESCE(AVG(${schema.commandes.totalTTC}), 0)`,
      })
      .from(schema.commandes)
      .innerJoin(schema.users, eq(schema.commandes.agentId, schema.users.id))
      .where(
        and(
          inArray(schema.commandes.statut, [
            "validee",
            "livree",
            "preparee",
            "en_livraison",
          ]),
          gte(schema.commandes.createdAt, debutPeriode)
        )
      )
      .groupBy(schema.commandes.agentId, schema.users.name, schema.users.email)
      .orderBy(desc(sql`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`));

    if (rows.length === 0) {
      if (isDemoFallbackEnabled()) {
        const totaux = {
          caTTC: DEMO_VENDEURS.reduce((s, v) => s + v.caTTC, 0),
          nbCommandes: DEMO_VENDEURS.reduce((s, v) => s + v.nbCommandes, 0),
        };
        return NextResponse.json({ vendeurs: DEMO_VENDEURS, periode, totaux, demo: true });
      }
      return NextResponse.json({ vendeurs: [], periode, totaux: { caTTC: 0, nbCommandes: 0 }, demo: false });
    }

    const totaux = {
      caTTC: rows.reduce((s, r) => s + Number(r.caTTC), 0),
      nbCommandes: rows.reduce((s, r) => s + Number(r.nbCommandes), 0),
    };

    return NextResponse.json({ vendeurs: rows, periode, totaux });
  } catch (error) {
    console.error("[GET /api/rapports/vendeurs]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
