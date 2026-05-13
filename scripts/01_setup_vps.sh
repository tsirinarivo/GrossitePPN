#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GrossistePPN — 01_setup_vps.sh
# Installation initiale du VPS (Ubuntu 22.04 / 24.04)
# À exécuter UNE SEULE FOIS en root sur le VPS vierge
# Usage : bash 01_setup_vps.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_USER="ppn"
APP_DIR="/opt/grossiteppn"
NODE_VERSION="22"
PG_DB="ppn_production"
PG_USER="ppn_user"

# ── Couleurs ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

[[ $EUID -ne 0 ]] && die "Ce script doit être exécuté en root (sudo bash 01_setup_vps.sh)"

# ── 1. Mise à jour système ────────────────────────────────────────────────────
info "Mise à jour des paquets..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git wget unzip gnupg ca-certificates lsb-release ufw fail2ban

# ── 2. Firewall ───────────────────────────────────────────────────────────────
info "Configuration firewall UFW..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
success "Firewall actif (SSH + 80 + 443)"

# ── 3. Utilisateur applicatif ────────────────────────────────────────────────
if ! id "$APP_USER" &>/dev/null; then
  info "Création utilisateur $APP_USER..."
  useradd -m -s /bin/bash "$APP_USER"
  usermod -aG sudo "$APP_USER"
  success "Utilisateur $APP_USER créé"
else
  success "Utilisateur $APP_USER existe déjà"
fi

# ── 4. Node.js via nvm ───────────────────────────────────────────────────────
info "Installation Node.js $NODE_VERSION via NodeSource..."
curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
apt-get install -y nodejs
success "Node $(node -v) / npm $(npm -v)"

# ── 5. pnpm ──────────────────────────────────────────────────────────────────
info "Installation pnpm..."
npm install -g pnpm pm2
success "pnpm $(pnpm -v) / PM2 $(pm2 -v)"

# ── 6. PostgreSQL ─────────────────────────────────────────────────────────────
info "Installation PostgreSQL..."
apt-get install -y -qq postgresql postgresql-contrib

systemctl enable postgresql
systemctl start postgresql

# Générer un mot de passe aléatoire si pas encore défini
if [[ ! -f /root/.ppn_db_password ]]; then
  PG_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)
  echo "$PG_PASS" > /root/.ppn_db_password
  chmod 600 /root/.ppn_db_password
  success "Mot de passe DB généré → /root/.ppn_db_password"
else
  PG_PASS=$(cat /root/.ppn_db_password)
  warn "Mot de passe DB existant utilisé"
fi

# Créer DB + user
sudo -u postgres psql -c "CREATE USER $PG_USER WITH PASSWORD '$PG_PASS';" 2>/dev/null || \
  sudo -u postgres psql -c "ALTER USER $PG_USER WITH PASSWORD '$PG_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $PG_DB OWNER $PG_USER;" 2>/dev/null || \
  warn "Base $PG_DB existe déjà"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DB TO $PG_USER;"

success "PostgreSQL configuré — DB: $PG_DB, User: $PG_USER"
echo ""
echo -e "${YELLOW}  DATABASE_URL=postgresql://$PG_USER:$PG_PASS@localhost:5432/$PG_DB${NC}"
echo ""

# ── 7. Nginx ─────────────────────────────────────────────────────────────────
info "Installation Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx

# Config Nginx
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

cat > /etc/nginx/sites-available/grossiteppn <<NGINX
server {
    listen 80;
    server_name $PUBLIC_IP _;

    client_max_body_size 20M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Sécurité headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Assets Next.js — cache long
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/grossiteppn /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
success "Nginx configuré → http://$PUBLIC_IP"

# ── 8. Répertoire app ─────────────────────────────────────────────────────────
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"

# ── 9. PM2 démarrage auto ────────────────────────────────────────────────────
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | tail -1 | bash || true

# ── Résumé ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  VPS prêt !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Répertoire app  : $APP_DIR"
echo "  Utilisateur app : $APP_USER"
echo "  Database URL    : postgresql://$PG_USER:$PG_PASS@localhost:5432/$PG_DB"
echo "  IP publique     : $PUBLIC_IP"
echo ""
echo -e "${YELLOW}Prochaine étape : bash 02_deploy.sh${NC}"
echo ""
