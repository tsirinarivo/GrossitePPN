#!/bin/bash
# deploy-vps.sh — Déploiement GrossistePPN sur VPS (/opt/grossiteppn)
# Usage : ./deploy-vps.sh user@grossiste.dago-it.com
#         VPS_HOST=user@ip ./deploy-vps.sh
set -euo pipefail

VPS="${1:-${VPS_HOST:-}}"
[[ -z "$VPS" ]] && { echo "Usage: ./deploy-vps.sh user@ip"; exit 1; }

ssh "$VPS" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/grossiteppn
git pull origin claude/wholesale-management-pwa-khts0
pnpm install --frozen-lockfile
pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart grossiteppn
REMOTE

echo "Déployé."
