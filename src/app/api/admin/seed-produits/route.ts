import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// ── Catégories ────────────────────────────────────────────────────────────────
const CATS = [
  { id: "cat-riz",       nom: "Riz",               nomMG: "Vary",             slug: "riz",        icone: "🌾", ordre: 1 },
  { id: "cat-huile",     nom: "Huile",              nomMG: "Menaka",           slug: "huile",      icone: "🫙", ordre: 2 },
  { id: "cat-sucre",     nom: "Sucre & Sel",        nomMG: "Siramamy & Sira",  slug: "sucre",      icone: "🍬", ordre: 3 },
  { id: "cat-hygiene",   nom: "Hygiène",            nomMG: "Fanadiovana",      slug: "hygiene",    icone: "🧼", ordre: 4 },
  { id: "cat-lait",      nom: "Lait & Conserves",   nomMG: "Ronono",           slug: "lait",       icone: "🥛", ordre: 5 },
  { id: "cat-farine",    nom: "Farine & Céréales",  nomMG: "Harina",           slug: "farine",     icone: "🌾", ordre: 6 },
  { id: "cat-boissons",  nom: "Boissons",           nomMG: "Zava-pisotro",     slug: "boissons",   icone: "🥤", ordre: 7 },
  { id: "cat-epices",    nom: "Épices & Condiments",nomMG: "Fanina",           slug: "epices",     icone: "🌶️", ordre: 8 },
  { id: "cat-conserves", nom: "Conserves",          nomMG: "Boaty",            slug: "conserves",  icone: "🥫", ordre: 9 },
  { id: "cat-legumes",   nom: "Légumineuses",       nomMG: "Voanemba",         slug: "legumes",    icone: "🫘", ordre: 10 },
];

// ── Produits + unités de vente ────────────────────────────────────────────────
type UV = {
  id: string; nom: string; facteurConversion: number;
  prixGros: number; prixSemiGros: number; prixDetail: number;
  estDefaut?: boolean; ordre?: number; codeBarres?: string;
};
type ProduitSeed = {
  id: string; code: string; nom: string; nomMG: string;
  categorieId: string; uniteBase: string;
  seuilAlerte: number; stockTana: number;
  prixAchat: number; prixGros: number; prixSemiGros: number; prixDetail: number;
  unitesVente: UV[];
};

