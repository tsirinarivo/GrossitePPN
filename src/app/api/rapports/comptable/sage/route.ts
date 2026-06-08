import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buildAnneeFecLines } from "@/lib/comptable-data";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function cell(v: string | number): string {
  const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, " ");
  return `"${s}"`;
}

function montant(n: number): string {
  return n > 0 ? (Math.round(n) + ",00").replace(".", ",") : "";
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "agent";
  if (!session?.user || !["admin", "gerant", "comptable"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const annee = parseInt(
    req.nextUrl.searchParams.get("annee") ?? String(new Date().getFullYear()),
    10
  );

  const { lines } = await buildAnneeFecLines(annee);

  // Format Sage / EBP — journal, date (JJ/MM/AAAA), compte, libellé, débit, crédit, pièce
  const header = ["Journal", "Date", "Compte", "Compte auxiliaire", "Libellé", "Débit", "Crédit", "Pièce"];
  const rows = [header.map(cell).join(";")];
  for (const l of lines) {
    const d = l.ecritureDate; // AAAAMMJJ
    const dateFr = `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
    rows.push(
      [
        l.journalCode,
        dateFr,
        l.compteNum,
        l.compAuxNum,
        l.ecritureLib,
        montant(l.debit),
        montant(l.credit),
        l.pieceRef,
      ]
        .map(cell)
        .join(";")
    );
  }

  await logAudit({
    action: "export",
    entite: "configuration",
    description: `Export Sage/EBP ${annee} (${lines.length} lignes)`,
    actor: { id: session.user.id, nom: session.user.name, role },
  });

  return new NextResponse("﻿" + rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-sage-${annee}.csv"`,
    },
  });
}
