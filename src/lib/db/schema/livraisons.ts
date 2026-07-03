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
import { commandes } from "./commandes";
import { users } from "./auth";

export const statutLivraisonEnum = pgEnum("statut_livraison", [
  "en_attente",
  "preparee",
  "chargee",
  "en_route",
  "livree",
  "refusee",
  "echec",
]);

export const vehicules = pgTable("vehicules", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  immatriculation: text("immatriculation").notNull().unique(),
  modele: text("modele"),
  capaciteKg: real("capacite_kg"),
  actif: boolean("actif").default(true).notNull(),
});

export const tournees = pgTable(
  "tournees",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id"),
    date: timestamp("date").notNull(),
    chauffeurId: text("chauffeur_id").references(() => users.id),
    vehiculeId: text("vehicule_id").references(() => vehicules.id),
    statut: text("statut").default("planifiee").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("tournees_date_idx").on(t.date)]
);

export const livraisons = pgTable(
  "livraisons",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id"),
    tokenPublic: text("token_public").notNull().unique(),
    commandeId: text("commande_id")
      .notNull()
      .references(() => commandes.id),
    tourneeId: text("tournee_id").references(() => tournees.id),
    ordre: integer("ordre").default(0),
    statut: statutLivraisonEnum("statut").default("en_attente").notNull(),
    adresseLivraison: text("adresse_livraison").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    signatureClient: text("signature_client"),
    photoPreuve: text("photo_preuve"),
    motifRefus: text("motif_refus"),
    livraisonAt: timestamp("livraison_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("livraisons_tournee_idx").on(t.tourneeId),
    index("livraisons_commande_idx").on(t.commandeId),
  ]
);
