#!/bin/bash
# deploy-vps.sh — Déploiement GrossistePPN sur VPS
# Usage : ./deploy-vps.sh user@grossiste.dago-it.com
#         VPS_HOST=user@ip ./deploy-vps.sh
set -euo pipefail

VPS="${1:-${VPS_HOST:-}}"
[[ -z "$VPS" ]] && { echo "Usage: ./deploy-vps.sh user@ip"; exit 1; }

ssh "$VPS" 'cd /opt/grossiteppn && git pull origin claude/wholesale-management-pwa-khts0'

echo "Déployé."
