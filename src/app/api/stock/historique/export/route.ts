import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { escapeCsvCell } from "@/lib/escape";

export const dynamic = "force-dynamic";

type Mouvement = {
  createdAt: string;
  type: string;
  produitCode: string | null;
  produitNom: string | null;
  produitUnite: string | null;
  depotNom: string | null;
  quantiteBase: number;
  quantiteAvant: number;
  quantiteApres: number;
  reference: string | null;
  agentNom: string;
  notes: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  entree: "Entrée",
  vente: "Vente",
  transfert: "Transfert",
  casse: "Casse",
  inventaire: "Inventaire",
  reservation: "Réservation",
};

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  const params = url.searchParams.toString();

  // Récupère via l'endpoint principal pour réutiliser les filtres
  const baseUrl = new URL(`/api/stock/historique?${params}`, req.url);
  const res = await fetch(baseUrl, { headers: { cookie: req.headers.get("cookie") ?? "" } });
  const data = await res.json();

  const lignes: Mouvement[] = data.mouvements ?? [];

  const rows: string[][] = [
    ["Date", "Heure", "Type", "Code produit", "Produit", "Dépôt", "Quantité", "Unité", "Avant", "Après", "Référence", "Agent", "Notes"],
  ];

  for (const l of lignes) {
    const date = new Date(l.createdAt);
    rows.push([
      date.toLocaleDateString("fr-FR"),
      date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      TYPE_LABELS[l.type] ?? l.type,
      escapeCsvCell(l.produitCode ?? ""),
      escapeCsvCell(l.produitNom ?? ""),
      escapeCsvCell(l.depotNom ?? ""),
      String(l.quantiteBase),
      escapeCsvCell(l.produitUnite ?? ""),
      String(l.quantiteAvant),
      String(l.quantiteApres),
      escapeCsvCell(l.reference ?? ""),
      escapeCsvCell(l.agentNom ?? ""),
      escapeCsvCell((l.notes ?? "").replace(/\r?\n/g, " ")),
    ]);
  }

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const body = "﻿" + csv;

  const datestamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historique-stock-${datestamp}.csv"`,
    },
  });
}
