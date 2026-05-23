# Guide de déploiement — GrossistePPN

## Première installation sur le VPS

```bash
# 1. Cloner sur le VPS dans /opt/grossiteppn
cd /opt && git clone <repo> grossiteppn && cd grossiteppn

# 2. Variables d'environnement (à créer .env)
cat > .env <<'EOF'
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="<générer avec: openssl rand -base64 32>"
BETTER_AUTH_URL="https://votre-domaine.com"
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"
NODE_ENV="production"
# Optionnel — laisse vide pour cacher les données démo (recommandé en prod)
# DEMO_FALLBACK="off"
# LOG_LEVEL="info"
EOF

# 3. Installer + premier build
pnpm install --frozen-lockfile
pnpm db:push        # crée toutes les tables Drizzle
pnpm build

# 4. Copier les assets dans standalone
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 5. Démarrer avec pm2
pm2 start .next/standalone/server.js --name grossiteppn
pm2 save
pm2 startup
```

## Déploiement d'une mise à jour

Branche active : `claude/resume-autonomous-dev-kUOrp` (à adapter si fusionnée vers main).

```bash
cd /opt/grossiteppn && \
  git pull origin claude/resume-autonomous-dev-kUOrp && \
  pnpm install --frozen-lockfile && \
  pnpm db:push && \
  pnpm build && \
  cp -r .next/static .next/standalone/.next/static && \
  cp -r public .next/standalone/public && \
  pm2 restart grossiteppn
```

> ⚠️ `pnpm db:push` n'est nécessaire que si le schéma DB a changé. Vérifier le diff
> dans `src/lib/db/schema/` avant de l'exécuter en prod (cette commande peut être
> destructive si elle détecte un renommage qu'il ne faut pas accepter).

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres Neon ou self-hosted |
| `BETTER_AUTH_SECRET` | ✅ | Secret de signature des sessions (≥ 32 chars aléatoires) |
| `BETTER_AUTH_URL` | ✅ | URL canonique publique |
| `NEXT_PUBLIC_APP_URL` | ✅ | Idem (pour usage client) |
| `NODE_ENV` | ✅ | `production` en prod |
| `DEMO_FALLBACK` | ❌ | `on` ou `off` pour forcer l'affichage / le masquage des données démo. Désactivé par défaut en prod. |
| `LOG_LEVEL` | ❌ | `debug` / `info` / `warn` / `error` — défaut `info` en prod |

## Backup base de données

### Backup automatique quotidien (Neon)

Neon a la **PITR** (Point-In-Time Recovery) gratuite sur 7 jours. Activé par défaut.
Pour plus long : passer en plan payant qui étend à 30j+.

### Backup applicatif hebdo (manuel)

À mettre en cron sur le VPS (`crontab -e`) :

```bash
# Dimanche 03h00 — pg_dump vers /var/backups/grossiteppn/
0 3 * * 0 pg_dump "$DATABASE_URL" | gzip > /var/backups/grossiteppn/dump-$(date +\%Y\%m\%d).sql.gz && find /var/backups/grossiteppn -mtime +30 -delete
```

### Restauration

```bash
gunzip -c dump-YYYYMMDD.sql.gz | psql "$DATABASE_URL"
```

## Monitoring

Logs structurés JSON en prod (1 ligne / log). Pour ingestion :

- **Plus simple** : `pm2 logs grossiteppn > app.log` + rotation logrotate
- **Vector / Loki / Grafana** : pointer Vector sur les sorties pm2
- **Datadog / Sentry** : ajouter le SDK plus tard sans casser l'existant

Erreurs client (React) : capturées par `src/app/global-error.tsx` et envoyées à `/api/log/client-error` qui les écrit via le logger serveur.

## Sécurité

- **Rate limiting** Better-Auth activé en prod :
  - 5 tentatives / minute / IP sur `/sign-in/email`
  - 3 / min sur `/sign-up/email` et `/forget-password`
- **Audit log** : table `audit_logs` consultable dans `/admin/audit`
- **Sessions** : 7 jours, refresh auto à 24h

## Tests

```bash
pnpm test            # Vitest (utils + helpers)
pnpm test:e2e        # Playwright smoke
```

`pnpm test:e2e` démarre `pnpm dev` automatiquement. Pour CI, lancer `pnpm build && pnpm start` en parallèle et passer `BASE_URL=http://localhost:3000`.

## Migration schéma DB

```bash
# Générer un fichier SQL de migration depuis les changements de schema/
pnpm db:generate

# Appliquer directement (à éviter en prod sans review)
pnpm db:push

# Préférable en prod : reviewer le SQL généré dans drizzle/migrations/ avant
psql "$DATABASE_URL" -f drizzle/migrations/NNNN_xxxx.sql
```

## Rollback rapide

```bash
# Revert vers le commit précédent
cd /opt/grossiteppn && git log --oneline -5
git checkout <hash-précédent>
pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart grossiteppn
```

Pour les changements de schéma DB → restaurer depuis le dump pg.
