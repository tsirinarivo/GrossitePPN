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

const MOTIF_LABELS: Record<string, string> = {
  qualite: "Problème qualité",
  erreur_livraison: "Erreur de livraison",
  refus_client: "Refus client",
  produit_endommage: "Produit endommagé",
  autre: "Autre",
};

const MODE_LABELS: Record<string, string> = {
  credit_compte: "Crédit en compte",
  especes: "Espèces",
  virement: "Virement bancaire",
  mvola: "Mvola",
  orange_money: "Orange Money",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [avoir] = await db
    .select()
    .from(schema.avoirs)
    .where(eq(schema.avoirs.id, id))
    .limit(1);

  if (!avoir) return NextResponse.json({ error: "Avoir introuvable" }, { status: 404 });

  let retour = null;
  let lignes: typeof schema.lignesRetour.$inferSelect[] = [];
  if (avoir.retourId) {
    const [r] = await db.select().from(schema.retours).where(eq(schema.retours.id, avoir.retourId)).limit(1);
    retour = r ?? null;
    if (retour) {
      lignes = await db.select().from(schema.lignesRetour).where(eq(schema.lignesRetour.retourId, retour.id));
    }
  }

  let client = null;
  if (avoir.clientId) {
    const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, avoir.clientId)).limit(1);
    client = c ?? null;
  }

  let factureNumero: string | null = null;
  if (avoir.factureId) {
    const [f] = await db.select({ numero: schema.factures.numero }).from(schema.factures).where(eq(schema.factures.id, avoir.factureId)).limit(1);
    factureNumero = f?.numero ?? null;
  }

  const [entreprise] = await db.select().from(schema.entreprise).limit(1);

  const dateAvoir = new Date(avoir.createdAt ?? Date.now()).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Avoir ${avoir.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20mm 20mm; }
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
  .info-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 3mm 4mm; margin-bottom: 6mm; font-size: 10pt; }
  .info-box strong { color: #b91c1c; }
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
  .totaux { margin-left: auto; width: 70mm; margin-bottom: 6mm; }
  .totaux-ligne { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 10pt; }
  .totaux-ligne.total { border-top: 2px solid #111; font-weight: 700; font-size: 12pt; padding-top: 2.5mm; margin-top: 1mm; }
  .totaux-ligne.total .label { color: #ef4444; }
  .mentions { border-top: 1px solid #ddd; margin-top: 8mm; padding-top: 4mm; font-size: 8pt; color: #888; }
  .statut-badge { display: inline-block; padding: 1mm 3mm; border-radius: 3mm; font-size: 8pt; font-weight: 700; text-transform: uppercase; }
  .statut-emis { background: #fef9c3; color: #92400e; }
  .statut-rembourse { background: #dcfce7; color: #15803d; }
  .statut-applique { background: #dbeafe; color: #1e40af; }
  @media print {
    body { padding: 15mm; }
    @page { size: A4; margin: 15mm; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="logo">${(entreprise?.nom ?? "Grossiste") + "<span>PPN</span>"}</div>
  <div class="doc-title">
    <h1>AVOIR</h1>
    <div class="numero">${avoir.numero}</div>
    <div class="date">Émis le ${dateAvoir}</div>
    <div style="margin-top:2mm">
      <span class="statut-badge statut-${avoir.statut}">${avoir.statut}</span>
    </div>
  </div>
</div>
<div class="divider"></div>

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

<div class="info-box">
  <strong>Référence retour :</strong> ${retour?.numero ?? "—"}
  ${factureNumero ? ` · <strong>Facture d'origine :</strong> ${factureNumero}` : ""}
  ${retour?.motif ? ` · <strong>Motif :</strong> ${MOTIF_LABELS[retour.motif] ?? retour.motif}` : ""}
  <br/>
  <strong>Mode de remboursement :</strong> ${MODE_LABELS[avoir.modeRemboursement] ?? avoir.modeRemboursement}
</div>

${lignes.length > 0 ? `
<table>
  <thead>
    <tr>
      <th style="width:50%">Désignation produit retourné</th>
      <th>Qté</th>
      <th>PU HT</th>
      <th>Total TTC</th>
    </tr>
  </thead>
  <tbody>
    ${lignes.map((l) => `
      <tr>
        <td>${l.nomProduit}${l.motifLigne ? `<br/><span style="font-size:8pt;color:#888">${l.motifLigne}</span>` : ""}</td>
        <td>${Number(l.quantite).toLocaleString("fr-FR")}</td>
        <td>${mgaFmt(Number(l.prixUnitaire))}</td>
        <td>${mgaFmt(Number(l.totalTTC))}</td>
      </tr>
    `).join("")}
  </tbody>
</table>
` : ""}

<div class="totaux">
  ${retour && retour.totalTVA > 0 ? `
    <div class="totaux-ligne"><span>Sous-total HT</span><span>${mgaFmt(retour.totalHT)}</span></div>
    <div class="totaux-ligne"><span>TVA</span><span>${mgaFmt(retour.totalTVA)}</span></div>
  ` : ""}
  <div class="totaux-ligne total">
    <span class="label">Montant de l'avoir</span>
    <span>${mgaFmt(avoir.montant)}</span>
  </div>
</div>

<div class="mentions">
  <p>Cet avoir annule partiellement ou totalement la facture d'origine référencée ci-dessus.</p>
  <p style="margin-top:2mm">${avoir.modeRemboursement === "credit_compte"
    ? "Le montant a été crédité sur le compte client et pourra être déduit d'une prochaine facture."
    : "Le remboursement sera effectué selon le mode indiqué dans un délai de 7 jours ouvrés."}</p>
  ${entreprise?.nif ? `<p style="margin-top:2mm">NIF : ${entreprise.nif}${entreprise?.stat ? ` · STAT : ${entreprise.stat}` : ""}${entreprise?.rcs ? ` · RCS : ${entreprise.rcs}` : ""}</p>` : ""}
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
