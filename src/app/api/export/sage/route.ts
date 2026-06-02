import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, gte, lt, eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  if (s.includes(";") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  const mois = url.searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);
  const [y, m] = mois.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, 1);
  const end = new Date(y!, m ?? 1, 1);

  try {
    const factures = await db
      .select({
        f: schema.factures,
        clientNom: schema.clients.raisonSociale,
        clientCode: schema.clients.code,
      })
      .from(schema.factures)
      .leftJoin(schema.clients, eq(schema.clients.id, schema.factures.clientId))
      .where(and(gte(schema.factures.createdAt, start), lt(schema.factures.createdAt, end)))
      .orderBy(asc(schema.factures.createdAt));

    const rows = [
      ["Date", "Pièce", "Client", "Code Client", "Libellé", "Montant HT", "Montant TVA", "Montant TTC", "Compte"].join(";"),
    ];

    for (const { f, clientNom, clientCode } of factures) {
      const date = new Date(f.createdAt).toLocaleDateString("fr-FR");
      rows.push([
        date,
        f.numero,
        esc(clientNom ?? "Comptoir"),
        clientCode ?? "",
        esc(`Facture ${f.numero}`),
        String(f.totalHT),
        String(f.totalTVA),
        String(f.totalTTC),
        "707000",
      ].join(";"));
    }

    const content = `﻿${rows.join("\n")}`;
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ventes-sage-${mois}.csv"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur export Sage" }, { status: 500 });
  }
}
