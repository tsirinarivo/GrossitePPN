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

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon", envoye: "Envoyé", confirme: "Confirmé",
  partiellement_recu: "Partiellement reçu", recu: "Reçu", annule: "Annulé",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [bc] = await db
    .select({
      id: schema.bonsCommande.id,
      numero: schema.bonsCommande.numero,
      statut: schema.bonsCommande.statut,
      totalHT: schema.bonsCommande.totalHT,
      totalTVA: schema.bonsCommande.totalTVA,
      totalTTC: schema.bonsCommande.totalTTC,
      dateCommande: schema.bonsCommande.dateCommande,
      dateLivraisonPrevue: schema.bonsCommande.dateLivraisonPrevue,
      notes: schema.bonsCommande.notes,
      conditions: schema.bonsCommande.conditions,
      referenceFournisseur: schema.bonsCommande.referenceFournisseur,
      fournisseurNom: schema.fournisseurs.nom,
      fournisseurContact: schema.fournisseurs.contact,
      fournisseurTelephone: schema.fournisseurs.telephone,
      fournisseurEmail: schema.fournisseurs.email,
      fournisseurAdresse: schema.fournisseurs.adresse,
      fournisseurVille: schema.fournisseurs.ville,
      fournisseurNif: schema.fournisseurs.nif,
    })
    .from(schema.bonsCommande)
    .innerJoin(schema.fournisseurs, eq(schema.fournisseurs.id, schema.bonsCommande.fournisseurId))
    .where(eq(schema.bonsCommande.id, id))
    .limit(1);

  if (!bc) return NextResponse.json({ error: "BC introuvable" }, { status: 404 });

  const lignes = await db
    .select()
    .from(schema.lignesBonCommande)
    .where(eq(schema.lignesBonCommande.bonCommandeId, id));

  const [entreprise] = await db.select().from(schema.entreprise).limit(1);

  const dateBC = bc.dateCommande
    ? new Date(bc.dateCommande).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>BC ${bc.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20mm 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; }
  .logo { font-size: 20pt; font-weight: 900; color: #FF4D00; }
  .bc-title { text-align: right; }
  .bc-title h1 { font-size: 16pt; font-weight: 700; color: #111; }
  .bc-title .numero { font-size: 14pt; font-weight: 900; color: #FF4D00; margin-top: 1mm; }
  .bc-title .date { font-size: 9pt; color: #888; }
  .divider { border-top: 2px solid #111; margin: 4mm 0; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 7mm; gap: 10mm; }
  .partie { flex: 1; }
  .partie h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 2mm; }
  .partie p { font-size: 10pt; color: #111; line-height: 1.5; }
  .partie .nom { font-weight: 700; font-size: 12pt; }
  .meta { display: flex; gap: 8mm; margin-bottom: 6mm; padding: 3mm; background: #f5f5f5; border-radius: 2mm; }
  .meta-item { display: flex; flex-direction: column; gap: 0.5mm; }
  .meta-item label { font-size: 8pt; color: #888; text-transform: uppercase; }
  .meta-item span { font-size: 10pt; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 2.5mm 3mm; text-align: left; font-size: 9pt; font-weight: 600; }
  thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  tbody tr { border-bottom: 1px solid #eee; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  tbody td { padding: 2mm 3mm; font-size: 10pt; }
  tbody td:last-child, tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; }
  .totaux { margin-left: auto; width: 65mm; }
  .tot-ligne { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 10pt; border-bottom: 1px solid #eee; }
  .tot-ligne.total { border-bottom: none; font-weight: 700; font-size: 12pt; padding-top: 2.5mm; margin-top: 1mm; border-top: 2px solid #111; }
  .notes { margin-top: 8mm; padding: 3mm; background: #fffbeb; border: 1px solid #fde68a; border-radius: 2mm; font-size: 9pt; }
  .statut { display: inline-block; padding: 1mm 3mm; border-radius: 3mm; font-size: 9pt; font-weight: 700; background: #dbeafe; color: #1d4ed8; }
  .footer { margin-top: 10mm; border-top: 1px solid #ddd; padding-top: 4mm; font-size: 8pt; color: #888; }
  @media print { body { padding: 15mm; } @page { size: A4; margin: 15mm; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">${entreprise?.nom ?? "GrossistePPN"}</div>
  <div class="bc-title">
    <h1>BON DE COMMANDE</h1>
    <div class="numero">${bc.numero}</div>
    <div class="date">Émis le ${dateBC}</div>
    <div style="margin-top:2mm"><span class="statut">${STATUT_LABELS[bc.statut] ?? bc.statut}</span></div>
  </div>
</div>
<div class="divider"></div>

<div class="parties">
  <div class="partie">
    <h3>Acheteur</h3>
    <p class="nom">${entreprise?.nom ?? "GrossistePPN"}</p>
    ${entreprise?.adresse ? `<p>${entreprise.adresse}</p>` : ""}
    ${entreprise?.telephone ? `<p>Tél : ${entreprise.telephone}</p>` : ""}
    ${entreprise?.nif ? `<p>NIF : ${entreprise.nif}</p>` : ""}
  </div>
  <div class="partie" style="text-align:right">
    <h3>Fournisseur</h3>
    <p class="nom">${bc.fournisseurNom}</p>
    ${bc.fournisseurAdresse ? `<p>${bc.fournisseurAdresse}${bc.fournisseurVille ? `, ${bc.fournisseurVille}` : ""}</p>` : ""}
    ${bc.fournisseurTelephone ? `<p>Tél : ${bc.fournisseurTelephone}</p>` : ""}
    ${bc.fournisseurEmail ? `<p>${bc.fournisseurEmail}</p>` : ""}
    ${bc.fournisseurNif ? `<p>NIF : ${bc.fournisseurNif}</p>` : ""}
    ${bc.referenceFournisseur ? `<p style="color:#3b82f6; font-size:9pt">Réf. four. : ${bc.referenceFournisseur}</p>` : ""}
  </div>
</div>

<div class="meta">
  <div class="meta-item"><label>Date commande</label><span>${dateBC}</span></div>
  ${bc.dateLivraisonPrevue ? `<div class="meta-item"><label>Livraison prévue</label><span>${new Date(bc.dateLivraisonPrevue).toLocaleDateString("fr-FR")}</span></div>` : ""}
  <div class="meta-item"><label>Statut</label><span>${STATUT_LABELS[bc.statut] ?? bc.statut}</span></div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:40%">Désignation</th>
      <th>Unité</th>
      <th>Qté commandée</th>
      <th>PU HT</th>
      <th>Total HT</th>
    </tr>
  </thead>
  <tbody>
    ${lignes.map((l) => `
      <tr>
        <td>${l.nomProduit}</td>
        <td>${l.nomUnite}</td>
        <td>${Number(l.quantiteCommandee).toLocaleString("fr-FR")}</td>
        <td>${mgaFmt(Number(l.prixUnitaireHT))}</td>
        <td>${mgaFmt(Number(l.totalHT))}</td>
      </tr>
    `).join("")}
  </tbody>
</table>

<div class="totaux">
  <div class="tot-ligne"><span>Sous-total HT</span><span>${mgaFmt(bc.totalHT)}</span></div>
  ${bc.totalTVA > 0 ? `<div class="tot-ligne"><span>TVA</span><span>${mgaFmt(bc.totalTVA)}</span></div>` : ""}
  <div class="tot-ligne total"><span>Total TTC</span><span>${mgaFmt(bc.totalTTC)}</span></div>
</div>

${bc.notes || bc.conditions ? `
<div class="notes">
  ${bc.notes ? `<p><strong>Notes :</strong> ${bc.notes}</p>` : ""}
  ${bc.conditions ? `<p style="margin-top:1mm"><strong>Conditions :</strong> ${bc.conditions}</p>` : ""}
</div>` : ""}

<div class="footer">
  <p>Bon de commande émis par ${entreprise?.nom ?? "GrossistePPN"}${entreprise?.nif ? ` · NIF : ${entreprise.nif}` : ""}.</p>
  <p>Prière de rappeler le numéro de bon de commande sur toute correspondance et livraison.</p>
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
