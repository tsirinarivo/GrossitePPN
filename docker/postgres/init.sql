-- Initialisation PostgreSQL pour GrossistePPN
-- Ce fichier est exécuté une seule fois à la création du container

-- Extensions utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- pour la recherche full-text

-- Les tables sont créées par Drizzle (pnpm db:push)
-- Ce fichier prépare juste l'environnement
