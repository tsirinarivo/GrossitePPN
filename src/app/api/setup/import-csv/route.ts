import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if ((c === ";" || c === ",") && !inQ) { cells.push(cur); cur = ""; continue; }
      cur += c;
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { csv } = await req.json() as { csv: string };
  if (!csv) return NextResponse.json({ error: "CSV requis" }, { status: 400 });

  try {
    const rows = parseCSV(csv);
    if (rows.length < 2) return NextResponse.json({ error: "CSV vide" }, { status: 400 });

    const header = rows[0]!.map((h) => h.toLowerCase());
    const idxCode = header.findIndex((h) => h === "code");
    const idxDesignation = header.findIndex((h) => h === "designation" || h === "nom");
    const idxPrix = header.findIndex((h) => h === "prix");
    const idxStock = header.findIndex((h) => h === "stock");
    const idxCategorie = header.findIndex((h) => h === "categorie");

    if (idxCode < 0 || idxDesignation < 0 || idxPrix < 0) {
      return NextResponse.json({ error: "Colonnes requises : code, designation, prix" }, { status: 400 });
    }

    let inserted = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      const code = row[idxCode]?.trim();
      const designation = row[idxDesignation]?.trim();
      const prixStr = row[idxPrix]?.trim();
      if (!code || !designation || !prixStr) {
        errors.push(`Ligne ${i + 1} : champs requis manquants`);
        continue;
      }
      const prix = Math.round(Number(prixStr.replace(/\s/g, "")));
      if (isNaN(prix) || prix < 0) {
        errors.push(`Ligne ${i + 1} : prix invalide`);
        continue;
      }
      const stock = idxStock >= 0 ? Math.round(Number(row[idxStock] ?? "0")) : 0;
      try {
        await db.insert(schema.produits).values({
          id: crypto.randomUUID(),
          code,
          nom: designation,
          uniteBase: "unite",
          prixVenteDetail: prix,
          prixVenteSemiGros: Math.round(prix * 0.92),
          prixVenteGros: Math.round(prix * 0.85),
          seuilAlerte: 10,
          actif: true,
        });
        void stock;
        void idxCategorie;
        inserted++;
      } catch (e) {
        errors.push(`Ligne ${i + 1} : ${e instanceof Error ? e.message : "erreur insertion"}`);
      }
    }

    return NextResponse.json({ inserted, total: rows.length - 1, errors: errors.slice(0, 10) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur parsing CSV" }, { status: 500 });
  }
}
