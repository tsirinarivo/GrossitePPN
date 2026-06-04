# ROADMAP — GrossistePPN

> Fichier de référence pour le cycle de développement autonome.
> Mettre à jour après chaque sprint : cocher ✅ dans "Livrés", retirer de "File d'attente".

---

## ✅ Livrés

### Sprint 1-4 — Fondations
- [x] Schéma DB complet (Drizzle + Neon) — 20+ tables
- [x] Auth Better-Auth avec rôles (admin/gerant/caissier/agent/magasinier/chauffeur/comptable/marketing/client_b2b)
- [x] Design system (dark theme, CSS vars, composants UI)
- [x] POS Agent — recherche produits, sélection client inline, panier, paiements multi-mode
- [x] Caisse — session ouverture/clôture localStorage, rapport Z, encaissement
- [x] Boutique B2B — catalogue, fiche produit, panier, checkout, compte client
- [x] Module Stock — liste, mouvements, alertes
- [x] Module Achats — fournisseurs, bons de commande, réceptions
- [x] Dashboard home — KPIs, graphiques Recharts

### Sprint 5-7 — Workflows métier
- [x] Rapport Z caisse (API + UI)
- [x] Encours crédit clients + relances SMS
- [x] Bon de livraison (module livraisons avec carte SVG)
- [x] Global search Cmd+K (produits + clients + commandes)
- [x] Rapport marges produits (top/flop, tableau trié)
- [x] Historique ventes enrichi (filtres avancés, graph CA/jour, export)

### Sprint 8-10 — Analytique & PDF
- [x] Fiche produit analytique (ventes 13 semaines, stock par dépôt, mouvements)
- [x] Dashboard mobile-first (swipe KPI cards, quick actions)
- [x] Fournisseurs — fiche enrichie, stats délais, historique BCs
- [x] Analyse stock intelligente (rotation, jours stock, suggestions réappro)
- [x] Export PDF facture A4 (HTML→print)
- [x] Flux trésorerie + prévision fin de mois dans finances
- [x] Export PDF bons de commande achats
- [x] Programme fidélité boutique (bronze/argent/or/platine, historique points)

### Sprint 11-15 — Modules avancés
- [x] Centre de notifications (bell icon, alertes stock/crédit/commandes)
- [x] Rapport TVA mensuel/trimestriel + export CSV
- [x] Gestion promotions CRUD (/admin/promotions)
- [x] Rapport performance vendeurs (podium, BarChart)
- [x] Historique sessions caisse (table, expand rapport Z)
- [x] Équipe B2B — gestion sous-utilisateurs
- [x] Rapport RFM clients (Champions/Fidèles/Potentiel/À risque)
- [x] PDF Devis B2B (validité 30j, signature)
- [x] Catalogue shop enrichi (bannières animées, stock badge, suggestions)
- [x] Dashboard commandes (liste + kanban statuts, avancement en 1 clic)
- [x] Charges opérationnelles CRUD (/finances/charges)
- [x] Bon de livraison PDF
- [x] Inventaire stock multi-dépôts (saisie, écarts, mouvements auto)
- [x] Prévisions saisonnières (ComposedChart, facteurs Madagascar, top produits)
- [x] Suivi livraison public enrichi (timeline 5 étapes, infos transporteur)

