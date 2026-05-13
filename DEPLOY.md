# Déploiement GrossistePPN — VPS Contabo Ubuntu 22.04

## Architecture sur le VPS

```
Internet :80/:443
     │
  Nginx natif (systemd)          ← gère tous les projets du VPS
     │
     ├── transhub    → 127.0.0.1:3000
     ├── dagoit      → 127.0.0.1:8085
     ├── smsgate     → 127.0.0.1:8084
     ├── dagocloud   → 127.0.0.1:8083
     ├── starlink    → 127.0.0.1:8082
     └── grossiteppn → 127.0.0.1:3001   ← notre app

Docker Compose GrossistePPN :
  ppn_app      (Next.js  :3001)
  ppn_postgres (PostgreSQL, réseau interne uniquement)
```

**Pas de container Nginx** — on réutilise le Nginx natif déjà en place.

---

## 1. Préparer le projet sur le VPS (une seule fois)

```bash
ssh root@TON_IP_VPS

# Cloner dans /opt comme tes autres projets
cd /opt
git clone https://github.com/tsirinarivo/GrossitePPN.git grossiteppn
cd grossiteppn
git checkout claude/wholesale-management-pwa-khts0
chmod +x deploy.sh
```

---

## 2. Configurer les variables d'environnement

```bash
cp .env.production.example .env.production
nano .env.production
```

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Mot de passe fort (min. 24 chars) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://TON_IP_VPS` (ou domaine plus tard) |

---

## 3. Premier déploiement

```bash
./deploy.sh --seed
```

Le script :
1. Vérifie les prérequis et variables
2. Vérifie que le port 3001 est libre
3. Build l'image Next.js (~3-5 min)
4. Démarre PostgreSQL + l'app
5. Applique les migrations Drizzle
6. Insère les données initiales (produits, dépôts, clients)
7. Configure automatiquement le vhost Nginx natif
8. Vérifie que l'app répond

---

## 4. Configuration Nginx (si pas fait automatiquement)

```bash
# Éditer le vhost généré
nano /etc/nginx/sites-available/grossiteppn

# Remplacer TON_IP_VPS par ton IP réelle, par exemple :
# server_name ppn.123.456.789.012;
# ou simplement :
# server_name _;   ← répond à toutes les requêtes sans domaine

# Vérifier et recharger
nginx -t && systemctl reload nginx
```

---

## 5. Mises à jour suivantes

```bash
cd /opt/grossiteppn
./deploy.sh   # sans --seed
```

---

## 6. Migrations manuelles

Si le script de migration échoue dans le deploy.sh :

```bash
source .env.production
DB="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?sslmode=disable"

# Option A — depuis un container temporaire
docker run --rm \
  --network grossiteppn_ppn_network \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@ppn_postgres:5432/${POSTGRES_DB}?sslmode=disable" \
  -v "$(pwd):/app" -w /app \
  node:22-alpine sh -c "npm i -g pnpm && pnpm install && pnpm drizzle-kit push"

# Option B — exposer temporairement PostgreSQL (puis refermer)
# Dans docker-compose.yml, ajouter sous postgres:
#   ports:
#     - "127.0.0.1:5433:5432"
# Puis depuis le VPS :
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5433/${POSTGRES_DB}?sslmode=disable" \
  pnpm drizzle-kit push
```

---

## 7. Commandes utiles

```bash
# Logs
docker compose logs -f app
docker compose logs -f postgres

# Statut
docker compose ps

# Redémarrer l'app
docker compose restart app

# Accès PostgreSQL
docker compose exec postgres psql -U ppn_user -d ppn_production

# Sauvegarde DB
docker compose exec postgres pg_dump -U ppn_user ppn_production \
  > /opt/backups/ppn_$(date +%Y%m%d_%H%M).sql

# Arrêt
docker compose down

# Voir ce qui tourne sur le VPS
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
```

---

## 8. Ressources VPS actuelles

| Ressource | Total | Utilisé | Libre |
|---|---|---|---|
| Disque | 193G | 61G | **133G** ✅ |
| RAM | 23Gi | 3.7Gi | **19Gi** ✅ |

GrossistePPN nécessite environ : ~500MB RAM, ~2GB disque.

---

## 9. Note sur ERPNext

Tes instances ERPNext (`erpnext` et `frappe_docker2`) sont en boucle de restart.  
Ce n'est pas lié à GrossistePPN mais si tu veux investiguer :
```bash
docker compose -f /opt/erpnext/pwd.yml logs frontend --tail=50
docker compose -f /opt/erpnext2/pwd.yml logs frontend --tail=50
```

---

## 10. Ajouter HTTPS plus tard (quand tu auras un domaine)

```bash
apt install certbot python3-certbot-nginx -y
# Modifier server_name dans /etc/nginx/sites-available/grossiteppn
certbot --nginx -d ton-domaine.mg
```
