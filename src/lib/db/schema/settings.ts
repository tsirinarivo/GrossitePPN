import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Configuration imprimante cloud (Xprint) — UNE config par tenant.
 * Isole l'imprimante de chaque espace client.
 */
export const printerConfig = pgTable("printer_config", {
  tenantId: text("tenant_id").primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
  xUser: text("x_user"),
  xKey: text("x_key"),
  sn: text("sn"),
  baseUrl: text("base_url"),
  copies: integer("copies").default(1),
  voice: integer("voice").default(0),
  header: text("header"),
  footer: text("footer"),
  autoOnFacture: boolean("auto_on_facture").default(true),
  autoOnBonLivraison: boolean("auto_on_bon_livraison").default(false),
  autoOnReceptionStock: boolean("auto_on_reception_stock").default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Configuration SMTP de la plateforme (singleton).
 * Config au niveau plateforme (super-admin), pas par tenant.
 */
export const smtpConfig = pgTable("smtp_config", {
  id: text("id").primaryKey().default("singleton"),
  host: text("host"),
  port: integer("port").default(587),
  secure: boolean("secure").default(false),
  username: text("username"),
  password: text("password"),
  fromEmail: text("from_email"),
  fromNom: text("from_nom"),
  actif: boolean("actif").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
