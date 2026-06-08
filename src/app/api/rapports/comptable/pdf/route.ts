import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { computeCompteResultat } from "@/lib/comptable-data";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " Ar";
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "agent";
  if (!session?.user || !["admin", "gerant", "comptable"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const mois = req.nextUrl.searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);
  const r = await computeCompteResultat(mois);

  const [entreprise] = await db.select().from(schema.entreprise).limit(1);
  const nomEntreprise = entreprise?.nom ?? "GrossistePPN";
  const nif = entreprise?.nif ?? "—";
  const stat = entreprise?.stat ?? "—";

  const editeLe = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  await logAudit({
    action: "export",
    entite: "configuration",
    description: `Rapport comptable mensuel ${r.label}`,
    actor: { id: session.user.id, nom: session.user.name, role },
  });

  const resultatPositif = r.resultat >= 0;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Rapport comptable ${r.label}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; }
  .page { padding: 18mm 20mm; min-height: 100vh; }
  .cover { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 80vh; }
  .cover .logo { font-size: 30pt; font-weight: 900; color: #FF4D00; margin-bottom: 4mm; }
  .cover .logo span { color: #111; }
  .cover h1 { font-size: 22pt; margin: 8mm 0 2mm; }
  .cover .periode { font-size: 16pt; color: #FF4D00; font-weight: 700; }
  .cover .meta { margin-top: 12mm; font-size: 10pt; color: #666; line-height: 1.8; }
  h2 { font-size: 14pt; color: #FF4D00; border-bottom: 2px solid #FF4D00; padding-bottom: 2mm; margin-bottom: 5mm; margin-top: 4mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; }
  td, th { padding: 2.6mm 3mm; font-size: 10.5pt; }
  tbody tr { border-bottom: 1px solid #eee; }
  .label { color: #333; }
  .val { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .total td { border-top: 2px solid #111; font-weight: 800; font-size: 11.5pt; }
  .sub { color: #888; font-size: 9pt; }
  .resultat { margin-top: 6mm; padding: 6mm; border-radius: 4mm; text-align: center; }
  .resultat.pos { background: #ecfdf5; border: 1px solid #6ee7b7; }
  .resultat.neg { background: #fef2f2; border: 1px solid #fca5a5; }
  .resultat .montant { font-size: 22pt; font-weight: 900; }
  .resultat.pos .montant { color: #059669; }
  .resultat.neg .montant { color: #dc2626; }
  .footer { margin-top: 14mm; padding-top: 4mm; border-top: 1px solid #ddd; font-size: 8pt; color: #999; text-align: center; }
  .demo { display: inline-block; margin-top: 4mm; padding: 1mm 3mm; background: #fef3c7; color: #92400e; font-size: 8pt; border-radius: 2mm; }
  @media print { .page { padding: 14mm 16mm; } .pagebreak { page-break-before: always; } }
</style>
</head>
<body>
  <div class="page cover">
    <div class="logo">Grossiste<span>PPN</span></div>
    <h1>Rapport comptable mensuel</h1>
    <div class="periode">${r.label}</div>
    <div class="meta">
      <div><strong>${nomEntreprise}</strong></div>
      <div>NIF : ${nif} &nbsp;·&nbsp; STAT : ${stat}</div>
      <div>Édité le ${editeLe}</div>
      ${r.demo ? '<div class="demo">Données de démonstration</div>' : ""}
    </div>
  </div>

  <div class="page pagebreak">
    <h2>Compte de résultat — ${r.label}</h2>
    <table>
      <tbody>
        <tr><td class="label">Chiffre d'affaires HT <span class="sub">(707)</span></td><td class="val">${fmt(r.caHT)}</td></tr>
        <tr><td class="label">Achats de marchandises HT <span class="sub">(607)</span></td><td class="val">− ${fmt(r.achatsHT)}</td></tr>
        <tr class="total"><td>Marge brute</td><td class="val">${fmt(r.margeBrute)}</td></tr>
      </tbody>
    </table>

    <h2>Charges opérationnelles</h2>
    <table>
      <tbody>
        ${
          r.charges.length > 0
            ? r.charges
                .map((c) => `<tr><td class="label">${c.libelle}</td><td class="val">− ${fmt(c.montant)}</td></tr>`)
                .join("")
            : '<tr><td class="label sub">Aucune charge enregistrée ce mois</td><td class="val">—</td></tr>'
        }
        <tr class="total"><td>Total charges</td><td class="val">− ${fmt(r.totalCharges)}</td></tr>
      </tbody>
    </table>

    <div class="resultat ${resultatPositif ? "pos" : "neg"}">
      <div class="sub" style="color:inherit;opacity:.7">Résultat net de la période</div>
      <div class="montant">${resultatPositif ? "" : "− "}${fmt(Math.abs(r.resultat))}</div>
    </div>

    <h2 style="margin-top:10mm">Récapitulatif TVA</h2>
    <table>
      <tbody>
        <tr><td class="label">TVA collectée <span class="sub">(44571)</span></td><td class="val">${fmt(r.tvaCollectee)}</td></tr>
        <tr><td class="label">TVA déductible <span class="sub">(44566)</span></td><td class="val">− ${fmt(r.tvaDeductible)}</td></tr>
        <tr class="total"><td>TVA nette à ${r.tvaNette >= 0 ? "décaisser" : "récupérer"}</td><td class="val">${fmt(Math.abs(r.tvaNette))}</td></tr>
      </tbody>
    </table>

    <div class="footer">
      ${nomEntreprise} — Rapport généré automatiquement par GrossistePPN le ${editeLe}.<br/>
      Document indicatif — à valider par un expert-comptable avant déclaration.
    </div>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
