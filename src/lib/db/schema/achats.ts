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
import { produits, unitesVente } from "./produits";
import { depots } from "./entreprise";
import { users } from "./auth";

export const statutBCEnum = pgEnum("statut_bon_commande", [
  "brouillon",
  "envoye",
  "confirme",
  "partiellement_recu",
  "recu",
  "annule",
]);

export const fournisseurs = pgTable("fournisseurs", {
  id: text("id").primaryKey(),
  nom: text("nom").notNull(),
  nomCourt: text("nom_court"),
  nif: text("nif"),
  contact: text("contact"),
  telephone: text("telephone"),
  email: text("email"),
  adresse: text("adresse"),
  ville: text("ville"),
  pays: text("pays").default("Madagascar"),
  conditionsPaiement: integer("conditions_paiement").default(30),
  notes: text("notes"),
  actif: boolean("actif").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bonsCommande = pgTable(
  "bons_commande",
  {
    id: text("id").primaryKey(),
    numero: text("numero").notNull().unique(),
    fournisseurId: text("fournisseur_id")
      .notNull()
      .references(() => fournisseurs.id),
    depotId: text("depot_id").references(() => depots.id),
    acheteurId: text("acheteur_id").references(() => users.id),

    statut: statutBCEnum("statut").default("brouillon").notNull(),

    totalHT: integer("total_ht").default(0).notNull(),
    totalTVA: integer("total_tva").default(0).notNull(),
    totalTTC: integer("total_ttc").default(0).notNull(),

    dateCommande: timestamp("date_commande").defaultNow(),
    dateLivraisonPrevue: timestamp("date_livraison_prevue"),
    dateReceptionEffective: timestamp("date_reception_effective"),

    notes: text("notes"),
    conditions: text("conditions"),
    referenceFournisseur: text("reference_fournisseur"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("bc_fournisseur_idx").on(t.fournisseurId),
    index("bc_statut_idx").on(t.statut),
    index("bc_created_idx").on(t.createdAt),
  ]
);

export const lignesBonCommande = pgTable(
  "lignes_bon_commande",
  {
    id: text("id").primaryKey(),
    bonCommandeId: text("bon_commande_id")
      .notNull()
      .references(() => bonsCommande.id, { onDelete: "cascade" }),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id),
    uniteVenteId: text("unite_vente_id").references(() => unitesVente.id),

    nomProduit: text("nom_produit").notNull(),
    nomUnite: text("nom_unite").notNull(),
    facteurConversion: real("facteur_conversion").notNull().default(1),

    quantiteCommandee: real("quantite_commandee").notNull(),
    quantiteRecue: real("quantite_recue").default(0).notNull(),
    quantiteBase: real("quantite_base").notNull(),

    prixUnitaireHT: integer("prix_unitaire_ht").notNull(),
    tauxTVA: integer("taux_tva").default(0),
    totalHT: integer("total_ht").notNull(),
    totalTVA: integer("total_tva").default(0),
    totalTTC: integer("total_ttc").notNull(),

    notes: text("notes"),
  },
  (t) => [index("lbc_bon_commande_idx").on(t.bonCommandeId)]
);

export const receptions = pgTable(
  "receptions",
  {
    id: text("id").primaryKey(),
    numero: text("numero").notNull().unique(),
    bonCommandeId: text("bon_commande_id")
      .notNull()
      .references(() => bonsCommande.id),
    depotId: text("depot_id").references(() => depots.id),
    receptionneurId: text("receptionneur_id").references(() => users.id),

    statut: text("statut").default("complete").notNull(),
    notes: text("notes"),
    anomalies: jsonb("anomalies"),

    dateReception: timestamp("date_reception").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("receptions_bc_idx").on(t.bonCommandeId)]
);

export const lignesReception = pgTable(
  "lignes_reception",
  {
    id: text("id").primaryKey(),
    receptionId: text("reception_id")
      .notNull()
      .references(() => receptions.id, { onDelete: "cascade" }),
    ligneBCId: text("ligne_bc_id")
      .notNull()
      .references(() => lignesBonCommande.id),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id),

    quantiteRecue: real("quantite_recue").notNull(),
    quantiteBase: real("quantite_base").notNull(),
    numeroLot: text("numero_lot"),
    dateExpiration: timestamp("date_expiration"),
    anomalie: text("anomalie"),
  },
  (t) => [index("lr_reception_idx").on(t.receptionId)]
);
