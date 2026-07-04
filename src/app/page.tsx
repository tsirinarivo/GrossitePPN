import type { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingCart, Package, Truck, Store, BarChart3, RotateCcw,
  Check, ArrowRight, ShieldCheck, Warehouse, Smartphone, Zap,
} from "lucide-react";
import { TenantAccess } from "@/components/marketing/tenant-access";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "GrossistePPN — Le logiciel de gestion des grossistes à Madagascar",
  description:
    "ERP complet pour grossistes alimentaires (PPN) à Madagascar : point de vente, stock multi-dépôts, livraisons, boutique B2B, facturation et analytics. Essai gratuit.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "GrossistePPN — Gestion complète pour grossistes",
    description:
      "POS, stock, livraisons, e-commerce B2B, facturation et rapports — pensé pour les grossistes malgaches.",
    type: "website",
  },
};

const FEATURES = [
  { icon: ShoppingCart, color: "#FF4D00", title: "Point de vente & Caisse", desc: "POS agent, sessions de caisse, Z-report, paiements multi-modes (espèces, Mvola, Orange, Airtel, crédit)." },
  { icon: Package, color: "#3B82F6", title: "Stock multi-dépôts", desc: "Inventaire en temps réel, mouvements atomiques, transferts inter-dépôts, alertes de rupture et réappro suggérée." },
  { icon: Truck, color: "#10B981", title: "Livraisons & tournées", desc: "Planification des tournées, feuilles de route, suivi chauffeur, ponctualité et motifs d'échec." },
  { icon: Store, color: "#EC4899", title: "Boutique B2B", desc: "Catalogue en ligne, panier, codes promo, listes d'achat récurrentes et espace client dédié." },
  { icon: BarChart3, color: "#8B5CF6", title: "Rapports & analytics", desc: "TVA, marges, performance vendeurs, analyse RFM clients, prévisions saisonnières, compte de résultat." },
  { icon: RotateCcw, color: "#EF4444", title: "Retours, avoirs & audit", desc: "Gestion des retours et avoirs, facturation conforme, journal d'audit complet des actions sensibles." },
];

const BENEFITS = [
  { icon: Smartphone, title: "Mobile & hors-ligne", desc: "Application web installable (PWA), fonctionne même avec une connexion instable." },
  { icon: ShieldCheck, title: "Isolé & sécurisé", desc: "Chaque entreprise dispose de son espace totalement isolé, avec rôles et permissions." },
  { icon: Warehouse, title: "Pensé pour le gros", desc: "Paliers de prix détail / semi-gros / gros, unités de conditionnement, crédit client." },
  { icon: Zap, title: "Rapide à déployer", desc: "Votre espace prêt en quelques minutes, accessible depuis votre propre sous-domaine." },
];

const CONTACT_EMAIL = process.env["NEXT_PUBLIC_CONTACT_EMAIL"] ?? "contact@dago-it.com";

