"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertCircle, Info, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Membre = {
  id: string;
  userId: string;
  nom: string | null;
  email: string;
  peutCommander: boolean;
  peutVoirFactures: boolean;
  peutGererEquipe: boolean;
  createdAt: string;
};

type EquipeData = {
  membres: Membre[];
  client: { raisonSociale: string; id: string };
};

function Initiales({ nom, email }: { nom: string | null; email: string }) {
  const lettre = (nom ?? email).trim().charAt(0).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-[--primary]/15 flex items-center justify-center text-[--primary] font-bold text-sm shrink-0">
      {lettre}
    </div>
  );
}

export function CompteEquipe() {
  const [data, setData] = useState<EquipeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRetrait, setConfirmRetrait] = useState<string | null>(null);
  const [retirant, setRetirant] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients/equipe")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Erreur");
        }
        return res.json() as Promise<EquipeData>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRetirer(membreId: string) {
    setRetirant(membreId);
    try {
      const res = await fetch(`/api/clients/equipe?membreId=${membreId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Erreur", { description: body.error ?? "Impossible de retirer ce membre" });
        return;
      }
      setData((prev) =>
        prev ? { ...prev, membres: prev.membres.filter((m) => m.id !== membreId) } : prev
      );
      toast.success("Membre retiré de l'équipe");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRetirant(null);
      setConfirmRetrait(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Mon équipe</h1>
        {data && (
          <p className="text-[--foreground-muted] mt-1">
            Membres de l&apos;équipe — {data.client.raisonSociale}
          </p>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[--border] bg-[--accent]/50 px-4 py-3 text-sm text-[--foreground-muted]">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-[--primary]" />
        <p>
          Pour ajouter un nouveau membre, contactez votre gestionnaire de compte GrossistePPN.
        </p>
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-[--accent]/40 animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error === "Compte e-commerce non activé"
            ? "Votre compte e-commerce n'est pas encore activé. Contactez votre gestionnaire."
            : error}
        </div>
      )}

      {!loading && !error && data && data.membres.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[--foreground-muted]">
          <Users className="w-10 h-10 opacity-30" />
          <p className="text-sm text-center">
            Aucun membre pour l&apos;instant. Contactez votre gestionnaire de compte pour ajouter des collaborateurs.
          </p>
        </div>
      )}

      {!loading && !error && data && data.membres.length > 0 && (
        <motion.ul className="space-y-3" initial="hidden" animate="visible" variants={{
          visible: { transition: { staggerChildren: 0.07 } },
          hidden: {},
        }}>
          <AnimatePresence>
            {data.membres.map((membre) => (
              <motion.li
                key={membre.id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                }}
                exit={{ opacity: 0, height: 0, marginTop: 0, overflow: "hidden" }}
                className="flex items-center gap-4 rounded-xl border border-[--border] bg-[--card] px-4 py-4"
              >
                <Initiales nom={membre.nom} email={membre.email} />

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[--foreground] truncate">
                    {membre.nom ?? membre.email}
                  </p>
                  <p className="text-xs text-[--foreground-muted] truncate">{membre.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {membre.peutCommander && (
                      <Badge className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/15">
                        Commander
                      </Badge>
                    )}
                    {membre.peutVoirFactures && (
                      <Badge className="text-[10px] bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/15">
                        Factures
                      </Badge>
                    )}
                    {membre.peutGererEquipe && (
                      <Badge className="text-[10px] bg-purple-500/15 text-purple-600 border-purple-500/30 hover:bg-purple-500/15">
                        Gérer équipe
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {confirmRetrait === membre.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[--foreground-muted]">Confirmer ?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={retirant === membre.id}
                        onClick={() => handleRetirer(membre.id)}
                        className="h-7 px-2 text-xs"
                      >
                        {retirant === membre.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Oui"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmRetrait(null)}
                        className="h-7 px-2 text-xs"
                      >
                        Non
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmRetrait(membre.id)}
                      className="h-8 w-8 p-0 text-[--foreground-muted] hover:text-red-500 hover:bg-red-500/10"
                      title="Retirer ce membre"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
