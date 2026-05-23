import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { e } from "@/lib/escape";

export const dynamic = "force-dynamic";

function mgaFmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " Ar";
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  // Fetch livraison
  const [livraison] = await db
    .select()
    .from(schema.livraisons)
    .where(eq(schema.livraisons.id, id))
    .limit(1);

  if (!livraison) return NextResponse.json({ error: "Livraison introuvable" }, { status: 404 });

  // Fetch commande
  const [commande] = await db
    .select()
    .from(schema.commandes)
    .where(eq(schema.commandes.id, livraison.commandeId))
    .limit(1);

  // Fetch lignes commande
  const lignes = commande
    ? await db.select().from(schema.lignesCommande).where(eq(schema.lignesCommande.commandeId, commande.id))
    : [];

  // Fetch client
  let client = null;
  if (commande?.clientId) {
    const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, commande.clientId)).limit(1);
    client = c ?? null;
  }

  // Fetch tournee + vehicule + chauffeur
  let tournee = null;
  let vehicule = null;
  let chauffeur = null;
  if (livraison.tourneeId) {
    const [t] = await db.select().from(schema.tournees).where(eq(schema.tournees.id, livraison.tourneeId)).limit(1);
    tournee = t ?? null;
    if (tournee?.vehiculeId) {
      const [v] = await db.select().from(schema.vehicules).where(eq(schema.vehicules.id, tournee.vehiculeId)).limit(1);
      vehicule = v ?? null;
    }
    if (tournee?.chauffeurId) {
      const [u] = await db.select().from(schema.users).where(eq(schema.users.id, tournee.chauffeurId)).limit(1);
      chauffeur = u ?? null;
    }
  }

  // Fetch entreprise
  const [entreprise] = await db.select().from(schema.entreprise).limit(1);

  const blRef = livraison.tokenPublic.slice(-8).toUpperCase();
  const dateLivraison = fmtDate(livraison.livraisonAt ?? livraison.createdAt);
  const isLivree = livraison.statut === "livree";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Bon de Livraison BL-${blRef}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 18mm 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; }
  .logo { font-size: 20pt; font-weight: 900; color: #FF4D00; }
  .logo span { color: #111; }
  .bl-title { text-align: right; }
  .bl-title h1 { font-size: 17pt; font-weight: 700; color: #111; letter-spacing: 1px; }
  .bl-title .numero { font-size: 11pt; color: #FF4D00; font-weight: 700; margin-top: 2mm; }
  .bl-title .date { font-size: 9pt; color: #666; margin-top: 1mm; }
  .divider { border-top: 2px solid #FF4D00; margin: 5mm 0; }
  .divider-light { border-top: 1px solid #ddd; margin: 4mm 0; }
  .sections { display: flex; gap: 6mm; margin-bottom: 6mm; }
  .section { flex: 1; }
  .section h3 { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 2mm; padding-bottom: 1mm; border-bottom: 1px solid #eee; }
  .section p { font-size: 10pt; color: #111; line-height: 1.6; }
  .section .nom { font-weight: 700; font-size: 11pt; }
  .section .sub { font-size: 9pt; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 2.5mm 3mm; text-align: left; font-size: 9pt; font-weight: 600; }
  thead th.right { text-align: right; }
  tbody tr { border-bottom: 1px solid #eee; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  tbody td { padding: 2.5mm 3mm; font-size: 10pt; vertical-align: top; }
  tbody td.right { text-align: right; }
  .signature-section { margin-top: 10mm; padding-top: 5mm; border-top: 1px solid #ddd; }
  .signature-section h3 { font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 5mm; }
  .sig-row { display: flex; gap: 8mm; }
  .sig-box { flex: 1; }
  .sig-box .label { font-size: 9pt; color: #555; margin-bottom: 2mm; }
  .sig-line { border-bottom: 1px solid #333; height: 16mm; margin-bottom: 2mm; }
  .sig-name { font-size: 8pt; color: #888; }
  .livree-badge {
    display: inline-block; margin-top: 4mm;
    padding: 2mm 5mm; border-radius: 4mm;
    background: #dcfce7; color: #15803d;
    font-size: 11pt; font-weight: 700; letter-spacing: 0.5px;
    border: 1px solid #86efac;
  }
  .ref-block { display: flex; gap: 10mm; margin-bottom: 5mm; }
  .ref-item { }
  .ref-item .key { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #999; }
  .ref-item .val { font-size: 10pt; font-weight: 600; color: #111; }
  @media print {
    body { padding: 12mm 15mm; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div>
    <div class="logo">${(entreprise?.nom ?? "Grossiste") + "<span>PPN</span>"}</div>
    ${entreprise?.adresse ? `<div style="font-size:9pt;color:#555;margin-top:1mm">${e(entreprise.adresse)}</div>` : ""}
    ${entreprise?.telephone ? `<div style="font-size:9pt;color:#555">${e(entreprise.telephone)}</div>` : ""}
  </div>
  <div class="bl-title">
    <h1>BON DE LIVRAISON</h1>
    <div class="numero">BL N° ${blRef}</div>
    <div class="date">Date : ${dateLivraison}</div>
    ${isLivree ? `<div class="livree-badge">✓ LIVRÉ LE ${fmtDate(livraison.livraisonAt)}</div>` : ""}
  </div>
</div>

<div class="divider"></div>

<!-- Ref block -->
<div class="ref-block">
  ${commande ? `<div class="ref-item"><div class="key">Commande</div><div class="val">${e(commande.numero)}</div></div>` : ""}
  <div class="ref-item"><div class="key">BL Ref</div><div class="val">BL-${blRef}</div></div>
  <div class="ref-item"><div class="key">Statut livraison</div><div class="val">${livraison.statut.replace(/_/g, " ").toUpperCase()}</div></div>
  <div class="ref-item"><div class="key">Date création</div><div class="val">${fmtDate(livraison.createdAt)}</div></div>
</div>

<div class="divider-light"></div>

<!-- Sections -->
<div class="sections">
  <!-- Destinataire -->
  <div class="section">
    <h3>Destinataire</h3>
    ${client ? `
      <p class="nom">${e(client.raisonSociale)}</p>
      ${client.adresse ? `<p>${e(client.adresse)}</p>` : ""}
      ${("ville" in client && client.ville) ? `<p>${(client as {ville?: string}).ville ?? ""}</p>` : ""}
      ${client.telephone ? `<p>Tél : ${e(client.telephone)}</p>` : ""}
    ` : `
      <p class="nom">Client comptoir</p>
    `}
    ${livraison.adresseLivraison ? `<p class="sub" style="margin-top:1mm">📍 ${e(livraison.adresseLivraison)}</p>` : ""}
  </div>

  <!-- Émetteur -->
  <div class="section">
    <h3>Émetteur</h3>
    <p class="nom">${e(entreprise?.nom ?? "GrossistePPN")}</p>
    ${entreprise?.adresse ? `<p>${e(entreprise.adresse)}</p>` : ""}
    ${entreprise?.telephone ? `<p>Tél : ${e(entreprise.telephone)}</p>` : ""}
    ${entreprise?.nif ? `<p>NIF : ${e(entreprise.nif)}</p>` : ""}
  </div>

  <!-- Transporteur -->
  ${tournee || vehicule || chauffeur ? `
  <div class="section">
    <h3>Transporteur</h3>
    ${chauffeur ? `<p class="nom">${chauffeur.name}</p>` : ""}
    ${vehicule ? `<p>Véhicule : <strong>${vehicule.immatriculation}</strong>${vehicule.modele ? ` (${vehicule.modele})` : ""}</p>` : ""}
    ${tournee ? `<p class="sub">Tournée : ${new Date(tournee.date).toLocaleDateString("fr-FR")}</p>` : ""}
  </div>
  ` : ""}
</div>

<div class="divider-light"></div>

<!-- Lignes -->
<table>
  <thead>
    <tr>
      <th style="width:45%">Désignation</th>
      <th class="right">Quantité</th>
      <th>Unité</th>
      ${commande ? `<th class="right">Total TTC</th>` : ""}
      <th>Observations</th>
    </tr>
  </thead>
  <tbody>
    ${lignes.length > 0 ? lignes.map((l) => `
      <tr>
        <td>${e(l.nomProduit ?? "—")}</td>
        <td class="right">${Number(l.quantite).toLocaleString("fr-FR")}</td>
        <td>${e(l.nomUnite ?? "")}</td>
        ${commande ? `<td class="right">${mgaFmt(Number(l.totalTTC))}</td>` : ""}
        <td></td>
      </tr>
    `).join("") : `
      <tr><td colspan="5" style="text-align:center;padding:4mm;color:#888">Aucune ligne</td></tr>
    `}
  </tbody>
</table>

${commande && lignes.length > 0 ? `
<div style="margin-left:auto;width:60mm;margin-bottom:6mm">
  <div style="display:flex;justify-content:space-between;padding:2mm 0;font-size:10pt">
    <span>Total HT</span><span>${mgaFmt(Number(commande.totalHT))}</span>
  </div>
  ${commande.totalTVA > 0 ? `<div style="display:flex;justify-content:space-between;padding:2mm 0;font-size:10pt"><span>TVA</span><span>${mgaFmt(Number(commande.totalTVA))}</span></div>` : ""}
  <div style="display:flex;justify-content:space-between;padding:2.5mm 0;font-size:12pt;font-weight:700;border-top:2px solid #111;margin-top:1mm">
    <span style="color:#FF4D00">Total TTC</span><span>${mgaFmt(Number(commande.totalTTC))}</span>
  </div>
</div>
` : ""}

<!-- Signatures -->
<div class="signature-section">
  <h3>Signatures</h3>
  <div class="sig-row">
    <div class="sig-box">
      <div class="label">Émargement livreur</div>
      <div class="sig-line"></div>
      <div class="sig-name">${chauffeur ? chauffeur.name : "___________________________"}</div>
    </div>
    <div class="sig-box">
      <div class="label">Signature client</div>
      <div class="sig-line"></div>
      <div class="sig-name">${client ? client.raisonSociale : "___________________________"}</div>
    </div>
    <div class="sig-box">
      <div class="label">Date de réception</div>
      <div class="sig-line"></div>
      <div class="sig-name">___________________________</div>
    </div>
  </div>
</div>

${livraison.motifRefus ? `
<div style="margin-top:5mm;padding:3mm;background:#fef2f2;border:1px solid #fecaca;border-radius:3mm">
  <strong style="color:#dc2626">Motif de refus :</strong>
  <span style="color:#991b1b"> ${livraison.motifRefus}</span>
</div>
` : ""}

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
