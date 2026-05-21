import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { commandes, factures, lignesCommande } from "./commandes";
import { produits } from "./produits";
import { users } from "./auth";

export const motifRetourEnum = pgEnum("motif_retour", [
  "defectueux",
  "non_conforme",
  "erreur_livraison",
  "date_peremption",
  "geste_commercial",
  "autre",
]);

export const modeRemboursementEnum = pgEnum("mode_remboursement", [
  "avoir_credit",
  "remboursement_especes",
  "remboursement_virement",
  "remboursement_mobile",
]);

export const statutRetourEnum = pgEnum("statut_retour", [
  "brouillon",
  "valide",
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
    motifDetail: text("motif_detail"),
    modeRemboursement: modeRemboursementEnum("mode_remboursement")
      .default("avoir_credit")
      .notNull(),
    statut: statutRetourEnum("statut").default("valide").notNull(),

    totalHT: integer("total_ht").default(0).notNull(),
    totalTVA: integer("total_tva").default(0).notNull(),
    totalTTC: integer("total_ttc").default(0).notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("retours_client_idx").on(t.clientId),
    index("retours_facture_idx").on(t.factureId),
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
    nomUnite: text("nom_unite").notNull(),

    quantite: real("quantite").notNull(),
    prixUnitaire: integer("prix_unitaire").notNull(),
    tauxTVA: integer("taux_tva").default(0),

    totalHT: integer("total_ht").notNull(),
    totalTVA: integer("total_tva").default(0),
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
    retourId: text("retour_id")
      .notNull()
      .references(() => retours.id, { onDelete: "cascade" }),
    factureId: text("facture_id").references(() => factures.id),
    clientId: text("client_id").references(() => clients.id),

    totalHT: integer("total_ht").notNull(),
    totalTVA: integer("total_tva").default(0).notNull(),
    totalTTC: integer("total_ttc").notNull(),

    statut: text("statut").default("emis").notNull(), // emis, applique, annule
    appliqueA: text("applique_a"), // facture id si appliqué

    paiements: jsonb("paiements"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("avoirs_client_idx").on(t.clientId),
    index("avoirs_facture_idx").on(t.factureId),
  ]
);
