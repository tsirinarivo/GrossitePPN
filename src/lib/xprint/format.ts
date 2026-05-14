/**
 * Normalise le texte pour imprimante thermique CP437/CP858.
 *
 * Pièges clés (spec §6.2) :
 *  - NBSP U+00A0 et NNBSP U+202F produits par Intl.NumberFormat("fr-FR") → "?" sur l'imprimante
 *  - Accents → carrés si non supprimés
 */
export function normaliseForThermal(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")          // strip diacritiques (NFD decomposed)
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")   // œ Œ
    .replace(/æ/g, "ae").replace(/Æ/g, "AE")   // æ Æ
    .replace(/[‘’]/g, "'")           // guillemets simples typographiques
    .replace(/[“”]/g, '"')           // guillemets doubles typographiques
    .replace(/[–—]/g, "-")           // tirets
    .replace(/…/g, "...")                 // ellipse
    .replace(/€/g, "EUR")                 // €
    .replace(/→/g, "->")                  // →
    .replace(/·/g, "-")                   // ·
    // NBSP (U+00A0) et NNBSP (U+202F) entre chiffres → "." (séparateur milliers thermique)
    .replace(/(\d)[  ](\d)/g, "$1.$2")
    // NBSP/NNBSP restants → espace normal
    .replace(/[  ]/g, " ");
}

/** Échapper le contenu utilisateur : évite d'injecter des balises xpyun */
export function escapeXprint(s: string): string {
  return normaliseForThermal(s).replace(/</g, "(").replace(/>/g, ")");
}

const WIDTH = 48; // 80mm → 48 chars ; 58mm → 32 chars

function divider(c = "-"): string {
  return c.repeat(WIDTH);
}

/** Ligne libellé gauche + valeur droite sur WIDTH chars, sans balises */
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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** NIF (numéro identification fiscale) — obligatoire B2B Madagascar */
  nif?: string | null;
  /** Numéro statistique Madagascar */
  stat?: string | null;
  /** Registre du commerce */
  rcs?: string | null;
  /** Assujettie TVA — affiche taux + mention */
  assujettieTV?: boolean;
  tauxTVA?: number | null;
  numeroFacture: string;
  date: Date;
  clientNom?: string | null;
  lignes: LigneTicket[];
  sousTotal: number;
  tva?: number | null;
  total: number;
  modePaiement?: string | null;
  /** URL courte ou numéro de facture (max 256 chars, sans < >) */
  qrPayload?: string | null;
  header?: string | null;
  footer?: string | null;
}

export interface BonLivraisonOpts {
  entrepriseNom: string;
  bonCode: string;
  date: Date;
  clientNom: string;
  clientTelephone?: string | null;
  clientAdresse?: string | null;
  chauffeurNom?: string | null;
  vehiculePlaque?: string | null;
  lignes: { ref: string; nom: string; qte: number; unite: string }[];
  totalColis: number;
  qrPayload?: string | null;
  nif?: string | null;
  stat?: string | null;
}

export interface FicheInventaireOpts {
  entrepriseNom: string;
  ficheCode: string;
  date: Date;
  depotNom?: string | null;
  lignes: { ref: string; nom: string; qteAttendue: number; unite: string }[];
}

// ─── Ticket de caisse / facture ───────────────────────────────────────────────

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

  // Mentions fiscales (§13.5)
  if (opts.nif) lines.push(`<C>NIF: ${escapeXprint(opts.nif)}</C>`);
  if (opts.stat) lines.push(`<C>STAT: ${escapeXprint(opts.stat)}</C>`);
  if (opts.rcs) lines.push(`<C>RCS: ${escapeXprint(opts.rcs)}</C>`);

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

  // Totaux — <BOLD> pour gras (pas <B> qui double la largeur)
  lines.push(row("Sous-total", formatMGAThermal(opts.sousTotal)));
  if (opts.tva && opts.tva > 0 && opts.tauxTVA) {
    lines.push(row(`TVA ${opts.tauxTVA}%`, formatMGAThermal(opts.tva)));
  } else if (opts.assujettieTV) {
    lines.push(`<L>TVA : non applicable</L>`);
  }
  lines.push(divider("="));
  lines.push(rowBold("TOTAL", formatMGAThermal(opts.total)));

  if (opts.modePaiement) {
    lines.push(row("Paiement", escapeXprint(opts.modePaiement)));
  }

  // QR code — centré, max 256 chars (spec §6.1 : pas de <CUT>, xpyun découpe auto)
  if (opts.qrPayload) {
    lines.push(divider());
    const qr = opts.qrPayload.slice(0, 256).replace(/</g, "").replace(/>/g, "");
    lines.push(`<QR>${qr}</QR>`);
  }

  lines.push("");
  lines.push(`<C>Merci pour votre achat !</C>`);
  lines.push(`<C>Misaotra !</C>`);

  if (opts.footer?.trim()) {
    lines.push("");
    for (const ln of opts.footer.split("\n")) {
      lines.push(`<C>${escapeXprint(ln)}</C>`);
    }
  }

  return lines.join("<BR>");
}

