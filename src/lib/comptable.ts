/** Utilitaires comptables : plan de comptes, compte de résultat, FEC. */

export const MOIS_LABELS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars",
  "04": "Avril", "05": "Mai", "06": "Juin",
  "07": "Juillet", "08": "Août", "09": "Septembre",
  "10": "Octobre", "11": "Novembre", "12": "Décembre",
};

export function moisLabel(mois: string): string {
  const [annee, m] = mois.split("-");
  return `${MOIS_LABELS[m ?? ""] ?? m} ${annee}`;
}

/** Plan de comptes simplifié (PCG) utilisé pour les écritures. */
export const COMPTES = {
  clients: { num: "411000", lib: "Clients" },
  fournisseurs: { num: "401000", lib: "Fournisseurs" },
  ventes: { num: "707000", lib: "Ventes de marchandises" },
  achats: { num: "607000", lib: "Achats de marchandises" },
  tvaCollectee: { num: "445710", lib: "TVA collectée" },
  tvaDeductible: { num: "445660", lib: "TVA déductible sur achats" },
  banque: { num: "512000", lib: "Banque" },
  caisse: { num: "530000", lib: "Caisse" },
} as const;

/** Mapping catégorie de charge → compte de charge PCG. */
export const COMPTE_CHARGE: Record<string, { num: string; lib: string }> = {
  personnel: { num: "641000", lib: "Rémunérations du personnel" },
  loyer: { num: "613000", lib: "Locations" },
  energie: { num: "606100", lib: "Énergie" },
  fournitures: { num: "606400", lib: "Fournitures administratives" },
  marketing: { num: "623000", lib: "Publicité, marketing" },
  maintenance: { num: "615000", lib: "Entretien et réparations" },
  autre: { num: "628000", lib: "Charges diverses" },
};

export function compteCharge(categorie: string) {
  return COMPTE_CHARGE[categorie] ?? COMPTE_CHARGE.autre!;
}

// ── Compte de résultat ─────────────────────────────────────────────────────────

export interface CompteResultat {
  mois: string;
  label: string;
  caHT: number;
  tvaCollectee: number;
  achatsHT: number;
  tvaDeductible: number;
  margeBrute: number;
  charges: { categorie: string; libelle: string; montant: number }[];
  totalCharges: number;
  resultat: number;
  tvaNette: number;
  demo: boolean;
}

/** Données de démonstration réalistes pour un grossiste malgache. */
export function demoCompteResultat(mois: string): CompteResultat {
  const caHT = 12_400_000;
  const tvaCollectee = 2_180_000;
  const achatsHT = 8_900_000;
  const tvaDeductible = 1_520_000;
  const charges = [
    { categorie: "personnel", libelle: "Rémunérations du personnel", montant: 1_350_000 },
    { categorie: "loyer", libelle: "Locations", montant: 600_000 },
    { categorie: "energie", libelle: "Énergie (JIRAMA)", montant: 320_000 },
    { categorie: "marketing", libelle: "Publicité, marketing", montant: 180_000 },
    { categorie: "maintenance", libelle: "Entretien véhicules", montant: 240_000 },
  ];
  const totalCharges = charges.reduce((s, c) => s + c.montant, 0);
  const margeBrute = caHT - achatsHT;
  return {
    mois,
    label: moisLabel(mois),
    caHT,
    tvaCollectee,
    achatsHT,
    tvaDeductible,
    margeBrute,
    charges,
    totalCharges,
    resultat: margeBrute - totalCharges,
    tvaNette: tvaCollectee - tvaDeductible,
    demo: true,
  };
}

// ── FEC (Fichier des Écritures Comptables) ──────────────────────────────────────

export interface FecLine {
  journalCode: string;
  journalLib: string;
  ecritureNum: string;
  ecritureDate: string; // AAAAMMJJ
  compteNum: string;
  compteLib: string;
  compAuxNum: string;
  compAuxLib: string;
  pieceRef: string;
  pieceDate: string; // AAAAMMJJ
  ecritureLib: string;
  debit: number;
  credit: number;
}

export const FEC_HEADER = [
  "JournalCode", "JournalLib", "EcritureNum", "EcritureDate",
  "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib",
  "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit",
  "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise",
];

function fecDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${j}`;
}

function fecAmount(n: number): string {
  // Séparateur décimal virgule, 2 décimales (Ariary sans décimales → ,00)
  return (Math.round(n) + ",00").replace(".", ",");
}

/** Sérialise les lignes FEC en fichier texte tabulé (norme DGFiP). */
export function serializeFec(lines: FecLine[]): string {
  const rows = [FEC_HEADER.join("\t")];
  lines.forEach((l, i) => {
    rows.push(
      [
        l.journalCode,
        l.journalLib,
        l.ecritureNum || String(i + 1),
        l.ecritureDate,
        l.compteNum,
        l.compteLib,
        l.compAuxNum,
        l.compAuxLib,
        l.pieceRef,
        l.pieceDate,
        l.ecritureLib,
        fecAmount(l.debit),
        fecAmount(l.credit),
        "", // EcritureLet
        "", // DateLet
        l.ecritureDate, // ValidDate
        "", // Montantdevise
        "", // Idevise
      ].join("\t")
    );
  });
  return rows.join("\r\n");
}

/** Construit les écritures de vente (journal VT). */
export function venteToFec(opts: {
  numero: string;
  date: Date;
  clientNum: string;
  clientLib: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  ecritureNum: string;
}): FecLine[] {
  const ed = fecDate(opts.date);
  const base = {
    journalCode: "VT",
    journalLib: "Ventes",
    ecritureNum: opts.ecritureNum,
    ecritureDate: ed,
    pieceRef: opts.numero,
    pieceDate: ed,
    ecritureLib: `Vente ${opts.numero}`,
    compAuxNum: "",
    compAuxLib: "",
  };
  return [
    { ...base, compteNum: COMPTES.clients.num, compteLib: COMPTES.clients.lib, compAuxNum: opts.clientNum, compAuxLib: opts.clientLib, debit: opts.totalTTC, credit: 0 },
    { ...base, compteNum: COMPTES.ventes.num, compteLib: COMPTES.ventes.lib, debit: 0, credit: opts.totalHT },
    { ...base, compteNum: COMPTES.tvaCollectee.num, compteLib: COMPTES.tvaCollectee.lib, debit: 0, credit: opts.totalTVA },
  ];
}

/** Construit les écritures d'achat (journal AC). */
export function achatToFec(opts: {
  numero: string;
  date: Date;
  fournisseurNum: string;
  fournisseurLib: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  ecritureNum: string;
}): FecLine[] {
  const ed = fecDate(opts.date);
  const base = {
    journalCode: "AC",
    journalLib: "Achats",
    ecritureNum: opts.ecritureNum,
    ecritureDate: ed,
    pieceRef: opts.numero,
    pieceDate: ed,
    ecritureLib: `Achat ${opts.numero}`,
    compAuxNum: "",
    compAuxLib: "",
  };
  return [
    { ...base, compteNum: COMPTES.achats.num, compteLib: COMPTES.achats.lib, debit: opts.totalHT, credit: 0 },
    { ...base, compteNum: COMPTES.tvaDeductible.num, compteLib: COMPTES.tvaDeductible.lib, debit: opts.totalTVA, credit: 0 },
    { ...base, compteNum: COMPTES.fournisseurs.num, compteLib: COMPTES.fournisseurs.lib, compAuxNum: opts.fournisseurNum, compAuxLib: opts.fournisseurLib, debit: 0, credit: opts.totalTTC },
  ];
}
