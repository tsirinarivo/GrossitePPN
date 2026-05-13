/**
 * Setup : authentification pour les tests dashboard
 * Crée un fichier d'état de session réutilisé par les autres tests
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

export const AGENT_AUTH_FILE = path.join(__dirname, ".auth/agent.json");
export const CAISSIER_AUTH_FILE = path.join(__dirname, ".auth/caissier.json");

setup("créer session agent", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h1")).toContainText("GrossistePPN");

  await page.getByLabel(/email/i).fill("agent@grossiteppn.mg");
  await page.getByLabel(/mot de passe/i).fill("agent123");
  await page.getByRole("button", { name: /connexion/i }).click();

  await page.waitForURL("/pos/agent");
  await page.context().storageState({ path: AGENT_AUTH_FILE });
});

setup("créer session caissier", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("mamy@grossiteppn.mg");
  await page.getByLabel(/mot de passe/i).fill("caissier123");
  await page.getByRole("button", { name: /connexion/i }).click();

  await page.waitForURL("/pos/caisse");
  await page.context().storageState({ path: CAISSIER_AUTH_FILE });
});
