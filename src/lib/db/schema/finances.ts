import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const chargesOperationnelles = pgTable(
  "charges_operationnelles",
  {
    id: text("id").primaryKey(),
    libelle: text("libelle").notNull(),
    categorie: text("categorie").notNull(), // personnel, loyer, energie, fournitures, marketing, maintenance, autre
    montant: integer("montant").notNull(),
    mois: text("mois").notNull(), // "YYYY-MM"
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("charges_mois_idx").on(t.mois),
    index("charges_categorie_idx").on(t.categorie),
  ]
);
