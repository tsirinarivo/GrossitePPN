import { NextRequest, NextResponse } from "next/server";
import { TRANSACTIONS } from "../route";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const t = TRANSACTIONS.get(id);
  if (!t) return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  return NextResponse.json({ transaction: t });
}

// Webhook simulé : forcer le statut
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { statut } = await req.json() as { statut: string };
  const t = TRANSACTIONS.get(id);
  if (!t) return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  t.statut = statut;
  TRANSACTIONS.set(id, t);
  return NextResponse.json({ transaction: t });
}