const PRODUITS: ProduitSeed[] = [
  // ── RIZ ──────────────────────────────────────────────────────────────────
  {
    id: "p-riz-maka", code: "RIZ-MAKA-001", nom: "Riz Makalioka", nomMG: "Vary Makalioka",
    categorieId: "cat-riz", uniteBase: "kg", seuilAlerte: 500, stockTana: 5000,
    prixAchat: 2500, prixGros: 2800, prixSemiGros: 3000, prixDetail: 3200,
    unitesVente: [
      { id: "uv-maka-kg",  nom: "kg",       facteurConversion: 1,  prixGros: 2800,  prixSemiGros: 3000,  prixDetail: 3200,  estDefaut: true,  ordre: 0, codeBarres: "6111000000001" },
      { id: "uv-maka-25",  nom: "Sac 25 kg",facteurConversion: 25, prixGros: 68000, prixSemiGros: 73000, prixDetail: 78000, estDefaut: false, ordre: 1, codeBarres: "6111000000002" },
      { id: "uv-maka-50",  nom: "Sac 50 kg",facteurConversion: 50, prixGros: 133000,prixSemiGros: 145000,prixDetail: 155000,estDefaut: false, ordre: 2, codeBarres: "6111000000003" },
    ],
  },
  {
    id: "p-riz-tsip", code: "RIZ-TSIP-001", nom: "Riz Tsipala", nomMG: "Vary Tsipala",
    categorieId: "cat-riz", uniteBase: "kg", seuilAlerte: 300, stockTana: 3000,
    prixAchat: 2200, prixGros: 2450, prixSemiGros: 2600, prixDetail: 2800,
    unitesVente: [
      { id: "uv-tsip-kg", nom: "kg",        facteurConversion: 1,  prixGros: 2450, prixSemiGros: 2600, prixDetail: 2800,  estDefaut: true,  ordre: 0 },
      { id: "uv-tsip-50", nom: "Sac 50 kg", facteurConversion: 50, prixGros: 118000,prixSemiGros: 125000,prixDetail: 135000,estDefaut: false, ordre: 1, codeBarres: "6111000000004" },
    ],
  },
  {
    id: "p-riz-rojo", code: "RIZ-ROJO-001", nom: "Riz Rouge", nomMG: "Vary Mena",
    categorieId: "cat-riz", uniteBase: "kg", seuilAlerte: 100, stockTana: 800,
    prixAchat: 3200, prixGros: 3600, prixSemiGros: 3800, prixDetail: 4000,
    unitesVente: [
      { id: "uv-rojo-kg", nom: "kg",        facteurConversion: 1,  prixGros: 3600,  prixSemiGros: 3800,  prixDetail: 4000,  estDefaut: true,  ordre: 0 },
      { id: "uv-rojo-25", nom: "Sac 25 kg", facteurConversion: 25, prixGros: 87000, prixSemiGros: 93000, prixDetail: 98000, estDefaut: false, ordre: 1 },
    ],
  },
  // ── HUILE ─────────────────────────────────────────────────────────────────
  {
    id: "p-hui-tiko1", code: "HUI-TIKO-1L", nom: "Huile Tiko 1L", nomMG: "Menaka Tiko 1L",
    categorieId: "cat-huile", uniteBase: "bouteille", seuilAlerte: 120, stockTana: 600,
    prixAchat: 9500, prixGros: 10500, prixSemiGros: 11000, prixDetail: 12000,
    unitesVente: [
      { id: "uv-tiko1-btl", nom: "Bouteille 1L",  facteurConversion: 1,  prixGros: 10500, prixSemiGros: 11000, prixDetail: 12000, estDefaut: true,  ordre: 0, codeBarres: "6111000000010" },
      { id: "uv-tiko1-ctn", nom: "Carton 12 btl", facteurConversion: 12, prixGros: 122000,prixSemiGros: 128000,prixDetail: 138000,estDefaut: false, ordre: 1, codeBarres: "6111000000011" },
    ],
  },
  {
    id: "p-hui-tiko5", code: "HUI-TIKO-5L", nom: "Huile Tiko 5L", nomMG: "Menaka Tiko 5L",
    categorieId: "cat-huile", uniteBase: "bidon", seuilAlerte: 48, stockTana: 240,
    prixAchat: 44000, prixGros: 50000, prixSemiGros: 53000, prixDetail: 57000,
    unitesVente: [
      { id: "uv-tiko5-bdn", nom: "Bidon 5L",      facteurConversion: 1, prixGros: 50000, prixSemiGros: 53000, prixDetail: 57000, estDefaut: true,  ordre: 0, codeBarres: "6111000000012" },
      { id: "uv-tiko5-ctn", nom: "Carton 4 bidons",facteurConversion: 4, prixGros: 196000,prixSemiGros: 208000,prixDetail: 224000,estDefaut: false, ordre: 1 },
    ],
  },
  {
    id: "p-hui-palme", code: "HUI-PALM-001", nom: "Huile de palme", nomMG: "Menaka palmiera",
    categorieId: "cat-huile", uniteBase: "litre", seuilAlerte: 200, stockTana: 1000,
    prixAchat: 7500, prixGros: 8500, prixSemiGros: 9000, prixDetail: 9800,
    unitesVente: [
      { id: "uv-palm-l",   nom: "Litre",      facteurConversion: 1,  prixGros: 8500,  prixSemiGros: 9000,  prixDetail: 9800,  estDefaut: true,  ordre: 0 },
      { id: "uv-palm-20l", nom: "Bidon 20L",  facteurConversion: 20, prixGros: 162000,prixSemiGros: 172000,prixDetail: 188000,estDefaut: false, ordre: 1 },
    ],
  },
  // ── SUCRE & SEL ───────────────────────────────────────────────────────────
  {
    id: "p-sucre-bl", code: "SUC-BLA-001", nom: "Sucre Blanc", nomMG: "Siramamy Fotsy",
    categorieId: "cat-sucre", uniteBase: "kg", seuilAlerte: 200, stockTana: 4000,
    prixAchat: 4000, prixGros: 4500, prixSemiGros: 4650, prixDetail: 4800,
    unitesVente: [
      { id: "uv-sbl-kg",  nom: "kg",       facteurConversion: 1,  prixGros: 4500,  prixSemiGros: 4650,  prixDetail: 4800,  estDefaut: true,  ordre: 0 },
      { id: "uv-sbl-50",  nom: "Sac 50 kg",facteurConversion: 50, prixGros: 218000,prixSemiGros: 228000,prixDetail: 235000,estDefaut: false, ordre: 1, codeBarres: "6111000000020" },
    ],
  },
  {
    id: "p-sel-fin", code: "SEL-FIN-001", nom: "Sel Fin", nomMG: "Sira Kely",
    categorieId: "cat-sucre", uniteBase: "kg", seuilAlerte: 100, stockTana: 2000,
    prixAchat: 800, prixGros: 950, prixSemiGros: 1000, prixDetail: 1100,
    unitesVente: [
      { id: "uv-sef-kg",  nom: "kg",       facteurConversion: 1,  prixGros: 950,   prixSemiGros: 1000,  prixDetail: 1100,  estDefaut: true,  ordre: 0 },
      { id: "uv-sef-25",  nom: "Sac 25 kg",facteurConversion: 25, prixGros: 22000, prixSemiGros: 24000, prixDetail: 26500, estDefaut: false, ordre: 1, codeBarres: "6111000000021" },
    ],
  },
  {
    id: "p-sel-gros", code: "SEL-GRO-001", nom: "Sel Gros (Marin)", nomMG: "Sira Be",
    categorieId: "cat-sucre", uniteBase: "kg", seuilAlerte: 100, stockTana: 3000,
    prixAchat: 500, prixGros: 600, prixSemiGros: 650, prixDetail: 750,
    unitesVente: [
      { id: "uv-seg-kg",  nom: "kg",       facteurConversion: 1,  prixGros: 600,   prixSemiGros: 650,   prixDetail: 750,   estDefaut: true,  ordre: 0 },
      { id: "uv-seg-50",  nom: "Sac 50 kg",facteurConversion: 50, prixGros: 28000, prixSemiGros: 31000, prixDetail: 36000, estDefaut: false, ordre: 1 },
    ],
  },
  // ── FARINE & CÉRÉALES ─────────────────────────────────────────────────────
  {
    id: "p-far-mixa", code: "FAR-MIX-001", nom: "Farine Mixa", nomMG: "Harina Mixa",
    categorieId: "cat-farine", uniteBase: "kg", seuilAlerte: 150, stockTana: 1500,
    prixAchat: 3600, prixGros: 4000, prixSemiGros: 4200, prixDetail: 4500,
    unitesVente: [
      { id: "uv-fmx-kg",  nom: "kg",       facteurConversion: 1,  prixGros: 4000,  prixSemiGros: 4200,  prixDetail: 4500,  estDefaut: true,  ordre: 0 },
      { id: "uv-fmx-25",  nom: "Sac 25 kg",facteurConversion: 25, prixGros: 96000, prixSemiGros: 102000,prixDetail: 108000,estDefaut: false, ordre: 1, codeBarres: "6111000000030" },
    ],
  },
  {
    id: "p-mais-grain", code: "MAI-GRA-001", nom: "Maïs en grains", nomMG: "Katsaka",
    categorieId: "cat-farine", uniteBase: "kg", seuilAlerte: 100, stockTana: 2000,
    prixAchat: 1500, prixGros: 1800, prixSemiGros: 1950, prixDetail: 2100,
    unitesVente: [
      { id: "uv-mais-kg", nom: "kg",        facteurConversion: 1,  prixGros: 1800,  prixSemiGros: 1950,  prixDetail: 2100,  estDefaut: true,  ordre: 0 },
      { id: "uv-mais-50", nom: "Sac 50 kg", facteurConversion: 50, prixGros: 86000, prixSemiGros: 94000, prixDetail: 102000,estDefaut: false, ordre: 1 },
    ],
  },
  // ── LAIT & CONSERVES ──────────────────────────────────────────────────────
  {
    id: "p-lait-glo", code: "LAI-GLO-001", nom: "Lait Gloria concentré", nomMG: "Ronono Gloria",
    categorieId: "cat-lait", uniteBase: "boîte", seuilAlerte: 96, stockTana: 480,
    prixAchat: 3500, prixGros: 4000, prixSemiGros: 4200, prixDetail: 4500,
    unitesVente: [
      { id: "uv-glo-bte", nom: "Boîte",        facteurConversion: 1,  prixGros: 4000,  prixSemiGros: 4200,  prixDetail: 4500,  estDefaut: true,  ordre: 0, codeBarres: "6111000000040" },
      { id: "uv-glo-ctn", nom: "Carton 48 btes",facteurConversion: 48, prixGros: 186000,prixSemiGros: 196000,prixDetail: 210000,estDefaut: false, ordre: 1, codeBarres: "6111000000041" },
    ],
  },
  {
    id: "p-lait-mixt", code: "LAI-MXT-001", nom: "Lait Mixtex en poudre 500g", nomMG: "Vovon-dronono Mixtex",
    categorieId: "cat-lait", uniteBase: "sachet", seuilAlerte: 60, stockTana: 300,
    prixAchat: 8500, prixGros: 9500, prixSemiGros: 10000, prixDetail: 11000,
    unitesVente: [
      { id: "uv-mxt-sch", nom: "Sachet 500g",   facteurConversion: 1, prixGros: 9500,  prixSemiGros: 10000, prixDetail: 11000, estDefaut: true,  ordre: 0, codeBarres: "6111000000042" },
      { id: "uv-mxt-ctn", nom: "Carton 12 pcs", facteurConversion: 12,prixGros: 110000,prixSemiGros: 116000,prixDetail: 128000,estDefaut: false, ordre: 1 },
    ],
  },
  // ── CONSERVES ─────────────────────────────────────────────────────────────
  {
    id: "p-sard-pech", code: "SAR-PEC-001", nom: "Sardines Pêcheur 425g", nomMG: "Trondro Pêcheur",
    categorieId: "cat-conserves", uniteBase: "boîte", seuilAlerte: 72, stockTana: 360,
    prixAchat: 3200, prixGros: 3700, prixSemiGros: 3900, prixDetail: 4200,
    unitesVente: [
      { id: "uv-srd-bte", nom: "Boîte 425g",    facteurConversion: 1,  prixGros: 3700,  prixSemiGros: 3900,  prixDetail: 4200,  estDefaut: true,  ordre: 0, codeBarres: "6111000000050" },
      { id: "uv-srd-ctn", nom: "Carton 24 btes", facteurConversion: 24, prixGros: 86000, prixSemiGros: 91000, prixDetail: 98000, estDefaut: false, ordre: 1, codeBarres: "6111000000051" },
    ],
  },
  {
    id: "p-tom-conc", code: "TOM-CON-001", nom: "Concentré Tomate 70g", nomMG: "Voatabia voatery",
    categorieId: "cat-conserves", uniteBase: "tube", seuilAlerte: 100, stockTana: 500,
    prixAchat: 1200, prixGros: 1400, prixSemiGros: 1500, prixDetail: 1700,
    unitesVente: [
      { id: "uv-tom-tub", nom: "Tube 70g",      facteurConversion: 1,  prixGros: 1400,  prixSemiGros: 1500,  prixDetail: 1700,  estDefaut: true,  ordre: 0, codeBarres: "6111000000052" },
      { id: "uv-tom-ctn", nom: "Carton 50 tubes",facteurConversion: 50, prixGros: 66000, prixSemiGros: 72000, prixDetail: 82000, estDefaut: false, ordre: 1 },
    ],
  },
  // ── HYGIÈNE ───────────────────────────────────────────────────────────────
  {
    id: "p-sav-madar", code: "SAV-MAD-001", nom: "Savon Madar 200g", nomMG: "Savony Madar",
    categorieId: "cat-hygiene", uniteBase: "pièce", seuilAlerte: 200, stockTana: 1200,
    prixAchat: 600, prixGros: 700, prixSemiGros: 750, prixDetail: 850,
    unitesVente: [
      { id: "uv-smad-pce", nom: "Pièce",          facteurConversion: 1,   prixGros: 700,   prixSemiGros: 750,   prixDetail: 850,   estDefaut: true,  ordre: 0, codeBarres: "6111000000060" },
      { id: "uv-smad-ctn", nom: "Carton 100 pcs", facteurConversion: 100, prixGros: 67000, prixSemiGros: 72000, prixDetail: 82000, estDefaut: false, ordre: 1, codeBarres: "6111000000061" },
    ],
  },
  {
    id: "p-lss-omo", code: "LSS-OMO-001", nom: "Lessive OMO 500g", nomMG: "Savony Lamba OMO",
    categorieId: "cat-hygiene", uniteBase: "sachet", seuilAlerte: 60, stockTana: 300,
    prixAchat: 4500, prixGros: 5200, prixSemiGros: 5500, prixDetail: 6000,
    unitesVente: [
      { id: "uv-omo-sch", nom: "Sachet 500g",   facteurConversion: 1,  prixGros: 5200,  prixSemiGros: 5500,  prixDetail: 6000,  estDefaut: true,  ordre: 0, codeBarres: "6111000000062" },
      { id: "uv-omo-ctn", nom: "Carton 12 pcs", facteurConversion: 12, prixGros: 60000, prixSemiGros: 64000, prixDetail: 70000, estDefaut: false, ordre: 1 },
    ],
  },
  {
    id: "p-lss-bao", code: "LSS-BAO-001", nom: "Lessive Baobab 1kg", nomMG: "Savony Lamba Baobab",
    categorieId: "cat-hygiene", uniteBase: "sachet", seuilAlerte: 60, stockTana: 300,
    prixAchat: 5500, prixGros: 6500, prixSemiGros: 7000, prixDetail: 7800,
    unitesVente: [
      { id: "uv-bao-sch", nom: "Sachet 1kg",    facteurConversion: 1,  prixGros: 6500,  prixSemiGros: 7000,  prixDetail: 7800,  estDefaut: true,  ordre: 0, codeBarres: "6111000000063" },
      { id: "uv-bao-ctn", nom: "Carton 10 pcs", facteurConversion: 10, prixGros: 62000, prixSemiGros: 67000, prixDetail: 75000, estDefaut: false, ordre: 1 },
    ],
  },
  // ── BOISSONS ──────────────────────────────────────────────────────────────
  {
    id: "p-eau-crist", code: "EAU-CRI-001", nom: "Eau Cristal 1,5L", nomMG: "Rano Cristal",
    categorieId: "cat-boissons", uniteBase: "bouteille", seuilAlerte: 48, stockTana: 480,
    prixAchat: 1200, prixGros: 1400, prixSemiGros: 1500, prixDetail: 1700,
    unitesVente: [
      { id: "uv-cri-btl", nom: "Bouteille 1,5L", facteurConversion: 1,  prixGros: 1400,  prixSemiGros: 1500,  prixDetail: 1700,  estDefaut: true,  ordre: 0, codeBarres: "6111000000070" },
      { id: "uv-cri-crt", nom: "Carton 12 btl",  facteurConversion: 12, prixGros: 16000, prixSemiGros: 17500, prixDetail: 19500, estDefaut: false, ordre: 1, codeBarres: "6111000000071" },
    ],
  },
  {
    id: "p-soda-coco", code: "SOD-COC-001", nom: "Coca-Cola 33cl", nomMG: "Coca-Cola",
    categorieId: "cat-boissons", uniteBase: "canette", seuilAlerte: 24, stockTana: 240,
    prixAchat: 2200, prixGros: 2600, prixSemiGros: 2800, prixDetail: 3200,
    unitesVente: [
      { id: "uv-coc-can", nom: "Canette 33cl",  facteurConversion: 1,  prixGros: 2600,  prixSemiGros: 2800,  prixDetail: 3200,  estDefaut: true,  ordre: 0, codeBarres: "6111000000072" },
      { id: "uv-coc-crt", nom: "Carton 24 can", facteurConversion: 24, prixGros: 60000, prixSemiGros: 65000, prixDetail: 74000, estDefaut: false, ordre: 1, codeBarres: "6111000000073" },
    ],
  },
  {
    id: "p-jus-mang", code: "JUS-MAN-001", nom: "Jus Bonbon Anglais Mangue 33cl", nomMG: "Ranon-kazo Mangue",
    categorieId: "cat-boissons", uniteBase: "bouteille", seuilAlerte: 24, stockTana: 120,
    prixAchat: 1600, prixGros: 1900, prixSemiGros: 2100, prixDetail: 2400,
    unitesVente: [
      { id: "uv-jmg-btl", nom: "Bouteille 33cl", facteurConversion: 1,  prixGros: 1900,  prixSemiGros: 2100,  prixDetail: 2400,  estDefaut: true,  ordre: 0, codeBarres: "6111000000074" },
      { id: "uv-jmg-crt", nom: "Carton 24 btl",  facteurConversion: 24, prixGros: 44000, prixSemiGros: 49000, prixDetail: 56000, estDefaut: false, ordre: 1 },
    ],
  },
  // ── ÉPICES & CONDIMENTS ───────────────────────────────────────────────────
  {
    id: "p-kub-bouil", code: "KUB-STD-001", nom: "Cube Bouillon KUB OR (boîte 60)", nomMG: "Bouillon Cube",
    categorieId: "cat-epices", uniteBase: "boîte", seuilAlerte: 24, stockTana: 120,
    prixAchat: 3800, prixGros: 4400, prixSemiGros: 4700, prixDetail: 5200,
    unitesVente: [
      { id: "uv-kub-bte", nom: "Boîte 60 cubes",  facteurConversion: 1,  prixGros: 4400,  prixSemiGros: 4700,  prixDetail: 5200,  estDefaut: true,  ordre: 0, codeBarres: "6111000000080" },
      { id: "uv-kub-crt", nom: "Carton 12 boîtes", facteurConversion: 12, prixGros: 51000, prixSemiGros: 55000, prixDetail: 61000, estDefaut: false, ordre: 1 },
    ],
  },
  {
    id: "p-vanille", code: "VAN-MAD-001", nom: "Vanille de Madagascar", nomMG: "Lavanila Malagasy",
    categorieId: "cat-epices", uniteBase: "g", seuilAlerte: 50, stockTana: 500,
    prixAchat: 40000, prixGros: 48000, prixSemiGros: 52000, prixDetail: 58000,
    unitesVente: [
      { id: "uv-van-100g", nom: "100g",    facteurConversion: 100, prixGros: 4800,  prixSemiGros: 5200,  prixDetail: 5800,  estDefaut: true,  ordre: 0 },
      { id: "uv-van-1kg",  nom: "1 kg",    facteurConversion: 1000,prixGros: 46000, prixSemiGros: 50000, prixDetail: 56000, estDefaut: false, ordre: 1 },
    ],
  },
  // ── LÉGUMINEUSES ──────────────────────────────────────────────────────────
  {
    id: "p-voan-blan", code: "VOA-BLA-001", nom: "Haricots Blancs", nomMG: "Voanemba Fotsy",
    categorieId: "cat-legumes", uniteBase: "kg", seuilAlerte: 80, stockTana: 800,
    prixAchat: 3000, prixGros: 3500, prixSemiGros: 3700, prixDetail: 4000,
    unitesVente: [
      { id: "uv-vbla-kg",  nom: "kg",       facteurConversion: 1,  prixGros: 3500,  prixSemiGros: 3700,  prixDetail: 4000,  estDefaut: true,  ordre: 0 },
      { id: "uv-vbla-50",  nom: "Sac 50 kg",facteurConversion: 50, prixGros: 168000,prixSemiGros: 178000,prixDetail: 194000,estDefaut: false, ordre: 1 },
    ],
  },
  {
    id: "p-lentille", code: "LEN-MAD-001", nom: "Lentilles", nomMG: "Antatsimo",
    categorieId: "cat-legumes", uniteBase: "kg", seuilAlerte: 60, stockTana: 600,
    prixAchat: 3500, prixGros: 4200, prixSemiGros: 4500, prixDetail: 4800,
    unitesVente: [
      { id: "uv-len-kg",  nom: "kg",       facteurConversion: 1,  prixGros: 4200,  prixSemiGros: 4500,  prixDetail: 4800,  estDefaut: true,  ordre: 0 },
      { id: "uv-len-25",  nom: "Sac 25 kg",facteurConversion: 25, prixGros: 102000,prixSemiGros: 109000,prixDetail: 116000,estDefaut: false, ordre: 1 },
    ],
  },
];

