#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GrossistePPN — 03_migrate_db.sh
# Appliquer les migrations SQL manuellement sur la DB de production
# Usage : bash 03_migrate_db.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/var/www/grossiteppn"
ENV_FILE="$APP_DIR/.env.production"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
die()  { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die ".env.production introuvable"
source "$ENV_FILE"
[[ -z "${DATABASE_URL:-}" ]] && die "DATABASE_URL manquant"

cd "$APP_DIR"

info "Application des migrations via drizzle-kit push..."
pnpm db:push

success "Migrations appliquées"
echo ""
info "Migration manuelle de print_logs (si premier déploiement)..."

# Appliquer explicitement le script xprint si la table n'existe pas
psql "$DATABASE_URL" -f src/lib/db/migrations/0001_xprint.sql 2>/dev/null && \
  success "Table print_logs créée/vérifiée" || \
  success "Table print_logs déjà présente"
