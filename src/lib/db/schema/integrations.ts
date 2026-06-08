import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/** Webhooks sortants — endpoints partenaires notifiés sur événements métier. */
export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    nom: text("nom").notNull(),
    url: text("url").notNull(),
    secret: text("secret").notNull(), // clé de signature HMAC SHA-256
    evenements: jsonb("evenements").$type<string[]>().notNull().default([]),
    actif: boolean("actif").default(true).notNull(),

    // Dernier état observé
    dernierStatut: integer("dernier_statut"),
    dernierSucces: boolean("dernier_succes"),
    derniereTentativeAt: timestamp("derniere_tentative_at"),
    nbEnvois: integer("nb_envois").default(0).notNull(),
    nbEchecs: integer("nb_echecs").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("webhooks_actif_idx").on(t.actif)]
);

/** Journal des livraisons de webhooks (tentatives + résultats). */
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    evenement: text("evenement").notNull(),
    payload: text("payload").notNull(),
    statusCode: integer("status_code"),
    succes: boolean("succes").default(false).notNull(),
    erreur: text("erreur"),
    dureeMs: integer("duree_ms"),
    tentative: integer("tentative").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("webhook_deliveries_webhook_idx").on(t.webhookId),
    index("webhook_deliveries_created_idx").on(t.createdAt),
  ]
);

/** Clés d'API pour l'accès partenaire en lecture (catalogue / stock). */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    nom: text("nom").notNull(),
    cle: text("cle").notNull().unique(),
    actif: boolean("actif").default(true).notNull(),
    nbAppels: integer("nb_appels").default(0).notNull(),
    derniereUtilisationAt: timestamp("derniere_utilisation_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("api_keys_cle_idx").on(t.cle)]
);
