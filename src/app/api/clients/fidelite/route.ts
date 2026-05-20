import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const TIER_THRESHOLDS = { bronze: 0, argent: 10_000, or: 50_000, platine: 200_000 };

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Find client linked to user
  const [client] = await db
    .select({
      id: schema.clients.id,
      raisonSociale: schema.clients.raisonSociale,
      pointsFidelite: schema.clients.pointsFidelite,
      statutFidelite: schema.clients.statutFidelite,
      totalAchats: schema.clients.totalAchats,
    })
    .from(schema.clients)
    .where(and(eq(schema.clients.userId, session.user.id), eq(schema.clients.ecommerceActif, true)))
    .limit(1);

  if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  // Transactions fidélité
  const transactions = await db
    .select()
    .from(schema.transactionsFidelite)
    .where(eq(schema.transactionsFidelite.clientId, client.id))
    .orderBy(desc(schema.transactionsFidelite.createdAt))
    .limit(20);

  const points = client.pointsFidelite ?? 0;
  const tier = (client.statutFidelite ?? "bronze") as keyof typeof TIER_THRESHOLDS;
  const tiers: Array<keyof typeof TIER_THRESHOLDS> = ["bronze", "argent", "or", "platine"];
  const tierIdx = tiers.indexOf(tier);
  const nextTier = tiers[tierIdx + 1] ?? null;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  const currentThreshold = TIER_THRESHOLDS[tier];
  const progressPct = nextThreshold
    ? Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  return NextResponse.json({
    client: {
      id: client.id,
      raisonSociale: client.raisonSociale,
      pointsFidelite: points,
      statutFidelite: tier,
      totalAchats: client.totalAchats ?? 0,
    },
    tier: {
      current: tier,
      next: nextTier,
      progressPct: Math.max(0, Math.min(100, progressPct)),
      pointsVersNextTier: nextThreshold ? Math.max(0, nextThreshold - points) : 0,
    },
    transactions,
  });
}
