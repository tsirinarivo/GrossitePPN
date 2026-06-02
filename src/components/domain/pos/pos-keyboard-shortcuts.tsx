"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { usePOSStore } from "@/store/pos.store";

const SHORTCUTS = [
  { keys: ["F1"], desc: "Afficher cette aide" },
  { keys: ["F2"], desc: "Focus recherche produit" },
  { keys: ["F3"], desc: "Focus recherche client" },
  { keys: ["F4"], desc: "Ouvrir/fermer panier" },
  { keys: ["F12"], desc: "Valider la commande" },
  { keys: ["+", "−"], desc: "Ajuster quantité dernière ligne" },
  { keys: ["Esc"], desc: "Fermer panneau / vider recherche" },
  { keys: ["Ctrl", "Suppr"], desc: "Vider le panier" },
];

type Props = {
  searchInputId: string;
  clientInputId?: string;
  onTogglePanier?: () => void;
  onSubmit?: () => void;
};

export function POSKeyboardShortcuts({ searchInputId, clientInputId, onTogglePanier, onSubmit }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const { setRecherche, viderPanier, modifierQuantite, lignes } = usePOSStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");

      if (e.key === "F1") {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        const el = document.getElementById(searchInputId) as HTMLInputElement | null;
        el?.focus();
        el?.select();
        return;
      }

      if (e.key === "F3" && clientInputId) {
        e.preventDefault();
        const el = document.getElementById(clientInputId) as HTMLInputElement | null;
        el?.focus();
        el?.select();
        return;
      }

      if (e.key === "F4") {
        e.preventDefault();
        onTogglePanier?.();
        return;
      }

      if (e.key === "F12") {
        e.preventDefault();
        onSubmit?.();
        return;
      }

      if (e.key === "Escape") {
        if (helpOpen) {
          e.preventDefault();
          setHelpOpen(false);
          return;
        }
        if (isInput && target instanceof HTMLInputElement) {
          if (target.id === searchInputId) {
            setRecherche("");
          }
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Delete") {
        e.preventDefault();
        if (confirm("Vider le panier ?")) viderPanier();
        return;
      }

      // Ne déclenche +/- que si pas dans un input
      if (!isInput && (e.key === "+" || e.key === "=")) {
        if (lignes.length > 0) {
          e.preventDefault();
          const derniere = lignes[lignes.length - 1]!;
          modifierQuantite(derniere.id, 1);
        }
        return;
      }
      if (!isInput && (e.key === "-" || e.key === "_")) {
        if (lignes.length > 0) {
          e.preventDefault();
          const derniere = lignes[lignes.length - 1]!;
          modifierQuantite(derniere.id, -1);
        }
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchInputId, clientInputId, onTogglePanier, onSubmit, helpOpen, lignes, setRecherche, viderPanier, modifierQuantite]);

  return (
    <>
      <button
        onClick={() => setHelpOpen(true)}
        title="Raccourcis clavier (F1)"
        className="fixed bottom-4 right-4 z-30 p-2.5 rounded-full bg-[--pos-surface] border border-[--pos-border] shadow-lg hover:scale-105 transition-transform"
      >
        <Keyboard className="w-4 h-4 text-[--pos-text-muted]" />
      </button>

      <AnimatePresence>
        {helpOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70" onClick={() => setHelpOpen(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[--pos-surface] border border-[--pos-border] rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <Keyboard className="w-5 h-5 text-[--pos-accent]" />
                <h2 className="font-bold text-base flex-1">Raccourcis clavier POS</h2>
                <button onClick={() => setHelpOpen(false)} className="p-1.5 rounded-lg hover:bg-[--pos-surface-hover]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {SHORTCUTS.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between gap-3 py-1.5"
                  >
                    <span className="text-sm text-[--pos-text-muted]">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, idx) => (
                        <span key={idx}>
                          {idx > 0 && <span className="text-[--pos-text-muted] mx-0.5">+</span>}
                          <kbd className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-[--pos-surface-hover] border border-[--pos-border] text-[--pos-text]">{k}</kbd>
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-[--pos-border] text-[11px] text-[--pos-text-muted]">
                Appuyez sur <kbd className="px-1.5 py-0.5 font-mono bg-[--pos-surface-hover] border border-[--pos-border] rounded">F1</kbd> à tout moment pour rouvrir cette aide.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
