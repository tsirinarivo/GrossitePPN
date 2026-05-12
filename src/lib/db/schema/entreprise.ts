import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const entreprise = pgTable("entreprise", {
  id: text("id").primaryKey().default("singleton"),
  nom: text("nom").notNull(),
  nif: text("nif"),
  stat: text("stat"),
  rcs: text("rcs"),
  adresse: text("adresse"),
  telephone: text("telephone"),
  email: text("email"),
  siteWeb: text("site_web"),
  logo: text("logo"),
  // TVA
  assujettieTV: boolean("assujettie_tva").default(false).notNull(),
  tauxTVADefaut: integer("taux_tva_defaut").default(20),
  // Factures
  prefixeFacture: text("prefixe_facture").default("FAC"),
  dernierNumeroFacture: integer("dernier_numero_facture").default(0).notNull(),
  mentionsLegales: text("mentions_legales"),
  conditionsGenerales: text("conditions_generales"),
  // E-commerce
  ecommerceActif: boolean("ecommerce_actif").default(false).notNull(),
  ecommerceDescription: text("ecommerce_description"),
  // Fidélité
  fideliteActif: boolean("fidelite_actif").default(false).notNull(),
  pointsParAriary: integer("points_par_ariary").default(1),
  // Config
  fuseauHoraire: text("fuseau_horaire").default("Indian/Antananarivo"),
  devise: text("devise").default("MGA"),
  langueDefaut: text("langue_defaut").default("fr"),
  parametres: jsonb("parametres"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const depots = pgTable("depots", {
  id: text("id").primaryKey(),
  nom: text("nom").notNull(),
  adresse: text("adresse"),
  telephone: text("telephone"),
  responsableId: text("responsable_id"),
  actif: boolean("actif").default(true).notNull(),
  estPrincipal: boolean("est_principal").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
