import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { computeCompteResultat } from "@/lib/comptable-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const mois = req.nextUrl.searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);
  const resultat = await computeCompteResultat(mois);
  return NextResponse.json(resultat);
}
