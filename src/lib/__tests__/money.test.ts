import { describe, it, expect } from "vitest";
import { formatMGA } from "@/lib/money";

describe("formatMGA", () => {
  it("formate les petits montants en Ariary", () => {
    expect(formatMGA(1000)).toContain("Ar");
    expect(formatMGA(1000)).toMatch(/1\s?000/);
  });

  it("formate les grands montants", () => {
    const out = formatMGA(1_250_000);
    expect(out).toContain("Ar");
    expect(out).toMatch(/1\s?250\s?000/);
  });

  it("mode compact : millions en M Ar", () => {
    expect(formatMGA(2_500_000, { compact: true })).toBe("2.5 M Ar");
    expect(formatMGA(1_000_000, { compact: true })).toBe("1 M Ar");
  });

  it("mode compact : milliers en k Ar", () => {
    expect(formatMGA(12_000, { compact: true })).toBe("12 k Ar");
  });

  it("arrondit les décimales", () => {
    const out = formatMGA(1234.7);
    expect(out).toMatch(/1\s?235/);
  });

  it("affiche FMG si demandé (1 Ar = 5 FMG)", () => {
    const out = formatMGA(1000, { showFMG: true });
    expect(out).toContain("FMG");
    expect(out).toMatch(/5\s?000/);
  });

  it("gère les montants négatifs", () => {
    const out = formatMGA(-5000);
    expect(out).toMatch(/-?5\s?000/);
  });

  it("gère zéro", () => {
    expect(formatMGA(0)).toMatch(/^0\s?Ar$/);
  });
});
