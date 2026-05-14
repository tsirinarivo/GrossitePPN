@AGENTS.md

## Déploiement VPS

Projet installé sur le VPS dans `/opt/grossiteppn`. Gestionnaire de processus : **pm2** (`pm2 restart grossiteppn`). App Next.js `output: standalone`.

Commandes de mise à jour (dans l'ordre, depuis le VPS) :

```bash
cd /opt/grossiteppn
git pull origin claude/wholesale-management-pwa-khts0
pnpm install --frozen-lockfile
pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart grossiteppn
```

> ⚠️ `git pull` seul ne suffit pas — Next.js standalone exécute le binaire compilé dans `.next/standalone/`. Il faut rebuild après chaque pull.

Script raccourci depuis la machine locale : `./deploy-vps.sh user@grossiste.dago-it.com`

## Règle après chaque commit/push

Après chaque `git push`, afficher systématiquement ce bloc à l'utilisateur :

```
Pour déployer sur le VPS :
cd /opt/grossiteppn && git pull origin claude/wholesale-management-pwa-khts0 && pnpm build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && pm2 restart grossiteppn
```
