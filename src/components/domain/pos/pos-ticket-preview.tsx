"use client";

import { motion } from "framer-motion";
import { X, Printer } from "lucide-react";
import { formatMGA } from "@/lib/money";

type Ligne = {
  id: string;
  nom: string;
  unite: string;
  quantite: number;
  prixUnitaire: number;
  totalTTC: number;
};

type Props = {
  entrepriseNom: string;
  entrepriseAdresse?: string;
  entrepriseTel?: string;
  nif?: string;
  stat?: string;
  numeroFacture?: string;
  date?: Date;
  clientNom?: string;
  lignes: Ligne[];
  sousTotalHT: number;
  tva: number;
  totalTTC: number;
  modePaiement?: string;
  header?: string;
  footer?: string;
  showTVA?: boolean;
  onClose: () => void;
  onPrint?: () => void;
};

export function POSTicketPreview({
  entrepriseNom,
  entrepriseAdresse,
  entrepriseTel,
  nif,
  stat,
  numeroFacture = "PREVIEW",
  date = new Date(),
  clientNom,
  lignes,
  sousTotalHT,
  tva,
  totalTTC,
  modePaiement,
  header,
  footer,
  showTVA = true,
  onClose,
  onPrint,
}: Props) {
  const dateFmt = date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-[--card] border border-[--border] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border]">
          <Printer className="w-4 h-4 text-[--primary]" />
          <h2 className="font-bold text-sm flex-1">Aperçu ticket thermique (58 mm)</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center" style={{ backgroundColor: "#f3f4f6" }}>
          {/* Ticket visuel */}
          <div
            className="bg-white shadow-lg p-3 font-mono text-[10px] leading-tight text-black"
            style={{ width: "220px", whiteSpace: "pre-wrap" }}
          >
            {header && (
              <>
                <div className="text-center mb-1">{header}</div>
                <div className="text-center">---</div>
              </>
            )}
            <div className="text-center font-extrabold text-[11px] uppercase tracking-wider">{entrepriseNom}</div>
            {entrepriseAdresse && <div className="text-center">{entrepriseAdresse}</div>}
            {entrepriseTel && <div className="text-center">Tel: {entrepriseTel}</div>}
            {nif && <div className="text-center">NIF: {nif}</div>}
            {stat && <div className="text-center">STAT: {stat}</div>}
            <div className="text-center my-1">================</div>
            <div className="text-center font-bold">FACTURE / RECU</div>
            <div className="text-center">================</div>
            <div className="flex justify-between"><span>N° {numeroFacture}</span><span>{dateFmt}</span></div>
            {clientNom && <div>Client: {clientNom}</div>}
            <div className="my-1">----------------</div>
            <div className="flex justify-between font-bold">
              <span>Article</span>
              <span>Qte  Total</span>
            </div>
            <div>----------------</div>
            {lignes.map((l) => (
              <div key={l.id} className="mb-0.5">
                <div className="flex justify-between gap-1">
                  <span className="truncate">{l.nom.slice(0, 16)}</span>
                  <span className="whitespace-nowrap">{l.quantite} {Math.round(l.totalTTC).toLocaleString("fr-FR")}</span>
                </div>
                {l.quantite > 1 && (
                  <div className="text-[--foreground-subtle]" style={{ color: "#666" }}>  @ {Math.round(l.prixUnitaire).toLocaleString("fr-FR")}/u</div>
                )}
              </div>
            ))}
            <div>----------------</div>
            <div className="flex justify-between"><span>Sous-total</span><span>{Math.round(sousTotalHT).toLocaleString("fr-FR")}</span></div>
            {showTVA && tva > 0 && (
              <div className="flex justify-between"><span>TVA</span><span>{Math.round(tva).toLocaleString("fr-FR")}</span></div>
            )}
            <div>================</div>
            <div className="flex justify-between font-extrabold text-[12px]">
              <span>TOTAL</span><span>{Math.round(totalTTC).toLocaleString("fr-FR")}</span>
            </div>
            {modePaiement && (
              <div className="flex justify-between mt-1"><span>Paiement</span><span className="uppercase">{modePaiement}</span></div>
            )}
            <div className="text-center mt-2">Merci pour votre achat !</div>
            <div className="text-center">Misaotra !</div>
            {footer && (
              <>
                <div className="text-center mt-1">---</div>
                <div className="text-center">{footer}</div>
              </>
            )}
            <div className="my-2 text-center">[QR code]</div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[--border]">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-[--border] hover:bg-[--muted]">Fermer</button>
          {onPrint && (
            <button onClick={onPrint} className="flex-1 py-2 text-sm rounded-lg bg-[--primary] text-white font-medium hover:opacity-90 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Version mini pour intégration dans un panneau
export function TicketLignesPreview({ lignes, totalTTC, formatHelper = formatMGA }: { lignes: Ligne[]; totalTTC: number; formatHelper?: typeof formatMGA }) {
  return (
    <div className="bg-white text-black p-3 font-mono text-[10px] leading-tight rounded shadow-inner" style={{ maxWidth: 220 }}>
      <div className="text-center font-bold">APERÇU</div>
      <div>----------------</div>
      {lignes.slice(0, 5).map((l) => (
        <div key={l.id} className="flex justify-between gap-1">
          <span className="truncate">{l.nom.slice(0, 16)}</span>
          <span>{l.quantite} {Math.round(l.totalTTC).toLocaleString("fr-FR")}</span>
        </div>
      ))}
      {lignes.length > 5 && <div>... +{lignes.length - 5} lignes</div>}
      <div>================</div>
      <div className="flex justify-between font-extrabold">
        <span>TOTAL</span><span>{formatHelper(totalTTC)}</span>
      </div>
    </div>
  );
}
