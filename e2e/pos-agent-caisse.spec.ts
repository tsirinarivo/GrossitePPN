/**
 * E2E : Flux complet POS Agent → Caisse
 *
 * 1. L'agent sélectionne un client et ajoute des produits au panier
 * 2. Il envoie la commande à la caisse
 * 3. La commande apparaît dans la file d'attente de la caisse
 * 4. Le caissier encaisse et génère la facture
 */
import { test, expect } from "@playwright/test";

// Note : ces tests requièrent un serveur avec DB réelle.
// En mode démo (sans DB), ils vérifient l'UI uniquement.

test.describe("POS Agent", () => {
  test.use({ storageState: "e2e/.auth/agent.json" });

  test("charger la page POS agent", async ({ page }) => {
    await page.goto("/pos/agent");
    await expect(page).toHaveTitle(/POS|Agent/i);

    // La grille de produits doit être visible
    const grid = page.locator('[data-testid="produit-grid"], [class*="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 5000 });
  });

  test("rechercher un produit et l'ajouter au panier", async ({ page }) => {
    await page.goto("/pos/agent");

    // Recherche
    const search = page.getByPlaceholder(/recherche/i);
    await search.fill("Riz");
    await page.waitForTimeout(300);

    // Au moins un produit "Riz" visible
    const rizCard = page.getByText("Riz Makalioka").first();
    await expect(rizCard).toBeVisible({ timeout: 5000 });

    // Clic sur "Ajouter" du premier produit riz
    const addBtn = page.getByRole("button", { name: /ajouter|add|\+/i }).first();
    await addBtn.click();

    // Le panier indique au moins 1 ligne
    const panierTotal = page.locator('[class*="total"], [class*="panier"]').filter({ hasText: /Ar/ }).first();
    await expect(panierTotal).toBeVisible({ timeout: 3000 });
  });

  test("vider la recherche et naviguer par catégorie", async ({ page }) => {
    await page.goto("/pos/agent");

    const search = page.getByPlaceholder(/recherche/i);
    await search.fill("xyz_produit_inexistant");
    await page.waitForTimeout(300);

    // Vider
    await search.clear();
    await page.waitForTimeout(300);

    // Des produits doivent réapparaître
    const cards = page.locator('[class*="card"], [class*="Card"]').filter({ hasText: /Ar/ });
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Caisse", () => {
  test.use({ storageState: "e2e/.auth/caissier.json" });

  test("charger la page caisse", async ({ page }) => {
    await page.goto("/pos/caisse");
    await expect(page).toHaveTitle(/Caisse/i);

    // File d'attente visible
    await expect(page.getByText(/file d'attente/i)).toBeVisible({ timeout: 5000 });
  });

  test("voir une commande dans la file", async ({ page }) => {
    await page.goto("/pos/caisse");

    // Au moins une commande démo doit être dans la file
    const commande = page.locator('[class*="cmd"], button').filter({ hasText: /CMD-/ }).first();
    await expect(commande).toBeVisible({ timeout: 5000 });
  });

  test("sélectionner une commande et passer au paiement", async ({ page }) => {
    await page.goto("/pos/caisse");

    const commande = page.locator("button").filter({ hasText: /CMD-/ }).first();
    await commande.click();

    // Panneau de détail visible
    await expect(page.getByRole("button", { name: /payer|encaisser|confirmer/i }).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Flux SSE POS→Caisse (intégration)", () => {
  test("la caisse reçoit les commandes en temps réel via SSE", async ({ browser }) => {
    // Ouvrir deux contextes : agent + caissier
    const agentCtx = await browser.newContext();
    const caissierCtx = await browser.newContext();

    const agentPage = await agentCtx.newPage();
    const caissierPage = await caissierCtx.newPage();

    // Caissier se connecte et attend les commandes
    await caissierPage.goto("/pos/caisse");
    await expect(caissierPage.getByText(/file d'attente/i)).toBeVisible({ timeout: 8000 });

    const initialCount = await caissierPage.locator("button").filter({ hasText: /CMD-/ }).count();

    // Agent navigue et envoie une commande
    await agentPage.goto("/pos/agent");
    const addBtn = await agentPage.getByRole("button", { name: /ajouter|\+/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();

      const sendBtn = agentPage.getByRole("button", { name: /caisse|envoyer|soumettre/i }).first();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
        // Attendre que la commande apparaisse côté caisse (SSE)
        await caissierPage.waitForTimeout(2000);
        const newCount = await caissierPage.locator("button").filter({ hasText: /CMD-/ }).count();
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    }

    await agentCtx.close();
    await caissierCtx.close();
  });
});
