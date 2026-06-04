import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, inArray, asc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { e } from "@/lib/escape";

export const dynamic = "force-dynamic";

/**
 * Génère un bordereau de chargement consolidé pour une tournée.
 * Liste TOUS les produits de toutes les commandes/livraisons de la tournée,
 * regroupés par produit avec quantité totale à charger.
 *
 * Utilisation : le magasinier imprime ce bordereau le matin et coche au fur et à
 * mesure du chargement du camion.
 */
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

  // Chauffeur + véhicule
  let chauffeur = null;
  let vehicule = null;
  if (tournee.chauffeurId) {
    const [c] = await db.select().from(schema.users).where(eq(schema.users.id, tournee.chauffeurId)).limit(1);
    chauffeur = c ?? null;
  }
  if (tournee.vehiculeId) {
    const [v] = await db.select().from(schema.vehicules).where(eq(schema.vehicules.id, tournee.vehiculeId)).limit(1);
    vehicule = v ?? null;
  }

  // Toutes les livraisons de la tournée
  const livraisons = await db
    .select({
      id: schema.livraisons.id,
      ordre: schema.livraisons.ordre,
      commandeId: schema.livraisons.commandeId,
      commandeNumero: schema.commandes.numero,
      clientNom: schema.clients.raisonSociale,
    })
    .from(schema.livraisons)
    .leftJoin(schema.commandes, eq(schema.livraisons.commandeId, schema.commandes.id))
    .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
    .where(eq(schema.livraisons.tourneeId, id))
    .orderBy(asc(schema.livraisons.ordre));

  if (livraisons.length === 0) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2cm;text-align:center;color:#888">
       Aucune livraison affectée à cette tournée.</body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const commandeIds = livraisons.map((l) => l.commandeId);

  // Toutes les lignes de toutes les commandes de la tournée
  const lignes = await db
    .select({
      produitId: schema.lignesCommande.produitId,
      nomProduit: schema.lignesCommande.nomProduit,
      nomUnite: schema.lignesCommande.nomUnite,
      quantite: schema.lignesCommande.quantite,
      quantiteBase: schema.lignesCommande.quantiteBase,
      commandeNumero: schema.commandes.numero,
      clientNom: schema.clients.raisonSociale,
    })
    .from(schema.lignesCommande)
    .innerJoin(schema.commandes, eq(schema.commandes.id, schema.lignesCommande.commandeId))
    .leftJoin(schema.clients, eq(schema.commandes.clientId, schema.clients.id))
    .where(inArray(schema.lignesCommande.commandeId, commandeIds));

  // Agrégation par produit
  type ProduitConsolide = {
    produitId: string;
    nomProduit: string;
    nomUnite: string;
    quantiteTotaleBase: number;
    detailsClients: Array<{ client: string; commande: string; qte: number }>;
  };
  const consolide = new Map<string, ProduitConsolide>();
  for (const l of lignes) {
    const cur = consolide.get(l.produitId) ?? {
      produitId: l.produitId,
      nomProduit: l.nomProduit,
      nomUnite: l.nomUnite,
      quantiteTotaleBase: 0,
      detailsClients: [],
    };
    cur.quantiteTotaleBase += Number(l.quantiteBase) || 0;
    cur.detailsClients.push({
      client: l.clientNom ?? "Comptoir",
      commande: l.commandeNumero ?? "—",
      qte: Number(l.quantite) || 0,
    });
    consolide.set(l.produitId, cur);
  }

  const produitsConsolides = Array.from(consolide.values()).sort((a, b) =>
    a.nomProduit.localeCompare(b.nomProduit)
  );

  const [entreprise] = await db.select().from(schema.entreprise).limit(1);

  const dateTournee = new Date(tournee.date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const totalArticles = produitsConsolides.length;
  const totalQuantiteBase = produitsConsolides.reduce((s, p) => s + p.quantiteTotaleBase, 0);
  const totalLivraisons = livraisons.length;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Bordereau de chargement — ${e(dateTournee)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 15mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6mm; }
  .logo { font-size: 18pt; font-weight: 900; color: #FF4D00; }
  .logo span { color: #111; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 18pt; font-weight: 700; color: #22c55e; }
  .doc-title .sub { font-size: 10pt; color: #666; margin-top: 1mm; font-weight: 600; }
  .divider { border-top: 2px solid #22c55e; margin: 4mm 0; }
  .infos { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; margin-bottom: 5mm; }
  .info-bloc { background: #f0fdf4; border-left: 3px solid #22c55e; padding: 2mm 3mm; }
  .info-bloc .label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .info-bloc .valeur { font-size: 10pt; font-weight: 600; margin-top: 0.5mm; }
  .totaux { background: #fef3c7; border: 1px solid #f59e0b; padding: 3mm 4mm; margin-bottom: 5mm; display: flex; gap: 6mm; }
  .totaux-item .label { font-size: 8pt; color: #888; }
  .totaux-item .valeur { font-size: 14pt; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 2.5mm 3mm; text-align: left; font-size: 9pt; font-weight: 600; }
  thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  thead th:last-child { text-align: center; width: 12mm; }
  tbody tr { border-bottom: 1px solid #eee; page-break-inside: avoid; }
  tbody td { padding: 3mm; font-size: 10pt; vertical-align: top; }
  tbody td.right { text-align: right; }
  tbody td.center { text-align: center; }
  .qte-badge { display: inline-block; padding: 1mm 3mm; border-radius: 2mm; background: #FF4D00; color: white; font-weight: 700; font-size: 11pt; min-width: 12mm; text-align: center; }
  .clients-detail { font-size: 8pt; color: #666; margin-top: 1mm; font-style: italic; line-height: 1.4; }
  .checkbox { display: inline-block; width: 5mm; height: 5mm; border: 1.5px solid #111; border-radius: 1mm; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 8mm; padding-top: 4mm; border-top: 1px dashed #ccc; }
  .signature .label { font-size: 8pt; color: #888; margin-bottom: 10mm; }
  .signature .line { border-top: 1px solid #111; padding-top: 1.5mm; font-size: 9pt; }
  @media print { body { padding: 12mm; } @page { size: A4; margin: 10mm; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">${e(entreprise?.nom ?? "Grossiste")}<span>PPN</span></div>
  <div class="doc-title">
    <h1>📦 BORDEREAU DE CHARGEMENT</h1>
    <div class="sub">${e(dateTournee)}</div>
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
    <div class="label">Capacité véhicule</div>
    <div class="valeur">${vehicule?.capaciteKg ? `${vehicule.capaciteKg} kg` : "— Non précisée —"}</div>
  </div>
</div>

<div class="totaux">
  <div class="totaux-item">
    <div class="label">Articles distincts</div>
    <div class="valeur">${totalArticles}</div>
  </div>
  <div class="totaux-item">
    <div class="label">Quantité totale (unité base)</div>
    <div class="valeur">${totalQuantiteBase.toLocaleString("fr-FR")}</div>
  </div>
  <div class="totaux-item">
    <div class="label">Points de livraison</div>
    <div class="valeur">${totalLivraisons}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:6mm">#</th>
      <th>Produit à charger</th>
      <th>Unité</th>
      <th>Qté totale</th>
      <th>✓</th>
    </tr>
  </thead>
  <tbody>
    ${produitsConsolides
      .map(
        (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div style="font-weight:600">${e(p.nomProduit)}</div>
          <div class="clients-detail">
            ${p.detailsClients
              .map(
                (d) =>
                  `${e(d.client)} (${e(d.commande)}): ${Number(d.qte).toLocaleString("fr-FR")} ${e(p.nomUnite)}`
              )
              .join(" · ")}
          </div>
        </td>
        <td>${e(p.nomUnite)}</td>
        <td class="right"><span class="qte-badge">${p.quantiteTotaleBase.toLocaleString("fr-FR")}</span></td>
        <td class="center"><span class="checkbox"></span></td>
      </tr>
    `
      )
      .join("")}
  </tbody>
</table>

<div class="signatures">
  <div class="signature">
    <div class="label">Magasinier (chargement)</div>
    <div class="line">Nom · Date · Signature</div>
  </div>
  <div class="signature">
    <div class="label">Chauffeur (réception)</div>
    <div class="line">Nom · Date · Signature</div>
  </div>
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
