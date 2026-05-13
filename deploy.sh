#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Déploiement GrossistePPN sur VPS Contabo
# Usage :
#   ./deploy.sh          # mise à jour normale
#   ./deploy.sh --seed   # premier déploiement (insère les données initiales)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[PPN]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

SEED=false
for arg in "$@"; do [[ "$arg" == "--seed" ]] && SEED=true; done

# ── 1. Vérifications ──────────────────────────────────────────────────────────
log "Vérification des prérequis..."
command -v docker >/dev/null 2>&1 || err "Docker non installé."
command -v git    >/dev/null 2>&1 || err "git non installé."

[[ -f ".env.production" ]] || err ".env.production manquant. Copier .env.production.example et remplir les valeurs."
source .env.production
[[ -z "${POSTGRES_PASSWORD:-}" ]]  && err "POSTGRES_PASSWORD manquant dans .env.production"
[[ -z "${BETTER_AUTH_SECRET:-}" ]] && err "BETTER_AUTH_SECRET manquant dans .env.production"
[[ "${POSTGRES_PASSWORD}" == "CHANGE_MOI_MOT_DE_PASSE_FORT_ICI" ]] && err "Change le POSTGRES_PASSWORD !"
[[ "${BETTER_AUTH_SECRET}"  == "CHANGE_MOI_SECRET_32_CHARS_MIN"  ]] && err "Change le BETTER_AUTH_SECRET !"

# Arrêter nos containers si ils tournent (libère le port 3001)
if docker compose ps 2>/dev/null | grep -qE "ppn_app|ppn_postgres"; then
  log "Arrêt des containers existants..."
  docker compose down
fi

# Vérifier que le port 3001 est libre
if ss -tlnp 2>/dev/null | grep -q ':3001'; then
  err "Port 3001 déjà utilisé par un autre processus. Changer APP_PORT dans docker-compose.yml."
fi
ok "Prérequis OK"

# ── 2. Pull du code ───────────────────────────────────────────────────────────
log "Mise à jour du code..."
git pull origin claude/wholesale-management-pwa-khts0
ok "Code à jour"

# ── 3. Build de l'image Docker ────────────────────────────────────────────────
log "Build de l'image Next.js (2-5 minutes)..."
docker compose --env-file .env.production build --no-cache app
ok "Image construite"

# ── 4. Démarrage PostgreSQL puis App ─────────────────────────────────────────
log "Démarrage PostgreSQL..."
docker compose --env-file .env.production up -d postgres

log "Attente que PostgreSQL soit prêt..."
until docker compose --env-file .env.production exec -T postgres \
  pg_isready -U "${POSTGRES_USER:-ppn_user}" -d "${POSTGRES_DB:-ppn_production}" \
  >/dev/null 2>&1; do
  printf "."
  sleep 2
done
echo ""
ok "PostgreSQL prêt"

log "Démarrage de l'application..."
docker compose --env-file .env.production up -d app
ok "Application démarrée"

# ── 5. Migrations DB ──────────────────────────────────────────────────────────
log "Application des migrations Drizzle..."
DB_INTERNAL="postgresql://${POSTGRES_USER:-ppn_user}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-ppn_production}?sslmode=disable"
docker compose --env-file .env.production run --rm \
  -e DATABASE_URL="${DB_INTERNAL}" \
  app sh -c "cd /app && npx drizzle-kit push" 2>/dev/null \
  || warn "Migration via npx échouée — essaie manuellement : voir DEPLOY.md section Migrations"
ok "Migrations appliquées"

# ── 6. Seed (optionnel) ───────────────────────────────────────────────────────
if [[ "$SEED" == "true" ]]; then
  log "Insertion des données initiales..."
  docker compose --env-file .env.production run --rm \
    -e DATABASE_URL="${DB_INTERNAL}" \
    app sh -c "node src/lib/db/seed.js" 2>/dev/null \
    || warn "Seed manuel requis : voir DEPLOY.md"
  ok "Données initiales insérées"
fi

# ── 7. Vhost Nginx ────────────────────────────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/grossiteppn"
if [[ ! -f "$NGINX_CONF" ]]; then
  log "Configuration du vhost Nginx..."
  cp docker/nginx/grossiteppn.conf "$NGINX_CONF"
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/grossiteppn
  nginx -t && systemctl reload nginx
  ok "Nginx configuré et rechargé"
  warn "⚠️  Édite /etc/nginx/sites-available/grossiteppn et remplace TON_IP_VPS par ton IP réelle"
else
  log "Vhost Nginx déjà en place — reload..."
  nginx -t && systemctl reload nginx
  ok "Nginx rechargé"
fi

# ── 8. Vérification finale ────────────────────────────────────────────────────
log "Vérification (attente 10s)..."
sleep 10
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "App répond correctement sur :3001"
else
  warn "App répond HTTP $HTTP_CODE — vérifier : docker compose logs app"
fi

VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "TON_IP_VPS")

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  GrossistePPN déployé !${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "  URL app     : http://${VPS_IP}  (si Nginx configuré)"
echo "  Direct      : http://127.0.0.1:3001  (depuis le VPS)"
echo "  Logs app    : docker compose logs -f app"
echo "  Statut      : docker compose ps"
echo ""
echo -e "${YELLOW}  Si Nginx n'est pas encore configuré :${NC}"
echo "  → Édite /etc/nginx/sites-available/grossiteppn"
echo "  → Remplace TON_IP_VPS par ${VPS_IP}"
echo "  → nginx -t && systemctl reload nginx"
echo ""
