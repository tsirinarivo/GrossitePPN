"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  Truck,
  Shield,
  Zap,
  Star,
  Package,
  TrendingDown,
  Users,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMGA } from "@/lib/money";
import { cn } from "@/lib/utils";

const PRODUITS_VEDETTES = [
  {
    id: "p-riz-maka",
    slug: "riz-makalioka",
    nom: "Riz Makalioka",
    nomMG: "Vary Makalioka",
    categorie: "Riz premium",
    prix: 3200,
    unite: "kg",
    stock: "En stock",
    reduction: null,
    badge: "Bestseller",
    couleurBadge: "bg-[--color-ocre-500]",
    emoji: "🌾",
  },
  {
    id: "p-huile",
    slug: "huile-tiko",
    nom: "Huile Tiko 1L",
    nomMG: "Menaka Tiko 1L",
    categorie: "Huiles alimentaires",
    prix: 12000,
    unite: "bouteille",
    stock: "En stock",
    reduction: 8,
    badge: "Promo",
    couleurBadge: "bg-[--destructive]",
    emoji: "🫙",
  },
  {
    id: "p-sucre",
    slug: "sucre-blanc",
    nom: "Sucre Blanc",
    nomMG: "Siramamy Fotsy",
    categorie: "Sucre & sel",
    prix: 4800,
    unite: "kg",
    stock: "Stock limité",
    reduction: null,
    badge: null,
    couleurBadge: "",
    emoji: "🍬",
  },
  {
    id: "p-savon",
    slug: "savon-madar",
    nom: "Savon Madar",
    nomMG: "Savony Madar",
    categorie: "Hygiène",
    prix: 800,
    unite: "pièce",
    stock: "En stock",
    reduction: null,
    badge: "Nouveau",
    couleurBadge: "bg-[--color-vanille-500]",
    emoji: "🧼",
  },
];

const TEMOIGNAGES = [
  {
    nom: "Rakotomalala Jean",
    role: "Gérant épicerie, Analakely",
    texte:
      "Je commande chaque semaine depuis 6 mois. La livraison est rapide et les prix sont imbattables pour des commandes en gros.",
    note: 5,
  },
  {
    nom: "Razafindrakoto Marie",
    role: "Restauratrice, Behoririka",
    texte:
      "Le système de crédit client m'a vraiment aidée à gérer ma trésorerie. Je recommande à tous les restaurateurs.",
    note: 5,
  },
  {
    nom: "Randrianarisoa Paul",
    role: "Épicier, Isotry",
    texte:
      "La commande rapide par grille est fantastique. Je fais ma commande mensuelle en moins de 5 minutes maintenant.",
    note: 5,
  },
];

const STATS = [
  { valeur: "1 200+", label: "Clients actifs" },
  { valeur: "180+", label: "Produits PPN" },
  { valeur: "48h", label: "Livraison max" },
  { valeur: "99.2%", label: "Satisfaction" },
];

