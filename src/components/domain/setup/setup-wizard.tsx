"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Warehouse, FileUp, Check, Loader2, Sparkles, Upload, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: 1, label: "Entreprise", icon: Building2 },
  { id: 2, label: "Premier dépôt", icon: Warehouse },
  { id: 3, label: "Importer produits", icon: FileUp },
  { id: 4, label: "Terminé", icon: Check },
];

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Étape 1: entreprise
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [nif, setNif] = useState("");

  // Étape 2: dépôt
  const [depotNom, setDepotNom] = useState("Dépôt principal");
  const [depotAdresse, setDepotAdresse] = useState("");

  // Étape 3: CSV
  const [csv, setCsv] = useState("");
  const [importStats, setImportStats] = useState<{ inserted: number; total: number; errors: string[] } | null>(null);

  const submitEntreprise = async () => {
    if (!nom.trim()) return toast.error("Nom requis");
    setLoading(true);
    try {
      await fetch("/api/admin/entreprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, adresse, telephone, nif }),
      });
      toast.success("Entreprise enregistrée");
      setStep(2);
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  const submitDepot = async () => {
    if (!depotNom.trim()) return toast.error("Nom requis");
    setLoading(true);
    try {
      await fetch("/api/depots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: depotNom, adresse: depotAdresse, estPrincipal: true }),
      });
      toast.success("Dépôt créé");
      setStep(3);
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(setCsv);
  };

  const submitCsv = async () => {
    if (!csv.trim()) return toast.error("CSV vide");
    setLoading(true);
    try {
      const res = await fetch("/api/setup/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      setImportStats(data);
      toast.success(`${data.inserted} produits importés`);
      setStep(4);
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  const skipCsv = () => setStep(4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[--background] to-[--muted]/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step > s.id ? "bg-green-500 text-white" : step === s.id ? "bg-[--primary] text-white" : "bg-[--muted] text-[--foreground-subtle]"}`}>
                {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-1 mx-2 rounded ${step > s.id ? "bg-green-500" : "bg-[--muted]"}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between mb-6 text-[11px] text-[--foreground-subtle]">
          {STEPS.map((s) => <div key={s.id} className="text-center" style={{ width: "25%" }}>{s.label}</div>)}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-[--card] border border-[--border] rounded-2xl p-6 shadow-xl"
          >
            {step === 1 && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <Building2 className="w-5 h-5 text-[--primary]" />
                  <h2 className="text-lg font-bold">Informations entreprise</h2>
                </div>
                <div className="space-y-3">
                  <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de l'entreprise *" className="w-full border border-[--border] rounded-lg px-3 py-2.5 text-sm bg-[--background]" autoFocus />
                  <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse" className="w-full border border-[--border] rounded-lg px-3 py-2.5 text-sm bg-[--background]" />
                  <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Téléphone" className="w-full border border-[--border] rounded-lg px-3 py-2.5 text-sm bg-[--background]" />
                  <input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="NIF" className="w-full border border-[--border] rounded-lg px-3 py-2.5 text-sm bg-[--background]" />
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={submitEntreprise} disabled={loading || !nom.trim()} className="px-5 py-2.5 rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <Warehouse className="w-5 h-5 text-[--primary]" />
                  <h2 className="text-lg font-bold">Créer le premier dépôt</h2>
                </div>
                <div className="space-y-3">
                  <input value={depotNom} onChange={(e) => setDepotNom(e.target.value)} placeholder="Nom du dépôt *" className="w-full border border-[--border] rounded-lg px-3 py-2.5 text-sm bg-[--background]" />
                  <input value={depotAdresse} onChange={(e) => setDepotAdresse(e.target.value)} placeholder="Adresse du dépôt" className="w-full border border-[--border] rounded-lg px-3 py-2.5 text-sm bg-[--background]" />
                </div>
                <div className="mt-6 flex justify-between">
                  <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-lg border border-[--border] hover:bg-[--muted] text-sm">Retour</button>
                  <button onClick={submitDepot} disabled={loading || !depotNom.trim()} className="px-5 py-2.5 rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <FileUp className="w-5 h-5 text-[--primary]" />
                  <h2 className="text-lg font-bold">Importer vos produits</h2>
                </div>
                <p className="text-xs text-[--foreground-subtle] mb-3">
                  CSV attendu avec colonnes : <code className="bg-[--muted] px-1 rounded">code</code>, <code className="bg-[--muted] px-1 rounded">designation</code>, <code className="bg-[--muted] px-1 rounded">prix</code>, optionnel <code className="bg-[--muted] px-1 rounded">stock</code>, <code className="bg-[--muted] px-1 rounded">categorie</code>. Séparateur ; ou ,
                </p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[--border] rounded-xl p-8 cursor-pointer hover:bg-[--muted]/20 transition-colors">
                  <Upload className="w-8 h-8 text-[--foreground-subtle] mb-2" />
                  <span className="text-sm font-medium">{csv ? `CSV chargé (${csv.split("\n").length - 1} lignes)` : "Choisir un fichier CSV"}</span>
                  <input type="file" accept=".csv,text/csv" onChange={handleFileImport} className="hidden" />
                </label>
                <details className="mt-3">
                  <summary className="text-xs text-[--foreground-subtle] cursor-pointer">Ou coller le CSV manuellement</summary>
                  <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} placeholder="code;designation;prix;stock&#10;RZ001;Riz Makalioka 50kg;110000;50&#10;HU002;Huile Tournesol 5L;50000;30" className="mt-2 w-full text-xs font-mono border border-[--border] rounded-lg px-3 py-2 bg-[--background] resize-none" />
                </details>
                <div className="mt-6 flex justify-between">
                  <button onClick={skipCsv} className="px-5 py-2.5 rounded-lg border border-[--border] hover:bg-[--muted] text-sm">Passer cette étape</button>
                  <button onClick={submitCsv} disabled={loading || !csv.trim()} className="px-5 py-2.5 rounded-lg bg-[--primary] text-white font-medium disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Importer
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="text-center py-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-green-500" />
                </motion.div>
                <h2 className="text-xl font-bold mb-2">Configuration terminée !</h2>
                <p className="text-sm text-[--foreground-subtle] mb-5">
                  Votre instance GrossistePPN est prête à l&apos;emploi.
                  {importStats && <><br /><strong className="text-[--foreground]">{importStats.inserted}</strong> produit{importStats.inserted > 1 ? "s" : ""} importé{importStats.inserted > 1 ? "s" : ""}.</>}
                </p>
                <button onClick={() => router.push("/")} className="px-6 py-3 rounded-lg bg-[--primary] text-white font-bold">
                  Aller au tableau de bord
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
