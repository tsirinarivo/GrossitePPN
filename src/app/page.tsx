import type { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingCart, Package, Truck, Store, BarChart3, RotateCcw,
  Check, ArrowRight, ShieldCheck, Warehouse, Smartphone, Zap,
  Sparkles, CreditCard, CircleCheck, TrendingUp,
} from "lucide-react";
import { TenantAccess } from "@/components/marketing/tenant-access";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "GrossistePPN — Le logiciel de gestion des grossistes à Madagascar",
  description:
    "ERP complet pour grossistes alimentaires (PPN) à Madagascar : point de vente, stock multi-dépôts, livraisons, boutique B2B, facturation et analytics.",
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
  { icon: Warehouse, title: "Pensé pour le gros", desc: "Paliers détail / semi-gros / gros, unités de conditionnement, crédit client." },
  { icon: Zap, title: "Rapide à déployer", desc: "Votre espace prêt en quelques minutes, sur votre propre sous-domaine." },
];

const STEPS = [
  { n: "1", icon: CreditCard, title: "Choisissez votre formule", desc: "Standard, Pro ou Entreprise — selon votre taille et vos besoins." },
  { n: "2", icon: Smartphone, title: "Payez par Mobile Money", desc: "MVola, Orange Money ou Airtel Money. Vous saisissez la référence." },
  { n: "3", icon: CircleCheck, title: "Votre espace est activé", desc: "Vous recevez vos identifiants par email et accédez à votre sous-domaine." },
];

