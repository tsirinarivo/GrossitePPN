CREATE TYPE "public"."role" AS ENUM('admin', 'gerant', 'caissier', 'agent', 'magasinier', 'chauffeur', 'comptable', 'marketing', 'client_b2b', 'sous_utilisateur_client');--> statement-breakpoint
CREATE TYPE "public"."palier_client" AS ENUM('detail', 'semi_gros', 'gros');--> statement-breakpoint
CREATE TYPE "public"."statut_fidelite" AS ENUM('bronze', 'argent', 'or', 'platine');--> statement-breakpoint
CREATE TYPE "public"."mode_paiement" AS ENUM('especes', 'mvola', 'orange_money', 'airtel_money', 'virement', 'cheque', 'credit_client', 'mixte');--> statement-breakpoint
CREATE TYPE "public"."source_commande" AS ENUM('pos_agent', 'ecommerce', 'telephone', 'import');--> statement-breakpoint
CREATE TYPE "public"."statut_commande" AS ENUM('brouillon', 'soumise', 'validee', 'preparee', 'en_livraison', 'livree', 'annulee', 'refusee');--> statement-breakpoint
CREATE TYPE "public"."statut_panier" AS ENUM('actif', 'abandonne', 'converti');--> statement-breakpoint
CREATE TYPE "public"."categorie_produit" AS ENUM('riz', 'huile', 'sucre', 'farine', 'sel', 'savon', 'lait', 'conserves', 'boissons', 'epices', 'legumineuses', 'cereales', 'hygiene', 'autre');--> statement-breakpoint
CREATE TYPE "public"."statut_livraison" AS ENUM('en_attente', 'preparee', 'chargee', 'en_route', 'livree', 'refusee', 'echec');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'agent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"actif" boolean DEFAULT true NOT NULL,
	"langue" text DEFAULT 'fr',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"raison_sociale" text NOT NULL,
	"nif" text,
	"stat" text,
	"telephone" text,
	"email" text,
	"adresse" text,
	"latitude" real,
	"longitude" real,
	"zone_tournee" text,
	"palier" "palier_client" DEFAULT 'detail' NOT NULL,
	"credit_autorise" boolean DEFAULT false NOT NULL,
	"plafond_credit" integer DEFAULT 0 NOT NULL,
	"encours_courant" integer DEFAULT 0 NOT NULL,
	"points_fidelite" integer DEFAULT 0 NOT NULL,
	"statut_fidelite" "statut_fidelite" DEFAULT 'bronze',
	"total_achats" integer DEFAULT 0 NOT NULL,
	"user_id" text,
	"ecommerce_actif" boolean DEFAULT false NOT NULL,
	"invitation_email" text,
	"dernier_achat" timestamp,
	"nb_commandes" integer DEFAULT 0 NOT NULL,
	"panier_moyen" integer DEFAULT 0,
	"actif" boolean DEFAULT true NOT NULL,
	"agent_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sous_utilisateurs" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"peut_commander" boolean DEFAULT true NOT NULL,
	"peut_voir_factures" boolean DEFAULT true NOT NULL,
	"peut_gerer_equipe" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commandes" (
	"id" text PRIMARY KEY NOT NULL,
	"numero" text NOT NULL,
	"client_id" text,
	"depot_id" text,
	"agent_id" text,
	"source" "source_commande" NOT NULL,
	"statut" "statut_commande" DEFAULT 'brouillon' NOT NULL,
	"total_ht" integer DEFAULT 0 NOT NULL,
	"total_tva" integer DEFAULT 0 NOT NULL,
	"total_ttc" integer DEFAULT 0 NOT NULL,
	"total_remise" integer DEFAULT 0 NOT NULL,
	"assujettie_tva" boolean DEFAULT false NOT NULL,
	"recap_tva" jsonb,
	"adresse_livraison" text,
	"creneau_livraison" timestamp,
	"notes_livraison" text,
	"notes" text,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"soumise_at" timestamp,
	"validee_at" timestamp,
	CONSTRAINT "commandes_numero_unique" UNIQUE("numero"),
	CONSTRAINT "commandes_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "factures" (
	"id" text PRIMARY KEY NOT NULL,
	"numero" text NOT NULL,
	"commande_id" text NOT NULL,
	"client_id" text,
	"caissier_id" text,
	"total_ht" integer NOT NULL,
	"total_tva" integer DEFAULT 0 NOT NULL,
	"total_ttc" integer NOT NULL,
	"total_regle" integer DEFAULT 0 NOT NULL,
	"solde_restant" integer DEFAULT 0 NOT NULL,
	"nif_entreprise" text,
	"stat_entreprise" text,
	"rcs_entreprise" text,
	"mode_paiement" "mode_paiement",
	"paiements" jsonb,
	"statut" text DEFAULT 'emise' NOT NULL,
	"date_echeance" timestamp,
	"motifs_annulation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "factures_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "lignes_commande" (
	"id" text PRIMARY KEY NOT NULL,
	"commande_id" text NOT NULL,
	"produit_id" text NOT NULL,
	"unite_vente_id" text,
	"nom_produit" text NOT NULL,
	"nom_unite" text NOT NULL,
	"facteur_conversion" real DEFAULT 1 NOT NULL,
	"quantite" real NOT NULL,
	"quantite_base" real NOT NULL,
	"prix_unitaire" integer NOT NULL,
	"taux_remise" real DEFAULT 0,
	"montant_remise" integer DEFAULT 0,
	"taux_tva" integer DEFAULT 0,
	"total_ht" integer NOT NULL,
	"total_tva" integer DEFAULT 0,
	"total_ttc" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "paiements" (
	"id" text PRIMARY KEY NOT NULL,
	"facture_id" text NOT NULL,
	"mode" "mode_paiement" NOT NULL,
	"montant" integer NOT NULL,
	"reference_transaction" text,
	"numero_cheque" text,
	"banque_cheque" text,
	"qr_code" text,
	"confirme" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions_caisse" (
	"id" text PRIMARY KEY NOT NULL,
	"caissier_id" text NOT NULL,
	"depot_id" text,
	"fond_caisse" integer DEFAULT 0 NOT NULL,
	"total_encaisse" integer DEFAULT 0 NOT NULL,
	"total_especes" integer DEFAULT 0 NOT NULL,
	"total_mobile_money" integer DEFAULT 0 NOT NULL,
	"total_virements" integer DEFAULT 0 NOT NULL,
	"total_cheques" integer DEFAULT 0 NOT NULL,
	"ouverture_at" timestamp DEFAULT now() NOT NULL,
	"fermeture_at" timestamp,
	"rapport_z" jsonb
);
--> statement-breakpoint
CREATE TABLE "avis" (
	"id" text PRIMARY KEY NOT NULL,
	"produit_id" text NOT NULL,
	"client_id" text,
	"note" integer NOT NULL,
	"commentaire" text,
	"valide" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bannieres" (
	"id" text PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"titre_mg" text,
	"image" text NOT NULL,
	"lien" text,
	"ordre" integer DEFAULT 0,
	"actif" boolean DEFAULT true NOT NULL,
	"debut_at" timestamp,
	"fin_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lignes_liste_achat" (
	"id" text PRIMARY KEY NOT NULL,
	"liste_id" text NOT NULL,
	"produit_id" text NOT NULL,
	"unite_vente_id" text,
	"quantite" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lignes_panier" (
	"id" text PRIMARY KEY NOT NULL,
	"panier_id" text NOT NULL,
	"produit_id" text NOT NULL,
	"unite_vente_id" text,
	"quantite" real NOT NULL,
	"stock_reserve" real DEFAULT 0 NOT NULL,
	"reserve_jusqu_a" timestamp,
	"prix_unitaire" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listes_achat" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"nom" text NOT NULL,
	"frequence" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"derniere_commande_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "paniers" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"statut" "statut_panier" DEFAULT 'actif' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"code" text,
	"type" text NOT NULL,
	"valeur" real NOT NULL,
	"type_valeur" text DEFAULT 'pct',
	"min_commande" integer DEFAULT 0,
	"nb_utilisations_max" integer,
	"nb_utilisations" integer DEFAULT 0 NOT NULL,
	"produit_ids" jsonb,
	"debut_at" timestamp NOT NULL,
	"fin_at" timestamp NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "transactions_fidelite" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"solde_apres" integer NOT NULL,
	"reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "depots" (
	"id" text PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"adresse" text,
	"telephone" text,
	"responsable_id" text,
	"actif" boolean DEFAULT true NOT NULL,
	"est_principal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entreprise" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"nom" text NOT NULL,
	"nif" text,
	"stat" text,
	"rcs" text,
	"adresse" text,
	"telephone" text,
	"email" text,
	"site_web" text,
	"logo" text,
	"assujettie_tva" boolean DEFAULT false NOT NULL,
	"taux_tva_defaut" integer DEFAULT 20,
	"prefixe_facture" text DEFAULT 'FAC',
	"dernier_numero_facture" integer DEFAULT 0 NOT NULL,
	"mentions_legales" text,
	"conditions_generales" text,
	"ecommerce_actif" boolean DEFAULT false NOT NULL,
	"ecommerce_description" text,
	"fidelite_actif" boolean DEFAULT false NOT NULL,
	"points_par_ariary" integer DEFAULT 1,
	"fuseau_horaire" text DEFAULT 'Indian/Antananarivo',
	"devise" text DEFAULT 'MGA',
	"langue_defaut" text DEFAULT 'fr',
	"parametres" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"nom_mg" text,
	"slug" text NOT NULL,
	"icone" text,
	"couleur" text,
	"ordre" integer DEFAULT 0,
	"actif" boolean DEFAULT true NOT NULL,
	"parent_id" text,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" text PRIMARY KEY NOT NULL,
	"produit_id" text NOT NULL,
	"depot_id" text NOT NULL,
	"numero_lot" text,
	"date_expiration" timestamp,
	"quantite_base" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mouvements_stock" (
	"id" text PRIMARY KEY NOT NULL,
	"produit_id" text NOT NULL,
	"depot_id" text NOT NULL,
	"lot_id" text,
	"type" text NOT NULL,
	"quantite_base" real NOT NULL,
	"quantite_avant" real NOT NULL,
	"quantite_apres" real NOT NULL,
	"reference" text,
	"notes" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produits" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"nom" text NOT NULL,
	"nom_mg" text,
	"description" text,
	"description_mg" text,
	"categorie_id" text,
	"marque" text,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"unite_base" text NOT NULL,
	"prix_achat_moyen_pondere" integer DEFAULT 0,
	"prix_vente_gros" integer,
	"prix_vente_semi_gros" integer,
	"prix_vente_detail" integer,
	"taux_tva" integer DEFAULT 0 NOT NULL,
	"exonere_tva" boolean DEFAULT false NOT NULL,
	"seuil_alerte" integer DEFAULT 0,
	"stock_reserve_ecommerce" integer DEFAULT 0 NOT NULL,
	"a_dlc" boolean DEFAULT false NOT NULL,
	"visible_ecommerce" boolean DEFAULT false NOT NULL,
	"prix_ecommerce" integer,
	"description_ecommerce" text,
	"stock_dedie_ecommerce" boolean DEFAULT false NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "produits_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" text PRIMARY KEY NOT NULL,
	"produit_id" text NOT NULL,
	"depot_id" text NOT NULL,
	"quantite_base" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unites_vente" (
	"id" text PRIMARY KEY NOT NULL,
	"produit_id" text NOT NULL,
	"nom" text NOT NULL,
	"facteur_conversion" real NOT NULL,
	"code_barres" text,
	"prix_gros" integer,
	"prix_semi_gros" integer,
	"prix_detail" integer,
	"prix_achat" integer,
	"est_defaut" boolean DEFAULT false NOT NULL,
	"ordre" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "livraisons" (
	"id" text PRIMARY KEY NOT NULL,
	"token_public" text NOT NULL,
	"commande_id" text NOT NULL,
	"tournee_id" text,
	"ordre" integer DEFAULT 0,
	"statut" "statut_livraison" DEFAULT 'en_attente' NOT NULL,
	"adresse_livraison" text NOT NULL,
	"latitude" real,
	"longitude" real,
	"signature_client" text,
	"photo_preuve" text,
	"motif_refus" text,
	"livraison_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "livraisons_token_public_unique" UNIQUE("token_public")
);
--> statement-breakpoint
CREATE TABLE "tournees" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"chauffeur_id" text,
	"vehicule_id" text,
	"statut" text DEFAULT 'planifiee' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicules" (
	"id" text PRIMARY KEY NOT NULL,
	"immatriculation" text NOT NULL,
	"modele" text,
	"capacite_kg" real,
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "vehicules_immatriculation_unique" UNIQUE("immatriculation")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sous_utilisateurs" ADD CONSTRAINT "sous_utilisateurs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sous_utilisateurs" ADD CONSTRAINT "sous_utilisateurs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_caissier_id_users_id_fk" FOREIGN KEY ("caissier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_unite_vente_id_unites_vente_id_fk" FOREIGN KEY ("unite_vente_id") REFERENCES "public"."unites_vente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_facture_id_factures_id_fk" FOREIGN KEY ("facture_id") REFERENCES "public"."factures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions_caisse" ADD CONSTRAINT "sessions_caisse_caissier_id_users_id_fk" FOREIGN KEY ("caissier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions_caisse" ADD CONSTRAINT "sessions_caisse_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avis" ADD CONSTRAINT "avis_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avis" ADD CONSTRAINT "avis_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_liste_achat" ADD CONSTRAINT "lignes_liste_achat_liste_id_listes_achat_id_fk" FOREIGN KEY ("liste_id") REFERENCES "public"."listes_achat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_liste_achat" ADD CONSTRAINT "lignes_liste_achat_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_liste_achat" ADD CONSTRAINT "lignes_liste_achat_unite_vente_id_unites_vente_id_fk" FOREIGN KEY ("unite_vente_id") REFERENCES "public"."unites_vente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_panier" ADD CONSTRAINT "lignes_panier_panier_id_paniers_id_fk" FOREIGN KEY ("panier_id") REFERENCES "public"."paniers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_panier" ADD CONSTRAINT "lignes_panier_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_panier" ADD CONSTRAINT "lignes_panier_unite_vente_id_unites_vente_id_fk" FOREIGN KEY ("unite_vente_id") REFERENCES "public"."unites_vente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listes_achat" ADD CONSTRAINT "listes_achat_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paniers" ADD CONSTRAINT "paniers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_fidelite" ADD CONSTRAINT "transactions_fidelite_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_categories_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unites_vente" ADD CONSTRAINT "unites_vente_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_tournee_id_tournees_id_fk" FOREIGN KEY ("tournee_id") REFERENCES "public"."tournees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournees" ADD CONSTRAINT "tournees_chauffeur_id_users_id_fk" FOREIGN KEY ("chauffeur_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournees" ADD CONSTRAINT "tournees_vehicule_id_vehicules_id_fk" FOREIGN KEY ("vehicule_id") REFERENCES "public"."vehicules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_agent_idx" ON "clients" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "clients_zone_idx" ON "clients" USING btree ("zone_tournee");--> statement-breakpoint
CREATE INDEX "commandes_client_idx" ON "commandes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "commandes_statut_idx" ON "commandes" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "commandes_source_idx" ON "commandes" USING btree ("source");--> statement-breakpoint
CREATE INDEX "commandes_created_idx" ON "commandes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "factures_client_idx" ON "factures" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "factures_created_idx" ON "factures" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lignes_commande_idx" ON "lignes_commande" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "paiements_facture_idx" ON "paiements" USING btree ("facture_id");--> statement-breakpoint
CREATE INDEX "avis_produit_idx" ON "avis" USING btree ("produit_id");--> statement-breakpoint
CREATE INDEX "lignes_panier_panier_idx" ON "lignes_panier" USING btree ("panier_id");--> statement-breakpoint
CREATE INDEX "listes_achat_client_idx" ON "listes_achat" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "paniers_client_idx" ON "paniers" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "fidelite_client_idx" ON "transactions_fidelite" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "lots_produit_depot_idx" ON "lots" USING btree ("produit_id","depot_id");--> statement-breakpoint
CREATE INDEX "mouvements_produit_idx" ON "mouvements_stock" USING btree ("produit_id");--> statement-breakpoint
CREATE INDEX "mouvements_date_idx" ON "mouvements_stock" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "produits_categorie_idx" ON "produits" USING btree ("categorie_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stocks_produit_depot_idx" ON "stocks" USING btree ("produit_id","depot_id");--> statement-breakpoint
CREATE INDEX "unites_vente_produit_idx" ON "unites_vente" USING btree ("produit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unites_vente_code_barres_idx" ON "unites_vente" USING btree ("code_barres");--> statement-breakpoint
CREATE INDEX "livraisons_tournee_idx" ON "livraisons" USING btree ("tournee_id");--> statement-breakpoint
CREATE INDEX "livraisons_commande_idx" ON "livraisons" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "tournees_date_idx" ON "tournees" USING btree ("date");