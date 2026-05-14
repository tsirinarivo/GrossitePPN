#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-vps.sh — Push & redémarre GrossistePPN sur le VPS (pm2 + Next.js standalone)
# Usage :
#   ./deploy-vps.sh                          # utilise VPS_HOST du .env.production
#   ./deploy-vps.sh user@grossiste.dago-it.com
#   VPS_HOST=user@1.2.3.4 ./deploy-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Résolution de l'hôte ──────────────────────────────────────────────────────
VPS="${1:-${VPS_HOST:-}}"

if [[ -z "$VPS" && -f ".env.production" ]]; then
  VPS=$(grep -E '^VPS_HOST=' .env.production | cut -d= -f2- | tr -d '"' | tr -d "'")
fi

if [[ -z "$VPS" ]]; then
  err "Hôte VPS introuvable.\nUsage : ./deploy-vps.sh user@1.2.3.4\n   ou   ajoutez VPS_HOST=user@ip dans .env.production"
fi

BRANCH="claude/wholesale-management-pwa-khts0"
REMOTE_DIR="/opt/grossiteppn"
PM2_NAME="grossiteppn"

log "Cible : ${VPS}  →  ${REMOTE_DIR}"

# ── Vérification SSH ──────────────────────────────────────────────────────────
log "Test de la connexion SSH..."
ssh -o ConnectTimeout=10 -o BatchMode=yes "$VPS" "echo ok" >/dev/null 2>&1 \
  || err "Connexion SSH impossible vers ${VPS}.\nVérifiez votre clé SSH ou l'adresse."
ok "SSH OK"

# ── Déploiement distant ───────────────────────────────────────────────────────
log "Déploiement sur le VPS..."
ssh "$VPS" bash -s -- "$BRANCH" "$REMOTE_DIR" "$PM2_NAME" <<'REMOTE'
set -euo pipefail

BRANCH="$1"
REMOTE_DIR="$2"
PM2_NAME="$3"

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[vps]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

cd "$REMOTE_DIR" || { echo -e "${RED}[✗]${NC} Dossier $REMOTE_DIR introuvable"; exit 1; }

# 1. Récupérer le code
log "git pull origin $BRANCH..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
ok "Code à jour ($(git rev-parse --short HEAD))"

# 2. Dépendances (rapide si lockfile inchangé)
log "pnpm install..."
pnpm install --frozen-lockfile --silent
ok "Dépendances OK"

# 3. Build
log "pnpm build..."
pnpm build 2>&1 | tail -5
ok "Build terminé"

# 4. Copie des assets statiques (requis pour output: standalone)
log "Copie des assets statiques..."
cp -r .next/static   .next/standalone/.next/static
cp -r public         .next/standalone/public
ok "Assets copiés"

# 5. Redémarrage pm2
log "pm2 restart $PM2_NAME..."
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  warn "$PM2_NAME absent de pm2 — démarrage initial..."
  pm2 start .next/standalone/server.js --name "$PM2_NAME"
  pm2 save
fi
ok "pm2 redémarré"

# 6. Vérification santé
log "Vérification /api/health..."
sleep 5
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
if [[ "$HTTP" == "200" ]]; then
  ok "App répond HTTP 200"
else
  warn "App répond HTTP $HTTP — vérifier : pm2 logs $PM2_NAME"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Déploiement réussi !${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo "  Commit  : $(git log --oneline -1)"
echo "  Logs    : pm2 logs $PM2_NAME"
echo "  Statut  : pm2 status"
REMOTE

ok "Déploiement terminé."
