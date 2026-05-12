import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  real,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { produits, unitesVente } from "./produits";
import { users } from "./auth";

export const statutPanierEnum = pgEnum("statut_panier", [
  "actif",
  "abandonne",
  "converti",
]);

export const paniers = pgTable(
  "paniers",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    statut: statutPanierEnum("statut").default("actif").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (t) => [index("paniers_client_idx").on(t.clientId)]
);

export const lignesPanier = pgTable(
  "lignes_panier",
  {
    id: text("id").primaryKey(),
    panierId: text("panier_id")
      .notNull()
      .references(() => paniers.id, { onDelete: "cascade" }),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id),
    uniteVenteId: text("unite_vente_id").references(() => unitesVente.id),
    quantite: real("quantite").notNull(),
    // Réservation de stock (TTL 15 min)
    stockReserve: real("stock_reserve").default(0).notNull(),
    reserveJusquA: timestamp("reserve_jusqu_a"),
    prixUnitaire: integer("prix_unitaire").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [index("lignes_panier_panier_idx").on(t.panierId)]
);

/** Promotions e-commerce */
export const promotions = pgTable("promotions", {
  id: text("id").primaryKey(),
  nom: text("nom").notNull(),
  code: text("code").unique(),
  type: text("type").notNull(), // code_promo, remise_palier, vente_flash
  valeur: real("valeur").notNull(),
  typeValeur: text("type_valeur").default("pct"), // pct | montant
  minCommande: integer("min_commande").default(0),
  nbUtilisationsMax: integer("nb_utilisations_max"),
  nbUtilisations: integer("nb_utilisations").default(0).notNull(),
  produitIds: jsonb("produit_ids").$type<string[]>(),
  debutAt: timestamp("debut_at").notNull(),
  finAt: timestamp("fin_at").notNull(),
  actif: boolean("actif").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Bannières merchandising */
export const bannieres = pgTable("bannieres", {
  id: text("id").primaryKey(),
  titre: text("titre").notNull(),
  titreMG: text("titre_mg"),
  image: text("image").notNull(),
  lien: text("lien"),
  ordre: integer("ordre").default(0),
  actif: boolean("actif").default(true).notNull(),
  debutAt: timestamp("debut_at"),
  finAt: timestamp("fin_at"),
});

/** Listes d'achat récurrentes */
export const listesAchat = pgTable(
  "listes_achat",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    nom: text("nom").notNull(),
    frequence: text("frequence"), // hebdo, mensuel, bimensuel
    createdAt: timestamp("created_at").defaultNow().notNull(),
    derniereCommandeAt: timestamp("derniere_commande_at"),
  },
  (t) => [index("listes_achat_client_idx").on(t.clientId)]
);

export const lignesListeAchat = pgTable("lignes_liste_achat", {
  id: text("id").primaryKey(),
  listeId: text("liste_id")
    .notNull()
    .references(() => listesAchat.id, { onDelete: "cascade" }),
  produitId: text("produit_id")
    .notNull()
    .references(() => produits.id),
  uniteVenteId: text("unite_vente_id").references(() => unitesVente.id),
  quantite: real("quantite").notNull(),
});

/** Avis clients */
export const avis = pgTable(
  "avis",
  {
    id: text("id").primaryKey(),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id),
    note: integer("note").notNull(),
    commentaire: text("commentaire"),
    valide: boolean("valide").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("avis_produit_idx").on(t.produitId)]
);

/** Programme fidélité — transactions de points */
export const transactionsFidelite = pgTable(
  "transactions_fidelite",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // gain, utilisation, expiration, ajustement
    points: integer("points").notNull(),
    soldeApres: integer("solde_apres").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("fidelite_client_idx").on(t.clientId)]
);
