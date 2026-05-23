import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { e } from "@/lib/escape";

export const dynamic = "force-dynamic";

function mgaFmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " MGA";
}

const MOTIF_LABELS: Record<string, string> = {
  defectueux: "Produit défectueux",
  non_conforme: "Non conforme à la commande",
  erreur_livraison: "Erreur de livraison",
  date_peremption: "Date de péremption proche",
  geste_commercial: "Geste commercial",
  autre: "Autre motif",
};

const MODE_LABELS: Record<string, string> = {
  avoir_credit: "Avoir crédité (à valoir sur prochaines commandes)",
  remboursement_especes: "Remboursement en espèces",
  remboursement_virement: "Remboursement par virement",
  remboursement_mobile: "Remboursement Mobile Money",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [retour] = await db
    .select()
    .from(schema.retours)
    .where(eq(schema.retours.id, id))
    .limit(1);

  if (!retour) return NextResponse.json({ error: "Retour introuvable" }, { status: 404 });

  const lignes = await db
    .select()
    .from(schema.lignesRetour)
    .where(eq(schema.lignesRetour.retourId, id));

  let client = null;
  if (retour.clientId) {
    const [c] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, retour.clientId))
      .limit(1);
    client = c ?? null;
  }

  let facture = null;
  if (retour.factureId) {
    const [f] = await db
      .select()
      .from(schema.factures)
      .where(eq(schema.factures.id, retour.factureId))
      .limit(1);
    facture = f ?? null;
  }

  const [avoir] = await db
    .select()
    .from(schema.avoirs)
    .where(eq(schema.avoirs.retourId, id))
    .limit(1);

  const [entreprise] = await db.select().from(schema.entreprise).limit(1);

  const dateRetour = new Date(retour.createdAt ?? Date.now()).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const documentTitle = avoir ? "AVOIR" : "BON DE RETOUR";
  const documentNumero = avoir?.numero ?? retour.numero;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${documentTitle} ${documentNumero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10mm; }
  .logo { font-size: 22pt; font-weight: 900; color: #FF4D00; }
  .logo span { color: #111; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 18pt; font-weight: 700; color: #ef4444; }
  .doc-title .numero { font-size: 10pt; color: #666; margin-top: 2mm; }
  .doc-title .date { font-size: 9pt; color: #888; }
  .divider { border-top: 2px solid #ef4444; margin: 5mm 0; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 8mm; }
  .partie { width: 48%; }
  .partie h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 2mm; }
  .partie p { font-size: 10pt; color: #111; line-height: 1.5; }
  .partie .nom { font-weight: 700; font-size: 12pt; }
  .ref-facture { background: #fef2f2; border-left: 3px solid #ef4444; padding: 3mm 4mm; margin-bottom: 6mm; font-size: 10pt; }
  .ref-facture .label { color: #888; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 2.5mm 3mm; text-align: left; font-size: 9pt; font-weight: 600; }
  thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  tbody tr { border-bottom: 1px solid #eee; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  tbody td { padding: 2mm 3mm; font-size: 10pt; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; }
  .totaux { margin-left: auto; width: 65mm; margin-bottom: 6mm; }
  .totaux-ligne { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 10pt; }
  .totaux-ligne.total { border-top: 2px solid #111; font-weight: 700; font-size: 12pt; padding-top: 2.5mm; margin-top: 1mm; }
  .totaux-ligne.total .label { color: #ef4444; }
  .mode-remb { background: #f0fdf4; border-left: 3px solid #22c55e; padding: 3mm 4mm; margin-bottom: 4mm; font-size: 10pt; }
  .mode-remb .label { color: #888; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; }
  .motif { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 3mm 4mm; margin-bottom: 4mm; font-size: 10pt; }
  .motif .label { color: #888; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; }
  .mentions { border-top: 1px solid #ddd; margin-top: 8mm; padding-top: 4mm; font-size: 8pt; color: #888; }
  .signature-box { display: flex; gap: 10mm; margin-top: 12mm; }
  .signature { flex: 1; }
  .signature .label { font-size: 8pt; color: #888; margin-bottom: 10mm; }
  .signature .line { border-top: 1px solid #111; padding-top: 1.5mm; font-size: 9pt; }
  @media print {
    body { padding: 15mm; }
    @page { size: A4; margin: 15mm; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="logo">${e(entreprise?.nom ?? "Grossiste")}<span>PPN</span></div>
  <div class="doc-title">
    <h1>${e(documentTitle)}</h1>
    <div class="numero">${e(documentNumero)}</div>
    <div class="date">Émis le ${e(dateRetour)}</div>
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
  </div>
  <div class="partie" style="text-align:right">
    <h3>Client</h3>
    ${
      client
        ? `
      <p class="nom">${e(client.raisonSociale)}</p>
      ${client.adresse ? `<p>${e(client.adresse)}</p>` : ""}
      ${client.telephone ? `<p>Tél : ${e(client.telephone)}</p>` : ""}
      ${client.nif ? `<p>NIF : ${e(client.nif)}</p>` : ""}
    `
        : `<p class="nom">Client comptoir</p>`
    }
  </div>
</div>

${
  facture
    ? `<div class="ref-facture">
  <span class="label">Référence facture d'origine</span><br/>
  <strong>${e(facture.numero)}</strong> — ${mgaFmt(facture.totalTTC)} (${new Date(facture.createdAt ?? Date.now()).toLocaleDateString("fr-FR")})
</div>`
    : ""
}

<div class="motif">
  <span class="label">Motif du retour</span><br/>
  <strong>${e(MOTIF_LABELS[retour.motif] ?? retour.motif)}</strong>
  ${retour.motifDetail ? ` — ${e(retour.motifDetail)}` : ""}
</div>

<table>
  <thead>
    <tr>
      <th style="width:40%">Désignation</th>
      <th>Unité</th>
      <th>Qté</th>
      <th>PU HT</th>
      ${Number(retour.totalTVA) > 0 ? `<th>TVA</th>` : ""}
      <th>Total TTC</th>
    </tr>
  </thead>
  <tbody>
    ${lignes
      .map(
        (l) => `
      <tr>
        <td>${e(l.nomProduit ?? "—")}${l.motifLigne ? `<br/><small style="color:#888">${e(l.motifLigne)}</small>` : ""}</td>
        <td>${e(l.nomUnite ?? "")}</td>
        <td>${Number(l.quantite).toLocaleString("fr-FR")}</td>
        <td>${mgaFmt(Number(l.prixUnitaire))}</td>
        ${Number(retour.totalTVA) > 0 ? `<td>${Number(l.tauxTVA ?? 0)}%</td>` : ""}
        <td>${mgaFmt(Number(l.totalTTC))}</td>
      </tr>
    `
      )
      .join("")}
  </tbody>
</table>

<div class="totaux">
  <div class="totaux-ligne"><span>Sous-total HT</span><span>${mgaFmt(retour.totalHT)}</span></div>
  ${Number(retour.totalTVA) > 0 ? `<div class="totaux-ligne"><span>TVA</span><span>${mgaFmt(retour.totalTVA)}</span></div>` : ""}
  <div class="totaux-ligne total">
    <span class="label">Montant ${avoir ? "de l'avoir" : "du retour"}</span>
    <span>${mgaFmt(retour.totalTTC)}</span>
  </div>
</div>

<div class="mode-remb">
  <span class="label">Mode de remboursement</span><br/>
  <strong>${e(MODE_LABELS[retour.modeRemboursement] ?? retour.modeRemboursement)}</strong>
</div>

${
  retour.notes
    ? `<div style="margin-bottom:6mm; padding:3mm 4mm; background:#f9fafb; border-radius:2mm; font-size:9pt; color:#444"><strong>Notes :</strong> ${e(retour.notes)}</div>`
    : ""
}

<div class="signature-box">
  <div class="signature">
    <div class="label">Pour ${entreprise?.nom ?? "GrossistePPN"}</div>
    <div class="line">Date & signature</div>
  </div>
  <div class="signature">
    <div class="label">Pour le client</div>
    <div class="line">Date & signature</div>
  </div>
</div>

<div class="mentions">
  <p>${avoir ? `Cet avoir est valable 12 mois à compter de sa date d'émission et peut être utilisé sur toute commande ultérieure.` : `Ce document atteste de la prise en charge du retour des marchandises listées ci-dessus.`}</p>
  ${entreprise?.nif ? `<p>NIF : ${entreprise.nif}${entreprise?.stat ? ` · STAT : ${entreprise.stat}` : ""}</p>` : ""}
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
