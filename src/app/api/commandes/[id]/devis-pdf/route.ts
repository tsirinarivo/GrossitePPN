import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function mgaFmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " MGA";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [commande] = await db
    .select()
    .from(schema.commandes)
    .where(eq(schema.commandes.id, id))
    .limit(1);

  if (!commande)
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const lignes = await db
    .select()
    .from(schema.lignesCommande)
    .where(eq(schema.lignesCommande.commandeId, id));

  let client = null;
  if (commande.clientId) {
    const [c] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, commande.clientId))
      .limit(1);
    client = c ?? null;
  }

  const [entreprise] = await db.select().from(schema.entreprise).limit(1);

  const dateDevis = new Date(commande.createdAt ?? Date.now()).toLocaleDateString(
    "fr-FR",
    { day: "2-digit", month: "long", year: "numeric" }
  );

  const validiteDate = new Date(commande.createdAt ?? Date.now());
  validiteDate.setDate(validiteDate.getDate() + 30);
  const dateValidite = validiteDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const tauxTVA = entreprise?.tauxTVADefaut ?? 20;
  const totalHT = commande.totalHT ?? 0;
  const totalTVA = commande.totalTVA ?? 0;
  const totalTTC = commande.totalTTC ?? 0;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Devis ${commande.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20mm 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10mm; }
  .logo { font-size: 22pt; font-weight: 900; color: #FF4D00; }
  .logo span { color: #111; }
  .devis-title { text-align: right; }
  .devis-title h1 { font-size: 18pt; font-weight: 700; color: #FF4D00; }
  .devis-title .numero { font-size: 10pt; color: #666; margin-top: 2mm; }
  .devis-title .date { font-size: 9pt; color: #888; }
  .divider { border-top: 2px solid #FF4D00; margin: 5mm 0; }
  .validite-box { background: #FEF9C3; border: 1px solid #FDE68A; border-radius: 4mm; padding: 3mm 5mm; margin-bottom: 8mm; font-size: 10pt; color: #92400E; font-weight: 600; display: flex; align-items: center; gap: 3mm; }
  .validite-box .label { font-size: 9pt; font-weight: 400; color: #A16207; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 8mm; }
  .partie { width: 48%; }
  .partie h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 2mm; }
  .partie p { font-size: 10pt; color: #111; line-height: 1.5; }
  .partie .nom { font-weight: 700; font-size: 12pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 2.5mm 3mm; text-align: left; font-size: 9pt; font-weight: 600; }
  thead th:last-child { text-align: right; }
  thead th:nth-child(2), thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
  tbody tr { border-bottom: 1px solid #eee; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  tbody td { padding: 2mm 3mm; font-size: 10pt; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody td:nth-child(2), tbody td:nth-child(4), tbody td:nth-child(5) { text-align: right; }
  .totaux { margin-left: auto; width: 70mm; margin-bottom: 6mm; }
  .totaux-ligne { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 10pt; }
  .totaux-ligne.total { border-top: 2px solid #111; font-weight: 700; font-size: 12pt; padding-top: 2.5mm; margin-top: 1mm; }
  .totaux-ligne.total .label { color: #FF4D00; }
  .note { border: 1px solid #ddd; border-radius: 3mm; padding: 3mm 5mm; margin-bottom: 6mm; font-size: 9pt; color: #555; line-height: 1.6; }
  .signature-box { border: 1px solid #ddd; border-radius: 3mm; padding: 4mm 5mm; margin-top: 8mm; }
  .signature-box p { font-size: 9pt; color: #888; margin-bottom: 12mm; }
  .signature-box .line { border-bottom: 1px solid #999; width: 60mm; }
  @media print {
    body { padding: 15mm; }
    @page { size: A4; margin: 15mm; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">${(entreprise?.nom ?? "Grossiste") + "<span>PPN</span>"}</div>
    ${entreprise?.adresse ? `<div style="font-size:9pt;color:#666;margin-top:1mm">${entreprise.adresse}</div>` : ""}
    ${entreprise?.telephone ? `<div style="font-size:9pt;color:#666">${entreprise.telephone}</div>` : ""}
    ${entreprise?.nif ? `<div style="font-size:9pt;color:#666">NIF : ${entreprise.nif}</div>` : ""}
    ${entreprise?.stat ? `<div style="font-size:9pt;color:#666">STAT : ${entreprise.stat}</div>` : ""}
  </div>
  <div class="devis-title">
    <h1>DEVIS</h1>
    <div class="numero">N° ${commande.numero}</div>
    <div class="date">Date : ${dateDevis}</div>
  </div>
</div>
<div class="divider"></div>

<div class="validite-box">
  <span class="label">VALABLE JUSQU'AU :</span>
  <span>${dateValidite}</span>
</div>

<div class="parties">
  <div class="partie">
    <h3>Émetteur</h3>
    <p class="nom">${entreprise?.nom ?? "GrossistePPN"}</p>
    ${entreprise?.adresse ? `<p>${entreprise.adresse}</p>` : ""}
    ${entreprise?.telephone ? `<p>Tél : ${entreprise.telephone}</p>` : ""}
    ${entreprise?.nif ? `<p>NIF : ${entreprise.nif}</p>` : ""}
    ${entreprise?.stat ? `<p>STAT : ${entreprise.stat}</p>` : ""}
  </div>
  <div class="partie" style="text-align:right">
    <h3>Client</h3>
    ${client ? `
      <p class="nom">${client.raisonSociale}</p>
      ${client.adresse ? `<p>${client.adresse}</p>` : ""}
      ${client.telephone ? `<p>Tél : ${client.telephone}</p>` : ""}
      ${client.nif ? `<p>NIF : ${client.nif}</p>` : ""}
    ` : `<p class="nom">Client comptoir</p>`}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:38%">Désignation</th>
      <th>Qté</th>
      <th>Unité</th>
      <th>PU HT</th>
      <th>Total HT</th>
    </tr>
  </thead>
  <tbody>
    ${lignes
      .map(
        (l) => `
      <tr>
        <td>${l.nomProduit ?? "—"}</td>
        <td>${Number(l.quantite).toLocaleString("fr-FR")}</td>
        <td>${l.nomUnite ?? ""}</td>
        <td>${mgaFmt(Number(l.prixUnitaire))}</td>
        <td>${mgaFmt(Number(l.totalHT))}</td>
      </tr>
    `
      )
      .join("")}
  </tbody>
</table>

<div class="totaux">
  <div class="totaux-ligne"><span>Sous-total HT</span><span>${mgaFmt(totalHT)}</span></div>
  ${totalTVA > 0 ? `<div class="totaux-ligne"><span>TVA (${tauxTVA}%)</span><span>${mgaFmt(totalTVA)}</span></div>` : ""}
  <div class="totaux-ligne total">
    <span class="label">Total TTC</span>
    <span>${mgaFmt(totalTTC)}</span>
  </div>
</div>

<div class="note">
  Ce devis est valable 30 jours à compter de sa date d&apos;émission.
  Pour acceptation, veuillez retourner ce document signé avec la mention &laquo;&nbsp;Bon pour accord&nbsp;&raquo;.
</div>

<div class="signature-box">
  <p>Signature et cachet client :</p>
  <div class="line"></div>
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
