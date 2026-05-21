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

### Sprint 16 — Retours & avoirs
- [x] Schéma DB retours / lignes_retour / avoirs (numérotation auto RET-YYYY-NNNN, AV-YYYY-NNNN)
- [x] API retours (CRUD list, POST avec génération auto avoir + impact encours client)
- [x] Module `/retours` avec KPIs (nb retours, total remboursé, avoirs émis, remb. directs) + filtres
- [x] Wizard 3 étapes : choix facture → sélection lignes (quantités max contrôlées) → motif & mode remboursement
- [x] 6 motifs (défectueux, non conforme, erreur livraison, péremption, geste commercial, autre)
- [x] 4 modes remboursement (avoir crédit / espèces / virement / mobile money)
- [x] PDF avoir A4 (lignes retournées, motif, mode, signatures, mentions légales)

### Sprint 17 — Tournées logistiques
- [x] API CRUD tournées (`/api/tournees`, `/api/tournees/[id]`)
- [x] API ressources (`/api/tournees/ressources` : chauffeurs, véhicules, livraisons libres)
- [x] API affectation livraisons + réordonnancement (`/api/tournees/[id]/affecter`)
- [x] Module `/tournees` : liste groupée par date avec barre de progression, statuts (planifiée / en cours / terminée)
- [x] Drawer création tournée (date + chauffeur + véhicule + notes)
- [x] Page détail `/tournees/[id]` : édition meta, picker livraisons libres, boutons ↑↓ pour réordonner, retirer
- [x] Stats progression (livrées / échecs / restantes)
- [x] PDF feuille de route chauffeur (infos tournée, arrêts numérotés, checkboxes, signatures)

### Sprint 18 — Gestion dépôts
- [x] Page CRUD `/admin/depots` (drawer création/édition, soft delete par désactivation)
- [x] Stock consolidé par dépôt (nb produits, unités, valeur en MGA)
- [x] API stock consolidé (`/api/depots/stock-consolide`)
- [x] Drawer transfert inter-dépôts (recherche produit, source ≠ destination, quantité)
- [x] Historique transferts (`/api/stock/transferts/historique`) avec groupement par référence
- [x] KPIs globaux : dépôts actifs, total produits, unités, valeur totale
- [x] Lien dans menu admin

### Sprint 19 — Codes promo boutique
- [x] API validation code promo (`/api/shop/promotions/valider`) avec contrôles date, actif, nb utilisations max, min commande
- [x] Application réelle dans le panier B2B (remplace le code mockup PPN5)
- [x] Recalcul automatique de la remise quand le panier change
- [x] Validation type valeur : pourcentage ou montant fixe
- [x] API stats utilisation (`/api/admin/promotions/stats`) avec statut calculé (active / expirée / future / limite atteinte)
- [x] Affichage taux utilisation et jours restants côté admin

### Sprint 20 — Listes d'achat récurrentes (B2B)
- [x] API CRUD `/api/shop/listes` et `/api/shop/listes/[id]` (auth B2B + sous-utilisateurs)
- [x] Page `/compte/listes` avec grille de listes (badges nb articles, fréquence, date dernière commande)
- [x] Drawer création : nom + fréquence (hebdo/bimensuel/mensuel) + import optionnel du panier actuel
- [x] Drawer détail : vue articles, suppression à l'unité, ajout au panier en 1 clic
- [x] Suppression de liste avec confirmation inline
- [x] Lien dans le footer de la boutique

---

### Thème B — Rapports & BI

### Sprint 21 — Rapport fournisseurs
- [x] API `/api/rapports/fournisseurs` avec filtres période (mois/3mois/12mois/année)
- [x] Calculs : nb BCs, total achats, délai moyen jours, taux conformité (qté reçue/commandée), retards
- [x] Page `/rapports/fournisseurs` avec KPIs globaux + BarChart top 6 + table classement
- [x] Bloc alertes pour fournisseurs avec taux retard > 30%
- [x] Couleurs sémantiques (vert ≥95%, ambre 85-95%, rouge &lt;85%) sur conformité et retards
- [x] Lien dans hub `/rapports`

