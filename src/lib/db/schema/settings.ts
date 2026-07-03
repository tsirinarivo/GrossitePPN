import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

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
