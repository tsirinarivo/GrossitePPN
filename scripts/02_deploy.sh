#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GrossistePPN — 02_deploy.sh
# Déploiement / mise à jour de l'application sur le VPS
# À exécuter depuis le VPS en tant que ppn (ou root)
# Usage : bash 02_deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/grossiteppn"
APP_NAME="grossiteppn"
GIT_REPO="https://github.com/tsirinarivo/GrossitePPN.git"
GIT_BRANCH="claude/wholesale-management-pwa-khts0"
ENV_FILE="$APP_DIR/.env.production"

# ── Couleurs ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

# ── Vérification .env.production ─────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  die ".env.production introuvable dans $APP_DIR\n  Créez-le d'abord : cp .env.production.example .env.production && nano .env.production"
fi

# Vérifier les variables obligatoires
source "$ENV_FILE"
[[ -z "${DATABASE_URL:-}" ]] && die "DATABASE_URL manquant dans .env.production"
[[ -z "${BETTER_AUTH_SECRET:-}" ]] && die "BETTER_AUTH_SECRET manquant dans .env.production"
[[ -z "${BETTER_AUTH_URL:-}" ]] && die "BETTER_AUTH_URL manquant dans .env.production"

info "Déploiement GrossistePPN → $APP_DIR"
echo "  Branche : $GIT_BRANCH"
echo "  URL     : $BETTER_AUTH_URL"
echo ""

# ── 1. Récupérer le code ──────────────────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  info "Mise à jour du dépôt..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$GIT_BRANCH"
  git pull origin "$GIT_BRANCH"
else
  info "Clone du dépôt..."
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

success "Code récupéré — commit $(git rev-parse --short HEAD)"

# ── 2. Variables d'environnement ──────────────────────────────────────────────
# S'assurer que .env.production est lié
if [[ ! -L "$APP_DIR/.env.production" ]] && [[ -f "$ENV_FILE" ]]; then
  cp -n "$ENV_FILE" "$APP_DIR/.env.production" 2>/dev/null || true
fi

# ── 3. Dépendances ────────────────────────────────────────────────────────────
info "Installation des dépendances..."
pnpm install --frozen-lockfile --prod=false
success "Dépendances installées"

# ── 4. Build Next.js ──────────────────────────────────────────────────────────
info "Build Next.js..."
NODE_ENV=production pnpm build
success "Build terminé"

# ── 4b. Copie des assets statiques (obligatoire pour output: standalone) ─────
info "Copie des fichiers statiques dans standalone..."
cp -r "$APP_DIR/.next/static"  "$APP_DIR/.next/standalone/.next/static"
cp -r "$APP_DIR/public"        "$APP_DIR/.next/standalone/public"
success "Assets statiques copiés (CSS / JS / images)"

# ── 5. Migrations base de données ─────────────────────────────────────────────
info "Application des migrations DB..."
DATABASE_URL="$DATABASE_URL" npx drizzle-kit push
success "Migrations appliquées"

# ── 6. PM2 — (re)démarrer l'app ──────────────────────────────────────────────
info "Démarrage/rechargement PM2..."

if pm2 describe "$APP_NAME" &>/dev/null; then
  pm2 restart "$APP_NAME" --update-env
  success "Application redémarrée"
else
  pm2 start "$APP_DIR/ecosystem.config.js"
  pm2 save
  success "Application démarrée"
fi

# ── 7. Vérification santé ─────────────────────────────────────────────────────
info "Vérification santé (attente 5s)..."
sleep 5

if curl -sf http://localhost:3000/api/health -o /dev/null; then
  success "Application répond sur le port 3000"
else
  warn "L'app ne répond pas encore — vérifier : pm2 logs $APP_NAME"
fi

# ── Résumé ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Déploiement réussi !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  App            : $BETTER_AUTH_URL"
echo "  Commit         : $(git rev-parse --short HEAD) — $(git log -1 --format='%s')"
echo "  PM2 status     : pm2 status"
echo "  Logs           : pm2 logs $APP_NAME"
echo ""
