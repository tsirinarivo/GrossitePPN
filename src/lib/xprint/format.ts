/** Normalise le texte pour imprimante thermique CP437 */
export function normaliseForThermal(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")
    .replace(/æ/g, "ae").replace(/Æ/g, "AE")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/€/g, "EUR")
    .replace(/→/g, "->")
    .replace(/·/g, "-")
    .replace(/(\d)[  ](\d)/g, "$1.$2")
    .replace(/[  ]/g, " ");
}

export function escapeXprint(s: string): string {
  return normaliseForThermal(s).replace(/</g, "(").replace(/>/g, ")");
}

const WIDTH = 48;

function divider(c = "-"): string {
  return c.repeat(WIDTH);
}

function row(left: string, right: string, totalWidth = WIDTH): string {
  const l = escapeXprint(left);
  const r = escapeXprint(right);
  const space = Math.max(1, totalWidth - l.length - r.length);
  return `<L>${l}${" ".repeat(space)}${r}</L>`;
}

export interface LigneTicket {
  nom: string;
  qte: number;
  unite: string;
  prixUnitaire: number;
  total: number;
}

export interface TicketFactureOpts {
  entrepriseNom: string;
  entrepriseAdresse?: string | null;
  entrepriseTelephone?: string | null;
  numeroFacture: string;
  date: Date;
  clientNom?: string | null;
  lignes: LigneTicket[];
  sousTotal: number;
  tva?: number | null;
  tauxTVA?: number | null;
  total: number;
  modePaiement?: string | null;
  qrPayload?: string | null;
  header?: string | null;
  footer?: string | null;
}

function formatMGAThermal(amount: number): string {
  // Pas d'Intl (NNBSP) — formatage manuel
  const rounded = Math.round(amount);
  const s = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} Ar`;
}

function formatDateThermal(d: Date): string {
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, "0");
  const mn = d.getMinutes().toString().padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
}

export function formatFactureTicket(opts: TicketFactureOpts): string {
  const lines: string[] = [];

  // En-tête custom
  if (opts.header?.trim()) {
    for (const ln of opts.header.split("\n")) {
      lines.push(`<C>${escapeXprint(ln)}</C>`);
    }
    lines.push("");
  }

  // Nom entreprise
  lines.push(`<C><B>${escapeXprint(opts.entrepriseNom.toUpperCase())}</B></C>`);
  if (opts.entrepriseAdresse) {
    lines.push(`<C>${escapeXprint(opts.entrepriseAdresse)}</C>`);
  }
  if (opts.entrepriseTelephone) {
    lines.push(`<C>Tel: ${escapeXprint(opts.entrepriseTelephone)}</C>`);
  }
  lines.push("");
  lines.push(`<C>FACTURE / RECU</C>`);
  lines.push(divider("="));

  // Numéro et date
  lines.push(row(`N° ${opts.numeroFacture}`, formatDateThermal(opts.date)));
  if (opts.clientNom) {
    lines.push(`<L>Client: ${escapeXprint(opts.clientNom)}</L>`);
  }
  lines.push(divider());

  // En-tête colonnes
  lines.push(`<L>Article            Qte  Unite   Total</L>`);
  lines.push(divider());

  // Lignes produits
  for (const lg of opts.lignes) {
    const nom = escapeXprint(lg.nom).slice(0, 20).padEnd(20);
    const qte = String(lg.qte).padStart(3);
    const unite = escapeXprint(lg.unite).slice(0, 5).padEnd(5);
    const total = formatMGAThermal(lg.total).padStart(10);
    lines.push(`<L>${nom} ${qte}  ${unite} ${total}</L>`);
    // Prix unitaire en dessous si > 1 article
    if (lg.qte > 1) {
      const pu = `  ${formatMGAThermal(lg.prixUnitaire)}/u`;
      lines.push(`<L>${escapeXprint(pu)}</L>`);
    }
  }

  lines.push(divider());

  // Totaux
  lines.push(row("Sous-total", formatMGAThermal(opts.sousTotal)));
  if (opts.tva && opts.tva > 0 && opts.tauxTVA) {
    lines.push(row(`TVA ${opts.tauxTVA}%`, formatMGAThermal(opts.tva)));
  }
  lines.push(divider("="));
  lines.push(`<L><B>${row("TOTAL", formatMGAThermal(opts.total)).replace("<L>", "").replace("</L>", "")}</B></L>`);

  if (opts.modePaiement) {
    lines.push(row("Paiement", escapeXprint(opts.modePaiement)));
  }

  // QR code
  if (opts.qrPayload) {
    lines.push(divider());
    lines.push(`<C><QRCODE>${opts.qrPayload.slice(0, 256)}</QRCODE></C>`);
  }

  lines.push("");
  lines.push(`<C>Merci pour votre achat !</C>`);
  lines.push(`<C>Misaotra !</C>`);

  // Pied custom
  if (opts.footer?.trim()) {
    lines.push("");
    for (const ln of opts.footer.split("\n")) {
      lines.push(`<C>${escapeXprint(ln)}</C>`);
    }
  }

  // PAS de <CUT> — xpyun découpe automatiquement
  return lines.join("<BR>");
}
