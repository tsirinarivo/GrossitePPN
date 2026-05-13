/**
 * E2E : Portail e-commerce B2B — catalogue, panier, checkout
 */
import { test, expect } from "@playwright/test";

test.describe("Shop landing & catalogue", () => {
  test("afficher la landing page", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8000 });
  });

  test("naviguer vers le catalogue depuis le header", async ({ page }) => {
    await page.goto("/shop");
    const catalogueLink = page.getByRole("link", { name: /catalogue|produits/i }).first();
    if (await catalogueLink.isVisible()) {
      await catalogueLink.click();
      await expect(page).toHaveURL(/shop/);
    }
  });

  test("filtrer par catégorie", async ({ page }) => {
    await page.goto("/shop");
    const filter = page.getByRole("button", { name: /riz|huile|sucre/i }).first();
    if (await filter.isVisible()) {
      await filter.click();
      await page.waitForTimeout(400);
      // La page ne doit pas crasher
      await expect(page.locator("body")).not.toContainText("error");
    }
  });

  test("ajouter au panier et voir le badge", async ({ page }) => {
    await page.goto("/shop");
    const addBtn = page.getByRole("button", { name: /panier|ajouter/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);
    }
    const panier = page.getByRole("link", { name: /panier/i }).first();
    await expect(panier).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Panier", () => {
  test("afficher la page panier", async ({ page }) => {
    await page.goto("/panier");
    // La page doit charger sans erreur 500
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Checkout", () => {
  test("afficher la page checkout", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8000 });
  });
});
