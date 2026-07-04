import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isMasterHost } from "@/lib/tenant-host";

export const dynamic = "force-dynamic";

// Prix mensuel par plan (aligné sur la landing) → sert au MRR estimé.
const PLAN_PRIX: Record<string, number> = {
  essai: 0,
  standard: 49_000,
  pro: 99_000,
  entreprise: 149_000,
};

// Statuts de commande considérés comme du CA réalisé.
const CA_STATUTS: Array<typeof schema.commandes.statut.enumValues[number]> = [
  "validee", "preparee", "en_livraison", "livree",
];

async function requireMasterAdmin() {
  const h = await headers();
  if (!isMasterHost(h.get("host"))) return null;
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  return role === "admin" ? session.user : null;
}

export async function GET() {
  if (!(await requireMasterAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const tenants = await db
      .select({
        id: schema.tenants.id,
        nom: schema.tenants.nom,
        slug: schema.tenants.slug,
        statut: schema.tenants.statut,
        plan: schema.tenants.plan,
        finEssaiAt: schema.tenants.finEssaiAt,
      })
      .from(schema.tenants);

    // CA réalisé par tenant (toutes commandes validées et au-delà).
    const caRows = await db
      .select({
        tenantId: schema.commandes.tenantId,
        ca: sql<number>`COALESCE(SUM(${schema.commandes.totalTTC}), 0)`,
        nbCommandes: sql<number>`COUNT(*)`,
      })
      .from(schema.commandes)
      .where(inArray(schema.commandes.statut, CA_STATUTS))
      .groupBy(schema.commandes.tenantId);

    const caMap = new Map<string, { ca: number; nb: number }>();
    for (const r of caRows) {
      if (!r.tenantId) continue;
      caMap.set(r.tenantId, { ca: Number(r.ca), nb: Number(r.nbCommandes) });
    }

    // Répartitions par statut et par plan.
    const parStatut: Record<string, number> = { actif: 0, essai: 0, suspendu: 0, resilie: 0 };
    const parPlan: Record<string, number> = { essai: 0, standard: 0, pro: 0, entreprise: 0 };
    let mrrEstime = 0;

    for (const t of tenants) {
      parStatut[t.statut] = (parStatut[t.statut] ?? 0) + 1;
      parPlan[t.plan] = (parPlan[t.plan] ?? 0) + 1;
      if (t.statut === "actif") mrrEstime += PLAN_PRIX[t.plan] ?? 0;
    }

    // Essais qui expirent (≤ 30 jours), triés par urgence.
    const now = Date.now();
    const HORIZON = 30 * 24 * 60 * 60 * 1000;
    const essaisExpirant = tenants
      .filter((t) => t.statut === "essai" && t.finEssaiAt)
      .map((t) => ({
        id: t.id,
        nom: t.nom,
        slug: t.slug,
        finEssaiAt: t.finEssaiAt,
        joursRestants: Math.ceil((new Date(t.finEssaiAt as Date).getTime() - now) / (24 * 60 * 60 * 1000)),
      }))
      .filter((t) => t.joursRestants <= 30 && t.finEssaiAt && new Date(t.finEssaiAt).getTime() - now <= HORIZON)
      .sort((a, b) => a.joursRestants - b.joursRestants)
      .slice(0, 10);

    // CA cumulé par tenant (top 10).
    const caParTenant = tenants
      .map((t) => ({
        id: t.id,
        nom: t.nom,
        slug: t.slug,
        plan: t.plan,
        ca: caMap.get(t.id)?.ca ?? 0,
        nbCommandes: caMap.get(t.id)?.nb ?? 0,
      }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);

    const totalCA = Array.from(caMap.values()).reduce((s, v) => s + v.ca, 0);

    return NextResponse.json({
      nbTenants: tenants.length,
      parStatut,
      parPlan,
      mrrEstime,
      totalCA,
      essaisExpirant,
      caParTenant,
    });
  } catch (e) {
    console.error("[api/admin/plateforme]", e);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
