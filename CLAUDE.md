@AGENTS.md

# GrossistePPN — Mémoire projet Claude

> ERP + PWA pour grossistes alimentaires à Madagascar. Gestion POS, stock, livraisons, achats, facturation, B2B e-commerce, analytics, retours/avoirs, tournées logistiques, dépôts multi-sites, audit trail.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16.2.6 App Router (`output: standalone`) — Turbopack |
| UI | Tailwind CSS v4 + Radix UI + shadcn/ui partiel |
| Animations | Framer Motion 12 |
| Base de données | PostgreSQL via Neon (serverless) |
| ORM | Drizzle ORM 0.45 |
| Auth | Better-Auth 1.6 avec rôles custom + rate limiting prod |
| État client | Zustand 5 (`persist` + `skipHydration`) |
| Charts | Recharts 3 |
| Formulaires | React Hook Form + Zod |
| Toasts | Sonner |
| Impression | ESC/POS WebUSB + Cloud (Xprint) + HTML→print |
| Offline | Service Worker + Dexie (IndexedDB) |
| i18n | next-intl (FR / MG) |
| Monnaie | `formatMGA` depuis `@/lib/money` |
| Tests | Vitest (utils) + Playwright (smoke E2E) |
| Logger | Logger structuré JSON en prod (`@/lib/logger`) |
| Sécurité | `escapeHtml` + `escapeCsvCell` (`@/lib/escape`) |

---

## Branche de travail

```
claude/resume-autonomous-dev-kUOrp
```

**Toujours développer et pousser sur cette branche. Ne jamais toucher `main` ni `claude/wholesale-management-pwa-khts0` (ancienne branche figée au sprint 15).**

---

## Conventions strictes observées dans le code

### API Routes
- Toujours `export const dynamic = "force-dynamic"` en haut de chaque route
- Pattern auth standard :
  ```ts
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  ```
- Vérification de rôle pour les actions sensibles :
  ```ts
  const role = (session.user as any).role ?? "agent";
  if (!["admin","gerant"].includes(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  ```
- Import DB toujours : `import { db } from "@/lib/db"; import * as schema from "@/lib/db/schema";`
- Drizzle : filtres multiples avec `and(condition1, condition2)` — **jamais deux `.where()` chaînés**
- `inArray()` avec enum Drizzle nécessite `as unknown as Type[]`
- **JAMAIS de fallback démo en prod** : utiliser `isDemoFallbackEnabled()` depuis `@/lib/demo-mode` pour conditionner
- **Ne JAMAIS faire confiance au `body` pour des IDs sensibles** (`agentId`, `clientId`, `userId`) — toujours dériver de `session.user.id` ou de jointures DB
- Mode paiement : whitelister contre l'enum DB (jamais de cast TypeScript ambigu)
- Logger les actions sensibles via `logAudit({ action, entite, entiteId, details })` depuis `@/lib/audit`

### Composants
- Tous les composants client commencent par `"use client";`
- Format monétaire : `formatMGA(valeur)` depuis `@/lib/money`
- Nombres : `.toLocaleString("fr-FR")` — **toujours wrapper en `(value ?? 0)`** pour les champs DB nullable
- Dates : `.toLocaleDateString("fr-FR")` — **toujours vérifier `if (date)` avant `new Date()`**
- Dark theme CSS vars : `bg-[--card]`, `text-[--foreground]`, `border-[--border]`, `text-[--foreground-muted]`
- Thème POS (dark orange) : CSS vars `--pos-*`, primaire `#FF4D00`
- Drawers/modals via `AnimatePresence` + `motion.aside` ou `createPortal`
- Animations listes : `motion.div` avec `initial={{ opacity: 0, y: 8 }}` + stagger `delay: i * 0.04`
- Boutons submit : **toujours garde `if (loading) return` en tête du handler async** + `disabled={loading}` sur le bouton

