import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const promotions = await db
      .select()
      .from(schema.promotions)
      .orderBy(desc(schema.promotions.createdAt));

    const now = new Date();

    const stats = promotions.map((p) => {
      const debut = new Date(p.debutAt);
      const fin = new Date(p.finAt);
      const expire = now > fin;
      const pasEncoreCommence = now < debut;
      const enCours = !expire && !pasEncoreCommence && p.actif;
      const limiteAtteinte = !!(p.nbUtilisationsMax && (p.nbUtilisations ?? 0) >= p.nbUtilisationsMax);

      const tauxUtilisation = p.nbUtilisationsMax
        ? Math.round(((p.nbUtilisations ?? 0) / p.nbUtilisationsMax) * 100)
        : null;

      const statut: "active" | "expiree" | "future" | "limite" | "inactive" = !p.actif
        ? "inactive"
        : limiteAtteinte
        ? "limite"
        : expire
        ? "expiree"
        : pasEncoreCommence
        ? "future"
        : "active";

      const joursRestants = enCours
        ? Math.max(0, Math.ceil((fin.getTime() - now.getTime()) / 86400000))
        : null;

      return {
        ...p,
        statut,
        tauxUtilisation,
        joursRestants,
        enCours,
      };
    });

    const totalUtilisations = promotions.reduce((s, p) => s + (p.nbUtilisations ?? 0), 0);
    const activesCount = stats.filter((s) => s.statut === "active").length;
    const expireesCount = stats.filter((s) => s.statut === "expiree").length;

    return NextResponse.json({
      promotions: stats,
      totaux: {
        total: promotions.length,
        actives: activesCount,
        expirees: expireesCount,
        totalUtilisations,
      },
    });
  } catch {
    return NextResponse.json({ promotions: [], totaux: { total: 0, actives: 0, expirees: 0, totalUtilisations: 0 } });
  }
}
