import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  real,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const palierClientEnum = pgEnum("palier_client", [
  "detail",
  "semi_gros",
  "gros",
]);

export const statutFideliteEnum = pgEnum("statut_fidelite", [
  "bronze",
  "argent",
  "or",
  "platine",
]);

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    raisonSociale: text("raison_sociale").notNull(),
    nif: text("nif"),
    stat: text("stat"),
    telephone: text("telephone"),
    email: text("email"),
    adresse: text("adresse"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    zoneTournee: text("zone_tournee"),

    // Palier de prix
    palier: palierClientEnum("palier").default("detail").notNull(),

    // Crédit
    creditAutorise: boolean("credit_autorise").default(false).notNull(),
    plafondCredit: integer("plafond_credit").default(0).notNull(),
    encoursCourant: integer("encours_courant").default(0).notNull(),

    // Fidélité
    pointsFidelite: integer("points_fidelite").default(0).notNull(),
    statutFidelite: statutFideliteEnum("statut_fidelite").default("bronze"),
    totalAchats: integer("total_achats").default(0).notNull(),

    // E-commerce — lien vers le compte utilisateur
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    ecommerceActif: boolean("ecommerce_actif").default(false).notNull(),
    invitationEmail: text("invitation_email"),

    // Stats
    dernierAchat: timestamp("dernier_achat"),
    nbCommandes: integer("nb_commandes").default(0).notNull(),
    panierMoyen: integer("panier_moyen").default(0),

    actif: boolean("actif").default(true).notNull(),
    agentId: text("agent_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("clients_agent_idx").on(t.agentId),
    index("clients_zone_idx").on(t.zoneTournee),
  ]
);

/** Sous-utilisateurs d'un compte client B2B */
export const sousUtilisateurs = pgTable("sous_utilisateurs", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  peutCommander: boolean("peut_commander").default(true).notNull(),
  peutVoirFactures: boolean("peut_voir_factures").default(true).notNull(),
  peutGererEquipe: boolean("peut_gerer_equipe").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
