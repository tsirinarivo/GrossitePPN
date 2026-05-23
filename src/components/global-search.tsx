"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, Package, Users, Receipt, ArrowRight, Loader2, X } from "lucide-react";
import { formatMGA } from "@/lib/money";
import { cn } from "@/lib/utils";

type Produit = { id: string; code: string; nom: string; uniteBase: string };
type Client  = { id: string; code: string; raisonSociale: string; telephone: string | null; palier: string };
type Commande = { id: string; numero: string; statut: string; totalTTC: number; createdAt: string };
type Results = { produits: Produit[]; clients: Client[]; commandes: Commande[] };

export function GlobalSearch() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<Results>({ produits: [], clients: [], commandes: [] });
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor]   = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  useEffect(() => { setMounted(true); }, []);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => { if (!v) { setQuery(""); setResults({ produits: [], clients: [], commandes: [] }); } return !v; });
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults({ produits: [], clients: [], commandes: [] }); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const total = results.produits.length + results.clients.length + results.commandes.length;
  const hasResults = total > 0;

  type Item = { href: string; label: string; sub: string; icon: typeof Package; iconColor: string };
  const items: Item[] = useMemo(() => [
    ...results.produits.map((p) => ({ href: `/stock/produits/${p.id}`, label: p.nom, sub: `${p.code} · ${p.uniteBase}`, icon: Package, iconColor: "#3B82F6" })),
    ...results.clients.map((c) => ({ href: `/clients`, label: c.raisonSociale, sub: `${c.code} · ${c.palier}`, icon: Users, iconColor: "#F59E0B" })),
    ...results.commandes.map((o) => ({ href: `/historique`, label: o.numero, sub: `${o.statut} · ${formatMGA(o.totalTTC)}`, icon: Receipt, iconColor: "#8B5CF6" })),
  ], [results]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && items[cursor]) navigate(items[cursor]!.href);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, items, cursor]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!mounted) return null;

  return (
    <>
      {/* Trigger pill — visible dans le nav header */}
      <button
        onClick={() => { setOpen(true); setQuery(""); setResults({ produits: [], clients: [], commandes: [] }); }}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[--foreground-muted] border border-[--border] hover:border-[--border-strong] hover:text-[--foreground] transition-all bg-[--accent]/50"
        style={{ minWidth: 180 }}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Rechercher…</span>
        <kbd className="text-[10px] font-mono bg-[--muted] px-1.5 py-0.5 rounded border border-[--border]">⌘K</kbd>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#0d0d14", borderColor: "#1E1E2E", maxHeight: "60vh" }}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#1E1E2E" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "#FF4D00" }} /> :
                         <Search className="w-4 h-4 shrink-0" style={{ color: "#666" }} />}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher produit, client, commande…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#666]"
                style={{ color: "#fff" }}
              />
              {query && (
                <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} style={{ color: "#666" }}>
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd
                onClick={() => setOpen(false)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border cursor-pointer"
                style={{ backgroundColor: "#1a1a1a", borderColor: "#333", color: "#666" }}
              >Esc</kbd>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {query.length < 2 ? (
                <div className="px-4 py-6 text-center text-sm" style={{ color: "#555" }}>
                  Tapez au moins 2 caractères…
                </div>
              ) : !hasResults && !loading ? (
                <div className="px-4 py-6 text-center text-sm" style={{ color: "#555" }}>
                  Aucun résultat pour «&nbsp;{query}&nbsp;»
                </div>
              ) : (
                <div className="py-2">
                  {/* Sections */}
                  {(["produits", "clients", "commandes"] as const).map((section) => {
                    const sectionItems = section === "produits" ? results.produits :
                                         section === "clients"  ? results.clients  : results.commandes;
                    if (sectionItems.length === 0) return null;

                    const SECTION_LABELS = { produits: "Produits", clients: "Clients", commandes: "Commandes" };
                    const offsets = { produits: 0, clients: results.produits.length, commandes: results.produits.length + results.clients.length };

                    return (
                      <div key={section}>
                        <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#555" }}>
                          {SECTION_LABELS[section]}
                        </div>
                        {sectionItems.map((item, i) => {
                          const globalIdx = offsets[section] + i;
                          const isActive = cursor === globalIdx;
                          const it = items[globalIdx]!;
                          return (
                            <button
                              key={item.id}
                              onMouseEnter={() => setCursor(globalIdx)}
                              onClick={() => navigate(it.href)}
                              className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors")}
                              style={{ backgroundColor: isActive ? "#1a1a2e" : "transparent" }}
                            >
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: it.iconColor + "20" }}>
                                <it.icon className="w-3.5 h-3.5" style={{ color: it.iconColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate" style={{ color: "#e0e0e0" }}>{it.label}</div>
                                <div className="text-xs truncate" style={{ color: "#666" }}>{it.sub}</div>
                              </div>
                              {isActive && <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "#FF4D00" }} />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t flex items-center gap-4 text-[10px]" style={{ borderColor: "#1E1E2E", color: "#555" }}>
              <span><kbd className="font-mono">↑↓</kbd> Naviguer</span>
              <span><kbd className="font-mono">↵</kbd> Ouvrir</span>
              <span><kbd className="font-mono">Esc</kbd> Fermer</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
