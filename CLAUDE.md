@AGENTS.md

# GrossistePPN — Mémoire projet Claude

> ERP + PWA pour grossistes alimentaires à Madagascar. Gestion POS, stock, livraisons, achats, facturation, B2B e-commerce, analytics.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16.2.6 App Router (`output: standalone`) |
| UI | Tailwind CSS v4 + Radix UI + shadcn/ui partiel |
| Animations | Framer Motion 12 |
| Base de données | PostgreSQL via Neon (serverless) |
| ORM | Drizzle ORM 0.45 |
| Auth | Better-Auth 1.6 avec rôles custom |
| État client | Zustand 5 (`persist` + `skipHydration`) |
| Charts | Recharts 3 |
| Formulaires | React Hook Form + Zod |
| Toasts | Sonner |
| Impression | ESC/POS WebUSB + Cloud (Xprint) + HTML→print |
| Offline | Service Worker + Dexie (IndexedDB) |
| i18n | next-intl (FR / MG) |
| Monnaie | `formatMGA` depuis `@/lib/money` |

---

## Branche de travail

```
claude/inspiring-bardeen-utEpQ
```

**Toujours développer et pousser sur cette branche. Ne jamais toucher `main`.**

> Branche historique (sprints 1→15) : `claude/wholesale-management-pwa-khts0`. Les sprints 16→35 ont été poussés sur `claude/inspiring-bardeen-utEpQ` qui tourne en prod (port 3002 via PM2, vhost `grossiste.dago-it.com`).

---

## Conventions strictes observées dans le code

### API Routes
- Toujours `export const dynamic = "force-dynamic"` en haut de chaque route
- Pattern auth standard :
  ```ts
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  ```
- Import DB toujours : `import { db } from "@/lib/db"; import * as schema from "@/lib/db/schema";`
- Drizzle : les filtres multiples utilisent `and(condition1, condition2)` — **jamais deux `.where()` chaînés**
- `inArray()` avec des enum Drizzle nécessite `as unknown as Type[]` pour satisfaire TypeScript
- Fallback démo systématique si la DB retourne vide (données réalistes Madagascar)

### Composants
- Tous les composants client commencent par `"use client";`
- Format monétaire : `formatMGA(valeur)` depuis `@/lib/money`
- Nombres : `.toLocaleString("fr-FR")`
- Dates : `.toLocaleDateString("fr-FR")`
- Dark theme CSS vars : `bg-[--card]`, `text-[--foreground]`, `border-[--border]`, `text-[--foreground-muted]`
- Thème POS (dark orange) : CSS vars `--pos-*`, `bg-[--pos-surface]`, couleur primaire `#FF4D00`
- Drawers/modals via `AnimatePresence` + `motion.aside` ou `createPortal`
- Animations listes : `motion.div` avec `initial={{ opacity: 0, y: 8 }}` + stagger `delay: i * 0.04`

### Schéma DB
- Les fichiers de schéma sont dans `src/lib/db/schema/` (splitté par domaine)
- Tous exportés depuis `src/lib/db/schema/index.ts`
- Clés primaires : `text("id").primaryKey()` (UUID via `crypto.randomUUID()` ou nanoid)
- Timestamps : `createdAt` (`defaultNow()`), `updatedAt` (manuel)

### Rôles disponibles
`admin` | `gerant` | `caissier` | `agent` | `magasinier` | `chauffeur` | `comptable` | `marketing` | `client_b2b` | `sous_utilisateur_client`

### PDF
- Pattern : route API retourne `text/html` avec styles inline + `<script>window.onload=()=>window.print()</script>`
- Le client ouvre la route dans un nouvel onglet (`window.open(url, "_blank")`)
- **Pas de pdf-lib** pour les documents courants (trop lourd)

---

## Déploiement VPS

Projet installé dans `/opt/grossiteppn`. Gestionnaire de processus : **pm2**.