const FAQ = [
  { q: "Ai-je besoin d'installer un logiciel ?", a: "Non. GrossistePPN est une application web accessible depuis un navigateur, installable sur mobile (PWA) et qui fonctionne même hors-ligne." },
  { q: "Comment se passe le paiement ?", a: "Vous payez par Mobile Money (MVola, Orange Money, Airtel Money) sur notre numéro marchand, puis saisissez la référence de la transaction. Votre espace est activé après vérification." },
  { q: "Mes données sont-elles isolées des autres entreprises ?", a: "Oui. Chaque entreprise dispose de son propre espace sur un sous-domaine dédié, avec des données totalement séparées et une gestion fine des rôles." },
  { q: "Puis-je changer de formule plus tard ?", a: "Oui, vous pouvez faire évoluer votre formule à tout moment selon la croissance de votre activité." },
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF4D00] to-[#FFB800] flex items-center justify-center shadow-lg shadow-[#FF4D00]/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">GrossistePPN</span>
          </div>
          <nav className="flex items-center gap-1">
            <a href="#fonctionnalites" className="hidden sm:inline-block px-3 py-2 text-sm text-[--foreground-muted] hover:text-[--foreground] transition-colors">Fonctionnalités</a>
            <a href="#etapes" className="hidden sm:inline-block px-3 py-2 text-sm text-[--foreground-muted] hover:text-[--foreground] transition-colors">Comment ça marche</a>
            <a href="#tarifs" className="hidden sm:inline-block px-3 py-2 text-sm text-[--foreground-muted] hover:text-[--foreground] transition-colors">Tarifs</a>
            <a href="#espace" className="ml-1 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-[#FF4D00] hover:bg-[#E04400] text-white transition-colors">
              Mon espace <ArrowRight className="w-4 h-4" />
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#FF4D00]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-16 md:pt-24 pb-12 relative grid lg:grid-cols-2 gap-12 items-center">
          {/* Texte */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[--border] bg-[--card] px-3 py-1 text-xs text-[--foreground-muted] mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB800]" /> Conçu pour les grossistes alimentaires malgaches
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Tout votre commerce de gros,
              <span className="bg-gradient-to-r from-[#FF4D00] to-[#FFB800] bg-clip-text text-transparent"> dans une seule application.</span>
            </h1>
            <p className="mt-6 text-lg text-[--foreground-muted] max-w-xl">
              Point de vente, stock multi-dépôts, livraisons, boutique B2B, facturation et analytics.
              Rapide, mobile, et pensé pour Madagascar.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="#tarifs" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D00] hover:bg-[#E04400] px-6 py-3.5 font-semibold text-white transition-colors">
                Voir les formules <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#espace" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[--border-strong] hover:bg-[--accent] px-6 py-3.5 font-semibold transition-colors">
                Accéder à mon espace
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[--foreground-muted]">
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#10B981]" /> Sans installation</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#10B981]" /> Fonctionne hors-ligne</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#10B981]" /> Paiement Mobile Money</span>
            </div>
          </div>

          {/* Aperçu produit (mockup) */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF4D00]/20 to-[#FFB800]/10 blur-2xl rounded-3xl" />
            <div className="relative rounded-2xl border border-[--border] bg-[--card] shadow-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[--border]">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]/70" />
                <span className="w-3 h-3 rounded-full bg-[#FFB800]/70" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]/70" />
                <span className="ml-3 text-xs text-[--foreground-subtle] font-mono">votre-entreprise.grossiste.dago-it.com</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "CA du jour", v: "1 240 000", c: "#10B981" },
                    { l: "Commandes", v: "38", c: "#FF4D00" },
                    { l: "Stock bas", v: "5", c: "#EF4444" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-lg bg-[--background-subtle] p-2.5">
                      <p className="text-[10px] text-[--foreground-muted]">{k.l}</p>
                      <p className="text-sm font-bold" style={{ color: k.c }}>{k.v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-[--background-subtle] p-3">
                  <p className="text-[10px] text-[--foreground-muted] mb-2">Ventes de la semaine</p>
                  <div className="flex items-end gap-1.5 h-20">
                    {[42, 58, 35, 70, 52, 88, 64].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#FF4D00] to-[#FFB800]" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {["Riz Makalioka 25kg", "Huile Tiko 1L", "Sucre roux 50kg"].map((p, i) => (
                    <div key={p} className="flex items-center justify-between rounded-lg bg-[--background-subtle] px-3 py-2">
                      <span className="text-xs text-[--foreground]">{p}</span>
                      <span className="text-[10px] text-[--foreground-muted]">{[128, 64, 20][i]} en stock</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bandeau stats */}
        <div className="border-y border-[--border] bg-[--background-subtle]">
          <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: "6+", l: "modules intégrés" },
              { v: "100%", l: "hors-ligne (PWA)" },
              { v: "FR / MG", l: "bilingue" },
              { v: "Mobile Money", l: "MVola · Orange · Airtel" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-[#FF4D00] to-[#FFB800] bg-clip-text text-transparent">{s.v}</p>
                <p className="text-xs text-[--foreground-muted] mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="fonctionnalites" className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tous les outils du grossiste, réunis</h2>
          <p className="mt-3 text-[--foreground-muted]">Une plateforme complète qui remplace vos tableurs et vos outils dispersés.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-[--border] bg-[--card] p-6 hover:border-[--border-strong] hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: `${f.color}1A` }}>
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-[--foreground-muted] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section id="etapes" className="border-y border-[--border] bg-[--background-subtle]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Démarrez en 3 étapes</h2>
            <p className="mt-3 text-[--foreground-muted]">De l'achat à votre espace opérationnel, en quelques minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-[--border] bg-[--card] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-9 h-9 rounded-full bg-[#FF4D00] text-white font-bold flex items-center justify-center shrink-0">{s.n}</span>
                  <s.icon className="w-5 h-5 text-[#FFB800]" />
                </div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-[--foreground-muted]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {BENEFITS.map((b) => (
          <div key={b.title}>
            <b.icon className="w-6 h-6 text-[#FF4D00] mb-3" />
            <h3 className="font-semibold">{b.title}</h3>
            <p className="mt-1.5 text-sm text-[--foreground-muted]">{b.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Pricing ── */}
      <section id="tarifs" className="border-t border-[--border]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Des tarifs clairs, sans surprise</h2>
            <p className="mt-3 text-[--foreground-muted]">Choisissez la formule adaptée à votre taille. Changez quand vous voulez.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PLANS.map((p) => (
              <div
                key={p.key}
                className={`relative rounded-2xl border p-6 flex flex-col ${p.accent ? "border-[#FF4D00] bg-[--card] shadow-xl shadow-[#FF4D00]/5 lg:-translate-y-2" : "border-[--border] bg-[--card]"}`}
              >
                {p.accent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#FF4D00] to-[#FFB800] px-3 py-0.5 text-[11px] font-semibold text-white">
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
          <p className="text-center text-xs text-[--foreground-subtle] mt-6">Paiement par Mobile Money · Activation après vérification</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-[--border] bg-[--background-subtle]">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-[--border] bg-[--card] p-4">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-medium">
                  {item.q}
                  <span className="text-[#FF4D00] text-xl leading-none transition-transform shrink-0 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-[--foreground-muted] leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Accès espace ── */}
      <section id="espace" className="border-t border-[--border]">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <TrendingUp className="w-8 h-8 text-[#FF4D00] mx-auto mb-4" />
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
          <p className="text-xs text-[--foreground-subtle]">© {"2026"} GrossistePPN — Madagascar</p>
        </div>
      </footer>
    </div>
  );
}
