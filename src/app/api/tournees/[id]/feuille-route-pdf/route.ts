import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getEntrepriseFor } from "@/lib/entreprise";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { e } from "@/lib/escape";

export const dynamic = "force-dynamic";

function mgaFmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " MGA";
}

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  preparee: "Préparée",
  chargee: "Chargée",
  en_route: "En route",
  livree: "Livrée",
  refusee: "Refusée",
  echec: "Échec",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [tournee] = await db
    .select()
    .from(schema.tournees)
    .where(eq(schema.tournees.id, id))
    .limit(1);

  if (!tournee) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });

  let chauffeur = null;
  if (tournee.chauffeurId) {
    const [c] = await db.select().from(schema.users).where(eq(schema.users.id, tournee.chauffeurId)).limit(1);
    chauffeur = c ?? null;
  }

  let vehicule = null;
  if (tournee.vehiculeId) {
    const [v] = await db.select().from(schema.vehicules).where(eq(schema.vehicules.id, tournee.vehiculeId)).limit(1);
    vehicule = v ?? null;
  }

  const livraisons = await db
    .select({
      id: schema.livraisons.id,
      ordre: schema.livraisons.ordre,
      adresseLivraison: schema.livraisons.adresseLivraison,
      statut: schema.livraisons.statut,
      commandeNumero: schema.commandes.numero,
      commandeTotalTTC: schema.commandes.totalTTC,
      clientNom: schema.clients.raisonSociale,
      clientTelephone: schema.clients.telephone,
      clientAdresse: schema.clients.adresse,
    })
    .from(schema.livraisons)
    .leftJoin(schema.commandes, eq(schema.livraisons.commandeId, schema.commandes.id))
    .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
    .where(eq(schema.livraisons.tourneeId, id))
    .orderBy(asc(schema.livraisons.ordre));

  const entreprise = await getEntrepriseFor(tournee.tenantId);

  const dateTournee = new Date(tournee.date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const totalTTC = livraisons.reduce((s, l) => s + (l.commandeTotalTTC ?? 0), 0);
  const numeroTournee = `T-${new Date(tournee.date).getFullYear()}${String(
    new Date(tournee.date).getMonth() + 1
  ).padStart(2, "0")}${String(new Date(tournee.date).getDate()).padStart(2, "0")}-${id.slice(0, 4).toUpperCase()}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Feuille de route ${numeroTournee}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 15mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; }
  .logo { font-size: 18pt; font-weight: 900; color: #FF4D00; }
  .logo span { color: #111; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 16pt; font-weight: 700; color: #3b82f6; }
  .doc-title .date { font-size: 10pt; color: #666; margin-top: 1mm; font-weight: 600; }
  .divider { border-top: 2px solid #3b82f6; margin: 4mm 0; }
  .infos { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; margin-bottom: 6mm; }
  .info-bloc { background: #f9fafb; border-left: 3px solid #3b82f6; padding: 3mm 4mm; }
  .info-bloc .label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .info-bloc .valeur { font-size: 11pt; font-weight: 600; margin-top: 1mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 2.5mm 3mm; text-align: left; font-size: 9pt; font-weight: 600; }
  thead th:last-child, thead th:nth-child(5) { text-align: right; }
  tbody tr { border-bottom: 1px solid #eee; page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  tbody td { padding: 2.5mm 3mm; font-size: 10pt; vertical-align: top; }
  .ordre-badge { display: inline-flex; align-items: center; justify-content: center; width: 7mm; height: 7mm; border-radius: 50%; background: #3b82f6; color: white; font-weight: 700; font-size: 10pt; }
  .checkbox { display: inline-block; width: 4mm; height: 4mm; border: 1.5px solid #111; border-radius: 1mm; vertical-align: middle; }
  .totaux { margin-left: auto; width: 70mm; padding: 3mm 4mm; background: #f9fafb; }
  .totaux-ligne { display: flex; justify-content: space-between; padding: 1mm 0; font-size: 10pt; }
  .totaux-ligne.total { border-top: 1px solid #111; font-weight: 700; padding-top: 1.5mm; margin-top: 1mm; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 10mm; }
  .signature .label { font-size: 8pt; color: #888; margin-bottom: 12mm; }
  .signature .line { border-top: 1px solid #111; padding-top: 1.5mm; font-size: 9pt; }
  .notes-bloc { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 3mm 4mm; margin-bottom: 4mm; font-size: 10pt; }
  .notes-bloc .label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .empty { text-align: center; padding: 12mm; color: #888; font-size: 10pt; }
  @media print {
    body { padding: 12mm; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="logo">${e(entreprise?.nom ?? "Grossiste")}<span>PPN</span></div>
  <div class="doc-title">
    <h1>FEUILLE DE ROUTE</h1>
    <div class="date">${e(dateTournee)}</div>
    <div style="font-size:9pt; color:#888; font-family:monospace">${e(numeroTournee)}</div>
  </div>
</div>
<div class="divider"></div>

<div class="infos">
  <div class="info-bloc">
    <div class="label">Chauffeur</div>
    <div class="valeur">${e(chauffeur?.name ?? "— Non assigné —")}</div>
  </div>
  <div class="info-bloc">
    <div class="label">Véhicule</div>
    <div class="valeur">${
      vehicule
        ? `${e(vehicule.modele ?? "")}${vehicule.modele ? " — " : ""}${e(vehicule.immatriculation)}`
        : "— Non assigné —"
    }</div>
  </div>
  <div class="info-bloc">
    <div class="label">Statut</div>
    <div class="valeur">${tournee.statut === "planifiee" ? "Planifiée" : tournee.statut === "en_cours" ? "En cours" : "Terminée"}</div>
  </div>
</div>

${
  tournee.notes
    ? `<div class="notes-bloc">
  <div class="label">Notes</div>
  <p>${e(tournee.notes)}</p>
</div>`
    : ""
}

${
  livraisons.length === 0
    ? `<div class="empty">Aucune livraison affectée à cette tournée.</div>`
    : `<table>
  <thead>
    <tr>
      <th style="width:8mm">#</th>
      <th>Client / N° commande</th>
      <th>Adresse de livraison</th>
      <th>Tél</th>
      <th>Montant</th>
      <th style="width:12mm; text-align:center">✓</th>
    </tr>
  </thead>
  <tbody>
    ${livraisons
      .map(
        (l, i) => `
      <tr>
        <td><span class="ordre-badge">${l.ordre || i + 1}</span></td>
        <td>
          <div style="font-weight:600">${e(l.clientNom ?? "Client comptoir")}</div>
          <div style="font-size:9pt; color:#666; font-family:monospace">${e(l.commandeNumero ?? "—")}</div>
        </td>
        <td style="font-size:9pt">${e(l.adresseLivraison ?? l.clientAdresse ?? "—")}</td>
        <td style="font-size:9pt; font-family:monospace">${e(l.clientTelephone ?? "—")}</td>
        <td style="text-align:right; font-weight:600">${mgaFmt(l.commandeTotalTTC ?? 0)}</td>
        <td style="text-align:center"><span class="checkbox"></span></td>
      </tr>
    `
      )
      .join("")}
  </tbody>
</table>

<div class="totaux">
  <div class="totaux-ligne"><span>Nombre de points</span><span>${livraisons.length}</span></div>
  <div class="totaux-ligne total"><span>Valeur totale</span><span>${mgaFmt(totalTTC)}</span></div>
</div>
`
}

<div class="signatures">
  <div class="signature">
    <div class="label">Départ — Magasinier</div>
    <div class="line">Date & signature</div>
  </div>
  <div class="signature">
    <div class="label">Retour — Chauffeur</div>
    <div class="line">Date & signature</div>
  </div>
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
