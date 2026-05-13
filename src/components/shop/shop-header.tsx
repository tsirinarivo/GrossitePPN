"use client";

import Link from "next/link";
import { ShoppingCart, User, Package, Menu, X, Search } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/shop", label: "Catalogue" },
  { href: "/shop?cat=riz", label: "Riz & Céréales" },
  { href: "/shop?cat=huile", label: "Huiles" },
  { href: "/shop?cat=savon", label: "Hygiène" },
  { href: "/shop?promo=1", label: "Promotions", badge: true },
];

export function ShopHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[--card]/95 backdrop-blur-md border-b border-[--border]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link href="/shop" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[--primary] flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold tracking-tight">GrossistePPN</span>
              <span className="text-[11px] text-[--foreground-muted] block leading-none -mt-0.5">
                Madagascar
              </span>
            </div>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 px-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[--foreground-muted] hover:text-[--foreground] rounded-lg hover:bg-[--accent] transition-all"
              >
                {l.label}
                {l.badge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[--destructive] absolute -top-0.5 -right-0.5" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            {/* Search */}
            <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
              <Link href="/shop?search=1">
                <Search className="w-4 h-4" />
              </Link>
            </Button>

            <LocaleSwitcher />

            {/* Panier */}
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/panier">
                <ShoppingCart className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[--primary] text-white text-[10px] font-bold flex items-center justify-center">
                  3
                </span>
              </Link>
            </Button>

            {/* Compte */}
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link href="/compte">
                <User className="w-3.5 h-3.5" />
                Mon compte
              </Link>
            </Button>

            {/* Hamburger mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="lg:hidden border-t border-[--border] bg-[--card] py-3 px-4 space-y-1 animate-fade-in">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[--accent] text-[--foreground-muted] hover:text-[--foreground] transition-all"
            >
              {l.label}
              {l.badge && <Badge variant="destructive" className="text-[10px] py-0">Nouveau</Badge>}
            </Link>
          ))}
          <div className="pt-2 border-t border-[--border]">
            <Link
              href="/compte"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[--accent] text-[--foreground-muted] hover:text-[--foreground]"
            >
              <User className="w-4 h-4" />
              Mon compte
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
