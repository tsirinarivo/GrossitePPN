import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const printLogs = pgTable(
  "print_logs",
  {
    id: text("id").primaryKey(),
    sn: text("sn").notNull(),
    kind: text("kind").notNull(), // facture | test | manual
    relatedId: text("related_id"),
    content: text("content").notNull(), // 500 premiers chars
    copies: integer("copies").default(1).notNull(),
    status: text("status").notNull(), // pending | printed | failed
    orderId: text("order_id"),
    error: text("error"),
    failedAt: timestamp("failed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("print_logs_status_idx").on(t.status),
    index("print_logs_created_idx").on(t.createdAt),
  ]
);
