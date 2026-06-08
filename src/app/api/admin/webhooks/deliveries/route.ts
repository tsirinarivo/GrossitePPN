import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function demoDeliveries() {
  const events = ["commande.creee", "facture.emise", "stock.bas", "commande.livree", "ping"];
  const now = Date.now();
  return Array.from({ length: 12 }, (_, i) => {
    const ok = i % 5 !== 0;
    return {
      id: `demo-del-${i}`,
      webhookId: "demo-webhook",
      webhookNom: "Partenaire logistique (démo)",
      evenement: events[i % events.length]!,
      statusCode: ok ? 200 : 503,
      succes: ok,
      erreur: ok ? null : "HTTP 503",
      dureeMs: 120 + ((i * 37) % 400),
      tentative: 1,
      createdAt: new Date(now - i * 47 * 60 * 1000).toISOString(),
    };
  });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "agent";
  if (!session?.user || (role !== "admin" && role !== "gerant")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const webhookId = req.nextUrl.searchParams.get("webhookId");

  try {
    const rows = await db
      .select({
        id: schema.webhookDeliveries.id,
        webhookId: schema.webhookDeliveries.webhookId,
        webhookNom: schema.webhooks.nom,
        evenement: schema.webhookDeliveries.evenement,
        statusCode: schema.webhookDeliveries.statusCode,
        succes: schema.webhookDeliveries.succes,
        erreur: schema.webhookDeliveries.erreur,
        dureeMs: schema.webhookDeliveries.dureeMs,
        tentative: schema.webhookDeliveries.tentative,
        createdAt: schema.webhookDeliveries.createdAt,
      })
      .from(schema.webhookDeliveries)
      .leftJoin(schema.webhooks, eq(schema.webhookDeliveries.webhookId, schema.webhooks.id))
      .where(webhookId ? eq(schema.webhookDeliveries.webhookId, webhookId) : undefined)
      .orderBy(desc(schema.webhookDeliveries.createdAt))
      .limit(100);

    if (rows.length > 0) {
      return NextResponse.json({
        deliveries: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        demo: false,
      });
    }
  } catch (e) {
    console.error("[webhooks/deliveries]", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ deliveries: demoDeliveries(), demo: true });
}
