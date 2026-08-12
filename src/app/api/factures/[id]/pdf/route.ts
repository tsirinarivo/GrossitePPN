import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getEntrepriseFor } from "@/lib/entreprise";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { scopeTenant } from "@/lib/tenant";
import { e } from "@/lib/escape";

export const dynamic = "force-dynamic";

function mgaFmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " MGA";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tid = actor.tenantId;

  const { id } = await params;

  const [facture] = await db
    .select()
    .from(schema.factures)
    .where(scopeTenant(schema.factures.tenantId, tid, eq(schema.factures.id, id)))
    .limit(1);

  if (!facture) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  // Get commande + lignes + client
  const [commande] = await db.select().from(schema.commandes).where(eq(schema.commandes.id, facture.commandeId)).limit(1);
  const lignes = await db.select().from(schema.lignesCommande).where(eq(schema.lignesCommande.commandeId, facture.commandeId));

  let client = null;
  if (facture.clientId) {
    const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, facture.clientId)).limit(1);
    client = c ?? null;
  }

  // Get entreprise settings
  const entreprise = await getEntrepriseFor(facture.tenantId);

  const dateFacture = new Date(facture.createdAt ?? Date.now()).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Facture ${facture.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20mm 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10mm; }
  .logo { font-size: 22pt; font-weight: 900; color: #FF4D00; }
  .logo span { color: #111; }
  .facture-title { text-align: right; }
  .facture-title h1 { font-size: 18pt; font-weight: 700; color: #FF4D00; }
  .facture-title .numero { font-size: 10pt; color: #666; margin-top: 2mm; }
  .facture-title .date { font-size: 9pt; color: #888; }
  .divider { border-top: 2px solid #FF4D00; margin: 5mm 0; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 8mm; }
  .partie { width: 48%; }
  .partie h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 2mm; }
  .partie p { font-size: 10pt; color: #111; line-height: 1.5; }
  .partie .nom { font-weight: 700; font-size: 12pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 2.5mm 3mm; text-align: left; font-size: 9pt; font-weight: 600; }
  thead th:last-child { text-align: right; }
  thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  tbody tr { border-bottom: 1px solid #eee; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  tbody td { padding: 2mm 3mm; font-size: 10pt; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; }
  .totaux { margin-left: auto; width: 60mm; margin-bottom: 6mm; }
  .totaux-ligne { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 10pt; }
  .totaux-ligne.total { border-top: 2px solid #111; font-weight: 700; font-size: 12pt; padding-top: 2.5mm; margin-top: 1mm; }
  .totaux-ligne.total .label { color: #FF4D00; }
  .mentions { border-top: 1px solid #ddd; margin-top: 8mm; padding-top: 4mm; font-size: 8pt; color: #888; }
  .statut-badge { display: inline-block; padding: 1mm 3mm; border-radius: 3mm; font-size: 8pt; font-weight: 700; text-transform: uppercase; }
  .statut-payee { background: #dcfce7; color: #15803d; }
  .statut-emise { background: #fef9c3; color: #92400e; }
  .statut-partielle { background: #fed7aa; color: #c2410c; }
  @media print {
    body { padding: 15mm; }
    @page { size: A4; margin: 15mm; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="logo">${e(entreprise?.nom ?? "Grossiste")}<span>PPN</span></div>
  <div class="facture-title">
    <h1>FACTURE</h1>
    <div class="numero">${e(facture.numero)}</div>
    <div class="date">Émise le ${e(dateFacture)}</div>
    <div style="margin-top:2mm">
      <span class="statut-badge statut-${e(facture.statut)}">${e(facture.statut)}</span>
    </div>
  </div>
</div>
<div class="divider"></div>

<div class="parties">
  <div class="partie">
    <h3>Émetteur</h3>
    <p class="nom">${e(entreprise?.nom ?? "GrossistePPN")}</p>
    ${entreprise?.adresse ? `<p>${e(entreprise.adresse)}</p>` : ""}
    ${entreprise?.telephone ? `<p>Tél : ${e(entreprise.telephone)}</p>` : ""}
    ${entreprise?.nif ? `<p>NIF : ${e(entreprise.nif)}</p>` : ""}
    ${entreprise?.stat ? `<p>STAT : ${e(entreprise.stat)}</p>` : ""}
  </div>
  <div class="partie" style="text-align:right">
    <h3>Client</h3>
    ${client ? `
      <p class="nom">${e(client.raisonSociale)}</p>
      ${client.adresse ? `<p>${e(client.adresse)}</p>` : ""}
      ${client.telephone ? `<p>Tél : ${e(client.telephone)}</p>` : ""}
      ${client.nif ? `<p>NIF : ${e(client.nif)}</p>` : ""}
    ` : `<p class="nom">Client comptoir</p>`}
    ${commande?.source === "ecommerce" ? `<p style="color:#3b82f6; font-size:9pt">Commande web</p>` : ""}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:40%">Désignation</th>
      <th>Unité</th>
      <th>Qté</th>
      <th>PU HT</th>
      ${facture.totalTVA > 0 ? `<th>TVA</th>` : ""}
      <th>Total TTC</th>
    </tr>
  </thead>
  <tbody>
    ${lignes.map((l) => `
      <tr>
        <td>${e(l.nomProduit ?? "—")}</td>
        <td>${e(l.nomUnite ?? "")}</td>
        <td>${Number(l.quantite).toLocaleString("fr-FR")}</td>
        <td>${mgaFmt(Number(l.prixUnitaire))}</td>
        ${facture.totalTVA > 0 ? `<td>${Number(l.tauxTVA ?? 0)}%</td>` : ""}
        <td>${mgaFmt(Number(l.totalTTC))}</td>
      </tr>
    `).join("")}
  </tbody>
</table>

<div class="totaux">
  <div class="totaux-ligne"><span>Sous-total HT</span><span>${mgaFmt(facture.totalHT)}</span></div>
  ${facture.totalTVA > 0 ? `<div class="totaux-ligne"><span>TVA</span><span>${mgaFmt(facture.totalTVA)}</span></div>` : ""}
  <div class="totaux-ligne total">
    <span class="label">Total TTC</span>
    <span>${mgaFmt(facture.totalTTC)}</span>
  </div>
  ${facture.modePaiement ? `<div class="totaux-ligne" style="color:#888; font-size:9pt"><span>Mode</span><span>${e(String(facture.modePaiement).replace(/_/g," "))}</span></div>` : ""}
  ${facture.soldeRestant > 0 ? `<div class="totaux-ligne" style="color:#ef4444"><span>Solde restant</span><span>${mgaFmt(facture.soldeRestant)}</span></div>` : ""}
</div>

<div class="mentions">
  <p>Cette facture a été émise par ${e(entreprise?.nom ?? "GrossistePPN")} conformément à la législation malgache en vigueur.</p>
  ${entreprise?.nif ? `<p>NIF : ${e(entreprise.nif)}${entreprise?.stat ? ` · STAT : ${e(entreprise.stat)}` : ""}${entreprise?.rcs ? ` · RCS : ${e(entreprise.rcs)}` : ""}</p>` : ""}
  <p style="margin-top:2mm">En cas de contestation, veuillez nous contacter dans les 7 jours suivant la réception.</p>
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
