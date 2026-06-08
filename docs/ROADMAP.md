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

### Thème F — Extensions post-roadmap (sprints 36+)
- [x] **Sprint 36 — Journal d'audit + RGPD** : table `journal_audit`, helper `logAudit()`, page `/admin/audit` (journal filtrable + export CSV), export données client JSON (droit d'accès), anonymisation client (droit à l'effacement), câblage logging réel sur les comptes utilisateurs

---

## 🗂 File d'attente — Sprints à venir

### Thème F (suite) — Extensions demandées

**Sprint 37 — Webhooks sortants + API publique partenaires**
- `/admin/webhooks` : CRUD endpoints + secret HMAC
- Déclencheurs sur événements (commande créée, livraison livrée, stock bas)
- Journal des livraisons + retry backoff
- Complète `/api/public/catalogue` et `/api/public/stock` (clé X-API-Key)

**Sprint 38 — Intégration comptable réelle (FEC + Sage/EBP)**
- Compte de résultat mensuel (rôle `comptable`)
- Export FEC conforme + CSV Sage/EBP
- Rapport mensuel PDF (couverture + résultat + TVA)


### Thème A — Workflows manquants

**Sprint 16 — Retours & avoirs**
- Module retours clients : saisie motif, produits retournés, quantités
- Génération avoir (crédit note) rattaché à la facture d'origine
- Impact sur encours crédit client
- PDF avoir

**Sprint 17 — Tournées logistiques**
- Création/édition tournée (date, chauffeur, véhicule)
- Affectation de livraisons à une tournée par drag-and-drop (ou bouton)
- Réordonnancement des arrêts (ordre numéroté)
- Statut tournée : planifiée → en_cours → terminée
- Feuille de route chauffeur PDF

**Sprint 18 — Gestion dépôts**
- CRUD dépôts (`/admin/depots`)
- Vue stock consolidé par dépôt
- Transferts inter-dépôts (formulaire + mouvement auto)
- Historique transferts

**Sprint 19 — Codes promo boutique**
- Application code promo au checkout (réduction %)
- Validation : date, nb utilisations, min commande
- Stats utilisation par code

**Sprint 20 — Listes d'achat récurrentes (B2B)**
- Boutique : "Mes listes" → sauvegarder un panier type
- Commande rapide depuis une liste sauvegardée
- Partage de liste entre sous-utilisateurs équipe

---

### Thème B — Rapports & BI

**Sprint 21 — Rapport fournisseurs**
- Classement fournisseurs par volume d'achat, délai moyen, taux de conformité
- Comparaison fournisseur A vs B pour même produit
- Alertes : fournisseur avec taux retard > 30%

**Sprint 22 — Bilan simplifié**
- Compte de résultat mensuel : CA HT − Achats − Charges = Résultat
- Tableau de bord comptable (pour rôle `comptable`)
- Export Excel-compatible (CSV avec séparateur ;)

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
