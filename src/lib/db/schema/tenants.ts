import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const tenantStatutEnum = pgEnum("tenant_statut", [
  "essai",
  "actif",
  "suspendu",
  "resilie",
]);

export const tenantPlanEnum = pgEnum("tenant_plan", [
  "essai",
  "standard",
  "pro",
  "entreprise",
]);

/**
 * Tenants de la plateforme (locataires SaaS multi-tenant).
 * Chaque tenant = une entreprise cliente disposant de son espace isolé.
 */
export const tenants = pgTable(
  "tenants",
  {
    id: text("id").primaryKey(),
    nom: text("nom").notNull(),
    // Identifiant technique unique (sous-domaine / clé d'espace)
    slug: text("slug").notNull().unique(),

    statut: tenantStatutEnum("statut").default("essai").notNull(),
    plan: tenantPlanEnum("plan").default("essai").notNull(),

    // Contact principal
    contactNom: text("contact_nom"),
    contactEmail: text("contact_email"),
    contactTelephone: text("contact_telephone"),

    // Quotas
    maxUtilisateurs: integer("max_utilisateurs").default(5).notNull(),
    maxDepots: integer("max_depots").default(1).notNull(),

    // Cycle de vie
    finEssaiAt: timestamp("fin_essai_at"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("tenants_statut_idx").on(t.statut),
    index("tenants_slug_idx").on(t.slug),
  ]
);
