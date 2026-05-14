# GrossistePPN — ERP Grossiste Madagascar

Application de gestion complète pour grossistes alimentaires à Madagascar. PWA (Progressive Web App) optimisée pour connexions lentes, utilisable partiellement hors ligne.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 App Router (`output: standalone`) |
| UI | Tailwind CSS v4 + Radix UI + Framer Motion |
| Base de données | PostgreSQL via Neon (serverless) |
| ORM | Drizzle ORM |
| Auth | Better-Auth avec rôles custom |
| État client | Zustand 5 (persist + skipHydration) |
| Temps réel | SSE (Server-Sent Events) |
| Impression | ESC/POS WebUSB + Cloud (Xprint) + PDF (pdf-lib) |
| Offline | Service Worker + Dexie (IndexedDB) |
| i18n | next-intl (FR / MG) |

---

## Modules

### Point de Vente (POS Agent) `/pos/agent`
- Catalogue produits par catégorie avec recherche
- Panier avec remises, TVA par produit, multi-unités
- Envoi de commandes à la caisse en temps réel (SSE)
- Liste "Mes commandes" : modifier ou annuler une commande envoyée
- Mode hors-ligne : Service Worker + fallback démo

### Caisse `/pos/caisse`
- File d'attente FIFO en temps réel (SSE)
- Visualisation des lignes + totaux HT/TVA/TTC
- Encaissement : choix mode de paiement (Espèces, Mvola, Orange Money, Airtel Money, Virement, Crédit client)
- Impression au choix : ticket ESC/POS (USB ou cloud), PDF A4, ou aucune
- Passage automatique à la commande suivante après encaissement
- Annulation de commande depuis la file

### Achats & Fournisseurs `/achats`
- Gestion des fournisseurs (nom, NIF, contact, délai paiement)
- Bons de commande avec lignes produits
- Workflow : Brouillon → Envoyé → Confirmé → Réceptionné
- Réception partielle ou complète avec mise à jour automatique du stock
- Création de mouvements de stock `entrée` à chaque réception

### Stock `/stock`
- Catalogue produits (code, catégorie, prix achat PUMP, prix vente par palier)
- Gestion par dépôt
- Mouvements : entrée, vente, transfert, casse, inventaire
- Traçabilité par lot (numéro lot, date expiration)
- Unités de vente multiples avec facteur de conversion

### Clients `/clients`
- Fiche client avec palier (Gros / Semi-gros / Détail)
- Encours crédit et plafond
- Programme fidélité (Bronze / Argent / Or / Platine)
- Historique commandes

### Livraisons `/livraisons`
- Tournées du jour avec statuts
- Vue carte + détail livraison
- Token public de suivi `/suivi/[id]`

### Boutique B2B `/shop`
- Catalogue public par catégorie
- Panier et commande en ligne
- Espace client : commandes, adresses, équipe, factures

### Rapports `/rapports`
- Graphiques Recharts (ventes, stock, achats)

### Admin `/admin`
- Paramètres entreprise (TVA, e-commerce, fidélité)
- Gestion dépôts, utilisateurs et rôles
- Configuration moyens de paiement
- Imprimante cloud (Xprint)

---

## Rôles utilisateurs

| Rôle | Label | Accès |
|------|-------|-------|
| `admin` | Administrateur | Tout |
| `gerant` | Gérant | POS, Stock, Clients, Livraisons, Achats, Rapports |
| `caissier` | Caissier | Caisse uniquement |
| `agent` | Agent commercial | POS Agent uniquement |
| `magasinier` | Magasinier | Stock, Achats |
| `comptable` | Comptable | Rapports, Achats, Clients |
| `chauffeur` | Chauffeur | Livraisons |
| `marketing` | Marketing | Rapports, Boutique |
| `client_b2b` | Client B2B | Boutique B2B |

---

## Installation

