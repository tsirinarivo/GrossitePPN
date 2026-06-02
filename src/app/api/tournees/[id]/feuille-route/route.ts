import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function mga(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " MGA";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [tournee] = await db.select().from(schema.tournees).where(eq(schema.tournees.id, id)).limit(1);
  if (!tournee) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const livraisons = await db
    .select({
      livraison: schema.livraisons,
      commandeNumero: schema.commandes.numero,
      totalTTC: schema.commandes.totalTTC,
      clientNom: schema.clients.raisonSociale,
      clientTel: schema.clients.telephone,
    })
    .from(schema.livraisons)
    .leftJoin(schema.commandes, eq(schema.commandes.id, schema.livraisons.commandeId))
    .leftJoin(schema.clients, eq(schema.clients.id, schema.commandes.clientId))
    .where(eq(schema.livraisons.tourneeId, id))
    .orderBy(asc(schema.livraisons.ordre));

  let chauffeur = null;
  if (tournee.chauffeurId) {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, tournee.chauffeurId)).limit(1);
    chauffeur = u ?? null;
  }

  let vehicule = null;
  if (tournee.vehiculeId) {
    const [v] = await db.select().from(schema.vehicules).where(eq(schema.vehicules.id, tournee.vehiculeId)).limit(1);
    vehicule = v ?? null;
  }

  const [entreprise] = await db.select().from(schema.entreprise).limit(1);

  const dateTournee = new Date(tournee.date).toLocaleDateString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const totalCA = livraisons.reduce((s, l) => s + (l.totalTTC ?? 0), 0);

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Feuille de route ${id.slice(0,8)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size:11pt; color:#111; padding:15mm; }
  .h { display:flex; justify-content:space-between; margin-bottom:8mm; padding-bottom:4mm; border-bottom:3px solid #FF4D00; }
  .h h1 { font-size:20pt; color:#FF4D00; font-weight:900; }
  .h .sub { font-size:9pt; color:#666; margin-top:1mm; }
  .info { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4mm; margin-bottom:8mm; }
  .info-box { background:#f9fafb; padding:3mm; border-radius:2mm; }
  .info-box .label { font-size:8pt; color:#888; text-transform:uppercase; letter-spacing:.5px; }
  .info-box .val { font-size:11pt; font-weight:700; margin-top:1mm; }
  table { width:100%; border-collapse:collapse; margin-bottom:6mm; }
  thead { background:#111; color:#fff; }
  thead th { padding:2.5mm; font-size:9pt; text-align:left; }
  tbody td { padding:3mm; font-size:10pt; border-bottom:1px solid #eee; vertical-align:top; }
  tbody tr:nth-child(even) { background:#f9f9f9; }
  .arret { width:14mm; text-align:center; font-weight:900; font-size:14pt; color:#FF4D00; }
  .check { width:18mm; text-align:center; }
  .check .box { display:inline-block; width:8mm; height:8mm; border:2px solid #999; border-radius:2mm; }
  .totaux { text-align:right; font-size:11pt; font-weight:700; padding:3mm; background:#fff7ed; border-radius:2mm; }
  .signature { margin-top:10mm; display:grid; grid-template-columns:1fr 1fr; gap:8mm; }
  .signature .case { border:1px solid #999; height:30mm; padding:2mm; }
  .signature .case .lbl { font-size:8pt; color:#666; }
  @media print { @page { size:A4; margin:10mm; } }
</style></head>
<body>
<div class="h">
  <div>
    <h1>FEUILLE DE ROUTE</h1>
    <div class="sub">${entreprise?.nom ?? "GrossistePPN"} · ${dateTournee}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18pt; font-weight:900;">${livraisons.length}</div>
    <div style="font-size:9pt; color:#666;">arrêt${livraisons.length > 1 ? "s" : ""}</div>
  </div>
</div>

<div class="info">
  <div class="info-box">
    <div class="label">Chauffeur</div>
    <div class="val">${chauffeur?.name ?? "Non assigné"}</div>
  </div>
  <div class="info-box">
    <div class="label">Véhicule</div>
    <div class="val">${vehicule?.immatriculation ?? "—"}${vehicule?.modele ? ` · ${vehicule.modele}` : ""}</div>
  </div>
  <div class="info-box">
    <div class="label">Statut</div>
    <div class="val">${tournee.statut}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th class="arret">#</th>
      <th>Client / Adresse</th>
      <th>N° commande</th>
      <th>Montant</th>
      <th class="check">Livré</th>
    </tr>
  </thead>
  <tbody>
    ${livraisons.map((l, i) => `
      <tr>
        <td class="arret">${i + 1}</td>
        <td>
          <div style="font-weight:700">${l.clientNom ?? "Client comptoir"}</div>
          <div style="font-size:9pt; color:#666;">${l.livraison.adresseLivraison ?? "—"}</div>
          ${l.clientTel ? `<div style="font-size:9pt; color:#888;">📞 ${l.clientTel}</div>` : ""}
        </td>
        <td style="font-family:monospace; font-size:9pt;">${l.commandeNumero ?? "—"}</td>
        <td style="font-weight:700;">${mga(Number(l.totalTTC ?? 0))}</td>
        <td class="check"><div class="box"></div></td>
      </tr>
    `).join("")}
  </tbody>
</table>

<div class="totaux">
  Total CA tournée : ${mga(totalCA)} · ${livraisons.length} livraison${livraisons.length > 1 ? "s" : ""}
</div>

${tournee.notes ? `<div style="margin-top:6mm; padding:3mm; background:#fef9c3; border-left:3px solid #f59e0b;"><strong>Notes :</strong> ${tournee.notes}</div>` : ""}

<div class="signature">
  <div class="case">
    <div class="lbl">Signature chauffeur</div>
  </div>
  <div class="case">
    <div class="lbl">Visa responsable</div>
  </div>
</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
