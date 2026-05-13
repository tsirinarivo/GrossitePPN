/**
 * Script de seed — données initiales pour Grossiste PPN Madagascar
 * Usage : DATABASE_URL=... pnpm tsx src/lib/db/seed.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env["DATABASE_URL"];
if (!url) throw new Error("DATABASE_URL manquant");

const client = postgres(url);
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Seed Grossiste PPN Madagascar...");

  // 1. Entreprise (singleton)
  await db.insert(schema.entreprise).values({
    id: "singleton",
    nom: "Grossiste PPN SARL",
    nif: "3000123456",
    stat: "46900 11 2024 0 12345",
    rcs: "2024 B 00789",
    adresse: "Lot II M 45 Bis, Analakely, Antananarivo 101",
    telephone: "+261 34 12 000 00",
    email: "contact@grossiteppn.mg",
    siteWeb: "https://grossiteppn.mg",
    assujettieTV: false,
    tauxTVADefaut: 20,
    prefixeFacture: "FAC",
    dernierNumeroFacture: 0,
    ecommerceActif: true,
    fideliteActif: true,
    fuseauHoraire: "Indian/Antananarivo",
    devise: "MGA",
    langueDefaut: "fr",
  }).onConflictDoNothing();

  // 2. Dépôts
  await db.insert(schema.depots).values([
    { id: "depot-tana", nom: "Dépôt principal Antananarivo", adresse: "Zone Industrielle Forello, Tanjombato", actif: true, estPrincipal: true },
    { id: "depot-tama", nom: "Dépôt Tamatave", adresse: "Bazar Be, Tamatave", actif: true, estPrincipal: false },
  ]).onConflictDoNothing();

  // 3. Catégories
  const cats = [
    { id: "cat-riz", nom: "Riz", nomMG: "Vary", slug: "riz", icone: "🌾", ordre: 1 },
    { id: "cat-huile", nom: "Huile", nomMG: "Menaka", slug: "huile", icone: "🫙", ordre: 2 },
    { id: "cat-sucre", nom: "Sucre & Sel", nomMG: "Siramamy & Sira", slug: "sucre", icone: "🍬", ordre: 3 },
    { id: "cat-savon", nom: "Hygiène", nomMG: "Fanadiovana", slug: "hygiene", icone: "🧼", ordre: 4 },
    { id: "cat-lait", nom: "Lait & Conserves", nomMG: "Ronono", slug: "lait", icone: "🥛", ordre: 5 },
    { id: "cat-farine", nom: "Farine & Céréales", nomMG: "Harina", slug: "farine", icone: "🌾", ordre: 6 },
  ];
  await db.insert(schema.categories).values(cats).onConflictDoNothing();

  // 4. Produits
  const produits = [
    { id: "p-riz-maka", code: "RIZ-MAKA-001", nom: "Riz Makalioka", nomMG: "Vary Makalioka", categorieId: "cat-riz", uniteBase: "kg", seuilAlerte: 500, prixAchatMoyenPondere: 2500, prixVenteGros: 2800, prixVenteSemiGros: 3000, prixVenteDetail: 3200, visibleEcommerce: true, actif: true },
    { id: "p-huile-tiko", code: "HUI-TIKO-001", nom: "Huile Tiko 1L", nomMG: "Menaka Tiko", categorieId: "cat-huile", uniteBase: "bouteille", seuilAlerte: 120, prixAchatMoyenPondere: 9500, prixVenteGros: 10500, prixVenteSemiGros: 11000, prixVenteDetail: 12000, visibleEcommerce: true, actif: true },
    { id: "p-sucre-bla", code: "SUC-BLA-001", nom: "Sucre Blanc", nomMG: "Siramamy Fotsy", categorieId: "cat-sucre", uniteBase: "kg", seuilAlerte: 200, prixAchatMoyenPondere: 4000, prixVenteGros: 4500, prixVenteSemiGros: 4650, prixVenteDetail: 4800, visibleEcommerce: true, actif: true },
    { id: "p-savon-mad", code: "SAV-MAD-001", nom: "Savon Madar", nomMG: "Savony Madar", categorieId: "cat-savon", uniteBase: "pièce", seuilAlerte: 300, prixAchatMoyenPondere: 600, prixVenteGros: 700, prixVenteSemiGros: 750, prixVenteDetail: 800, visibleEcommerce: true, actif: true },
    { id: "p-lait-glo", code: "LAI-GLO-001", nom: "Lait Gloria concentré", nomMG: "Ronono Gloria", categorieId: "cat-lait", uniteBase: "boîte", seuilAlerte: 96, prixAchatMoyenPondere: 3500, prixVenteGros: 4000, prixVenteSemiGros: 4200, prixVenteDetail: 4500, visibleEcommerce: true, actif: true },
    { id: "p-sel-fin", code: "SEL-FIN-001", nom: "Sel Fin", nomMG: "Sira Kely", categorieId: "cat-sucre", uniteBase: "kg", seuilAlerte: 100, prixAchatMoyenPondere: 800, prixVenteGros: 900, prixVenteSemiGros: 950, prixVenteDetail: 1000, visibleEcommerce: true, actif: true },
  ];
  await db.insert(schema.produits).values(produits).onConflictDoNothing();

  // 5. Unités de vente
  const unites = [
    // Riz
    { id: "uv-riz-kg", produitId: "p-riz-maka", nom: "kg", facteurConversion: 1, estDefaut: true, ordre: 0, prixGros: 2800, prixSemiGros: 3000, prixDetail: 3200 },
    { id: "uv-riz-sac25", produitId: "p-riz-maka", nom: "Sac 25 kg", facteurConversion: 25, estDefaut: false, ordre: 1, prixGros: 68000, prixSemiGros: 73000, prixDetail: 78000 },
    { id: "uv-riz-sac50", produitId: "p-riz-maka", nom: "Sac 50 kg", facteurConversion: 50, estDefaut: false, ordre: 2, prixGros: 135000, prixSemiGros: 145000, prixDetail: 155000 },
    // Huile
    { id: "uv-hui-btl", produitId: "p-huile-tiko", nom: "Bouteille", facteurConversion: 1, estDefaut: true, ordre: 0, prixGros: 10500, prixSemiGros: 11000, prixDetail: 12000 },
    { id: "uv-hui-ctn", produitId: "p-huile-tiko", nom: "Carton 12 btl", facteurConversion: 12, estDefaut: false, ordre: 1, prixGros: 120000, prixSemiGros: 126000, prixDetail: 138000 },
    // Sucre
    { id: "uv-suc-kg", produitId: "p-sucre-bla", nom: "kg", facteurConversion: 1, estDefaut: true, ordre: 0, prixGros: 4500, prixSemiGros: 4650, prixDetail: 4800 },
    { id: "uv-suc-sac", produitId: "p-sucre-bla", nom: "Sac 50 kg", facteurConversion: 50, estDefaut: false, ordre: 1, prixGros: 220000, prixSemiGros: 228000, prixDetail: 235000 },
    // Savon
    { id: "uv-sav-pce", produitId: "p-savon-mad", nom: "Pièce", facteurConversion: 1, estDefaut: true, ordre: 0, prixGros: 700, prixSemiGros: 750, prixDetail: 800 },
    { id: "uv-sav-ctn", produitId: "p-savon-mad", nom: "Carton 100 pcs", facteurConversion: 100, estDefaut: false, ordre: 1, prixGros: 68000, prixSemiGros: 72000, prixDetail: 77000 },
    // Lait
    { id: "uv-lai-bte", produitId: "p-lait-glo", nom: "Boîte", facteurConversion: 1, estDefaut: true, ordre: 0, prixGros: 4000, prixSemiGros: 4200, prixDetail: 4500 },
    { id: "uv-lai-ctn", produitId: "p-lait-glo", nom: "Carton 48 btes", facteurConversion: 48, estDefaut: false, ordre: 1, prixGros: 185000, prixSemiGros: 196000, prixDetail: 210000 },
    // Sel
    { id: "uv-sel-kg", produitId: "p-sel-fin", nom: "kg", facteurConversion: 1, estDefaut: true, ordre: 0, prixGros: 900, prixSemiGros: 950, prixDetail: 1000 },
    { id: "uv-sel-sac", produitId: "p-sel-fin", nom: "Sac 25 kg", facteurConversion: 25, estDefaut: false, ordre: 1, prixGros: 21000, prixSemiGros: 22500, prixDetail: 24000 },
  ];
  await db.insert(schema.unitesVente).values(unites).onConflictDoNothing();

  // 6. Stocks initiaux (dépôt principal)
  const stocksInit = [
    { id: "st-riz-tana", produitId: "p-riz-maka", depotId: "depot-tana", quantiteBase: 2500 },
    { id: "st-hui-tana", produitId: "p-huile-tiko", depotId: "depot-tana", quantiteBase: 48 },
    { id: "st-suc-tana", produitId: "p-sucre-bla", depotId: "depot-tana", quantiteBase: 3000 },
    { id: "st-sav-tana", produitId: "p-savon-mad", depotId: "depot-tana", quantiteBase: 2400 },
    { id: "st-lai-tana", produitId: "p-lait-glo", depotId: "depot-tana", quantiteBase: 96 },
    { id: "st-sel-tana", produitId: "p-sel-fin", depotId: "depot-tana", quantiteBase: 1200 },
  ];
  await db.insert(schema.stocks).values(stocksInit).onConflictDoNothing();

  // 7. Clients
  const clients = [
    { id: "c-rabe", code: "CLI-001", raisonSociale: "Épicerie Rabe", telephone: "+261341234567", palier: "gros" as const, creditAutorise: true, plafondCredit: 8_000_000, encoursCourant: 4_500_000, pointsFidelite: 1240, actif: true },
    { id: "c-tana", code: "CLI-002", raisonSociale: "Tana Distribution", telephone: "+261335567890", palier: "gros" as const, creditAutorise: true, plafondCredit: 7_000_000, encoursCourant: 9_200_000, pointsFidelite: 2180, actif: true },
    { id: "c-soa", code: "CLI-003", raisonSociale: "Magasin Soa", telephone: "+261321122334", palier: "semi_gros" as const, creditAutorise: true, plafondCredit: 2_000_000, encoursCourant: 850_000, pointsFidelite: 420, actif: true },
    { id: "c-tiana", code: "CLI-004", raisonSociale: "Boutique Tiana", telephone: "+261347890123", palier: "detail" as const, creditAutorise: false, plafondCredit: 500_000, encoursCourant: 0, pointsFidelite: 95, actif: true },
  ];
  await db.insert(schema.clients).values(clients).onConflictDoNothing();

  console.log("✅ Seed terminé !");
  console.log("   → Commandes suivantes pour activer la DB :");
  console.log("   DATABASE_URL=<neon_url> pnpm drizzle-kit push");
  console.log("   DATABASE_URL=<neon_url> pnpm tsx src/lib/db/seed.ts");
}

seed().catch((e) => {
  console.error("❌ Seed échoué :", e);
  process.exit(1);
});
