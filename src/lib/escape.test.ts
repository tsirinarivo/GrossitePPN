import { describe, it, expect } from "vitest";
import { escapeHtml, escapeCsvCell } from "./escape";

describe("escapeHtml", () => {
  it("échappe les balises HTML basiques", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;&#x2F;script&gt;"
    );
  });

  it("échappe les guillemets et apostrophes (utile en attribut)", () => {
    expect(escapeHtml(`a "b" 'c'`)).toBe("a &quot;b&quot; &#39;c&#39;");
  });

  it("échappe l'esperluette en premier (sinon double-échappement)", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("a &amp; b")).toBe("a &amp;amp; b");
  });

  it("retourne une chaîne vide pour null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("convertit les nombres en string", () => {
    expect(escapeHtml(123)).toBe("123");
  });

  it("neutralise un payload XSS complet sur attribut img", () => {
    const payload = `<img src=x onerror="alert(document.cookie)">`;
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain("<img");
    expect(escaped).not.toContain('onerror="');
  });
});

describe("escapeCsvCell", () => {
  it("préfixe les cellules commençant par = avec apostrophe", () => {
    expect(escapeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
  });

  it("préfixe + - @ aussi", () => {
    expect(escapeCsvCell("+1234")).toBe("'+1234");
    expect(escapeCsvCell("-CMD")).toBe("'-CMD");
    expect(escapeCsvCell("@username")).toBe("'@username");
  });

  it("laisse intactes les valeurs normales", () => {
    expect(escapeCsvCell("Nom Client")).toBe("Nom Client");
    expect(escapeCsvCell("123,45")).toBe("123,45");
  });

  it("retourne chaîne vide pour null", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});
