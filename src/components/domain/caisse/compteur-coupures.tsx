"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Banknote, Coins, RotateCcw, Check, AlertTriangle } from "lucide-react";
import { formatMGA } from "@/lib/money";

/**
 * Décompte du fond de caisse par coupure malgache (Ariary).
 *
 * Coupures officielles en circulation au Madagascar :
 *  - billets : 200, 500, 1 000, 2 000, 5 000, 10 000, 20 000 Ar
 *  - pièces : 50, 100 Ar (rarement utilisées en grossiste)
 *
 * Usage : ouverture session caisse / clôture / vérification fond physique vs théorique.
 * Affiche un récap total + alerte d'écart vs montant attendu.
 *
 * Émet onTotalChange avec le total + la répartition pour persistance dans rapportZ.
 */

export type DecompteCoupures = {
  c200: number;
  c500: number;
  c1000: number;
  c2000: number;
  c5000: number;
  c10000: number;
  c20000: number;
};

export const EMPTY_DECOMPTE: DecompteCoupures = {
  c200: 0,
  c500: 0,
  c1000: 0,
  c2000: 0,
  c5000: 0,
  c10000: 0,
  c20000: 0,
};

const COUPURES: { key: keyof DecompteCoupures; value: number; label: string; color: string }[] = [
  { key: "c20000", value: 20000, label: "20 000 Ar", color: "#8b5cf6" },
  { key: "c10000", value: 10000, label: "10 000 Ar", color: "#3b82f6" },
  { key: "c5000",  value: 5000,  label: "5 000 Ar",  color: "#22c55e" },
  { key: "c2000",  value: 2000,  label: "2 000 Ar",  color: "#f59e0b" },
  { key: "c1000",  value: 1000,  label: "1 000 Ar",  color: "#ef4444" },
  { key: "c500",   value: 500,   label: "500 Ar",    color: "#ec4899" },
  { key: "c200",   value: 200,   label: "200 Ar",    color: "#6b7280" },
];

function calcTotal(d: DecompteCoupures): number {
  return COUPURES.reduce((s, c) => s + d[c.key] * c.value, 0);
}

function calcNbBillets(d: DecompteCoupures): number {
  return COUPURES.reduce((s, c) => s + d[c.key], 0);
}

export function CompteurCoupures({
  initialValue = EMPTY_DECOMPTE,
  montantAttendu,
  label = "Décompte du fond de caisse",
  onChange,
}: {
  initialValue?: DecompteCoupures;
  montantAttendu?: number;
  label?: string;
  onChange?: (decompte: DecompteCoupures, total: number) => void;
}) {
  const [decompte, setDecompte] = useState<DecompteCoupures>(initialValue);

  const total = useMemo(() => calcTotal(decompte), [decompte]);
  const nbBillets = useMemo(() => calcNbBillets(decompte), [decompte]);
  const ecart = montantAttendu != null ? total - montantAttendu : null;

  useEffect(() => {
    onChange?.(decompte, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decompte, total]);

  const updateCoupure = (key: keyof DecompteCoupures, val: string) => {
    const n = Math.max(0, Math.floor(Number(val) || 0));
    setDecompte((prev) => ({ ...prev, [key]: n }));
  };

  const reset = () => setDecompte(EMPTY_DECOMPTE);

  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Banknote className="w-4 h-4 text-[--primary]" />
        <h3 className="font-bold text-sm flex-1">{label}</h3>
        <button
          onClick={reset}
          className="p-1.5 rounded-md text-[--foreground-subtle] hover:bg-[--muted]"
          title="Réinitialiser"
          type="button"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        {COUPURES.map((c) => {
          const nb = decompte[c.key];
          const sousTotal = nb * c.value;
          return (
            <div key={c.key} className="flex items-center gap-2 py-1">
              <div
                className="w-1 h-6 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-xs font-mono w-20 shrink-0">{c.label}</span>
              <span className="text-xs text-[--foreground-subtle]">×</span>
              <input
                type="number"
                min={0}
                value={nb || ""}
                onChange={(ev) => updateCoupure(c.key, ev.target.value)}
                placeholder="0"
                className="w-16 text-center border border-[--border] rounded-md py-1 text-sm bg-[--background] focus:outline-none focus:border-[--primary] font-semibold"
              />
              <span className="text-xs text-[--foreground-subtle] flex-1 text-right font-mono">
                {sousTotal > 0 ? formatMGA(sousTotal) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[--border] pt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-[--foreground-subtle]">
          <span className="flex items-center gap-1.5">
            <Coins className="w-3 h-3" />
            {nbBillets} billet(s) total
          </span>
        </div>
        <motion.div
          key={total}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-baseline justify-between"
        >
          <span className="text-sm font-semibold">TOTAL</span>
          <span className="text-xl font-bold text-[--primary] font-mono">{formatMGA(total)}</span>
        </motion.div>

        {ecart !== null && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              ecart === 0
                ? "bg-green-500/10 text-green-500"
                : Math.abs(ecart) <= 500
                ? "bg-amber-500/10 text-amber-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            {ecart === 0 ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">Décompte exact : montant attendu atteint</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold">
                    Écart : {ecart > 0 ? "+" : ""}
                    {formatMGA(ecart)}
                  </div>
                  <div className="text-[10px] opacity-80">
                    Attendu : {formatMGA(montantAttendu!)} · Compté : {formatMGA(total)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
