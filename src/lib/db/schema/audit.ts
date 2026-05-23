import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

/**
 * Journal d'audit des actions sensibles : suppression, validation, modification
 * de paramètres, accès admin, etc.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    userEmail: text("user_email"),
    userRole: text("user_role"),
    action: text("action").notNull(), // ex: "commande.valider", "client.supprimer", "promotion.creer"
    entite: text("entite"),           // ex: "commande", "client", "promotion"
    entiteId: text("entite_id"),
    details: jsonb("details"),         // payload contextuel
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("audit_user_idx").on(t.userId),
    index("audit_action_idx").on(t.action),
    index("audit_entite_idx").on(t.entite, t.entiteId),
    index("audit_created_idx").on(t.createdAt),
  ]
);
