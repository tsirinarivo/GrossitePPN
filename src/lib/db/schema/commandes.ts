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
import { depots } from "./entreprise";
import { users } from "./auth";

export const sourceCommandeEnum = pgEnum("source_commande", [
  "pos_agent",
  "ecommerce",
  "telephone",
  "import",
]);

export const statutCommandeEnum = pgEnum("statut_commande", [
  "brouillon",
  "soumise",
  "validee",
  "preparee",
  "en_livraison",
  "livree",
  "annulee",
  "refusee",
]);

export const modePaiementEnum = pgEnum("mode_paiement", [
  "especes",
  "mvola",
  "orange_money",
  "airtel_money",
  "virement",
  "cheque",
  "credit_client",
  "mixte",
]);

export const commandes = pgTable(
  "commandes",
  {
    id: text("id").primaryKey(),
    numero: text("numero").notNull().unique(),
    clientId: text("client_id").references(() => clients.id),
    depotId: text("depot_id").references(() => depots.id),
    agentId: text("agent_id").references(() => users.id),
    source: sourceCommandeEnum("source").notNull(),
    statut: statutCommandeEnum("statut").default("brouillon").notNull(),

    // Totaux
    totalHT: integer("total_ht").default(0).notNull(),
    totalTVA: integer("total_tva").default(0).notNull(),
    totalTTC: integer("total_ttc").default(0).notNull(),
    totalRemise: integer("total_remise").default(0).notNull(),

    // TVA
    assujettieTV: boolean("assujettie_tva").default(false).notNull(),
    recapTVA: jsonb("recap_tva"),

    // Livraison
    adresseLivraison: text("adresse_livraison"),
    creneauLivraison: timestamp("creneau_livraison"),
    notesLivraison: text("notes_livraison"),

    // Notes
    notes: text("notes"),

    // Idempotency
    idempotencyKey: text("idempotency_key").unique(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    soumiseAt: timestamp("soumise_at"),
    valideeAt: timestamp("validee_at"),
  },
  (t) => [
    index("commandes_client_idx").on(t.clientId),
    index("commandes_statut_idx").on(t.statut),
    index("commandes_source_idx").on(t.source),
    index("commandes_created_idx").on(t.createdAt),
  ]
);

export const lignesCommande = pgTable(
  "lignes_commande",
  {
    id: text("id").primaryKey(),
    commandeId: text("commande_id")
      .notNull()
      .references(() => commandes.id, { onDelete: "cascade" }),
    produitId: text("produit_id")
      .notNull()
      .references(() => produits.id),
    uniteVenteId: text("unite_vente_id").references(() => unitesVente.id),

    // Libellés dénormalisés (pour historique)
    nomProduit: text("nom_produit").notNull(),
    nomUnite: text("nom_unite").notNull(),
    facteurConversion: real("facteur_conversion").notNull().default(1),

    quantite: real("quantite").notNull(),
    quantiteBase: real("quantite_base").notNull(),

    prixUnitaire: integer("prix_unitaire").notNull(),
    tauxRemise: real("taux_remise").default(0),
    montantRemise: integer("montant_remise").default(0),
    tauxTVA: integer("taux_tva").default(0),

    totalHT: integer("total_ht").notNull(),
    totalTVA: integer("total_tva").default(0),
    totalTTC: integer("total_ttc").notNull(),

    notes: text("notes"),
  },
  (t) => [index("lignes_commande_idx").on(t.commandeId)]
);

export const factures = pgTable(
  "factures",
  {
    id: text("id").primaryKey(),
    numero: text("numero").notNull().unique(),
    commandeId: text("commande_id")
      .notNull()
      .references(() => commandes.id),
    clientId: text("client_id").references(() => clients.id),
    caissierID: text("caissier_id").references(() => users.id),

    // Totaux
    totalHT: integer("total_ht").notNull(),
    totalTVA: integer("total_tva").default(0).notNull(),
    totalTTC: integer("total_ttc").notNull(),
    totalRegle: integer("total_regle").default(0).notNull(),
    soldeRestant: integer("solde_restant").default(0).notNull(),

    // Mentions légales copiées
    nifEntreprise: text("nif_entreprise"),
    statEntreprise: text("stat_entreprise"),
    rcsEntreprise: text("rcs_entreprise"),

    // Paiements
    modePaiement: modePaiementEnum("mode_paiement"),
    paiements: jsonb("paiements"),

    statut: text("statut").default("emise").notNull(), // emise, payee, partielle, annulee
    dateEcheance: timestamp("date_echeance"),
    motifsAnnulation: text("motifs_annulation"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("factures_client_idx").on(t.clientId),
    index("factures_created_idx").on(t.createdAt),
  ]
);

export const paiements = pgTable(
  "paiements",
  {
    id: text("id").primaryKey(),
    factureId: text("facture_id")
      .notNull()
      .references(() => factures.id, { onDelete: "cascade" }),
    mode: modePaiementEnum("mode").notNull(),
    montant: integer("montant").notNull(),
    referenceTransaction: text("reference_transaction"),
    numeroCheque: text("numero_cheque"),
    banqueCheque: text("banque_cheque"),
    qrCode: text("qr_code"),
    confirme: boolean("confirme").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("paiements_facture_idx").on(t.factureId)]
);

/** Sessions de caisse */
export const sessionsCaisse = pgTable("sessions_caisse", {
  id: text("id").primaryKey(),
  caissierID: text("caissier_id")
    .notNull()
    .references(() => users.id),
  depotId: text("depot_id").references(() => depots.id),
  fondCaisse: integer("fond_caisse").default(0).notNull(),
  totalEncaisse: integer("total_encaisse").default(0).notNull(),
  totalEspeces: integer("total_especes").default(0).notNull(),
  totalMobileMoney: integer("total_mobile_money").default(0).notNull(),
  totalVirements: integer("total_virements").default(0).notNull(),
  totalCheques: integer("total_cheques").default(0).notNull(),
  ouvertureAt: timestamp("ouverture_at").defaultNow().notNull(),
  fermetureAt: timestamp("fermeture_at"),
  rapportZ: jsonb("rapport_z"),
});
