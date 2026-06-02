import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function mga(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " MGA";
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const mois = new URL(req.url).searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);

  // Fetch via internal API (réutiliser logique bilan)
  const baseUrl = new URL(req.url);
  baseUrl.pathname = "/api/rapports/bilan";
  baseUrl.searchParams.set("mois", mois);
  const bilan = await fetch(baseUrl.toString(), { headers: await headers() }).then((r) => r.json());

  const [entreprise] = await db.select().from(schema.entreprise).limit(1);

  const [y, m] = mois.split("-").map(Number);
  const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const moisLabel = `${MOIS[(m ?? 1) - 1]} ${y}`;

  const CAT_LABELS: Record<string, string> = {
    personnel: "Personnel", loyer: "Loyer", energie: "Énergie",
    fournitures: "Fournitures", marketing: "Marketing", maintenance: "Maintenance", autre: "Autre",
  };

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Rapport mensuel ${mois}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11pt;color:#111;padding:20mm}
  .cover{height:240mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;page-break-after:always}
  .cover .logo{font-size:36pt;font-weight:900;color:#FF4D00;margin-bottom:5mm}
  .cover .logo span{color:#111}
  .cover h1{font-size:28pt;margin-top:20mm;color:#111}
  .cover .subtitle{font-size:14pt;color:#666;margin-top:5mm}
  .cover .footer{position:absolute;bottom:30mm;font-size:9pt;color:#999}
  h2{font-size:18pt;color:#FF4D00;margin-bottom:5mm;border-bottom:2px solid #FF4D00;padding-bottom:2mm}
  h3{font-size:14pt;color:#111;margin:8mm 0 3mm}
  table{width:100%;border-collapse:collapse;margin:5mm 0}
  th,td{padding:3mm;text-align:left;border-bottom:1px solid #eee;font-size:10pt}
  th{background:#111;color:#fff;font-size:9pt}
  .totaux{text-align:right;font-weight:700;font-size:12pt}
  .resultat{padding:5mm;background:#fff7ed;border-left:4px solid #FF4D00;margin:5mm 0;font-size:14pt;font-weight:700}
  .resultat.positive{background:#dcfce7;border-color:#22c55e;color:#15803d}
  .resultat.negative{background:#fee2e2;border-color:#ef4444;color:#b91c1c}
  .section{page-break-before:always}
  @media print{@page{size:A4;margin:15mm}}
</style></head>
<body>

<div class="cover">
  <div class="logo">${entreprise?.nom ?? "Grossiste"}<span>PPN</span></div>
  <h1>RAPPORT MENSUEL</h1>
  <div class="subtitle">${moisLabel}</div>
  <div class="footer">${entreprise?.nom ?? "GrossistePPN"} · ${entreprise?.adresse ?? ""}</div>
</div>

<div class="section">
  <h2>Compte de résultat — ${moisLabel}</h2>

  <h3>Produits</h3>
  <table>
    <tr><td>Chiffre d'affaires HT</td><td class="totaux">${mga(bilan.caHT)}</td></tr>
    <tr><td>TVA collectée</td><td class="totaux">${mga(bilan.tva)}</td></tr>
    <tr><td><strong>Chiffre d'affaires TTC</strong></td><td class="totaux"><strong>${mga(bilan.caTTC)}</strong></td></tr>
  </table>

  <h3>Achats</h3>
  <table>
    <tr><td>Achats marchandises HT</td><td class="totaux">${mga(bilan.achats)}</td></tr>
  </table>

  <h3>Marge brute</h3>
  <table>
    <tr><td><strong>Marge brute (CA HT − Achats)</strong></td><td class="totaux"><strong>${mga(bilan.margeBrute)}</strong></td></tr>
  </table>

  <h3>Charges opérationnelles</h3>
  <table>
    <thead><tr><th>Catégorie</th><th style="text-align:right">Montant</th></tr></thead>
    <tbody>
      ${(bilan.chargesParCategorie ?? []).map((c: { categorie: string; montant: number }) =>
        `<tr><td>${CAT_LABELS[c.categorie] ?? c.categorie}</td><td class="totaux">${mga(c.montant)}</td></tr>`
      ).join("")}
      <tr><td><strong>Total charges</strong></td><td class="totaux"><strong>${mga(bilan.chargesTotales)}</strong></td></tr>
    </tbody>
  </table>

  <div class="resultat ${bilan.resultat >= 0 ? "positive" : "negative"}">
    Résultat net du mois : ${mga(bilan.resultat)}
  </div>
</div>

<div class="section">
  <h2>Synthèse TVA</h2>
  <table>
    <tr><td>CA HT</td><td class="totaux">${mga(bilan.caHT)}</td></tr>
    <tr><td>TVA collectée (20%)</td><td class="totaux">${mga(bilan.tva)}</td></tr>
    <tr><td><strong>Net TVA à reverser</strong></td><td class="totaux"><strong>${mga(bilan.tva)}</strong></td></tr>
  </table>
  <p style="margin-top:5mm;font-size:9pt;color:#666">À déposer auprès des services fiscaux avant le 15 du mois suivant.</p>
</div>

<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
