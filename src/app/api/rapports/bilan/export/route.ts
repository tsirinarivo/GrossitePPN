import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const annee = searchParams.get("annee") ?? String(new Date().getFullYear());

  // Récupère via l'endpoint principal
  const baseUrl = new URL(`/api/rapports/bilan?annee=${annee}`, req.url);
  const res = await fetch(baseUrl, { headers: { cookie: req.headers.get("cookie") ?? "" } });
  const data = await res.json();

  const lignes = data.mois ?? [];

  type Ligne = {
    mois: string;
    label: string;
    caHT: number;
    caTTC: number;
    nbCommandes: number;
    achatsHT: number;
    achatsTTC: number;
    charges: number;
    margeBrute: number;
    margeBrutePct: number;
    resultat: number;
  };

  const rows: string[][] = [
    ["Mois", "Nb commandes", "CA HT (MGA)", "CA TTC (MGA)", "Achats HT (MGA)", "Achats TTC (MGA)", "Charges (MGA)", "Marge brute (MGA)", "Marge brute (%)", "Résultat (MGA)"],
  ];

  let totaux = { ca: 0, caTTC: 0, nb: 0, ach: 0, achTTC: 0, chg: 0, marge: 0, res: 0 };

  for (const l of lignes as Ligne[]) {
    rows.push([
      l.label,
      String(l.nbCommandes),
      String(l.caHT),
      String(l.caTTC),
      String(l.achatsHT),
      String(l.achatsTTC),
      String(l.charges),
      String(l.margeBrute),
      `${l.margeBrutePct}%`,
      String(l.resultat),
    ]);
    totaux.ca += l.caHT;
    totaux.caTTC += l.caTTC;
    totaux.nb += l.nbCommandes;
    totaux.ach += l.achatsHT;
    totaux.achTTC += l.achatsTTC;
    totaux.chg += l.charges;
    totaux.marge += l.margeBrute;
    totaux.res += l.resultat;
  }

  rows.push([
    `TOTAL ${annee}`,
    String(totaux.nb),
    String(totaux.ca),
    String(totaux.caTTC),
    String(totaux.ach),
    String(totaux.achTTC),
    String(totaux.chg),
    String(totaux.marge),
    totaux.ca > 0 ? `${Math.round((totaux.marge / totaux.ca) * 100)}%` : "0%",
    String(totaux.res),
  ]);

  // CSV avec ; pour Excel français
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
  // BOM UTF-8 pour Excel
  const body = "﻿" + csv;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bilan-${annee}.csv"`,
    },
  });
}
