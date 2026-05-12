/** Moteur TVA optionnel — Grossiste PPN Madagascar */

export type TaxConfig = {
  assujetti: boolean;
  tauxDefaut: number;
};

export type LigneTaxe = {
  taux: number;
  baseHT: number;
  montantTVA: number;
};

export type RecapTaxe = {
  totalHT: number;
  lignesTVA: LigneTaxe[];
  totalTVA: number;
  totalTTC: number;
  exonere: boolean;
};

/** Calculer le récap TVA d'une commande */
export function calculerTaxes(
  lignes: Array<{ montantHT: number; tauxTVA: number }>,
  config: TaxConfig
): RecapTaxe {
  if (!config.assujetti) {
    const totalHT = lignes.reduce((s, l) => s + l.montantHT, 0);
    return {
      totalHT,
      lignesTVA: [],
      totalTVA: 0,
      totalTTC: totalHT,
      exonere: true,
    };
  }

  const totalHT = lignes.reduce((s, l) => s + l.montantHT, 0);

  const byTaux = lignes.reduce<Record<number, number>>((acc, l) => {
    const taux = l.tauxTVA;
    acc[taux] = (acc[taux] ?? 0) + l.montantHT;
    return acc;
  }, {});

  const lignesTVA: LigneTaxe[] = Object.entries(byTaux).map(
    ([tauxStr, baseHT]) => {
      const taux = Number(tauxStr);
      const montantTVA = Math.round(baseHT * (taux / 100));
      return { taux, baseHT: Math.round(baseHT), montantTVA };
    }
  );

  const totalTVA = lignesTVA.reduce((s, l) => s + l.montantTVA, 0);

  return {
    totalHT: Math.round(totalHT),
    lignesTVA,
    totalTVA,
    totalTTC: Math.round(totalHT) + totalTVA,
    exonere: false,
  };
}

/** Vérifier la cohérence des prix par palier / unité */
export function verifierCoherencePrix(
  prixUnitaire: number,
  facteurConversion: number,
  prixConditionnement: number
): { coherent: boolean; alerteSuspicion: boolean } {
  const prixEquivalent = prixUnitaire * facteurConversion;
  const ecart = prixConditionnement - prixEquivalent;
  const pct = ecart / prixEquivalent;

  // Normal : le prix au conditionnement est inférieur (avantage grossiste)
  const coherent = prixConditionnement <= prixEquivalent;

  // Suspect : le prix au conditionnement est SUPÉRIEUR à unitaire × facteur
  const alerteSuspicion = prixConditionnement > prixEquivalent * 1.02;

  return { coherent, alerteSuspicion };
}
