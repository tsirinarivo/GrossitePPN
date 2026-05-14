@AGENTS.md

## Déploiement VPS

Projet installé sur le VPS dans `/opt/grossiteppn`. Gestionnaire de processus : **pm2** (`pm2 restart grossiteppn`). App Next.js `output: standalone`.

Commandes de mise à jour (dans l'ordre) :

```bash
cd /opt/grossiteppn
git pull origin claude/wholesale-management-pwa-khts0
pnpm install --frozen-lockfile
pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart grossiteppn
```

Script raccourci depuis la machine locale : `./deploy-vps.sh user@grossiste.dago-it.com`

> ⚠️ Les deux `cp` après `pnpm build` sont **obligatoires** — `output: standalone` ne copie pas les assets statiques automatiquement.
