import { NextRequest, NextResponse } from "next/server";
import { loadXprintConfig, sendPrintAndLog } from "@/lib/xprint/service";
import { formatFactureTicket } from "@/lib/xprint/format";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function buildQrPayload(opts: {
  numero: string;
  client?: string | null;
  totalTTC: number;
  modePaiement?: string | null;
  date: Date;
}): string {
  const dd = String(opts.date.getDate()).padStart(2, "0");
  const mm = String(opts.date.getMonth() + 1).padStart(2, "0");
  const yyyy = opts.date.getFullYear();
  const hh = String(opts.date.getHours()).padStart(2, "0");
  const mn = String(opts.date.getMinutes()).padStart(2, "0");
  const dateStr = `${dd}/${mm}/${yyyy} ${hh}:${mn}`;

  const totalStr = Math.round(opts.totalTTC)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " Ar";

  const client = opts.client && opts.client !== "Client comptoir"
    ? opts.client.slice(0, 40)
    : "Comptoir";

  const paie = (opts.modePaiement ?? "Especes").slice(0, 20);

  return [
    `CMD:${opts.numero}`,
    `DATE:${dateStr}`,
    `TOTAL:${totalStr}`,
    `CLIENT:${client}`,
    `PAIE:${paie}`,
  ].join(" | ");
}

export async function POST(req: NextRequest) {
  try {
    const cfg = await loadXprintConfig();
    if (!cfg) {
      return NextResponse.json(
        { ok: false, errorMessage: "Imprimante non configurée" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { numero, client, lignes, totalHT, totalTVA, totalTTC, modePaiement, assujettieTV, commandeId } = body;

    const rows = await db.select().from(schema.entreprise).limit(1);
    const e = rows[0];

    const content = formatFactureTicket({
      entrepriseNom: e?.nom ?? "Grossiste PPN",
      entrepriseAdresse: e?.adresse ?? null,
      entrepriseTelephone: e?.telephone ?? null,
      nif: e?.nif ?? null,
      stat: e?.stat ?? null,
      assujettieTV: assujettieTV ?? false,
      numeroFacture: numero,
      date: new Date(),
      clientNom: client && client !== "Client comptoir" ? client : null,
      lignes: (lignes ?? []).map((l: { nom: string; qte: number; unite: string; prix: number; total: number }) => ({
        nom: l.nom,
        qte: l.qte,
        unite: l.unite,
        prixUnitaire: l.prix,
        total: l.total,
      })),
      sousTotal: totalHT,
      tva: totalTVA > 0 ? totalTVA : null,
      total: totalTTC,
      modePaiement: modePaiement ?? "Especes",
      qrPayload: buildQrPayload({ numero, client, totalTTC, modePaiement, date: new Date() }),
      header: cfg.header,
      footer: cfg.footer,
    });

    const result = await sendPrintAndLog(content, {
      kind: "facture",
      relatedId: commandeId ?? null,
      copies: cfg.copies,
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[print/ticket]", msg);
    return NextResponse.json({ ok: false, errorMessage: msg }, { status: 500 });
  }
}
