"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Smartphone, Copy, CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ROOT_DOMAIN } from "@/lib/tenant-host";

type OperateurKey = "mvola" | "orange_money" | "airtel_money";

const OPERATEURS: { key: OperateurKey; label: string; color: string }[] = [
  { key: "mvola", label: "MVola", color: "#FFC400" },
  { key: "orange_money", label: "Orange Money", color: "#FF7900" },
  { key: "airtel_money", label: "Airtel Money", color: "#E4002B" },
];

type Numeros = Record<OperateurKey, { numero: string | null; nom: string | null }>;

export function SouscriptionForm({
  planKey, planNom, prix, numeros, instructions,
}: {
  planKey: string;
  planNom: string;
  prix: number;
  numeros: Numeros;
  instructions: string | null;
}) {
  const [operateur, setOperateur] = useState<OperateurKey>("mvola");
  const [form, setForm] = useState({
    entrepriseNom: "", contactNom: "", contactEmail: "", telephone: "", reference: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ slug: string } | null>(null);

  const numeroActif = numeros[operateur]?.numero;
  const nomActif = numeros[operateur]?.nom;

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function copyNum() {
    if (!numeroActif) return;
    navigator.clipboard?.writeText(numeroActif).then(() => toast.success("Numéro copié")).catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!form.entrepriseNom.trim()) return toast.error("Nom de l'entreprise requis");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail)) return toast.error("Email valide requis");
    if (!form.reference.trim()) return toast.error("Référence de la transaction requise");
    setLoading(true);
    try {
      const res = await fetch("/api/souscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan: planKey, operateur }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone({ slug: data.slug });
      } else {
        toast.error(data.error ?? "Erreur lors de la souscription");
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center rounded-2xl border border-[--border] bg-[--card] p-8">
        <div className="w-14 h-14 rounded-full bg-[#10B981]/15 flex items-center justify-center mx-auto mb-4">
          <CircleCheck className="w-7 h-7 text-[#10B981]" />
        </div>
        <h1 className="text-2xl font-bold">Demande enregistrée&nbsp;!</h1>
        <p className="mt-3 text-[--foreground-muted]">
          Votre espace <span className="font-mono text-[--foreground]">{done.slug}.{ROOT_DOMAIN}</span> est créé
          en <span className="text-amber-400">attente de validation</span>. Dès que nous confirmons votre paiement
          Mobile Money, il est activé et vous recevez vos identifiants par email à <span className="text-[--foreground]">{form.contactEmail}</span>.
        </p>
        <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#FF4D00] hover:bg-[#E04400] px-5 py-2.5 font-semibold text-white transition-colors">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const inputCls = "w-full h-11 px-3 rounded-lg border border-[--border] bg-[--background] text-[--foreground] placeholder:text-[--foreground-subtle] focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/40";

  return (
    <form onSubmit={submit} className="grid md:grid-cols-5 gap-6">
      {/* Récap + paiement */}
      <div className="md:col-span-2 space-y-4">
        <div className="rounded-2xl border border-[#FF4D00]/40 bg-[--card] p-5">
          <p className="text-xs text-[--foreground-muted]">Formule choisie</p>
          <p className="text-xl font-bold">{planNom}</p>
          <p className="mt-2 text-3xl font-extrabold">{prix.toLocaleString("fr-FR")} <span className="text-sm font-medium text-[--foreground-muted]">Ar / mois</span></p>
        </div>

        <div className="rounded-2xl border border-[--border] bg-[--card] p-5 space-y-3">
          <p className="font-semibold inline-flex items-center gap-2"><Smartphone className="w-4 h-4 text-[#FF4D00]" /> Payer par Mobile Money</p>
          <div className="grid grid-cols-3 gap-2">
            {OPERATEURS.map((o) => (
              <button type="button" key={o.key} onClick={() => setOperateur(o.key)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${operateur === o.key ? "border-[#FF4D00] text-[--foreground]" : "border-[--border] text-[--foreground-muted] hover:border-[--border-strong]"}`}>
                {o.label}
              </button>
            ))}
          </div>

          {numeroActif ? (
            <div className="rounded-lg bg-[--background-subtle] p-3">
              <p className="text-xs text-[--foreground-muted]">Envoyez <span className="font-semibold text-[--foreground]">{prix.toLocaleString("fr-FR")} Ar</span> au numéro :</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-lg font-bold font-mono tracking-wide">{numeroActif}</span>
                <button type="button" onClick={copyNum} className="p-1.5 rounded-md hover:bg-[--accent] text-[--foreground-muted]" title="Copier">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {nomActif && <p className="text-xs text-[--foreground-muted] mt-0.5">Au nom de : {nomActif}</p>}
            </div>
          ) : (
            <p className="text-xs text-amber-400">Numéro {OPERATEURS.find((o) => o.key === operateur)?.label} non configuré — choisissez un autre opérateur ou contactez-nous.</p>
          )}

          <p className="text-[11px] text-[--foreground-subtle]">
            {instructions || "Après le paiement, saisissez la référence de la transaction reçue par SMS dans le formulaire. Votre espace sera activé après vérification."}
          </p>
        </div>
      </div>

      {/* Formulaire entreprise */}
      <div className="md:col-span-3 rounded-2xl border border-[--border] bg-[--card] p-5 space-y-3">
        <h1 className="text-lg font-bold">Vos informations</h1>
        <div>
          <label className="text-xs text-[--foreground-muted] mb-1 block">Nom de l&apos;entreprise *</label>
          <input className={inputCls} value={form.entrepriseNom} onChange={(e) => set("entrepriseNom", e.target.value)} placeholder="Ex : Grossiste Analakely" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[--foreground-muted] mb-1 block">Nom du contact</label>
            <input className={inputCls} value={form.contactNom} onChange={(e) => set("contactNom", e.target.value)} placeholder="Responsable" />
          </div>
          <div>
            <label className="text-xs text-[--foreground-muted] mb-1 block">Téléphone (du paiement)</label>
            <input className={inputCls} value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="034 …" />
          </div>
        </div>
        <div>
          <label className="text-xs text-[--foreground-muted] mb-1 block">Email * <span className="text-[--foreground-subtle]">(pour recevoir vos identifiants)</span></label>
          <input className={inputCls} type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="vous@entreprise.mg" />
        </div>
        <div>
          <label className="text-xs text-[--foreground-muted] mb-1 block">Référence de la transaction Mobile Money *</label>
          <input className={inputCls} value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Ex : réf. reçue par SMS après paiement" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-12 mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D00] hover:bg-[#E04400] disabled:opacity-60 font-semibold text-white transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Valider ma souscription
        </button>
        <p className="text-[11px] text-[--foreground-subtle] text-center">
          Votre espace est créé en attente ; il sera activé après vérification du paiement.
        </p>
      </div>
    </form>
  );
}
