import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

interface Notification {
  type: "stock" | "credit" | "commandes";
  id: string;
  message: string;
  level: "error" | "warning" | "info";
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const notifications: Notification[] = [];

  try {
    // ── 1. Stock critique ────────────────────────────────────────────────────
    const stockRows = await db
      .select({
        id: schema.produits.id,
        nom: schema.produits.nom,
        seuilAlerte: schema.produits.seuilAlerte,
        stockTotal: sql<number>`COALESCE(SUM(${schema.stocks.quantiteBase}), 0)`,
      })
      .from(schema.produits)
      .leftJoin(schema.stocks, eq(schema.stocks.produitId, schema.produits.id))
      .where(eq(schema.produits.actif, true))
      .groupBy(schema.produits.id)
      .limit(20);

    const stockCritiques = stockRows
      .filter((p) => {
        const seuil = p.seuilAlerte ?? 0;
        const stock = Number(p.stockTotal);
        return seuil > 0 && stock <= seuil;
      })
      .slice(0, 5);

    for (const p of stockCritiques) {
      const stock = Math.round(Number(p.stockTotal));
      notifications.push({
        type: "stock",
        id: p.id,
        message: `${p.nom}: stock critique (${stock})`,
        level: "error",
      });
    }

    // ── 2. Encours dépassé ──────────────────────────────────────────────────
    const encoursRows = await db
      .select({
        id: schema.clients.id,
        raisonSociale: schema.clients.raisonSociale,
        encoursCourant: schema.clients.encoursCourant,
        plafondCredit: schema.clients.plafondCredit,
      })
      .from(schema.clients)
      .where(
        and(
          eq(schema.clients.creditAutorise, true),
          gt(
            schema.clients.encoursCourant,
            sql<number>`${schema.clients.plafondCredit} * 0.9`
          )
        )
      )
      .limit(5);

    for (const c of encoursRows) {
      const pct =
        c.plafondCredit > 0
          ? Math.round((c.encoursCourant / c.plafondCredit) * 100)
          : 100;
      notifications.push({
        type: "credit",
        id: c.id,
        message: `${c.raisonSociale}: encours à ${pct}%`,
        level: "warning",
      });
    }

    // ── 3. Commandes en attente depuis +24h ──────────────────────────────────
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const cmdRows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.commandes)
      .where(
        and(
          eq(schema.commandes.statut, "soumise"),
          lt(schema.commandes.createdAt, cutoff)
        )
      );

    const nbCmd = Number(cmdRows[0]?.count ?? 0);
    if (nbCmd > 0) {
      notifications.push({
        type: "commandes",
        id: "cmd",
        message: `${nbCmd} commande${nbCmd > 1 ? "s" : ""} en attente depuis +24h`,
        level: "info",
      });
    }

    return NextResponse.json(
      { notifications, count: notifications.length },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("[api/notifications]", e);
    return NextResponse.json({ notifications: [], count: 0 });
  }
}
