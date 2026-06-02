import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Store en mémoire (simulation - en prod : Redis ou DB)
const TRANSACTIONS = new Map<string, { id: string; montant: number; mode: string; statut: string; createdAt: number; numero: string }>();

// Initier une transaction Mobile Money
export async function POST(req: NextRequest) {
  const { montant, mode, numero } = await req.json() as { montant: number; mode: string; numero: string };
  if (!montant || !mode) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

  const id = crypto.randomUUID();
  const transaction = {
    id,
    montant: Math.round(montant),
    mode,
    statut: "en_attente",
    createdAt: Date.now(),
    numero: numero || `MM-${id.slice(0, 8).toUpperCase()}`,
  };
  TRANSACTIONS.set(id, transaction);

  // Simulation : webhook auto à 3s
  setTimeout(() => {
    const t = TRANSACTIONS.get(id);
    if (t && t.statut === "en_attente") {
      t.statut = "paye";
      TRANSACTIONS.set(id, t);
    }
  }, 3000);

  // QR payload (fictif)
  const qrPayload = `${mode.toUpperCase()}://pay?id=${id}&amount=${transaction.montant}&ref=${transaction.numero}`;

  return NextResponse.json({ id, qrPayload, transaction });
}

export { TRANSACTIONS };