### Sprint 16-20 — Thème A workflows métier
- [x] Sprint 16 — Retours & avoirs (wizard 3 étapes + PDF + impact encours + réintégration stock)
- [x] Sprint 17 — Tournées logistiques (CRUD + affectation livraisons + réordonnancement + PDF feuille de route)
- [x] Sprint 18 — Gestion dépôts (`/admin/depots` CRUD + stock consolidé + transferts inter-dépôts + historique)
- [x] Sprint 19 — Codes promo boutique (validation API serveur-side + stats admin + compteur d'utilisations)
- [x] Sprint 20 — Listes d'achat récurrentes B2B (CRUD + import panier + ajout au panier 1 clic)

### Sprint 21-24 — Thème B rapports & BI
- [x] Sprint 21 — Rapport fournisseurs (volume + conformité + délais + alertes retard >30%)
- [x] Sprint 22 — Bilan simplifié comptable (compte résultat mensuel + ComposedChart + export CSV)
- [x] Sprint 23 — Rapport livraisons (ponctualité chauffeur + km + motifs échec + coûts)
- [x] Sprint 24 — Analyse panier moyen (distribution + market basket + suggestion cross-sell)

### Hors-sprint — Pack PPN Madagascar (utilité terrain immédiate)
- [x] **API `/api/pos/favoris`** — top 12 produits vendus par l'agent sur 30j (fallback global + récents)
- [x] **API + page `/stock/ruptures`** — détection rupture imminente : jours_restants = stock ÷ vitesse_vente_30j, criticité critique/urgent/alerte
- [x] **PDF bordereau de chargement** `/api/tournees/[id]/bordereau-chargement` — liste consolidée des produits à charger pour une tournée (groupé par produit, détail clients, checkboxes)
- [x] **Composant `CompteurCoupures`** — décompte fond de caisse par coupure Ar (200/500/1k/2k/5k/10k/20k) avec calcul total + détection d'écart vs montant attendu

### Hors-sprint — Historique des articles
- [x] Page globale `/stock/historique` avec filtres période/type/dépôt/recherche + export CSV
- [x] Onglet "Historique" dans la fiche produit (4 sections : timeline, ventes, achats, évolution prix)
- [x] API `/api/produits/[id]/historique` (mouvements + top clients/fournisseurs + évolution prix + synthèse)
- [x] API `/api/stock/historique` (toutes opérations + agrégations) + export CSV

### Hors-sprint — Hardening production (P0/P1/P2)
- [x] Checkout B2B câblé à l'API : crée vraiment une commande, incrémente compteur promo, vide le panier
- [x] Audit log : table `audit_logs` + helper `logAudit()` + page `/admin/audit`
- [x] Rate limiting Better-Auth en prod
- [x] Désactivation auto des fallbacks démo en prod (`isDemoFallbackEnabled()`)
- [x] Logger structuré JSON (`@/lib/logger`)
- [x] Global error boundary + endpoint `/api/log/client-error`
- [x] 24 tests Vitest (money, demo-mode, escape) + smoke Playwright

### Hors-sprint — Audit sécurité (34 bugs corrigés en 3 passes)
- [x] **Mode paiement** : forcé à "especes" par cast TS cassé → whitelist + gestion crédit
- [x] **Retours** : ne réintégraient pas le stock → mouvements + update auto
- [x] **Null-safe** : encoursCourant/totalAchats/pointsFidelite/nbCommandes/derniereCommande
- [x] **XSS PDF** : 6 templates (factures, avoirs, devis, BC, bon livraison, feuille route) → `escapeHtml`
- [x] **CSV injection** : exports → `escapeCsvCell`
- [x] **Race condition stock** : SELECT-puis-UPDATE → UPDATE atomique `GREATEST + RETURNING`
- [x] **IDOR** : agentId/clientId/membreId/factureId — dérivés de session ou jointure
- [x] **Permission escalation** : champs sensibles clients réservés managers
- [x] **Auth manquante** : depots GET, livraisons GET
- [x] **Validation négative** : retours refusent qte/pu < 0
- [x] **Validation dates/inputs** : tournées, finances, clients (espaces blancs)
- [x] **useEffect deps mutables** : global-search → useMemo

---

## 🗂 File d'attente — Sprints à venir

### Thème C — Expérience utilisateur

**Sprint 25 — Raccourcis clavier POS**
- Panel aide raccourcis (F1 pour ouvrir)
- F2 → focus recherche produit, F3 → focus recherche client
- F12 → valider commande, +/- → ajuster quantité ligne sélectionnée
- Ctrl+S → sauver brouillon
- Affichage discret des raccourcis actifs dans la barre POS

**Sprint 26 — Mode impression thermique**
- Aperçu ticket thermique 58mm dans le POS avant impression
- Configuration : logo, message de pied, afficher/masquer TVA
- Test d'impression depuis `/admin/printer`
- Profils enregistrés (caisse 1, caisse 2…)

**Sprint 27 — Application mobile chauffeur**
- Vue `/chauffeur` dédiée (responsive, gros boutons)
- Liste tournée du jour avec géolocalisation
- Bouton "Livré" / "Refusé" + saisie motif
- Photo preuve (input file → base64 stocké)
- Mode offline : queue Dexie + sync au retour réseau

**Sprint 28 — Notifications avancées**
- Priorités : critique / warning / info
- Marquer comme lu (persisté en DB)
- Page `/notifications` avec historique
- Badge sur l'onglet navigateur (document.title)
- Push notifications navigateur (opt-in)

**Sprint 29 — Onboarding & setup wizard**
- Wizard première connexion : renseigner entreprise, créer premier dépôt, importer produits CSV
- Page `/setup` (route déjà présente, à compléter)
- Import produits via CSV (colonnes : code, designation, prix, stock, categorie)

---

### Thème D — Performance & infrastructure

**Sprint 30 — Optimisation cache & vitesse**
- `staleTime` TanStack Query sur les endpoints lents
- Prefetch produits POS au mount
- Skeleton loading systématique (pas de flash de contenu vide)
- Image optimization pour les photos produits

**Sprint 31 — PWA complète**
- Service Worker : precache coquille + données produits
- `manifest.json` complet (icônes toutes tailles, shortcuts)
- Banner "Installer l'app" sur mobile
- Sync offline : commandes POS créées hors-ligne envoyées au retour réseau

**Sprint 32 — Coverage tests étendue**
- Tests Vitest pour : calculs TVA, scoring RFM, market basket, conformité fournisseur
- Tests API critiques (commandes POST/PATCH, retours, transferts) avec DB de test
- Playwright : parcours complet login → POS → encaissement → facture → audit

---

### Thème E — Intégrations

**Sprint 33 — Mobile Money (simulation puis réel)**
- Page confirmation paiement Mvola/Orange Money avec QR code fictif
- Webhook simulé : after 3s → statut "payé"
- Bouton "Vérifier le paiement" avec polling
- Architecture prête pour brancher la vraie API quand contrat signé

**Sprint 34 — Export comptable**
- Export commandes/factures au format FEC (fichier écritures comptables France)
- Export Sage-compatible CSV
- Rapport mensuel complet PDF (couverture + compte de résultat + TVA)

**Sprint 35 — API publique partenaires**
- Route `/api/public/catalogue` (sans auth, avec rate limiting header)
- Route `/api/public/stock` (stock temps réel pour intégration externe)
- Clé API simple (header `X-API-Key`) configurée dans admin

---

### Thème F — Métier avancé

**Sprint 36 — Réservations / pré-commandes**
- Marquer une commande "à livrer dans N jours" qui réserve du stock
- Page `/reservations` avec date prévue, statut, conversion en vraie commande
- Alerte si stock insuffisant à l'approche

**Sprint 37 — Gestion des prix par client**
- Tarifs négociés client par client (override du palier)
- Historique des changements de prix
- Application automatique au POS quand client sélectionné

**Sprint 38 — Programme de parrainage B2B**
- Code parrainage par client
- Tracking conversions
- Crédit fidélité automatique si commande filleul > X MGA

**Sprint 39 — Centre de support intégré**
- Tickets clients (création, réponse, statut)
- FAQ recherchable
- Chat in-app vers admin (SSE)

**Sprint 40 — Multi-entreprises (multi-tenant léger)**
- Plusieurs entités juridiques sur la même installation
- Filtre top-level entreprise dans toutes les requêtes
- Switcher dans le header pour les users multi-entité

---

### Thème G — Spécificités secteur PPN Madagascar

**Sprint 41 — Gestion lots & DLC (Date Limite de Consommation)**
- Saisie n° lot + DLC à la réception fournisseur
- Picking FEFO automatique (First Expired, First Out) au POS et en livraison
- Alertes dashboard : produits à <30j de DLC, à <7j, expirés à retirer
- Rapport pertes par DLC mensuel
- Critique pour PPN alimentaire (riz, huile, conserves, lait)

**Sprint 42 — Inventaire tournant**
- Au lieu d'un full inventaire annuel : compter X produits / semaine en rotation
- Calendrier auto qui propose les produits à compter (priorité forte valeur ou fort écart historique)
- Score de fiabilité par produit (basé sur l'historique des écarts)
- Notification magasinier de la liste du jour

**Sprint 43 — Workflow validation BC > seuil**
- Configuration : BC > X MGA nécessite validation gérant
- Notification au gérant + lien d'approbation 1-clic
- Audit log de chaque validation
- Empêche les commandes massives non contrôlées

**Sprint 44 — CRM relances commerciales actives**
- Détection auto : client qui n'a pas commandé depuis N jours (selon palier)
- File de relances pour les agents avec script personnalisé
- Tracking : appelé / commande passée / converti / abandonné
- Stats taux de conversion par agent

**Sprint 45 — Notifications SMS via API externe**
- Intégration Twilio ou Vonage (mock d'abord)
- Templates : confirmation commande, livraison en route, relance crédit, promo
- Page admin pour configurer le sender ID + templates
- Tracking envois et coûts

**Sprint 46 — Dashboard responsable de zone**
- Vue dédiée pour les superviseurs régionaux (Tana / Mahajanga / Toamasina)
- KPIs par zone : CA, clients actifs, livraisons réussies, taux retour
- Liste des agents de la zone avec performance
- Affectation et réaffectation des clients à des agents

**Sprint 47 — Recommandations produits intelligentes**
- Suggestion "Clients ayant acheté X ont aussi acheté Y" au POS
- Bandeau "Commandé d'habitude" dans la boutique B2B (basé sur l'historique du client)
- Algo simple : top 5 co-occurrences sur 90j, exclus déjà au panier
- Tracking : combien de suggestions acceptées

---

## Notes de priorité

Pour reprendre : prendre le **premier sprint non coché** de la "File d'attente" ou demander un thème précis.

**Recommandations (par valeur métier décroissante)** :
- **Sprint 41** (lots & DLC) : critique pour PPN alimentaire, évite les pertes
- **Sprint 27** (app chauffeur) : haute valeur terrain, débloque le module livraisons en mode mobile
- **Sprint 31** (PWA offline) : critique pour Madagascar (connexion instable)
- **Sprint 29** (onboarding) : nécessaire avant de vendre à un nouveau client
- **Sprint 25** (raccourcis POS) : améliore drastiquement la vitesse en caisse
- **Sprint 33** (Mobile Money) : feature commerciale différenciante locale
- **Sprint 45** (SMS) : engagement client + recouvrement crédit
- **Sprint 44** (CRM relances) : revenu récurrent

Les sprints **36-40** sont des extensions métier — n'attaquer qu'après que le périmètre actuel soit stabilisé en prod sur 1-2 mois.
