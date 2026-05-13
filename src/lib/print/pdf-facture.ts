/**
 * Génération facture A4 en PDF avec pdf-lib
 * Retourne un Uint8Array (bytes du PDF) que le caller peut déclencher en download
 *
 * Usage :
 *   const bytes = await genererFacturePDF(data);
 *   const blob = new Blob([bytes], { type: "application/pdf" });
 *   const url = URL.createObjectURL(blob);
 *   window.open(url, "_blank");
 */

import { PDFDocument, rgb, StandardFonts, type RGB } from "pdf-lib";

export interface FacturePDFData {
  // Entreprise
  nomEntreprise: string;
  adresseEntreprise: string;
  nif?: string;
  stat?: string;
  rcs?: string;
  // Facture
  numero: string;
  date: string;
  dateEcheance?: string;
  // Client
  client: string;
  adresseClient?: string;
  // Lignes
  lignes: {
    description: string;
    unite: string;
    quantite: number;
    prixUnitaire: number;
    totalHT: number;
    tauxTVA: number;
    totalTVA: number;
    totalTTC: number;
  }[];
  // Totaux
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  totalRegle: number;
  soldeRestant: number;
  // Config
  assujettieTV: boolean;
  modePaiement: string;
  notes?: string;
  conditionsReglement?: string;
}

const COLORS = {
  primary: rgb(0.4, 0.22, 0.07),   // ocre brun
  dark: rgb(0.07, 0.07, 0.12),
  muted: rgb(0.45, 0.45, 0.5),
  border: rgb(0.88, 0.86, 0.82),
  bg: rgb(0.97, 0.95, 0.91),
  white: rgb(1, 1, 1),
} satisfies Record<string, RGB>;

const A4 = { width: 595, height: 842 };
const MARGIN = 50;
const COL_WIDTHS = [240, 50, 70, 70, 65] as const; // desc, qte, pu, ht, ttc

function drawHLine(page: ReturnType<PDFDocument["addPage"]>, y: number, color = COLORS.border) {
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4.width - MARGIN, y }, thickness: 0.5, color });
}

function fmt(n: number): string {
  return `${n.toLocaleString("fr-FR")} Ar`;
}

