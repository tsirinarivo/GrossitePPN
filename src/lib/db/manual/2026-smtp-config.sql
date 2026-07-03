-- Table de configuration SMTP (singleton) — idempotent
CREATE TABLE IF NOT EXISTS "smtp_config" (
  "id" text PRIMARY KEY DEFAULT 'singleton',
  "host" text,
  "port" integer DEFAULT 587,
  "secure" boolean DEFAULT false,
  "username" text,
  "password" text,
  "from_email" text,
  "from_nom" text,
  "actif" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
