@AGENTS.md

## Déploiement VPS

Projet installé sur le VPS dans `/opt/grossiteppn`. Gestionnaire de processus : **pm2** (`pm2 restart grossiteppn`). App Next.js `output: standalone`.

Commandes de mise à jour :

```bash
cd /opt/grossiteppn
git pull origin claude/wholesale-management-pwa-khts0
```

Script raccourci depuis la machine locale : `./deploy-vps.sh user@grossiste.dago-it.com`
