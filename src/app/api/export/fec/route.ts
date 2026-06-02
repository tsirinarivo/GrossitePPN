import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, gte, lt, eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function escape(s: string): string {
  return s.replace(/\|/g, "/").replace(/\n/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  const annee = parseInt(url.searchParams.get("annee") ?? String(new Date().getFullYear()), 10);

  const start = new Date(annee, 0, 1);
  const end = new Date(annee + 1, 0, 1);

  try {
    const factures = await db
      .select({
        f: schema.factures,
        clientNom: schema.clients.raisonSociale,
      })
      .from(schema.factures)
      .leftJoin(schema.clients, eq(schema.clients.id, schema.factures.clientId))
      .where(and(gte(schema.factures.createdAt, start), lt(schema.factures.createdAt, end)))
      .orderBy(asc(schema.factures.createdAt));

    // En-tête FEC simplifié (pipe-separated)
    const headers = [
      "JournalCode", "JournalLib", "EcritureNum", "EcritureDate",
      "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib",
      "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit",
      "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise",
    ];

    const rows: string[] = [headers.join("|")];

    let num = 1;
    for (const { f, clientNom } of factures) {
      const date = new Date(f.createdAt).toISOString().slice(0, 10).replace(/-/g, "");
      const numEcr = `VTE${String(num).padStart(6, "0")}`;

      // Débit client (411)
      rows.push([
        "VTE", "Journal Ventes", numEcr, date,
        "411000", "Clients", f.clientId ?? "", escape(clientNom ?? "Comptoir"),
        f.numero, date, escape(`Facture ${f.numero}`),
        String(f.totalTTC), "0",
        "", "", date, "", "MGA",
      ].join("|"));

      // Crédit ventes HT (707)
      rows.push([
        "VTE", "Journal Ventes", numEcr, date,
        "707000", "Ventes marchandises", "", "",
        f.numero, date, escape(`Facture ${f.numero}`),
        "0", String(f.totalHT),
        "", "", date, "", "MGA",
      ].join("|"));

      // Crédit TVA (44571)
      if (f.totalTVA > 0) {
        rows.push([
          "VTE", "Journal Ventes", numEcr, date,
          "445710", "TVA collectée", "", "",
          f.numero, date, escape(`TVA Facture ${f.numero}`),
          "0", String(f.totalTVA),
          "", "", date, "", "MGA",
        ].join("|"));
      }

      num++;
    }

    const content = rows.join("\n");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="FEC-${annee}.txt"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur génération FEC" }, { status: 500 });
  }
}
