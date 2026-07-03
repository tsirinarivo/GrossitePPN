import { NextResponse } from "next/server";
import { loadXprintConfig, sendPrintAndLog } from "@/lib/xprint/service";
import { formatFactureTicket } from "@/lib/xprint/format";
import { getSessionTenantId } from "@/lib/tenant";
import { getEntrepriseFor } from "@/lib/entreprise";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const tid = await getSessionTenantId();
    const cfg = await loadXprintConfig(tid);
    if (!cfg) {
      return NextResponse.json(
        { ok: false, errorMessage: "Imprimante non configurée — renseigne User, UserKEY et SN dans les paramètres." },
        { status: 400 }
      );
    }

    const e = await getEntrepriseFor(tid);

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
      modePaiement: "Especes",
      qrPayload: "https://grossiste.dago-it.com/factures/TEST-001",
      header: cfg.header,
      footer: cfg.footer,
    });

    const result = await sendPrintAndLog(content, { kind: "test" }, tid);

    if (!result.ok) {
      // Log côté serveur pour diagnostic
      console.error("[xprint] test print failed:", result.errorMessage);
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[xprint] test route error:", msg);
    return NextResponse.json({ ok: false, errorMessage: msg }, { status: 500 });
  }
}
