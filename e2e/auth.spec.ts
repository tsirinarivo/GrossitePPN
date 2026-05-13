/**
 * E2E : Authentification et protections de routes
 */
import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("afficher le formulaire de connexion", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("GrossistePPN");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /connexion/i })).toBeVisible();
  });

  test("afficher une erreur avec des identifiants invalides", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("inconnu@test.mg");
    await page.getByLabel(/mot de passe/i).fill("mauvais_mdp");
    await page.getByRole("button", { name: /connexion/i }).click();

    // Message d'erreur dans les 5 secondes
    await expect(page.getByRole("alert").or(page.getByText(/invalide|incorrect|erreur/i))).toBeVisible({ timeout: 5000 });
  });

  test("rediriger vers /login depuis une route protégée sans session", async ({ page }) => {
    await page.goto("/pos/agent");
    await expect(page).toHaveURL(/\/login/);
  });

  test("rediriger vers /login depuis /stock sans session", async ({ page }) => {
    await page.goto("/stock");
    await expect(page).toHaveURL(/\/login/);
  });

  test("afficher les comptes de démo", async ({ page }) => {
    await page.goto("/login");
    // Les boutons de remplissage rapide existent
    const demoBtn = page.getByRole("button", { name: /admin|agent|caissier/i }).first();
    await expect(demoBtn).toBeVisible({ timeout: 3000 });
  });
});
