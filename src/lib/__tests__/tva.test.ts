import { describe, it, expect } from "vitest";

// Calcul TVA standard Madagascar (20%)
function calculTVA(montantHT: number, taux: number): { ht: number; tva: number; ttc: number } {
  const ht = Math.round(montantHT);
  const tva = Math.round((ht * taux) / 100);
  const ttc = ht + tva;
  return { ht, tva, ttc };
}

function extractTVA(montantTTC: number, taux: number): { ht: number; tva: number; ttc: number } {
  const ttc = Math.round(montantTTC);
  const ht = Math.round(ttc / (1 + taux / 100));
  const tva = ttc - ht;
  return { ht, tva, ttc };
}

describe("Calculs TVA Madagascar", () => {
  it("calcule la TVA à 20% sur 100 000 Ar HT", () => {
    const r = calculTVA(100_000, 20);
    expect(r.ht).toBe(100_000);
    expect(r.tva).toBe(20_000);
    expect(r.ttc).toBe(120_000);
  });

  it("extrait la TVA d'un montant TTC", () => {
    const r = extractTVA(120_000, 20);
    expect(r.ttc).toBe(120_000);
    expect(r.ht).toBe(100_000);
    expect(r.tva).toBe(20_000);
  });

  it("gère un taux de 0% (exonéré)", () => {
    const r = calculTVA(50_000, 0);
    expect(r.ht).toBe(50_000);
    expect(r.tva).toBe(0);
    expect(r.ttc).toBe(50_000);
  });

  it("arrondit correctement", () => {
    const r = calculTVA(33333, 20);
    expect(r.tva).toBe(6667);
  });
});