export function ShopLanding() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="overflow-x-hidden">
      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center overflow-hidden bg-[--pos-bg]"
      >
        {/* Fond animé — grain + gradient */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 20% 40%, oklch(0.52 0.18 43 / 0.35) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 70%, oklch(0.50 0.15 145 / 0.25) 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at 60% 20%, oklch(0.46 0.22 270 / 0.20) 0%, transparent 50%)
            `,
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.95 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.95 0 0) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-24"
        >
          <div className="max-w-3xl">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="bg-[--primary]/20 text-[--color-ocre-300] ring-[--primary]/30 mb-6 text-xs px-3 py-1.5">
                <Zap className="w-3 h-3 mr-1" />
                Plateforme B2B Madagascar
              </Badge>
            </motion.div>

            {/* Titre */}
            <motion.h1
              className="text-display-xl text-white leading-[1] mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Vos PPN,{" "}
              <span
                className="relative"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.75 0.18 55) 0%, oklch(0.65 0.17 145) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                livrés vite
              </span>
              <br />à Madagascar.
            </motion.h1>

            <motion.p
              className="text-lg text-[--pos-text-muted] mb-8 max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Commandez en gros — riz, huile, sucre, savon et plus — en ligne.
              Prix négociés, paiement Mvola/Orange Money, livraison 48h.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button variant="pos" size="xl" asChild>
                <Link href="/shop">
                  Voir le catalogue
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="xl"
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
                asChild
              >
                <Link href="/compte">Créer un compte</Link>
              </Button>
            </motion.div>

            {/* Stats hero */}
            <motion.div
              className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold text-white">{s.valeur}</div>
                  <div className="text-xs text-[--pos-text-muted] mt-0.5">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-9 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          AVANTAGES
      ══════════════════════════════════════ */}
      <section className="py-20 bg-[--background]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingDown,
                titre: "Prix grossiste garanti",
                desc: "Paliers gros / semi-gros / détail avec application automatique selon votre profil.",
                couleur: "text-[--color-ocre-600]",
                bg: "bg-[--color-ocre-50] dark:bg-[--color-ocre-950]",
              },
              {
                icon: Truck,
                titre: "Livraison partout à Tana",
                desc: "Tournées quotidiennes. Suivi temps réel sur carte. Signature électronique.",
                couleur: "text-[--color-vanille-600]",
                bg: "bg-[--color-vanille-50] dark:bg-[--color-vanille-950]",
              },
              {
                icon: Shield,
                titre: "Paiement flexible",
                desc: "Mvola, Orange Money, Airtel Money, espèces, crédit client. Factures officielles NIF/STAT.",
                couleur: "text-[--color-indigo-600]",
                bg: "bg-[--color-indigo-50] dark:bg-[--color-indigo-950]",
              },
            ].map((a, i) => (
              <motion.div
                key={a.titre}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
                        a.bg
                      )}
                    >
                      <a.icon className={cn("w-6 h-6", a.couleur)} />
                    </div>
                    <h3 className="font-semibold text-[--foreground] mb-2">{a.titre}</h3>
                    <p className="text-sm text-[--foreground-muted] leading-relaxed">{a.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PRODUITS VEDETTES
      ══════════════════════════════════════ */}
      <section className="py-20 bg-[--background-subtle]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <motion.p
                className="text-sm font-semibold text-[--primary] uppercase tracking-widest mb-2"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                Produits phares
              </motion.p>
              <motion.h2
                className="text-display-md text-[--foreground]"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Les essentiels PPN
              </motion.h2>
            </div>
            <Button variant="outline" asChild className="hidden sm:flex">
              <Link href="/shop">
                Tout voir
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {PRODUITS_VEDETTES.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <ProduitCard produit={p} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA COMMANDE RAPIDE
      ══════════════════════════════════════ */}
      <section className="py-20 bg-[--background]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-[--primary] p-8 sm:p-12 relative overflow-hidden">
            {/* Déco */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/4" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
              <div className="flex-1 text-center sm:text-left">
                <Badge className="bg-white/20 text-white ring-white/30 mb-4">
                  <Zap className="w-3 h-3 mr-1" />
                  Commande rapide
                </Badge>
                <h2 className="text-display-sm text-white mb-3">
                  Remplissez votre grille en 3 minutes
                </h2>
                <p className="text-white/80 text-base max-w-lg">
                  Notre outil de commande rapide vous permet de saisir des
                  dizaines de produits d'un coup, comme un tableau Excel.
                  Parfait pour vos commandes hebdomadaires récurrentes.
                </p>
              </div>
              <div className="shrink-0">
                <Button
                  size="xl"
                  className="bg-white text-[--primary] hover:bg-white/90 font-bold shadow-xl"
                  asChild
                >
                  <Link href="/shop?mode=quick">
                    <ShoppingCart className="w-5 h-5" />
                    Commander maintenant
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TÉMOIGNAGES
      ══════════════════════════════════════ */}
      <section className="py-20 bg-[--background-subtle]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-semibold text-[--primary] uppercase tracking-widest mb-2">
              Témoignages
            </p>
            <h2 className="text-display-md text-[--foreground]">
              Ils nous font confiance
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEMOIGNAGES.map((t, i) => (
              <motion.div
                key={t.nom}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6 flex flex-col gap-4">
                    {/* Étoiles */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.note }).map((_, j) => (
                        <Star
                          key={j}
                          className="w-4 h-4 text-[--warning] fill-[--warning]"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-[--foreground] leading-relaxed flex-1">
                      &ldquo;{t.texte}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-[--border]">
                      <div className="w-8 h-8 rounded-full bg-[--primary]/15 flex items-center justify-center text-sm font-bold text-[--primary]">
                        {t.nom[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[--foreground]">{t.nom}</p>
                        <p className="text-xs text-[--foreground-muted]">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          INSCRIPTION CTA
      ══════════════════════════════════════ */}
      <section className="py-24 bg-[--background]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-[--primary]/10 flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-[--primary]" />
            </div>
            <h2 className="text-display-md text-[--foreground]">
              Rejoignez 1 200+ professionnels
            </h2>
            <p className="text-[--foreground-muted] text-lg leading-relaxed">
              Inscription gratuite. Accès immédiat au catalogue. Vos prix
              personnalisés sont configurés lors de votre premier contact.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                "Épiceries & supérettes",
                "Restaurants",
                "ONG & associations",
                "Hôtels",
                "Revendeurs",
              ].map((l) => (
                <span
                  key={l}
                  className="flex items-center gap-1.5 text-sm text-[--foreground-muted] bg-[--background-subtle] rounded-full px-3 py-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[--success]" />
                  {l}
                </span>
              ))}
            </div>
            <Button size="xl" asChild className="mt-2">
              <Link href="/register">
                Créer mon compte professionnel
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function ProduitCard({
  produit,
}: {
  produit: (typeof PRODUITS_VEDETTES)[0];
}) {
  return (
    <Link href={`/produit/${produit.slug}`} className="group block">
      <div
        className={cn(
          "rounded-2xl border border-[--card-border] bg-[--card] overflow-hidden",
          "transition-all duration-200",
          "hover:border-[--primary]/30 hover:shadow-lg hover:-translate-y-1"
        )}
      >
        {/* Image / emoji placeholder */}
        <div className="relative h-36 bg-[--background-muted] flex items-center justify-center">
          <span className="text-5xl">{produit.emoji}</span>
          {produit.badge && (
            <span
              className={cn(
                "absolute top-3 left-3 text-[10px] font-bold text-white px-2 py-0.5 rounded-full",
                produit.couleurBadge
              )}
            >
              {produit.badge}
            </span>
          )}
          {produit.reduction && (
            <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-[--destructive] px-2 py-0.5 rounded-full">
              −{produit.reduction}%
            </span>
          )}
        </div>

        {/* Infos */}
        <div className="p-4">
          <p className="text-[11px] text-[--foreground-subtle] mb-1">{produit.categorie}</p>
          <h3 className="text-sm font-semibold text-[--foreground] leading-tight group-hover:text-[--primary] transition-colors">
            {produit.nom}
          </h3>
          <p className="text-[11px] text-[--foreground-muted] italic mb-3">
            {produit.nomMG}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-base font-bold text-[--foreground] text-mga">
                {formatMGA(produit.prix)}
              </span>
              <span className="text-[11px] text-[--foreground-muted] ml-1">
                /{produit.unite}
              </span>
            </div>
            <span
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                produit.stock === "En stock"
                  ? "bg-[--success]/10 text-[--success]"
                  : produit.stock === "Stock limité"
                    ? "bg-[--warning]/15 text-[--warning-foreground]"
                    : "bg-[--destructive]/10 text-[--destructive]"
              )}
            >
              {produit.stock}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