export default function LandingPage() {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Demande GrossistePPN")}`;

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-[--background]/80 border-b border-[--border]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF4D00] to-[#FFB800] flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">GrossistePPN</span>
          </div>
          <nav className="flex items-center gap-2">
            <a href="#fonctionnalites" className="hidden sm:inline-block px-3 py-2 text-sm text-[--foreground-muted] hover:text-[--foreground] transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hidden sm:inline-block px-3 py-2 text-sm text-[--foreground-muted] hover:text-[--foreground] transition-colors">Tarifs</a>
            <a href="#espace" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-[#FF4D00] hover:bg-[#E04400] text-white transition-colors">
              Mon espace <ArrowRight className="w-4 h-4" />
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF4D00]/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[--border] bg-[--card] px-3 py-1 text-xs text-[--foreground-muted] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Conçu pour les grossistes alimentaires malgaches
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Gérez tout votre commerce de gros,
              <span className="bg-gradient-to-r from-[#FF4D00] to-[#FFB800] bg-clip-text text-transparent"> depuis un seul endroit.</span>
            </h1>
            <p className="mt-6 text-lg text-[--foreground-muted] max-w-2xl">
              Point de vente, stock multi-dépôts, livraisons, boutique B2B, facturation et analytics.
              GrossistePPN réunit toute la gestion de votre entreprise dans une seule application, rapide et mobile.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="#espace" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D00] hover:bg-[#E04400] px-6 py-3.5 font-semibold text-white transition-colors">
                Accéder à mon espace <ArrowRight className="w-4 h-4" />
              </a>
              <a href={mailto} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[--border-strong] hover:bg-[--accent] px-6 py-3.5 font-semibold transition-colors">
                Demander une démonstration
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="fonctionnalites" className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tous les outils du grossiste, réunis</h2>
          <p className="mt-3 text-[--foreground-muted]">Une plateforme complète qui remplace vos tableurs et vos outils dispersés.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[--border] bg-[--card] p-6 hover:border-[--border-strong] transition-colors">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${f.color}1A` }}>
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-[--foreground-muted] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits band ── */}
      <section className="border-y border-[--border] bg-[--background-subtle]">
        <div className="max-w-6xl mx-auto px-4 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {BENEFITS.map((b) => (
            <div key={b.title}>
              <b.icon className="w-6 h-6 text-[#FF4D00] mb-3" />
              <h3 className="font-semibold">{b.title}</h3>
              <p className="mt-1.5 text-sm text-[--foreground-muted]">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="tarifs" className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Des formules adaptées à votre taille</h2>
          <p className="mt-3 text-[--foreground-muted]">Des tarifs clairs, sans surprise. Évoluez à votre rythme, changez de formule quand vous voulez.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`relative rounded-2xl border p-6 flex flex-col ${p.accent ? "border-[#FF4D00] bg-[--card]" : "border-[--border] bg-[--card]"}`}
            >
              {p.accent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FF4D00] px-3 py-0.5 text-[11px] font-semibold text-white">
                  Recommandé
                </span>
              )}
              <h3 className="font-bold text-xl">{p.nom}</h3>
              <p className="text-sm text-[--foreground-muted] mt-1">{p.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">{p.prix.toLocaleString("fr-FR")}</span>
                <span className="text-sm text-[--foreground-muted]">Ar / mois</span>
              </div>
              <ul className="mt-5 space-y-2.5 flex-1">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span className="text-[--foreground-muted]">{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/souscription?plan=${p.key}`}
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm transition-colors ${p.accent ? "bg-[#FF4D00] hover:bg-[#E04400] text-white" : "border border-[--border-strong] hover:bg-[--accent]"}`}
              >
                Acheter <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Accès espace ── */}
      <section id="espace" className="border-t border-[--border]">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Déjà client&nbsp;? Accédez à votre espace</h2>
          <p className="mt-3 text-[--foreground-muted]">
            Saisissez l'identifiant de votre entreprise pour rejoindre votre espace sécurisé.
          </p>
          <div className="mt-8">
            <TenantAccess />
          </div>
          <p className="mt-4 text-sm text-[--foreground-subtle]">
            Vous ne connaissez pas votre identifiant&nbsp;?{" "}
            <a href={mailto} className="text-[#FF4D00] hover:underline">Contactez-nous</a>.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[--border] bg-[--background-subtle]">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4D00] to-[#FFB800] flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">GrossistePPN</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[--foreground-muted]">
            <a href="#fonctionnalites" className="hover:text-[--foreground] transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-[--foreground] transition-colors">Tarifs</a>
            <Link href="/login" className="hover:text-[--foreground] transition-colors">Connexion</Link>
          </div>
          <p className="text-xs text-[--foreground-subtle]">
            © {"2026"} GrossistePPN — Madagascar
          </p>
        </div>
      </footer>
    </div>
  );
}
