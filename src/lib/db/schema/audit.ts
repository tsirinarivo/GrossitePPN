import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Journal d'audit métier (traçabilité ERP multi-utilisateurs + RGPD).
 *
 * ⚠️ Nom de table volontairement distinct de `audit_logs` (réservé à
 * Better-Auth) pour éviter toute collision lors des migrations.
 */
export const journalAudit = pgTable(
  "journal_audit",
  {
    id: text("id").primaryKey(),

    // Acteur — on dénormalise nom/rôle pour conserver une trace lisible
    // même si l'utilisateur est supprimé plus tard.
    userId: text("user_id"),
    userNom: text("user_nom"),
    userRole: text("user_role"),

    // Quoi
    action: text("action").notNull(), // creation, modification, suppression, connexion, export, anonymisation, annulation, remise, acces
    entite: text("entite").notNull(), // client, produit, prix, commande, vente, facture, stock, utilisateur, promotion, rgpd, auth
    entiteId: text("entite_id"),
    description: text("description").notNull(),

    // Contexte additionnel (JSON sérialisé : avant/après, montants, etc.)
    metadata: text("metadata"),

    ipAddress: text("ip_address"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("journal_audit_entite_idx").on(t.entite),
    index("journal_audit_action_idx").on(t.action),
    index("journal_audit_user_idx").on(t.userId),
    index("journal_audit_created_idx").on(t.createdAt),
  ]
);
