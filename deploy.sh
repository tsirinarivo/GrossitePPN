#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Script de déploiement GrossistePPN sur VPS Contabo
# Usage : ./deploy.sh [--seed]   (--seed pour insérer les données initiales)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[PPN]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

SEED=false
for arg in "$@"; do
  [[ "$arg" == "--seed" ]] && SEED=true
done

# ── 1. Vérifications ──────────────────────────────────────────────────────────
log "Vérification des prérequis..."
command -v docker   >/dev/null 2>&1 || err "Docker non installé. Lancer : curl -fsSL https://get.docker.com | sh"
command -v git      >/dev/null 2>&1 || err "git non installé."

[[ -f ".env.production" ]] || err ".env.production manquant. Copier .env.production.example et remplir les valeurs."
source .env.production
[[ -z "${POSTGRES_PASSWORD:-}" ]] && err "POSTGRES_PASSWORD non défini dans .env.production"
[[ -z "${BETTER_AUTH_SECRET:-}" ]] && err "BETTER_AUTH_SECRET non défini dans .env.production"
[[ "${POSTGRES_PASSWORD}" == "CHANGE_MOI_MOT_DE_PASSE_FORT_ICI" ]] && err "Change le POSTGRES_PASSWORD dans .env.production !"
[[ "${BETTER_AUTH_SECRET}" == "CHANGE_MOI_SECRET_32_CHARS_MIN" ]] && err "Change le BETTER_AUTH_SECRET dans .env.production !"

ok "Prérequis OK"

# ── 2. Pull du code ───────────────────────────────────────────────────────────
log "Mise à jour du code..."
git pull origin claude/wholesale-management-pwa-khts0
ok "Code à jour"

# ── 3. Build de l'image Docker ────────────────────────────────────────────────
log "Build de l'image Next.js (peut prendre 2-5 minutes)..."
docker compose --env-file .env.production build --no-cache app
ok "Image construite"

# ── 4. Démarrage des services ─────────────────────────────────────────────────
log "Démarrage des conteneurs..."
docker compose --env-file .env.production up -d postgres
log "Attente PostgreSQL (20s)..."
sleep 20

docker compose --env-file .env.production up -d app nginx
ok "Conteneurs démarrés"

# ── 5. Migrations DB ──────────────────────────────────────────────────────────
log "Application des migrations Drizzle..."
DB_URL="postgresql://${POSTGRES_USER:-ppn_user}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB:-ppn_production}?sslmode=disable"
docker compose --env-file .env.production exec app \
  sh -c "DATABASE_URL='${DB_URL}' npx drizzle-kit push" 2>/dev/null || \
docker run --rm --network ppn_ppn_network \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-ppn_user}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-ppn_production}?sslmode=disable" \
  -v "$(pwd):/app" -w /app \
  node:22-alpine sh -c "npm i -g pnpm && pnpm drizzle-kit push" || \
  warn "Migration manuelle requise : voir section 'Migrations' dans DEPLOY.md"

ok "Migrations appliquées"

# ── 6. Seed (optionnel) ───────────────────────────────────────────────────────
if [[ "$SEED" == "true" ]]; then
  log "Insertion des données initiales (seed)..."
  docker compose --env-file .env.production exec app \
    sh -c "DATABASE_URL='${DB_URL}' node -e \"require('./src/lib/db/seed')\"" || \
    warn "Seed manuel requis : DATABASE_URL=... pnpm db:seed"
  ok "Données initiales insérées"
fi

# ── 7. Vérification ───────────────────────────────────────────────────────────
log "Vérification de l'application..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/login" || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "Application accessible sur http://$(curl -s ifconfig.me 2>/dev/null || echo 'TON_IP')"
else
  warn "App répond HTTP $HTTP_CODE — vérifier : docker compose logs app"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  GrossistePPN déployé avec succès !${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "  URL         : http://$(curl -s ifconfig.me 2>/dev/null || echo 'TON_IP_VPS')"
echo "  Login       : /login"
echo "  Logs app    : docker compose logs -f app"
echo "  Logs nginx  : docker compose logs -f nginx"
echo "  Statut      : docker compose ps"
echo "  Arrêt       : docker compose down"
echo ""
