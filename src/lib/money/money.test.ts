import { describe, it, expect } from "vitest";
import { formatMGA, parseMGA, roundMGA, calcTVA, calcHTfromTTC } from "./index";

describe("formatMGA", () => {
  it("formate un montant simple", () => {
    expect(formatMGA(1250000)).toContain("250");
    expect(formatMGA(1250000)).toContain("Ar");
  });

  it("formate en compact", () => {
    expect(formatMGA(1_500_000, { compact: true })).toMatch(/M Ar/);
    expect(formatMGA(5_000, { compact: true })).toMatch(/k Ar/);
  });

  it("arrondit au plus près", () => {
    const a = formatMGA(1234.6);
    const b = formatMGA(1235);
    expect(a).toBe(b);
  });

  it("affiche FMG quand demandé (×5)", () => {
    const r = formatMGA(1000, { showFMG: true });
    expect(r).toContain("5"); // 5000 FMG
    expect(r).toContain("FMG");
  });
});

describe("parseMGA", () => {
  it("parse une saisie utilisateur avec espaces", () => {
    expect(parseMGA("1 250 000 Ar")).toBe(1250000);
    expect(parseMGA("450,50")).toBeCloseTo(450.5);
  });

  it("retourne 0 sur entrée invalide", () => {
    expect(parseMGA("abc")).toBe(0);
    expect(parseMGA("")).toBe(0);
  });
});

describe("roundMGA", () => {
  it("arrondit à l'entier (Ariary = pas de décimales)", () => {
    expect(roundMGA(1234.5)).toBe(1235);
    expect(roundMGA(1234.49)).toBe(1234);
  });
});

describe("calcTVA", () => {
  it("calcule TVA 20% sur 1000 HT", () => {
    const r = calcTVA(1000, 20);
    expect(r.ht).toBe(1000);
    expect(r.tva).toBe(200);
    expect(r.ttc).toBe(1200);
  });

  it("calcule TVA 0% (exonéré)", () => {
    const r = calcTVA(1000, 0);
    expect(r.tva).toBe(0);
    expect(r.ttc).toBe(1000);
  });
});

describe("calcHTfromTTC", () => {
  it("retrouve le HT depuis le TTC à 20%", () => {
    const r = calcHTfromTTC(1200, 20);
    expect(r.ht).toBe(1000);
    expect(r.tva).toBe(200);
    expect(r.ttc).toBe(1200);
  });
});