// ── Seed handler ──────────────────────────────────────────────────────────────
export async function POST() {
  const now = new Date();
  const errors: string[] = [];
  let nbCategories = 0;
  let nbProduits = 0;
  let nbUnites = 0;
  let nbStocks = 0;

  // 1. Dépôts (nécessaires avant les stocks, FK)
  try {
    await db.insert(schema.depots).values([
      { id: "depot-tana", nom: "Dépôt principal Antananarivo", adresse: "Zone Industrielle Forello, Tanjombato", actif: true, estPrincipal: true },
      { id: "depot-tama", nom: "Dépôt Tamatave", adresse: "Bazar Be, Tamatave", actif: true, estPrincipal: false },
    ]).onConflictDoNothing();
  } catch (e) {
    errors.push(`depots: ${e}`);
  }

  // 2. Catégories
  try {
    await db.insert(schema.categories).values(CATS).onConflictDoNothing();
    nbCategories = CATS.length;
  } catch (e) {
    errors.push(`categories: ${e}`);
  }

  // 3. Produits + unités + stocks — chaque produit est indépendant
  for (const p of PRODUITS) {
    // Produit
    try {
      await db.insert(schema.produits).values({
        id: p.id,
        code: p.code,
        nom: p.nom,
        nomMG: p.nomMG,
        categorieId: p.categorieId,
        uniteBase: p.uniteBase,
        seuilAlerte: p.seuilAlerte,
        prixAchatMoyenPondere: p.prixAchat,
        prixVenteGros: p.prixGros,
        prixVenteSemiGros: p.prixSemiGros,
        prixVenteDetail: p.prixDetail,
        tauxTVA: 0,
        visibleEcommerce: true,
        actif: true,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing();
      nbProduits++;
    } catch (e) {
      errors.push(`produit ${p.code}: ${e}`);
      continue; // skip units/stock if product failed
    }

    // Unités de vente
    for (const [i, uv] of p.unitesVente.entries()) {
      try {
        await db.insert(schema.unitesVente).values({
          id: uv.id,
          produitId: p.id,
          nom: uv.nom,
          facteurConversion: uv.facteurConversion,
          prixGros: uv.prixGros,
          prixSemiGros: uv.prixSemiGros,
          prixDetail: uv.prixDetail,
          codeBarres: uv.codeBarres ?? null,
          estDefaut: uv.estDefaut ?? i === 0,
          ordre: uv.ordre ?? i,
        }).onConflictDoNothing();
        nbUnites++;
      } catch (e) {
        errors.push(`unite ${uv.id}: ${e}`);
      }
    }

    // Stock dépôt Tana (onConflictDoNothing — le stock sera mis à jour manuellement)
    try {
      await db.insert(schema.stocks).values({
        id: `st-${p.id}-tana`,
        produitId: p.id,
        depotId: "depot-tana",
        quantiteBase: p.stockTana,
        updatedAt: now,
      }).onConflictDoNothing();
      nbStocks++;
    } catch (e) {
      errors.push(`stock ${p.id}: ${e}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    categories: nbCategories,
    produits: nbProduits,
    unitesVente: nbUnites,
    stocks: nbStocks,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function GET() {
  const [produits, categories, stocks] = await Promise.all([
    db.select({ id: schema.produits.id, nom: schema.produits.nom, code: schema.produits.code })
      .from(schema.produits).limit(50),
    db.select().from(schema.categories),
    db.select({ produitId: schema.stocks.produitId, qty: schema.stocks.quantiteBase })
      .from(schema.stocks),
  ]);
  return NextResponse.json({
    produits: produits.length,
    categories: categories.length,
    stocks: stocks.length,
    liste: produits,
  });
}