export async function genererFacturePDF(data: FacturePDFData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.width, A4.height]);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = A4.height - MARGIN;

  // ── En-tête entreprise ────────────────────────────────────────────────────
  page.drawRectangle({ x: MARGIN, y: y - 70, width: A4.width - MARGIN * 2, height: 75, color: COLORS.bg, borderWidth: 0 });

  page.drawText(data.nomEntreprise, { x: MARGIN + 10, y: y - 20, size: 14, font: fontBold, color: COLORS.primary });
  page.drawText(data.adresseEntreprise, { x: MARGIN + 10, y: y - 35, size: 8, font: fontRegular, color: COLORS.muted });
  if (data.nif) page.drawText(`NIF : ${data.nif}`, { x: MARGIN + 10, y: y - 47, size: 8, font: fontRegular, color: COLORS.muted });
  if (data.stat) page.drawText(`STAT : ${data.stat}`, { x: MARGIN + 10, y: y - 57, size: 8, font: fontRegular, color: COLORS.muted });

  // Bloc FACTURE à droite
  const rightX = A4.width - MARGIN - 160;
  page.drawText("FACTURE", { x: rightX, y: y - 15, size: 20, font: fontBold, color: COLORS.primary });
  page.drawText(`N° ${data.numero}`, { x: rightX, y: y - 32, size: 9, font: fontBold, color: COLORS.dark });
  page.drawText(`Date : ${data.date}`, { x: rightX, y: y - 44, size: 8, font: fontRegular, color: COLORS.muted });
  if (data.dateEcheance) page.drawText(`Échéance : ${data.dateEcheance}`, { x: rightX, y: y - 55, size: 8, font: fontRegular, color: COLORS.muted });

  y -= 90;

  // ── Bloc client ────────────────────────────────────────────────────────────
  page.drawText("Facturé à :", { x: MARGIN, y, size: 9, font: fontBold, color: COLORS.muted });
  y -= 14;
  page.drawText(data.client, { x: MARGIN, y, size: 11, font: fontBold, color: COLORS.dark });
  if (data.adresseClient) {
    y -= 12;
    page.drawText(data.adresseClient, { x: MARGIN, y, size: 8, font: fontRegular, color: COLORS.muted });
  }
  y -= 20;
  drawHLine(page, y);
  y -= 16;

  // ── En-tête tableau ───────────────────────────────────────────────────────
  page.drawRectangle({ x: MARGIN, y: y - 4, width: A4.width - MARGIN * 2, height: 18, color: COLORS.primary });
  const headers = ["Description", "Qté", "Prix HT", "Total HT", "Total TTC"];
  let colX = MARGIN + 4;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i]!, { x: colX, y: y + 2, size: 8, font: fontBold, color: COLORS.white });
    colX += COL_WIDTHS[i]!;
  }
  y -= 20;

  // ── Lignes ────────────────────────────────────────────────────────────────
  for (const [idx, ligne] of data.lignes.entries()) {
    if (idx % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - 4, width: A4.width - MARGIN * 2, height: 18, color: COLORS.bg });
    const cells = [
      `${ligne.description} (${ligne.unite})`,
      ligne.quantite.toString(),
      fmt(ligne.prixUnitaire),
      fmt(ligne.totalHT),
      fmt(ligne.totalTTC),
    ];
    colX = MARGIN + 4;
    for (let i = 0; i < cells.length; i++) {
      page.drawText(cells[i]!, { x: colX, y: y + 2, size: 8, font: fontRegular, color: COLORS.dark, maxWidth: COL_WIDTHS[i]! - 6 });
      colX += COL_WIDTHS[i]!;
    }
    y -= 18;
  }

  y -= 6;
  drawHLine(page, y);
  y -= 16;

  // ── Totaux ────────────────────────────────────────────────────────────────
  const totalsX = A4.width - MARGIN - 180;
  const totalsLabelX = totalsX;
  const totalsValueX = A4.width - MARGIN - 4;

  const drawTotal = (label: string, value: string, bold = false) => {
    const font = bold ? fontBold : fontRegular;
    const color = bold ? COLORS.dark : COLORS.muted;
    page.drawText(label, { x: totalsLabelX, y, size: 9, font, color });
    page.drawText(value, { x: totalsValueX - fontRegular.widthOfTextAtSize(value, 9), y, size: 9, font, color });
    y -= 14;
  };

  drawTotal("Total HT", fmt(data.totalHT));
  if (data.assujettieTV) drawTotal("TVA", fmt(data.totalTVA));
  y -= 2;
  drawHLine(page, y + 1);
  y -= 4;
  drawTotal("TOTAL TTC", fmt(data.totalTTC), true);
  drawTotal("Réglé", fmt(data.totalRegle));
  if (data.soldeRestant > 0) drawTotal("Solde restant", fmt(data.soldeRestant), true);

  y -= 10;

  // ── Mode paiement ─────────────────────────────────────────────────────────
  page.drawText(`Mode de paiement : ${data.modePaiement}`, { x: MARGIN, y, size: 9, font: fontRegular, color: COLORS.muted });
  y -= 20;

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    page.drawText("Notes :", { x: MARGIN, y, size: 9, font: fontBold, color: COLORS.dark });
    y -= 12;
    page.drawText(data.notes, { x: MARGIN, y, size: 8, font: fontRegular, color: COLORS.muted, maxWidth: A4.width - MARGIN * 2 });
    y -= 14;
  }

  // ── Pied de page ─────────────────────────────────────────────────────────
  drawHLine(page, 60);
  page.drawText("Misaotra - Merci pour votre confiance ! — GrossistePPN Madagascar", {
    x: MARGIN, y: 48, size: 7, font: fontRegular, color: COLORS.muted,
  });
  if (data.conditionsReglement) {
    page.drawText(data.conditionsReglement, { x: MARGIN, y: 36, size: 7, font: fontRegular, color: COLORS.muted });
  }

  const bytes = await doc.save();
  return bytes;
}

export function downloadPDF(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