### Schéma DB
- Les fichiers de schéma sont dans `src/lib/db/schema/` (splitté par domaine)
- Tous exportés depuis `src/lib/db/schema/index.ts`
- Clés primaires : `text("id").primaryKey()` (UUID via `crypto.randomUUID()`)
- Timestamps : `createdAt` (`defaultNow()`), `updatedAt` (manuel)
- Modifications de stock : **UPDATE atomique avec `sql\`GREATEST(0, qte - X)\`` + `RETURNING`** — jamais SELECT puis UPDATE séparés

### Rôles disponibles
`admin` | `gerant` | `caissier` | `agent` | `magasinier` | `chauffeur` | `comptable` | `marketing` | `client_b2b` | `sous_utilisateur_client`

### PDF (HTML→print)
- Pattern : route API retourne `text/html` avec styles inline + `<script>window.onload=()=>window.print()</script>`
- Le client ouvre la route dans un nouvel onglet (`window.open(url, "_blank")`)
- **Pas de pdf-lib** pour les documents courants
- **TOUJOURS échapper les interpolations utilisateur avec `e()`** depuis `@/lib/escape` — sinon XSS dans le PDF

### Export CSV
- Séparateur `;` + BOM UTF-8 (`"﻿"` en tête) pour Excel français
- **TOUJOURS appliquer `escapeCsvCell()`** sur les valeurs utilisateur (évite l'injection de formules `=`, `+`, `-`, `@`)

---

## Déploiement VPS

Projet installé dans `/opt/grossiteppn`. Gestionnaire de processus : **pm2** (process `grossiteppn`, port 3002).

Le `.env` est un symlink vers `.env.production` (créé lors du premier déploiement de la session). Contient `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `NODE_ENV=production`.

```bash
cd /opt/grossiteppn
git pull origin claude/resume-autonomous-dev-kUOrp
pnpm install --frozen-lockfile
pnpm db:push  # SI le schéma a changé (vérifier le diff avant)
pnpm build
rm -rf .next/standalone/.next/static .next/standalone/public  # OBLIGATOIRE avant le cp (sinon nesting → chunks 404)
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart grossiteppn
```

> ⚠️ `git pull` seul ne suffit pas — il faut toujours rebuilder.
> ⚠️ **Toujours `rm -rf` le dossier static/public du standalone AVANT le `cp`** : sinon `cp -r` imbrique dans le dossier existant (`.next/standalone/.next/static/static/…`) → « Failed to load chunk » au 2ᵉ redéploiement.

### Règle après chaque `git push`

Afficher OBLIGATOIREMENT ce bloc exact, prêt à copier-coller :

```
cd /opt/grossiteppn && git pull origin claude/resume-autonomous-dev-kUOrp && pnpm build && rm -rf .next/standalone/.next/static .next/standalone/public && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && pm2 restart grossiteppn
```

Si le sprint a ajouté/modifié des tables DB, ajouter `pnpm db:push` après le `git pull`.

---

## Mode de fonctionnement autonome

**L'utilisateur n'a pas besoin de confirmer chaque sprint.**

### Workflow à chaque nouvelle session
1. Lire `docs/ROADMAP.md` → prendre le prochain sprint de la "File d'attente"
2. Vérifier `git log --oneline -5` pour ne pas refaire ce qui est fait
3. Lancer les agents en parallèle pour les tâches indépendantes
4. `pnpm build` doit passer **sans erreur TypeScript** avant tout commit
5. `pnpm test` doit passer (Vitest, 24 tests) — ajouter des tests si on touche `@/lib/money`, `@/lib/escape`, `@/lib/demo-mode`, calculs TVA/RFM
6. Commit avec message `feat(sprint-N): description courte`
7. Push sur `claude/resume-autonomous-dev-kUOrp`
8. Afficher la commande VPS
9. Marquer le sprint comme livré dans `docs/ROADMAP.md` et committer la mise à jour
10. Enchaîner le sprint suivant sans demander la permission

### Format du rapport après chaque sprint
```
Sprint N ✓ — [3 features en une ligne]
Routes : X → Y pages, +Z API routes
[commande VPS prête à copier-coller]
```

### Quand s'arrêter
- Si l'utilisateur dit "pause", "stop", "attends"
- Si le build échoue avec une erreur non triviale (> 10 min de debug)
- Si une feature nécessite une migration DB **destructive** (drop column, rename) — demander avant
- Si on touche au flux paiement, validation commande, ou décrémentation stock — demander avant (zone critique)

---

## État actuel (sprint 24 livré + audit complet — Mai 2026)

### Routes implémentées (48 pages + ~80 API routes)

**Dashboard / Back-office :**
- `/` Dashboard home (KPIs, graphiques, quick actions mobile)
- `/pos/agent` POS agent (recherche produits, client inline, panier)
- `/pos/caisse` Caisse (sessions, Z-report, paiements multi-mode, **mode paiement réel respecté**)
- `/pos/sessions` Historique sessions caisse
- `/commandes` Dashboard commandes (liste + kanban statuts)
- `/historique` Historique ventes enrichi (filtres, graph CA/jour)
- `/stock` Gestion stock + mouvements + bouton Historique
- `/stock/analyse` Analyse rotation, réappro suggérée
- `/stock/historique` **Vue globale mouvements stock avec filtres + export CSV**
- `/stock/inventaire` Saisie inventaire multi-dépôts
- `/stock/produits/[id]` Fiche produit avec onglets Édition / Analytique / **Historique** (timeline + ventes + achats + évolution prix)
- `/stock/produits/nouveau` Wizard création produit
- `/clients` CRM clients (filtre par agent pour les non-managers)
- `/clients/encours` Encours crédit + relances
- `/livraisons` Tableau de bord livraisons + carte SVG
- `/tournees` **Gestion tournées logistiques (CRUD + affectation + réordonnancement)**
- `/tournees/[id]` Détail tournée + picker livraisons libres + PDF feuille de route
- `/achats` Bons de commande fournisseurs + réceptions
- `/retours` **Retours & avoirs (liste + KPIs + filtres)**
- `/retours/nouveau` **Wizard 3 étapes : facture → lignes → motif/mode**
- `/finances` Dashboard financier
- `/finances/charges` CRUD charges opérationnelles
- `/rapports` Hub rapports
- `/rapports/marges` Marges produits
- `/rapports/tva` Rapport TVA mensuel/trimestriel
- `/rapports/vendeurs` Performance vendeurs (admin/gerant/comptable/marketing)
- `/rapports/clients` Analyse RFM (admin/gerant/comptable/marketing)
- `/rapports/previsions` Prévisions saisonnières
- `/rapports/fournisseurs` **Classement volume + conformité + délais + alertes retard**
- `/rapports/bilan` **Compte de résultat mensuel + export CSV**
- `/rapports/livraisons` **Ponctualité chauffeur + km + motifs échec**
- `/rapports/panier-moyen` **Distribution + market basket + cross-sell**
- `/admin` Paramètres entreprise + menu (promotions, dépôts, audit)
- `/admin/promotions` Gestion promotions
- `/admin/depots` **CRUD dépôts + stock consolidé + transferts inter-dépôts**
- `/admin/audit` **Journal d'audit (admin + gérant)**

**Boutique B2B (e-commerce) :**
- `/shop` Catalogue, `/shop/categorie/[slug]`
- `/produit/[slug]` Fiche produit
- `/panier` Panier avec code promo réel
- `/checkout` **Checkout réel : crée la commande en DB + incrémente compteur promo + redirige**
- `/compte` Espace client
- `/compte/commandes` `/compte/factures` `/compte/fidelite` `/compte/equipe` `/compte/adresses`
- `/compte/listes` **Listes d'achat récurrentes (CRUD + import panier + ajout 1 clic)**
- `/suivi/[id]` Suivi livraison public

**PDF générés** (tous avec échappement XSS) : Factures, Devis, BC achats, Bons de livraison, Avoirs/Retours, Feuilles de route tournée

---

## Sécurité et qualité (durci en cette session)

- **Audit log** : table `audit_logs` + helper `logAudit()` câblé sur commande.valider, commande.annuler, retour.creer, depot.desactiver
- **Rate limiting** Better-Auth en prod : 5 sign-in/min, 3 sign-up/min, 3 forget-password/min
- **XSS PDF** : tous les templates HTML utilisent `e()` (escapeHtml) sur les champs utilisateur
- **CSV injection** : exports CSV utilisent `escapeCsvCell()`
- **IDOR fermés** : `agentId`/`clientId` jamais lus du body
- **Stock atomique** : UPDATE `GREATEST(0, qte - X)` + `RETURNING`
- **Mode paiement** : whitelisté contre enum DB
- **Permission escalation** : champs sensibles clients (`creditAutorise`, `plafondCredit`, `actif`, `agentId`) réservés admin/gerant
- **Validation négative** : retours refusent quantités/prix négatifs
- **Null-safe** : tous les `client.encoursCourant + X` deviennent `(client.X ?? 0) + Y`
- **Demo fallback** : `DEMO_FALLBACK=on|off` env, désactivé par défaut en prod

### Tests
- `pnpm test` → 24 tests Vitest (money, demo-mode, escape)
- `pnpm test:e2e` → smoke Playwright (pages publiques, redirections auth, API 401)

---

## Pièges connus

- **Double `.where()` Drizzle** : le second écrase le premier — toujours utiliser `and()`
- **`inArray()` avec enum Drizzle** : typer avec `as unknown as Type[]`
- **Build lock Next.js** : si "another build is running", `kill -9 $(pgrep -f "next build")` puis relancer
- **`schema.clients.ville`** : n'existe PAS — utiliser `adresse`
- **`schema.commandes.statut` enum** : brouillon/soumise/validee/preparee/en_livraison/livree/annulee/refusee (pas "partiellement_livree")
- **`schema.livraisons.statut` enum** : en_attente/preparee/chargee/en_route/livree/refusee/echec
- **PDF dans standalone** : retourner `NextResponse` avec `Content-Type: text/html`, pas de redirect
- **Mode paiement enum DB** : especes/mvola/orange_money/airtel_money/virement/cheque/credit_client/mixte — **jamais cast TS direct, toujours whitelister**
- **Champs DB nullable** : `client.encoursCourant`, `totalAchats`, `nbCommandes`, `pointsFidelite`, `plafondCredit` — toujours `?? 0` avant arithmétique
- **`Number(x) || 0`** : transforme silencieusement les inputs invalides en 0 — toujours `Number.isFinite()` + check explicite > 0 pour les quantités
- **`parseInt()` sans base 10** : `parseInt("011")` = 11, pas 9, mais sans base un input pathologique peut renvoyer NaN — toujours `parseInt(s, 10)` + isNaN check
- **Next.js Server Actions** : changent d'ID à chaque build → spam log "Failed to find Server Action 'x'" depuis les onglets anciens. Fix : `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` fixé dans .env.production
- **VPS écoute sur :3002** (pas :3000) — vérifier reverse proxy si problème
- **Symlink `.env`** : `.env` est un symlink vers `.env.production` sur le VPS pour que `drizzle-kit push` charge les bonnes variables sans `source` manuel

---

## Ce qu'il ne faut PAS faire

- Ne jamais pousser sur `main` ni sur `claude/wholesale-management-pwa-khts0` (branche figée)
- Ne jamais modifier un schéma existant sans créer une migration explicite (destructive = demander)
- Ne pas utiliser `pdf-lib` pour les documents courants
- Ne pas ajouter de `console.log` en production — utiliser `logger.info/warn/error` depuis `@/lib/logger`
- Ne pas installer de nouvelles dépendances sans vérifier qu'elles existent déjà
- Ne pas refactoriser du code existant qui fonctionne (sprint = livraison de valeur, pas de cleanup)
- Ne pas interpoler de données utilisateur directement dans un template HTML/PDF sans `e()` — XSS garanti
- Ne pas accepter `agentId`, `clientId`, `userId` depuis le body d'une API — toujours dériver de la session ou d'une jointure DB
- Ne pas faire de SELECT-puis-UPDATE séparé sur le stock — toujours UPDATE atomique
- Ne pas cast TypeScript le mode paiement (`as "especes"`) — whitelister contre l'enum
- Ne pas réactiver les fallbacks démo en prod (`DEMO_FALLBACK=on`) sauf debug ponctuel
