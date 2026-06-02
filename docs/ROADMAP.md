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

### Sprint 16 — Retours & avoirs ✅
- [x] Schéma DB : retours, lignesRetour, avoirs (+ enums motif/statut/mode remboursement)
- [x] Module /retours, drawer création 2 étapes, PDF avoir, impact encours crédit

### Sprint 17 — Tournées logistiques ✅
- [x] API /api/tournees CRUD + affectation/réordonnancement livraisons
- [x] Page /livraisons/tournees, drawer détail avec ordre arrêts (up/down)
- [x] Feuille de route PDF (arrêts numérotés, signatures, cases à cocher)

### Sprint 18 — Gestion dépôts ✅
- [x] /api/depots enrichi avec stats (nbProduits, stockTotal)
- [x] /api/depots/transferts atomique + historique groupé par référence
- [x] Page /admin/depots: grille, vue stock détaillée, drawer transfert

### Sprint 19 — Codes promo boutique ✅
- [x] /api/promotions/validate avec validation date/min commande/utilisations max
- [x] Codes démo (BIENVENUE10, PPN5, FETE50K) + intégration au panier shop

### Sprint 20 — Listes d'achat récurrentes B2B ✅
- [x] /api/listes-achat GET/POST/DELETE/PATCH
- [x] Page /compte/listes: grille, drawer création depuis panier, commande rapide

### Sprint 21 — Rapport fournisseurs ✅
- [x] /rapports/fournisseurs: volume, délai moyen, taux conformité, taux retard
- [x] Alertes >30% retard, BarChart, classement triable

### Sprint 22 — Bilan simplifié ✅
- [x] /rapports/bilan: compte de résultat mensuel (CA HT − Achats − Charges = Résultat)
- [x] Export CSV avec BOM UTF-8

### Sprint 23 — Rapport livraisons ✅
- [x] /rapports/livraisons: ponctualité chauffeur, motifs échec, coût moyen

### Sprint 24 — Analyse panier moyen ✅
- [x] /rapports/panier: distribution 6 tranches, panier moyen/médian
- [x] Paires fréquentes (market basket simplifié)

### Sprint 25 — Raccourcis clavier POS ✅
- [x] F1 aide, F2/F3 focus search, F4 panier, F12 valider, +/− qté, Ctrl+Suppr vider

### Sprint 26 — Aperçu ticket thermique ✅
- [x] Composant POSTicketPreview avec rendu visuel 58mm

### Sprint 27 — App mobile chauffeur ✅
- [x] /chauffeur: tournée du jour, ActionDialog (livré/refusé/échec) + photo

### Sprint 28 — Notifications avancées ✅
- [x] Page /notifications: historique, filtres priorité, marquer lu (localStorage)
- [x] Badge document.title

### Sprint 29 — Setup wizard ✅
- [x] /setup: 4 étapes (entreprise → dépôt → CSV → fini)
- [x] /api/setup/import-csv: parse CSV (; ou ,) avec validation

### Sprint 30 — Skeletons + optimisations ✅
- [x] Skeleton, KpiSkeleton, CardSkeleton, TableSkeleton réutilisables

### Sprint 31 — PWA complète ✅
- [x] manifest.json: theme color brand, shortcuts (POS/Caisse/Chauffeur/Shop)
- [x] PWAInstallBanner: capture beforeinstallprompt, dismiss 7 jours

### Sprint 32 — Tests Vitest ✅
- [x] vitest.config.ts + scripts pnpm test
- [x] 17 tests : formatMGA, calcul TVA, scoring RFM

### Sprint 33 — Mobile Money simulation ✅
- [x] /api/paiements/mobile-money POST/GET avec webhook simulé 3s
- [x] Page /paiement/[id]: QR SVG, polling auto + bouton vérification

### Sprint 34 — Export comptable ✅
- [x] /api/export/fec: format FEC pipe-separated (411/707/44571)
- [x] /api/export/sage: CSV ; pour import Sage
- [x] /api/export/rapport-mensuel: PDF couverture + résultat + TVA

### Sprint 35 — API publique partenaires ✅
- [x] /api/public/catalogue: produits actifs (X-API-Key)
- [x] /api/public/stock: stock temps réel (filtrable par code)
- [x] Rate limiting 60req/min avec headers X-RateLimit-*

---

## 🎉 Roadmap complet livré

**38 → 47 pages · ~55 → ~75 routes API · 17 tests passent**

Pour aller plus loin : monitoring (Sentry), webhooks sortants, marketplace multi-vendeurs, audit log RGPD.
