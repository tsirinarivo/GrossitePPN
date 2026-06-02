"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Truck, Loader2, CheckCircle2, AlertTriangle, MapPin, User } from "lucide-react";
import { formatMGA } from "@/lib/money";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Chauffeur = { id: string; nom: string; nbLivraisons: number; tauxPonctualite: number; kmTotal: number; coutMoyen: number };
type Motif = { motif: string; nb: number };
type Global = { totalLivraisons: number; tauxLivrees: number; tauxRefusEchec: number; coutMoyen: number };

export function RapportLivraisonsView() {
  const [parChauffeur, setParChauffeur] = useState<Chauffeur[]>([]);
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [global, setGlobal] = useState<Global | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rapports/livraisons").then((r) => r.json()).then((d) => {
      setParChauffeur(d.parChauffeur ?? []);
      setMotifs(d.motifsEchecs ?? []);
      setGlobal(d.global ?? null);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card]">
        <Truck className="w-5 h-5 text-[--primary]" />
        <h1 className="text-lg font-bold flex-1">Rapport livraisons</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 flex flex-col gap-6">
        {loading || !global ? (
          <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1"><Truck className="w-3.5 h-3.5 text-[--primary]" /><span className="text-xs text-[--foreground-subtle]">Total livraisons</span></div>
                <div className="text-lg font-bold">{global.totalLivraisons}</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-[--foreground-subtle]">Taux ponctualité</span></div>
                <div className="text-lg font-bold text-green-500">{global.tauxLivrees}%</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-[--foreground-subtle]">Échecs / refus</span></div>
                <div className="text-lg font-bold text-red-500">{global.tauxRefusEchec}%</div>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1"><MapPin className="w-3.5 h-3.5 text-purple-500" /><span className="text-xs text-[--foreground-subtle]">Coût moyen / livraison</span></div>
                <div className="text-lg font-bold">{formatMGA(global.coutMoyen)}</div>
              </div>
            </div>

            {/* Par chauffeur */}
            <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[--border] flex items-center gap-2">
                <User className="w-4 h-4 text-[--primary]" />
                <span className="text-sm font-semibold">Performance par chauffeur</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border] bg-[--muted]/30">
                      <th className="text-left px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Chauffeur</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Livraisons</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium">Ponctualité</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Km simulés</th>
                      <th className="text-right px-3 py-2 text-xs text-[--foreground-subtle] font-medium hidden md:table-cell">Coût moy.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parChauffeur.map((c, i) => (
                      <motion.tr key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-[--border] last:border-0">
                        <td className="px-3 py-2.5 font-medium text-sm">{c.nom}</td>
                        <td className="px-3 py-2.5 text-right text-sm">{c.nbLivraisons}</td>
                        <td className="px-3 py-2.5 text-right text-sm">
                          <span className={c.tauxPonctualite >= 90 ? "text-green-500" : c.tauxPonctualite >= 80 ? "text-amber-500" : "text-red-500"}>{c.tauxPonctualite}%</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs hidden md:table-cell">{c.kmTotal} km</td>
                        <td className="px-3 py-2.5 text-right text-xs hidden md:table-cell">{formatMGA(c.coutMoyen)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Motifs d'échecs */}
            {motifs.length > 0 && (
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Motifs d&apos;échec agrégés</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={motifs} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="motif" type="category" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="nb" fill="#ef4444" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
