"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Plus, Trash2, Loader2, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Categorie {
  id: string;
  nom: string;
  icone: string | null;
}

export function CategoriesView() {
  const [cats, setCats] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [icone, setIcone] = useState("");
  const [saving, startSave] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/categories").then((r) => r.json()).then((d) => setCats(d.categories ?? [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function add() {
    if (!nom.trim()) { toast.error("Nom requis"); return; }
    startSave(async () => {
      const res = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nom.trim(), icone: icone.trim() || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Catégorie ajoutée");
        setNom(""); setIcone("");
        load();
      } else {
        toast.error(d.error ?? "Erreur");
      }
    });
  }

  async function remove(c: Categorie) {
    if (!window.confirm(`Supprimer la catégorie « ${c.nom} » ? (les produits existants ne sont pas supprimés)`)) return;
    setBusy(c.id);
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      if (res.ok) { setCats((p) => p.filter((x) => x.id !== c.id)); toast.success("Catégorie supprimée"); }
      else toast.error("Suppression impossible");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <Link href="/stock" className="inline-flex items-center gap-1.5 text-sm text-[--foreground-muted] hover:text-[--foreground] mb-2">
          <ArrowLeft className="w-4 h-4" /> Stock
        </Link>
        <h1 className="text-display-sm text-[--foreground]">Catégories</h1>
        <p className="text-[--foreground-muted] mt-1">Organisez vos produits par catégorie (riz, huile, hygiène…)</p>
      </div>

      {/* Ajout */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-4">
        <p className="font-semibold text-[--foreground] mb-3 inline-flex items-center gap-2"><Plus className="w-4 h-4 text-[--primary]" /> Nouvelle catégorie</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={icone} onChange={(e) => setIcone(e.target.value)} placeholder="🌾" className="sm:w-20 text-center" maxLength={4} />
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom (ex : Riz)" className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <Button onClick={add} loading={saving} disabled={!nom.trim()}>
            <Check className="w-4 h-4" /> Ajouter
          </Button>
        </div>
        <p className="text-[11px] text-[--foreground-subtle] mt-2">L&apos;icône (emoji) est optionnelle.</p>
      </div>

      {/* Liste */}
      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[--foreground-muted]"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
        ) : cats.length === 0 ? (
          <div className="text-center py-12 text-[--foreground-muted]">
            <Tag className="w-10 h-10 opacity-20 mx-auto mb-3" />
            <p className="text-sm">Aucune catégorie — ajoutez-en une ci-dessus.</p>
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            <AnimatePresence initial={false}>
              {cats.map((c) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[--accent]/30">
                  <span className="inline-flex items-center gap-2.5 text-[--foreground]">
                    <span className="text-lg w-6 text-center">{c.icone || "📦"}</span>
                    <span className="font-medium">{c.nom}</span>
                  </span>
                  <Button variant="ghost" size="icon-sm" className="text-[--foreground-muted] hover:text-red-400" disabled={busy === c.id}
                    onClick={() => remove(c)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
