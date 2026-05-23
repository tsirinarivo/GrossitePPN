import { test, expect } from "@playwright/test";

/**
 * Smoke tests — vérifient qu'aucune page critique ne casse en chargement initial.
 * À enrichir avec un vrai login + parcours commande dans un environnement de test
 * avec base de données dédiée (variable TEST_DATABASE_URL).
 */

test.describe("Pages publiques accessibles", () => {
  test("Page login charge et affiche le formulaire", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/connexion|login/i);
    await expect(page.getByRole("textbox").first()).toBeVisible();
  });

  test("Boutique B2B publique (catalogue)", async ({ page }) => {
    const res = await page.goto("/shop");
    // Soit 200 (anonyme autorisé), soit redirige vers login — les deux sont OK
    expect([200, 302, 307]).toContain(res?.status() ?? 0);
  });

  test("Suivi public livraison avec token bidon — 404 attendu, pas de crash", async ({ page }) => {
    const res = await page.goto("/suivi/trk-fakefake");
    // L'app doit gérer le token introuvable sans 500
    expect(res?.status()).toBeLessThan(500);
  });
});

test.describe("API publiques health", () => {
  test("GET /api/health", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
  });
});

test.describe("Routes protégées redirigent vers /login", () => {
  for (const path of [
    "/",
    "/pos/agent",
    "/pos/caisse",
    "/stock",
    "/stock/historique",
    "/clients",
    "/livraisons",
    "/commandes",
    "/finances",
    "/admin",
    "/admin/audit",
    "/retours",
    "/tournees",
    "/rapports",
    "/rapports/bilan",
    "/rapports/fournisseurs",
  ]) {
    test(`${path} redirige vers /login si non authentifié`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      const url = page.url();
      expect(url).toMatch(/\/login/);
    });
  }
});

test.describe("API protégées renvoient 401 sans session", () => {
  for (const path of [
    "/api/pos/commandes",
    "/api/clients",
    "/api/stock",
    "/api/finances",
    "/api/retours",
    "/api/tournees",
    "/api/rapports/bilan",
    "/api/rapports/fournisseurs",
    "/api/admin/audit",
  ]) {
    test(`${path} → 401`, async ({ request }) => {
      const res = await request.get(path);
      expect([401, 403]).toContain(res.status());
    });
  }
});

test.describe("Validation code promo (sans auth requise)", () => {
  test("POST /api/shop/promotions/valider rejette les codes vides", async ({ request }) => {
    const res = await request.post("/api/shop/promotions/valider", {
      data: { code: "", totalPanier: 100000 },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/shop/promotions/valider rejette un code inexistant", async ({ request }) => {
    const res = await request.post("/api/shop/promotions/valider", {
      data: { code: "PROMOIMAGINAIRE-XYZ-123", totalPanier: 100000 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.valide).toBe(false);
  });
});
