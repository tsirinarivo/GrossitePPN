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
  "en_attente",
]);

export const tenantPlanEnum = pgEnum("tenant_plan", [
  "essai",
  "standard",
  "pro",
  "entreprise",
]);

export const abonnementOperateurEnum = pgEnum("abonnement_operateur", [
  "mvola",
  "orange_money",
  "airtel_money",
]);

export const abonnementStatutEnum = pgEnum("abonnement_statut", [
  "en_attente",
  "valide",
  "rejete",
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

/**
 * Demandes d'abonnement / paiements Mobile Money (souscription depuis la landing).
 * Le paiement est manuel : le client paie sur le numéro marchand et saisit la
 * référence ; le super-admin valide dans la console master (→ tenant activé).
 */
export const abonnements = pgTable(
  "abonnements",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id"),
    entrepriseNom: text("entreprise_nom").notNull(),
    slug: text("slug"),
    plan: tenantPlanEnum("plan").notNull(),
    montant: integer("montant").notNull(),
    operateur: abonnementOperateurEnum("operateur").notNull(),
    telephone: text("telephone"),
    reference: text("reference"),
    contactNom: text("contact_nom"),
    contactEmail: text("contact_email"),
    statut: abonnementStatutEnum("statut").default("en_attente").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    valideAt: timestamp("valide_at"),
    valideBy: text("valide_by"),
  },
  (t) => [index("abonnements_statut_idx").on(t.statut)]
);
