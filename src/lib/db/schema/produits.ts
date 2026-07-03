import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  real,
} from "drizzle-orm/pg-core";
import { depots } from "./entreprise";

export const categorieEnum = pgEnum("categorie_produit", [
  "riz",
  "huile",
  "sucre",
  "farine",
  "sel",
  "savon",
  "lait",
  "conserves",
  "boissons",
  "epices",
  "legumineuses",
  "cereales",
  "hygiene",
  "autre",
]);

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  nom: text("nom").notNull(),
  nomMG: text("nom_mg"),
  slug: text("slug").notNull().unique(),
  icone: text("icone"),
  couleur: text("couleur"),
  ordre: integer("ordre").default(0),
  actif: boolean("actif").default(true).notNull(),
  parentId: text("parent_id"),
});

export const produits = pgTable(
  "produits",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id"),
    code: text("code").notNull(),
    nom: text("nom").notNull(),
    nomMG: text("nom_mg"),
    description: text("description"),
    descriptionMG: text("description_mg"),
    categorieId: text("categorie_id").references(() => categories.id),
    marque: text("marque"),
    photos: jsonb("photos").$type<string[]>().default([]),

    // Unité de base (stockage interne)
    uniteBase: text("unite_base").notNull(),

    // Prix d'achat moyen pondéré (en unité de base)
    prixAchatMoyenPondere: integer("prix_achat_moyen_pondere").default(0),

    // Paliers de prix pour l'unité de base
    prixVenteGros: integer("prix_vente_gros"),
    prixVenteSemiGros: integer("prix_vente_semi_gros"),
    prixVenteDetail: integer("prix_vente_detail"),

    // TVA
    tauxTVA: integer("taux_tva").default(0).notNull(),
    exonereTVA: boolean("exonere_tva").default(false).notNull(),

    // Stock
    seuilAlerte: integer("seuil_alerte").default(0),
    stockReserveEcommerce: integer("stock_reserve_ecommerce").default(0).notNull(),

    // DLC/DLUO pour denrées
    aDLC: boolean("a_dlc").default(false).notNull(),

    // E-commerce
    visibleEcommerce: boolean("visible_ecommerce").default(false).notNull(),
    prixEcommerce: integer("prix_ecommerce"),
    descriptionEcommerce: text("description_ecommerce"),
    stockDedieEcommerce: boolean("stock_dedie_ecommerce").default(false).notNull(),

    actif: boolean("actif").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("produits_categorie_idx").on(t.categorieId),
    // Code unique PAR tenant (permet à chaque tenant de réutiliser ses codes)
    uniqueIndex("produits_tenant_code_uidx").on(t.tenantId, t.code),
  ]
);

/** Unités de vente — une par conditionnement (kg, sac 50kg, carton de 12…) */
export const unitesVente = pgTable(
  "unites_vente",
  {
    id: text("id").primaryKey(),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id, { onDelete: "cascade" }),
    nom: text("nom").notNull(),
    facteurConversion: real("facteur_conversion").notNull(),
    codeBarres: text("code_barres"),
    // Prix par palier pour CETTE unité
    prixGros: integer("prix_gros"),
    prixSemiGros: integer("prix_semi_gros"),
    prixDetail: integer("prix_detail"),
    prixAchat: integer("prix_achat"),
    // Config
    estDefaut: boolean("est_defaut").default(false).notNull(),
    ordre: integer("ordre").default(0),
  },
  (t) => [
    index("unites_vente_produit_idx").on(t.produitId),
    uniqueIndex("unites_vente_code_barres_idx").on(t.codeBarres),
  ]
);

/** Stock par dépôt (toujours en unité de base) */
export const stocks = pgTable(
  "stocks",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id"),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id, { onDelete: "cascade" }),
    depotId: text("depot_id")
      .notNull()
      .references(() => depots.id, { onDelete: "cascade" }),
    quantiteBase: real("quantite_base").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("stocks_produit_depot_idx").on(t.produitId, t.depotId),
  ]
);

/** Lots (numéros de lot + DLC pour traçabilité FIFO/FEFO) */
export const lots = pgTable(
  "lots",
  {
    id: text("id").primaryKey(),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id, { onDelete: "cascade" }),
    depotId: text("depot_id")
      .notNull()
      .references(() => depots.id),
    numeroLot: text("numero_lot"),
    dateExpiration: timestamp("date_expiration"),
    quantiteBase: real("quantite_base").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("lots_produit_depot_idx").on(t.produitId, t.depotId)]
);

/** Mouvements de stock (entrées, sorties, transferts, casse…) */
export const mouvementsStock = pgTable(
  "mouvements_stock",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id"),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id),
    depotId: text("depot_id")
      .notNull()
      .references(() => depots.id),
    lotId: text("lot_id").references(() => lots.id),
    type: text("type").notNull(), // entrée, vente, transfert, casse, inventaire, réservation
    quantiteBase: real("quantite_base").notNull(),
    quantiteAvant: real("quantite_avant").notNull(),
    quantiteApres: real("quantite_apres").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    userId: text("user_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("mouvements_produit_idx").on(t.produitId),
    index("mouvements_date_idx").on(t.createdAt),
  ]
);
