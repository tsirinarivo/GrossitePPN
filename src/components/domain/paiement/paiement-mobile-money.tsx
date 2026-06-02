"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Smartphone, Check, Loader2, Copy, RefreshCw, X } from "lucide-react";
import { formatMGA } from "@/lib/money";
import { toast } from "sonner";

type Props = {
  id?: string;
  montant: number;
  mode: "mvola" | "orange_money" | "airtel_money";
  onPaye?: () => void;
  onClose?: () => void;
};

const MODE_META = {
  mvola: { label: "Mvola", color: "#FFCC00", logo: "📱" },
  orange_money: { label: "Orange Money", color: "#FF6600", logo: "🧡" },
  airtel_money: { label: "Airtel Money", color: "#E60000", logo: "🔴" },
};

function buildQrSvg(payload: string): string {
  // SVG QR factice — grille 21x21 pseudo-aléatoire dérivée du payload
  const SIZE = 21;
  const cells: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) >>> 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      h = (h * 1664525 + 1013904223) >>> 0;
      cells[y]![x] = (h & 1) === 1;
    }
  }
  // Finder patterns (coins)
  const finder = (cx: number, cy: number) => {
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
      const px = cx + x, py = cy + y;
      if (px < 0 || px >= SIZE || py < 0 || py >= SIZE) continue;
      const onBorder = Math.abs(x) === 3 || Math.abs(y) === 3;
      const onCenter = Math.abs(x) <= 1 && Math.abs(y) <= 1;
      cells[py]![px] = onBorder || onCenter;
    }
  };
  finder(3, 3); finder(SIZE - 4, 3); finder(3, SIZE - 4);
  const cellSize = 8;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE * cellSize} ${SIZE * cellSize}" width="${SIZE * cellSize}" height="${SIZE * cellSize}"><rect width="100%" height="100%" fill="white"/>`;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (cells[y]![x]) svg += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
    }
  }
  svg += "</svg>";
  return svg;
}

export function PaiementMobileMoney({ id: initialId, montant, mode, onPaye, onClose }: Props) {
  const [id, setId] = useState<string | null>(initialId ?? null);
  const [qrPayload, setQrPayload] = useState<string>("");
  const [statut, setStatut] = useState<string>("en_attente");
  const [polling, setPolling] = useState(false);
  const [numero, setNumero] = useState("");

  const meta = MODE_META[mode];

  const initier = useCallback(async () => {
    try {
      const res = await fetch("/api/paiements/mobile-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant, mode, numero }),
      });
      const data = await res.json();
      setId(data.id);
      setQrPayload(data.qrPayload);
      setStatut("en_attente");
    } catch {
      toast.error("Erreur initialisation paiement");
    }
  }, [montant, mode, numero]);

  useEffect(() => {
    if (!initialId) initier();
  }, [initialId, initier]);

  // Polling auto
  useEffect(() => {
    if (!id || statut === "paye") return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/paiements/mobile-money/${id}`);
        const d = await r.json();
        if (d.transaction?.statut === "paye") {
          setStatut("paye");
          toast.success("Paiement reçu !");
          onPaye?.();
        }
      } catch {}
    }, 1500);
    return () => clearInterval(iv);
  }, [id, statut, onPaye]);

  const verifierMaintenant = async () => {
    if (!id) return;
    setPolling(true);
    try {
      const r = await fetch(`/api/paiements/mobile-money/${id}`);
      const d = await r.json();
      setStatut(d.transaction?.statut ?? "en_attente");
    } finally {
      setPolling(false);
    }
  };

  const copier = () => {
    navigator.clipboard.writeText(qrPayload);
    toast.success("QR copié");
  };

  return (
    <div className="bg-[--card] border border-[--border] rounded-2xl p-6 max-w-md w-full mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: meta.color + "30" }}>{meta.logo}</div>
        <div className="flex-1">
          <h2 className="font-bold text-base">Paiement {meta.label}</h2>
          <p className="text-xs text-[--foreground-subtle]">{formatMGA(montant)}</p>
        </div>
        {onClose && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted]"><X className="w-4 h-4" /></button>}
      </div>

      {statut === "paye" ? (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="py-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <div className="text-base font-bold text-green-500">Paiement reçu</div>
          <div className="text-xs text-[--foreground-subtle] mt-1">{formatMGA(montant)} encaissés</div>
        </motion.div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-xl mb-4 flex justify-center">
            {qrPayload ? (
              <div dangerouslySetInnerHTML={{ __html: buildQrSvg(qrPayload) }} className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[--foreground-subtle]" /></div>
            )}
          </div>

          <div className="bg-[--muted]/30 rounded-lg p-3 mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[--foreground-subtle] shrink-0" />
            <span className="text-xs flex-1 truncate font-mono">{qrPayload || "..."}</span>
            <button onClick={copier} className="p-1.5 rounded hover:bg-[--muted]"><Copy className="w-3 h-3" /></button>
          </div>

          <div className="space-y-3">
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Numéro du client (optionnel)"
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
            />
            <button
              onClick={verifierMaintenant}
              disabled={polling}
              className="w-full py-2.5 rounded-lg border border-[--border] hover:bg-[--muted] text-sm font-medium flex items-center justify-center gap-2"
            >
              {polling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Vérifier le paiement
            </button>
            <div className="text-[11px] text-center text-[--foreground-subtle]">
              <span className="inline-flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                En attente — le statut se met à jour automatiquement
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