### Prérequis
- Node.js 20+
- pnpm 9+
- PostgreSQL (Neon recommandé)

### Développement local

```bash
# Cloner le dépôt
git clone https://github.com/tsirinarivo/GrossitePPN.git
cd GrossitePPN

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL

# Lancer le serveur de développement
pnpm dev
```

### Variables d'environnement requises

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://votre-domaine.mg

# Optionnel — impression cloud
XPRINT_API_KEY=...
XPRINT_DEVICE_ID=...
```

### Build production

```bash
pnpm build
```

---

## Déploiement VPS

Le projet utilise `output: "standalone"` — les fichiers statiques doivent être copiés après chaque build.

```bash
# Première installation
cd /opt/grossiteppn
git clone https://github.com/tsirinarivo/GrossitePPN.git .
pnpm install
cp .env.example .env.local   # remplir les valeurs
pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 start .next/standalone/server.js --name grossiteppn
pm2 save && pm2 startup
```

```bash
# Mise à jour
cd /opt/grossiteppn
git pull origin claude/wholesale-management-pwa-khts0
pnpm install --frozen-lockfile
pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart grossiteppn
```

### Nginx — reverse proxy

```nginx
server {
    server_name grossiste.dago-it.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Requis pour les Server-Sent Events (file d'attente caisse)
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

---

## Structure du projet

```
src/
├── app/
│   ├── (dashboard)/          # Pages protégées (POS, stock, achats…)
│   ├── (shop)/               # Boutique B2B publique
│   └── api/                  # Routes API Next.js
│       ├── achats/           # Fournisseurs, bons de commande, réceptions
│       ├── caisse/           # File d'attente, encaissement
│       ├── pos/              # Commandes agent
│       ├── stock/            # Mouvements stock
│       ├── stream/caisse/    # SSE temps réel
│       └── print/            # Impression ticket / PDF
├── components/
│   ├── domain/               # Composants métier par module
│   │   ├── pos/              # POS agent + panier + mes commandes
│   │   ├── caisse/           # Interface caisse
│   │   ├── achats/           # Module achats
│   │   ├── stock/            # Module stock
│   │   └── clients/          # CRM clients
│   └── ui/                   # Composants génériques (Button, Card…)
├── lib/
│   ├── db/schema/            # Schémas Drizzle ORM (tables PostgreSQL)
│   ├── auth/                 # Configuration Better-Auth
│   ├── sse/                  # Broadcaster SSE in-process
│   ├── print/                # ESC/POS + PDF facture
│   ├── money.ts              # Formatage Ariary (MGA)
│   └── permissions.ts        # RBAC — rôles et sections
├── store/
│   ├── pos.store.ts          # État POS (panier, catalogue, mode édition)
│   └── app.store.ts          # État global (connexion réseau)
├── hooks/
│   └── use-commande-stream.ts # Hook SSE caisse
└── public/
    ├── sw.js                 # Service Worker PWA
    └── manifest.json         # Manifest PWA
```

---

## PWA & Offline

Le Service Worker (`public/sw.js`) implémente :
- **Cache-first** pour les assets statiques (`/_next/static/`, fonts, images)
- **Network-first avec timeout 5s** pour les pages HTML
- Fallback HTML si réseau indisponible

L'application reste utilisable en lecture (catalogue produits) même sans connexion.

---

## Impression

| Méthode | Description |
|---------|-------------|
| **Cloud (Xprint)** | Imprimante réseau configurée dans Admin → Imprimante. |
| **USB (ESC/POS)** | WebUSB — Chrome/Edge desktop uniquement. |
| **PDF A4** | Généré côté client avec pdf-lib, téléchargement direct. |

---

## Devises

Tous les montants sont en **Ariary Malgache (MGA)**, stockés en **entiers** dans la base de données. La fonction `formatMGA()` gère l'affichage avec séparateurs de milliers.

---

## Licence

Usage privé — GrossistePPN Madagascar.
