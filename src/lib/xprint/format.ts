/** Normalise le texte pour imprimante thermique CP437/CP858
 *  - Supprime les diacritiques (accents)
 *  - Remplace NBSP (U+00A0) et NNBSP (U+202F) entre chiffres par "."
 *  - Remplace les caractères spéciaux non imprimables
 */
export function normaliseForThermal(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")        // strip diacritiques (NFD decomposed)
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")   // œ Œ
    .replace(/æ/g, "ae").replace(/Æ/g, "AE")   // æ Æ
    .replace(/[‘’]/g, "'")         // guillemets simples typographiques
    .replace(/[“”]/g, '"')         // guillemets doubles typographiques
    .replace(/[–—]/g, "-")         // tirets
    .replace(/…/g, "...")               // ellipse
    .replace(/€/g, "EUR")              // €
    .replace(/→/g, "->")              // →
    .replace(/·/g, "-")               // ·
    // NBSP (U+00A0) et NNBSP (U+202F) entre chiffres → "." (séparateur de milliers MGA)
    .replace(/(\d)[  ](\d)/g, "$1.$2")
    // Remaining NBSP/NNBSP → espace normal
    .replace(/[  ]/g, " ");
}

export function escapeXprint(s: string): string {
  return normaliseForThermal(s).replace(/</g, "(").replace(/>/g, ")");
}

const WIDTH = 48;

function divider(c = "-"): string {
  return c.repeat(WIDTH);
}

/** Ligne gauche-droite sur WIDTH caractères, sans les tags <L> */
function rowContent(left: string, right: string, totalWidth = WIDTH): string {
  const l = escapeXprint(left);
  const r = escapeXprint(right);
  const space = Math.max(1, totalWidth - l.length - r.length);
  return `${l}${" ".repeat(space)}${r}`;
}

function row(left: string, right: string): string {
  return `<L>${rowContent(left, right)}</L>`;
}

function rowBold(left: string, right: string): string {
  return `<L><BOLD>${rowContent(left, right)}</BOLD></L>`;
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

/** Formatage montant MGA sans Intl (évite NNBSP U+202F) */
function formatMGAThermal(amount: number): string {
  const rounded = Math.round(amount);
  const s = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} Ar`;
}

function formatDateThermal(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
}

export function formatFactureTicket(opts: TicketFactureOpts): string {
  const lines: string[] = [];

  // En-tête custom (multilignes)
  if (opts.header?.trim()) {
    for (const ln of opts.header.split("\n")) {
      lines.push(`<C>${escapeXprint(ln)}</C>`);
    }
    lines.push("");
  }

  // Nom entreprise centré en gras
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
    if (lg.qte > 1) {
      lines.push(`<L>  @ ${formatMGAThermal(lg.prixUnitaire)}/u</L>`);
    }
  }

  lines.push(divider());

  // Totaux — <BOLD> pour gras normal, pas <B> (qui double la largeur)
  lines.push(row("Sous-total", formatMGAThermal(opts.sousTotal)));
  if (opts.tva && opts.tva > 0 && opts.tauxTVA) {
    lines.push(row(`TVA ${opts.tauxTVA}%`, formatMGAThermal(opts.tva)));
  }
  lines.push(divider("="));
  lines.push(rowBold("TOTAL", formatMGAThermal(opts.total)));

  if (opts.modePaiement) {
    lines.push(row("Paiement", escapeXprint(opts.modePaiement)));
  }

  // QR code — centré, max 256 chars (spec section 4)
  // Pas de <CUT> après — xpyun découpe automatiquement (spec section 5.1)
  if (opts.qrPayload) {
    lines.push(divider());
    const qr = opts.qrPayload.slice(0, 256).replace(/</g, "").replace(/>/g, "");
    lines.push(`<C><QRCODE>${qr}</QRCODE></C>`);
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

  return lines.join("<BR>");
}
