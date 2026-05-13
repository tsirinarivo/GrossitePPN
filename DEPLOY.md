# Déploiement GrossistePPN — VPS Contabo Ubuntu 22.04

## Architecture

```
Internet → Nginx :80 → Next.js :3000 → PostgreSQL :5432
           (reverse proxy)  (app)           (DB)
```

Tout tourne dans Docker Compose sur le même VPS.  
Latence DB interne : < 1ms.

---

## 1. Préparer le VPS (une seule fois)

Connecte-toi en SSH à ton VPS Contabo :

```bash
ssh root@TON_IP_VPS
```

### Installer Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Vérifier
docker --version
docker compose version
```

### Cloner le projet

```bash
cd /opt
git clone https://github.com/tsirinarivo/GrossitePPN.git grossiteppn
cd grossiteppn
git checkout claude/wholesale-management-pwa-khts0
```

---

## 2. Configurer les variables d'environnement

```bash
cp .env.production.example .env.production
nano .env.production
```

Remplir les valeurs :

| Variable | Description | Exemple |
|---|---|---|
| `POSTGRES_PASSWORD` | Mot de passe DB (fort) | `Xk9#mP2$vL8nQ...` |
| `BETTER_AUTH_SECRET` | Clé secrète auth (32+ chars) | générer avec `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL publique de l'app | `http://123.456.789.012` |

**Générer un secret sécurisé :**
```bash
openssl rand -base64 32
```

---

## 3. Premier déploiement

```bash
chmod +x deploy.sh

# Déployer + insérer les données initiales
./deploy.sh --seed
```

Le script va :
1. Vérifier les prérequis
2. Builder l'image Next.js (~3-5 min)
3. Démarrer PostgreSQL, l'app, Nginx
4. Appliquer les migrations Drizzle
5. Insérer les données initiales (produits, dépôts, clients démo)

---

## 4. Mises à jour suivantes

```bash
cd /opt/grossiteppn
./deploy.sh
# (sans --seed pour ne pas réinsérer les données)
```

---

## 5. Migrations manuelles (si le script échoue)

```bash
# Depuis le VPS, dans le dossier du projet
source .env.production
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?sslmode=disable"

# Pousser le schéma
docker run --rm \
  --network grossiteppn_ppn_network \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable" \
  -v "$(pwd):/app" -w /app \
  node:22-alpine sh -c "npm i -g pnpm && pnpm install && pnpm drizzle-kit push"

# Seed
docker run --rm \
  --network grossiteppn_ppn_network \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable" \
  -v "$(pwd):/app" -w /app \
  node:22-alpine sh -c "npm i -g pnpm && pnpm install && pnpm db:seed"
```

---

## 6. Commandes utiles

```bash
# Voir les logs en temps réel
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f postgres

# Statut des conteneurs
docker compose ps

# Redémarrer un service
docker compose restart app

# Accéder à PostgreSQL directement
docker compose exec postgres psql -U ppn_user -d ppn_production

# Sauvegarder la base de données
docker compose exec postgres pg_dump -U ppn_user ppn_production > backup_$(date +%Y%m%d).sql

# Restaurer une sauvegarde
docker compose exec -T postgres psql -U ppn_user ppn_production < backup_20260513.sql

# Arrêter tout
docker compose down

# Arrêter et supprimer les données (⚠️ irréversible)
docker compose down -v
```

---

## 7. Surveillance

```bash
# CPU / RAM / Disk
htop
df -h

# Espace utilisé par Docker
docker system df

# Nettoyer les images inutilisées
docker system prune -f
```

---

## 8. Ajouter un domaine + HTTPS (optionnel, plus tard)

Quand tu auras un nom de domaine `.mg` :

```bash
# Installer Certbot
apt install certbot python3-certbot-nginx -y

# Modifier docker/nginx/nginx.conf : ajouter server_name ton-domaine.mg
# Puis obtenir le certificat SSL
certbot --nginx -d ton-domaine.mg
```

---

## Ports ouverts sur le firewall VPS

```bash
# Ouvrir le port 80 (HTTP)
ufw allow 80/tcp
ufw allow 22/tcp  # SSH (déjà ouvert normalement)
ufw enable
```

---

## Comptes de connexion (démo après seed)

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@grossiteppn.mg | (à définir via l'interface) |

> **Note :** Les comptes utilisateurs se créent via le module Admin → Inviter un utilisateur.
