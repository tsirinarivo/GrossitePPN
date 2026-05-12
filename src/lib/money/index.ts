/** Utilitaires monétaires — Ariary malgache (MGA) */

/** Formater un montant en Ariary : 1 250 000 Ar */
export function formatMGA(amount: number, opts?: { compact?: boolean; showFMG?: boolean }): string {
  if (opts?.compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1).replace(".0", "")} M Ar`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `${(amount / 1_000).toFixed(0)} k Ar`;
    }
  }

  const formatted = new Intl.NumberFormat("fr-MG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));

  const result = `${formatted} Ar`;

  if (opts?.showFMG) {
    const fmg = Math.round(amount * 5);
    const fmgFormatted = new Intl.NumberFormat("fr-MG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(fmg);
    return `${result} (${fmgFormatted} FMG)`;
  }

  return result;
}

/** Parser un montant saisi par l'utilisateur */
export function parseMGA(value: string): number {
  const clean = value.replace(/[^\d,-]/g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

/** Arrondir au niveau entier (Ariary = pas de décimales) */
export function roundMGA(amount: number): number {
  return Math.round(amount);
}

/** Calculer TVA */
export function calcTVA(
  montantHT: number,
  tauxTVA: number
): { ht: number; tva: number; ttc: number } {
  const tva = roundMGA(montantHT * (tauxTVA / 100));
  return { ht: roundMGA(montantHT), tva, ttc: roundMGA(montantHT) + tva };
}

/** Calculer TTC → HT */
export function calcHTfromTTC(
  montantTTC: number,
  tauxTVA: number
): { ht: number; tva: number; ttc: number } {
  const ht = roundMGA(montantTTC / (1 + tauxTVA / 100));
  const tva = montantTTC - ht;
  return { ht, tva, ttc: montantTTC };
}