```bash
cd /opt/grossiteppn
git pull origin claude/inspiring-bardeen-utEpQ
pnpm install --frozen-lockfile
pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart grossiteppn
```

> ⚠️ `git pull` seul ne suffit pas — il faut toujours rebuilder.

### Règle après chaque `git push`

Afficher OBLIGATOIREMENT ce bloc exact, prêt à copier-coller :

```
cd /opt/grossiteppn && git pull origin claude/inspiring-bardeen-utEpQ && pnpm build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && pm2 restart grossiteppn
```

---

## Mode de fonctionnement autonome

**L'utilisateur n'a pas besoin de confirmer chaque sprint.**

### Workflow à chaque nouvelle session
1. Lire `docs/ROADMAP.md` → prendre le prochain sprint de la "File d'attente"
2. Vérifier `git log --oneline -5` pour ne pas refaire ce qui est fait
3. Lancer les agents en parallèle pour les tâches indépendantes
4. `pnpm build` doit passer **sans erreur TypeScript** avant tout commit
5. Commit avec message `feat(sprint-N): description courte`
6. Push sur la branche de travail
7. Afficher la commande VPS
8. Marquer le sprint comme livré dans `docs/ROADMAP.md` et committer la mise à jour
9. Enchaîner le sprint suivant sans demander la permission

### Format du rapport après chaque sprint
```
Sprint N ✓ — [3 features en une ligne]
Routes : X → Y
[commande VPS]
```

### Quand s'arrêter
- Si l'utilisateur dit "pause", "stop", "attends"
- Si le build échoue avec une erreur non triviale (> 10 min de debug)
- Si une feature nécessite une migration DB réelle (créer un nouveau schéma = ok, modifier existant = demander)

---

## État actuel (sprint 35 — Juin 2026)

### Routes implémentées (~47 pages + ~75 API routes)

**Dashboard / Back-office :**
- `/` Dashboard home (KPIs, graphiques, quick actions mobile)
- `/pos/agent` POS agent (recherche, client inline, panier, raccourcis F1-F12, aperçu ticket thermique 58mm)
- `/pos/caisse` Caisse (sessions, Z-report, paiements multi-mode)
- `/pos/sessions` Historique sessions caisse
- `/commandes` Dashboard commandes (liste + kanban statuts)
- `/retours` Retours clients + génération avoirs + PDF (sprint 16)
- `/historique` Historique ventes enrichi (filtres, graph CA/jour)
- `/stock` Gestion stock + mouvements
- `/stock/analyse` Analyse rotation, réappro suggérée
- `/stock/inventaire` Saisie inventaire multi-dépôts
- `/stock/produits/[id]` Fiche produit avec analytique ventes
- `/stock/produits/nouveau` Wizard création produit
- `/clients` CRM clients (liste, KPIs, drawer détail)
- `/clients/encours` Encours crédit + relances
- `/livraisons` Tableau de bord livraisons + carte SVG
- `/livraisons/tournees` Tournées logistiques + feuille de route PDF (sprint 17)
- `/chauffeur` App mobile chauffeur — tournée du jour, photo preuve, offline (sprint 27)
- `/achats` Bons de commande fournisseurs + réceptions
- `/finances` Dashboard financier (CA, charges, prévision fin de mois)
- `/finances/charges` CRUD charges opérationnelles
- `/notifications` Historique + filtres priorité + marquer lu (sprint 28)
- `/rapports` Hub rapports
- `/rapports/marges` Marges produits (top/flop, tableau)
- `/rapports/tva` Rapport TVA mensuel/trimestriel
- `/rapports/vendeurs` Performance par agent/vendeur
- `/rapports/clients` Analyse RFM clients (Champions/Fidèles/etc.)
- `/rapports/previsions` Prévisions saisonnières + facteurs Madagascar
- `/rapports/fournisseurs` Volume, délai, conformité, alertes (sprint 21)
- `/rapports/bilan` Compte de résultat mensuel + export CSV (sprint 22)
- `/rapports/livraisons` Ponctualité chauffeur, motifs échec (sprint 23)
- `/rapports/panier` Distribution montants + market basket (sprint 24)
- `/admin` Paramètres entreprise
- `/admin/promotions` Gestion promotions (CRUD)
- `/admin/depots` CRUD dépôts + stock consolidé + transferts inter-dépôts (sprint 18)
- `/setup` Wizard 4 étapes + import CSV produits (sprint 29)
- `/paiement/[id]` Confirmation Mobile Money simulé avec QR + polling (sprint 33)

