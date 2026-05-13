import { NextResponse } from "next/server";
import { loadXprintConfig } from "@/lib/xprint/service";
import { sendPrintAndLog } from "@/lib/xprint/service";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { formatFactureTicket } from "@/lib/xprint/format";

export const dynamic = "force-dynamic";

export async function POST() {
  const cfg = await loadXprintConfig();
  if (!cfg) {
    return NextResponse.json({ ok: false, error: "Imprimante non configurée" }, { status: 400 });
  }

  const rows = await db.select().from(schema.entreprise).limit(1);
  const e = rows[0];

  const content = formatFactureTicket({
    entrepriseNom: e?.nom ?? "Grossiste PPN",
    entrepriseAdresse: e?.adresse ?? null,
    entrepriseTelephone: e?.telephone ?? null,
    numeroFacture: "TEST-001",
    date: new Date(),
    clientNom: "Ticket de test",
    lignes: [
      { nom: "Riz Makalioka", qte: 10, unite: "kg", prixUnitaire: 2800, total: 28000 },
      { nom: "Huile Tiko 1L", qte: 3, unite: "bte", prixUnitaire: 10500, total: 31500 },
    ],
    sousTotal: 59500,
    total: 59500,
    modePaiement: "Espèces",
    qrPayload: "https://grossiste.dago-it.com/factures/TEST-001",
    header: cfg.header,
    footer: cfg.footer,
  });

  const result = await sendPrintAndLog(content, { kind: "test" });

  return NextResponse.json(result);
}
