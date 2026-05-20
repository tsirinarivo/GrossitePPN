import Link from "next/link";
import { Package, MapPin, Phone, Mail, Shield, Truck, Clock } from "lucide-react";

const GARANTIES = [
  { icon: Truck, label: "Livraison rapide", desc: "Antananarivo & régions" },
  { icon: Shield, label: "Paiement sécurisé", desc: "Mvola, Orange Money, Espèces" },
  { icon: Clock, label: "Support 7j/7", desc: "8h – 18h (heure Tana)" },
];

export function ShopFooter() {
  return (
    <footer className="bg-[--card] border-t border-[--border] mt-20">
      {/* Garanties */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-b border-[--border]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {GARANTIES.map((g) => (
            <div key={g.label} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0">
                <g.icon className="w-5 h-5 text-[--primary]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[--foreground]">{g.label}</p>
                <p className="text-xs text-[--foreground-muted]">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[--primary] flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[--foreground]">GrossistePPN</span>
            </div>
            <p className="text-sm text-[--foreground-muted] leading-relaxed">
              Votre grossiste de confiance en Produits de Première Nécessité.
              Commandez en ligne, livraison dans tout Madagascar.
            </p>
            <div className="flex flex-col gap-2 mt-4 text-sm text-[--foreground-muted]">
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                Antananarivo 101, Madagascar
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                +261 34 00 000 00
              </span>
              <span className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                contact@grossisteppn.mg
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[--foreground] mb-4">Catalogue</h3>
            <ul className="space-y-2 text-sm text-[--foreground-muted]">
              {["Riz & Céréales", "Huiles", "Sucre & Sel", "Savon & Hygiène", "Lait & Conserves"].map((l) => (
                <li key={l}>
                  <Link href="/shop" className="hover:text-[--foreground] transition-colors">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[--foreground] mb-4">Mon compte</h3>
            <ul className="space-y-2 text-sm text-[--foreground-muted]">
              {[
                { href: "/compte/commandes", label: "Mes commandes" },
                { href: "/compte/factures", label: "Mes factures" },
                { href: "/compte/fidelite", label: "Ma fidélité ⭐" },
                { href: "/compte/adresses", label: "Mes adresses" },
                { href: "/compte/equipe", label: "Mon équipe" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-[--foreground] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[--foreground] mb-4">Informations</h3>
            <ul className="space-y-2 text-sm text-[--foreground-muted]">
              {["À propos", "Conditions de vente", "Politique de confidentialité", "Contact"].map((l) => (
                <li key={l}>
                  <Link href="#" className="hover:text-[--foreground] transition-colors">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[--border] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[--foreground-subtle]">
          <p>© 2026 GrossistePPN Madagascar. Tous droits réservés.</p>
          <p className="font-mono">NIF 123456789 · STAT 12345678901234</p>
        </div>
      </div>
    </footer>
  );
}