**Boutique B2B (e-commerce) :**
- `/shop` Catalogue avec bannières animées, stock badge, suggestions
- `/shop/categorie/[slug]` Page catégorie
- `/produit/[slug]` Fiche produit avec suggestions similaires
- `/panier` Panier avec checkout + codes promo réels (sprint 19)
- `/compte` Espace client
- `/compte/commandes` Mes commandes (avec lien PDF facture)
- `/compte/factures` Mes factures
- `/compte/listes` Listes d'achat récurrentes + commande rapide (sprint 20)
- `/compte/fidelite` Programme fidélité (tier bronze→platine)
- `/compte/equipe` Gestion équipe B2B
- `/compte/adresses` Mes adresses
- `/suivi/[id]` Suivi livraison public (timeline statuts)

**PDF générés :** Factures, Devis, Bons de commande achats, Bons de livraison, Avoirs (sprint 16), Feuille de route tournée (sprint 17), Rapport mensuel comptable (sprint 34)

**API publiques (avec X-API-Key + rate limit) :**
- `/api/public/catalogue` — produits actifs
- `/api/public/stock` — stock temps réel

**Exports comptables (sprint 34) :**
- `/api/export/fec` — FEC pipe-separated (411/707/44571)
- `/api/export/sage` — CSV ; pour Sage
- `/api/export/rapport-mensuel` — PDF couverture + résultat + TVA

### Tables DB ajoutées (sprint 16)

`retours`, `lignes_retour`, `avoirs` — nécessite `pnpm drizzle-kit push` sur le VPS lors du premier déploiement après le pull.

### Tests

`pnpm test` lance Vitest (17 tests OK : formatMGA, calcul TVA, scoring RFM).

---

## Pièges connus

- **Double `.where()` Drizzle** : le second écrase le premier — toujours utiliser `and()`
- **`inArray()` avec enum Drizzle** : typer avec `as unknown as Type[]` ou extraire le tableau avec type explicite
- **Build lock Next.js** : si "another build is running", `kill -9 $(pgrep -f "next build")` puis relancer
- **`schema.clients.ville`** : n'existe PAS dans ce schéma — utiliser `adresse` à la place
- **`schema.commandes.statut` enum** : brouillon/soumise/validee/preparee/en_livraison/livree/annulee/refusee (pas "partiellement_livree")
- **`schema.livraisons.statut` enum** : en_attente/preparee/chargee/en_route/livree/refusee/echec
- **PDF dans standalone** : retourner `NextResponse` avec `Content-Type: text/html`, pas de redirect

---

## Ce qu'il ne faut PAS faire

- Ne jamais pousser sur `main`
- Ne jamais modifier un fichier de schéma existant sans créer une migration (risque de casser la prod)
- Ne pas utiliser `pdf-lib` pour les documents courants (lent, lourd)
- Ne pas créer de tests E2E/Playwright sauf si explicitement demandé
- Ne pas ajouter de `console.log` en production
- Ne pas installer de nouvelles dépendances sans vérifier qu'elles existent déjà (`dexie`, `recharts`, `framer-motion`, `sonner` sont déjà là)
- Ne pas refactoriser du code existant qui fonctionne (sprint = livraison de valeur, pas de cleanup)
