import { describe, it, expect } from "vitest";

// Scoring RFM simplifié
type Score = "Champions" | "Fidèles" | "Potentiels" | "À risque" | "Perdus";

function scoringRFM(rec: number, freq: number, mon: number): Score {
  // rec = jours depuis dernier achat, freq = nb commandes 12 mois, mon = total TTC 12 mois
  if (rec <= 30 && freq >= 10 && mon >= 5_000_000) return "Champions";
  if (rec <= 60 && freq >= 5) return "Fidèles";
  if (rec <= 90 && freq >= 2) return "Potentiels";
  if (rec > 180) return "Perdus";
  return "À risque";
}

describe("Scoring RFM clients", () => {
  it("identifie un Champion (récent, fréquent, gros panier)", () => {
    expect(scoringRFM(15, 15, 8_000_000)).toBe("Champions");
  });

  it("identifie un client Fidèle", () => {
    expect(scoringRFM(45, 6, 1_500_000)).toBe("Fidèles");
  });

  it("identifie un client Potentiel", () => {
    expect(scoringRFM(80, 3, 600_000)).toBe("Potentiels");
  });

  it("identifie un client À risque", () => {
    expect(scoringRFM(120, 1, 200_000)).toBe("À risque");
  });

  it("identifie un client Perdu (> 6 mois)", () => {
    expect(scoringRFM(200, 0, 0)).toBe("Perdus");
  });
});
