-- Migration 0001 : table print_logs pour xpyun cloud printing
CREATE TABLE IF NOT EXISTS "print_logs" (
  "id" text PRIMARY KEY,
  "sn" text NOT NULL,
  "kind" text NOT NULL,
  "related_id" text,
  "content" text NOT NULL,
  "copies" integer DEFAULT 1 NOT NULL,
  "status" text NOT NULL,
  "order_id" text,
  "error" text,
  "failed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "print_logs_status_idx" ON "print_logs" ("status");
CREATE INDEX IF NOT EXISTS "print_logs_created_idx" ON "print_logs" ("created_at");