### Sprint 22 — Bilan simplifié
- [x] API `/api/rapports/bilan` agrégeant CA (commandes) + Achats (BCs reçus) + Charges (chargesOperationnelles) par mois
- [x] Calcul marge brute, % marge, résultat net = marge − charges, taux résultat
- [x] Page `/rapports/bilan` accessible aux comptables (requireRole admin/gerant/comptable)
- [x] ComposedChart bars (CA / Achats / Charges) + ligne Résultat
- [x] Compte de résultat synthétique annuel + table mensuelle détaillée
- [x] Export CSV `/api/rapports/bilan/export` séparateur `;` + BOM UTF-8 Excel-compatible
- [x] Navigation année (boutons ←/→) avec limite année courante

**Sprint 23 — Rapport livraisons**
- Taux ponctualité par chauffeur
- Km parcourus simulés par tournée
- Livraisons échouées : motifs agrégés
- Coût moyen par livraison

**Sprint 24 — Analyse panier moyen**
- Distribution des montants de commande (histogramme)
- Produits fréquemment commandés ensemble (market basket simplifié)
- Recommandations cross-sell dans le POS

---

### Thème C — Expérience utilisateur

**Sprint 25 — Raccourcis clavier POS**
- Panel aide raccourcis (F1 pour ouvrir)
- F2 → focus recherche produit
- F3 → focus recherche client
- F12 → valider commande
- +/- → ajuster quantité ligne sélectionnée

**Sprint 26 — Mode impression thermique**
- Aperçu ticket thermique 58mm dans le POS avant impression
- Configuration : logo, message de pied, afficher/masquer TVA
- Test d'impression depuis `/admin/printer`

**Sprint 27 — Application mobile chauffeur**
- Vue `/chauffeur` dédiée (responsive, gros boutons)
- Liste tournée du jour
- Bouton "Livré" / "Refusé" + saisie motif
- Photo preuve (input file → base64 stocké)
- Mode offline : queue Dexie + sync au retour réseau

**Sprint 28 — Notifications avancées**
- Priorités : critique / warning / info
- Marquer comme lu (persisté en DB ou localStorage)
- Page `/notifications` avec historique
- Badge sur l'onglet navigateur (document.title)

**Sprint 29 — Onboarding & setup wizard**
- Wizard première connexion : renseigner entreprise, créer premier dépôt, importer produits CSV
- Page `/setup` (déjà route API présente)
- Import produits via CSV (colonnes : code, designation, prix, stock, categorie)

---

### Thème D — Performance & infrastructure

**Sprint 30 — Optimisation cache & vitesse**
- `staleTime` TanStack Query sur les endpoints lents
- Prefetch produits POS au mount (eviter le premier fetch)
- Skeleton loading systématique (pas de flash de contenu vide)
- Image optimization pour les photos produits

**Sprint 31 — PWA complète**
- Service Worker : precache coquille + données produits
- `manifest.json` complet (icônes toutes tailles, shortcuts)
- Banner "Installer l'app" sur mobile
- Sync offline : commandes POS créées hors-ligne envoyées au retour réseau

**Sprint 32 — Tests & qualité**
- Tests Vitest pour les utilitaires (`formatMGA`, calculs TVA, scoring RFM)
- Tests API critiques (commandes POST, auth)
- Playwright : smoke test login → POS → commande → historique

---

### Thème E — Intégrations

**Sprint 33 — Mobile Money (simulation)**
- Page confirmation paiement Mvola/Orange Money avec QR code fictif
- Webhook simulé : after 3s → statut "payé"
- Bouton "Vérifier le paiement" avec polling

**Sprint 34 — Export comptable**
- Export commandes/factures au format FEC (fichier écritures comptables France)
- Export Sage-compatible CSV
- Rapport mensuel complet PDF (couverture + compte de résultat + TVA)

**Sprint 35 — API publique partenaires**
- Route `/api/public/catalogue` (sans auth, avec rate limiting header)
- Route `/api/public/stock` (stock temps réel pour intégration externe)
- Clé API simple (header `X-API-Key`) configurée dans admin

---

## Notes de priorité

Pour reprendre : prendre le **premier sprint non coché** de la "File d'attente" ou demander un thème précis.

Les sprints **16, 17, 18** (retours, tournées, dépôts) ont le plus d'impact sur le workflow terrain.
Les sprints **25, 27** (raccourcis POS, app chauffeur) améliorent l'usage quotidien.
Les sprints **30, 31** (cache, PWA) améliorent la performance perçue.
