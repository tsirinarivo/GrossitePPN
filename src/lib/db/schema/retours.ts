import {
  pgTable,
  text,
  integer,
  timestamp,
  real,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { produits } from "./produits";
import { factures, commandes, lignesCommande } from "./commandes";
import { users } from "./auth";

export const motifRetourEnum = pgEnum("motif_retour", [
  "qualite",
  "erreur_livraison",
  "refus_client",
  "produit_endommage",
  "autre",
]);

export const statutRetourEnum = pgEnum("statut_retour", [
  "brouillon",
  "valide",
  "rembourse",
  "annule",
]);

export const modeRemboursementEnum = pgEnum("mode_remboursement", [
  "credit_compte",
  "especes",
  "virement",
  "mvola",
  "orange_money",
]);

export const statutAvoirEnum = pgEnum("statut_avoir", [
  "emis",
  "applique",
  "rembourse",
  "annule",
]);

export const retours = pgTable(
  "retours",
  {
    id: text("id").primaryKey(),
    numero: text("numero").notNull().unique(),
    factureId: text("facture_id").references(() => factures.id),
    commandeId: text("commande_id").references(() => commandes.id),
    clientId: text("client_id").references(() => clients.id),
    agentId: text("agent_id").references(() => users.id),

    motif: motifRetourEnum("motif").notNull(),
    statut: statutRetourEnum("statut").default("brouillon").notNull(),

    totalHT: integer("total_ht").default(0).notNull(),
    totalTVA: integer("total_tva").default(0).notNull(),
    totalTTC: integer("total_ttc").default(0).notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    valideeAt: timestamp("validee_at"),
    rembourseeAt: timestamp("remboursee_at"),
  },
  (t) => [
    index("retours_facture_idx").on(t.factureId),
    index("retours_client_idx").on(t.clientId),
    index("retours_statut_idx").on(t.statut),
    index("retours_created_idx").on(t.createdAt),
  ]
);

export const lignesRetour = pgTable(
  "lignes_retour",
  {
    id: text("id").primaryKey(),
    retourId: text("retour_id")
      .notNull()
      .references(() => retours.id, { onDelete: "cascade" }),
    ligneCommandeId: text("ligne_commande_id").references(() => lignesCommande.id),
    produitId: text("produit_id").references(() => produits.id),

    nomProduit: text("nom_produit").notNull(),
    quantite: real("quantite").notNull(),
    prixUnitaire: integer("prix_unitaire").notNull(),
    tauxTVA: integer("taux_tva").default(0).notNull(),

    totalHT: integer("total_ht").notNull(),
    totalTVA: integer("total_tva").default(0).notNull(),
    totalTTC: integer("total_ttc").notNull(),

    motifLigne: text("motif_ligne"),
  },
  (t) => [index("lignes_retour_idx").on(t.retourId)]
);

export const avoirs = pgTable(
  "avoirs",
  {
    id: text("id").primaryKey(),
    numero: text("numero").notNull().unique(),
    retourId: text("retour_id").references(() => retours.id, { onDelete: "set null" }),
    clientId: text("client_id").references(() => clients.id),
    factureId: text("facture_id").references(() => factures.id),

    montant: integer("montant").notNull(),
    modeRemboursement: modeRemboursementEnum("mode_remboursement")
      .default("credit_compte")
      .notNull(),
    statut: statutAvoirEnum("statut").default("emis").notNull(),

    appliqueAFactureId: text("applique_a_facture_id").references(() => factures.id),
    referenceTransaction: text("reference_transaction"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    appliqueAt: timestamp("applique_at"),
  },
  (t) => [
    index("avoirs_client_idx").on(t.clientId),
    index("avoirs_facture_idx").on(t.factureId),
    index("avoirs_statut_idx").on(t.statut),
  ]
);