// ─── Bon de livraison B2B ────────────────────────────────────────────────────

export function formatBonLivraison(opts: BonLivraisonOpts): string {
  const lines: string[] = [];

  lines.push(`<C><B>${escapeXprint(opts.entrepriseNom.toUpperCase())}</B></C>`);
  lines.push(`<C>BON DE LIVRAISON</C>`);
  if (opts.nif) lines.push(`<C>NIF: ${escapeXprint(opts.nif)}</C>`);
  if (opts.stat) lines.push(`<C>STAT: ${escapeXprint(opts.stat)}</C>`);
  lines.push(divider("="));
  lines.push(`<C><B>${escapeXprint(opts.bonCode)}</B></C>`);
  lines.push(`<C>${escapeXprint(formatDateThermal(opts.date))}</C>`);
  lines.push(divider());

  lines.push(`<L><BOLD>CLIENT</BOLD></L>`);
  lines.push(`<L>${escapeXprint(opts.clientNom)}</L>`);
  if (opts.clientTelephone) lines.push(`<L>${escapeXprint(opts.clientTelephone)}</L>`);
  if (opts.clientAdresse) lines.push(`<L>${escapeXprint(opts.clientAdresse)}</L>`);

  if (opts.chauffeurNom) {
    lines.push(divider());
    lines.push(`<L>Livreur : ${escapeXprint(opts.chauffeurNom)}</L>`);
    if (opts.vehiculePlaque) lines.push(`<L>Vehicule: ${escapeXprint(opts.vehiculePlaque)}</L>`);
  }

  lines.push(divider());
  for (const it of opts.lignes) {
    lines.push(`<L>${escapeXprint(it.ref)} - ${escapeXprint(it.nom.slice(0, 30))}</L>`);
    lines.push(`<L>${rowContent("  Quantite", `${it.qte} ${it.unite}`)}</L>`);
  }
  lines.push(divider());
  lines.push(rowBold("TOTAL COLIS", String(opts.totalColis)));

  if (opts.qrPayload) {
    lines.push("");
    const qr = opts.qrPayload.slice(0, 256).replace(/</g, "").replace(/>/g, "");
    lines.push(`<QR>${qr}</QR>`);
  }

  lines.push("");
  lines.push(`<L>Signature client :</L>`);
  lines.push("");
  lines.push(`<L>______________________</L>`);

  return lines.join("<BR>");
}

// ─── Fiche d'inventaire ───────────────────────────────────────────────────────

export function formatFicheInventaire(opts: FicheInventaireOpts): string {
  const lines: string[] = [];

  lines.push(`<C><B>FICHE INVENTAIRE</B></C>`);
  lines.push(`<C>${escapeXprint(opts.entrepriseNom)}</C>`);
  if (opts.depotNom) lines.push(`<C>Depot: ${escapeXprint(opts.depotNom)}</C>`);
  lines.push(`<C>${escapeXprint(opts.ficheCode)} - ${escapeXprint(formatDateThermal(opts.date))}</C>`);
  lines.push(divider());
  lines.push(`<L>${rowContent("Reference / Article", "Theorique")}</L>`);
  lines.push(divider());

  for (const it of opts.lignes) {
    lines.push(`<L>${escapeXprint(it.ref)} ${escapeXprint(it.nom.slice(0, 20))}</L>`);
    lines.push(`<L>${rowContent("  Compte: _______", `${it.qteAttendue} ${it.unite}`)}</L>`);
  }

  lines.push(divider());
  lines.push(`<L>Inventoriste : __________________</L>`);
  lines.push(`<L>Signature :    __________________</L>`);

  return lines.join("<BR>");
}
