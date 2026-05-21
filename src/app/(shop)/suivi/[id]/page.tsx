import type { Metadata } from "next";
import Link from "next/link";
import { Package, MapPin, Phone, CheckCircle, Circle, XCircle, Truck, ShoppingBag, ClipboardCheck } from "lucide-react";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Suivi de commande" };

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function SuiviPage({ params }: Props) {
  const { id } = await params;

  // Fetch livraison by tokenPublic
  const rows = await db
    .select({
      livraisonId: schema.livraisons.id,
      statut: schema.livraisons.statut,
      adresseLivraison: schema.livraisons.adresseLivraison,
      livraisonAt: schema.livraisons.livraisonAt,
      motifRefus: schema.livraisons.motifRefus,
      livraisonCreatedAt: schema.livraisons.createdAt,
      commandeNumero: schema.commandes.numero,
      commandeCreatedAt: schema.commandes.createdAt,
      commandeStatut: schema.commandes.statut,
      totalTTC: schema.commandes.totalTTC,
      commandeId: schema.commandes.id,
      clientNom: schema.clients.raisonSociale,
      clientAdresse: schema.clients.adresse,
      clientTel: schema.clients.telephone,
      vehiculeImmat: schema.vehicules.immatriculation,
      vehiculeModele: schema.vehicules.modele,
    })
    .from(schema.livraisons)
    .leftJoin(
      schema.commandes,
      eq(schema.livraisons.commandeId, schema.commandes.id)
    )
    .leftJoin(
      schema.clients,
      eq(schema.commandes.clientId, schema.clients.id)
    )
    .leftJoin(
      schema.tournees,
      eq(schema.livraisons.tourneeId, schema.tournees.id)
    )
    .leftJoin(
      schema.vehicules,
      eq(schema.tournees.vehiculeId, schema.vehicules.id)
    )
    .where(eq(schema.livraisons.tokenPublic, id))
    .limit(1);

  const livraison = rows[0];

  // Fetch entreprise for footer phone
  const entrepriseRows = await db
    .select({ nom: schema.entreprise.nom, telephone: schema.entreprise.telephone })
    .from(schema.entreprise)
    .limit(1);
  const entreprise = entrepriseRows[0];

  // Not found
  if (!livraison) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[--background-subtle] flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-[--foreground-muted]" />
        </div>
        <h1 className="text-xl font-bold text-[--foreground] mb-2">
          Numéro de suivi introuvable
        </h1>
        <p className="text-sm text-[--foreground-muted] max-w-sm mb-6">
          Ce lien de suivi n&apos;existe pas ou a expiré. Vérifiez le lien dans votre
          SMS ou email de confirmation.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[--primary] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ShoppingBag className="w-4 h-4" />
          Retour à la boutique
        </Link>
      </div>
    );
  }

  // Fetch lignes commande
  const lignes = livraison.commandeId
    ? await db
        .select({
          id: schema.lignesCommande.id,
          nomProduit: schema.lignesCommande.nomProduit,
          quantite: schema.lignesCommande.quantite,
          nomUnite: schema.lignesCommande.nomUnite,
          totalTTC: schema.lignesCommande.totalTTC,
        })
        .from(schema.lignesCommande)
        .where(eq(schema.lignesCommande.commandeId, livraison.commandeId))
    : [];

  const statut = livraison.statut;
  const commandeStatut = livraison.commandeStatut ?? "brouillon";
  const isRefuse = statut === "refusee" || statut === "echec";

  // Determine step completion
  const step1Done = true; // commande reçue = always done
  const step2Done = !["brouillon", "soumise"].includes(commandeStatut);
  const step3Done = ["preparee", "chargee", "en_route", "en_livraison", "livree"].includes(statut ?? "");
  const step4Done = ["en_route", "chargee", "livree"].includes(statut ?? "");
  const step5Done = statut === "livree";

  type StepState = "done" | "active" | "pending" | "error";

  function stepState(done: boolean, isErrorStep = false): StepState {
    if (isRefuse && isErrorStep) return "error";
    if (done) return "done";
    return "pending";
  }

  const steps: { label: string; date?: Date | null; detail?: string; state: StepState }[] = [
    {
      label: "Commande reçue",
      date: livraison.commandeCreatedAt,
      state: stepState(step1Done),
    },
    {
      label: "Commande validée",
      date: undefined,
      state: stepState(step2Done),
    },
    {
      label: "En préparation",
      date: undefined,
      state: stepState(step3Done),
    },
    {
      label: "En livraison",
      date: undefined,
      detail: livraison.vehiculeImmat
        ? `Véhicule : ${livraison.vehiculeImmat}${livraison.vehiculeModele ? ` (${livraison.vehiculeModele})` : ""}`
        : undefined,
      state: isRefuse ? "error" : stepState(step4Done),
    },
    {
      label: statut === "livree" ? "Livré" : isRefuse ? "Refusée / Échec" : "Livré",
      date: livraison.livraisonAt,
      detail: isRefuse && livraison.motifRefus ? `Motif : ${livraison.motifRefus}` : undefined,
      state: isRefuse ? "error" : stepState(step5Done, true),
    },
  ];

  const refBadge = `#${id.slice(-8).toUpperCase()}`;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header card */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[--primary]/10 flex items-center justify-center mx-auto">
          <Package className="w-7 h-7 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--foreground]">
            Suivi de commande
          </h1>
          <p className="text-xs text-[--foreground-muted] font-mono bg-[--background-subtle] px-3 py-1.5 rounded-lg inline-block mt-2">
            {refBadge}
          </p>
        </div>
        {livraison.commandeNumero && (
          <p className="text-sm text-[--foreground-muted]">
            Commande{" "}
            <span className="font-semibold text-[--foreground]">
              {livraison.commandeNumero}
            </span>{" "}
            · {formatDateShort(livraison.commandeCreatedAt)}
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-[--border] bg-[--card] p-5">
        <h2 className="text-sm font-semibold text-[--foreground] mb-5">
          Statut de la livraison
        </h2>
        <div className="space-y-0">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const isDone = step.state === "done";
            const isError = step.state === "error";
            const isPending = step.state === "pending";

            return (
              <div key={i} className="flex gap-4">
                {/* Column: icon + line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                      isError
                        ? "bg-[--destructive]/10 border-[--destructive]"
                        : isDone
                        ? "bg-[--success]/10 border-[--success]"
                        : isPending
                        ? "bg-[--background-subtle] border-[--border]"
                        : "bg-[--primary]/10 border-[--primary]"
                    }`}
                  >
                    {isError ? (
                      <XCircle className="w-4 h-4 text-[--destructive]" />
                    ) : isDone ? (
                      <CheckCircle className="w-4 h-4 text-[--success]" />
                    ) : i === 3 ? (
                      <Truck className="w-3.5 h-3.5 text-[--foreground-muted]" />
                    ) : i === 2 ? (
                      <ClipboardCheck className="w-3.5 h-3.5 text-[--foreground-muted]" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[--foreground-muted]" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 h-8 mt-1 mb-1 rounded-full ${
                        isDone || isError ? "bg-[--success]" : "bg-[--border]"
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-${isLast ? "0" : "0"} pt-1 min-w-0`} style={{ paddingBottom: isLast ? 0 : 16 }}>
                  <p
                    className={`text-sm font-semibold ${
                      isError
                        ? "text-[--destructive]"
                        : isDone
                        ? "text-[--foreground]"
                        : "text-[--foreground-muted]"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-xs text-[--foreground-muted] mt-0.5">
                      {formatDate(step.date)}
                    </p>
                  )}
                  {step.detail && (
                    <p
                      className={`text-xs mt-0.5 ${
                        isError ? "text-[--destructive]/80" : "text-[--foreground-muted]"
                      }`}
                    >
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-[--border] bg-[--card] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[--foreground]">
          Informations de livraison
        </h2>
        {livraison.clientNom && (
          <div className="flex items-start gap-2 text-sm">
            <Package className="w-4 h-4 text-[--foreground-muted] shrink-0 mt-0.5" />
            <div>
              <span className="text-[--foreground-muted] text-xs block">
                Destinataire
              </span>
              <span className="font-medium text-[--foreground]">
                {livraison.clientNom}
                {livraison.clientAdresse ? ` — ${livraison.clientAdresse}` : ""}
              </span>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-[--foreground-muted] shrink-0 mt-0.5" />
          <div>
            <span className="text-[--foreground-muted] text-xs block">
              Adresse de livraison
            </span>
            <span className="font-medium text-[--foreground]">
              {livraison.adresseLivraison}
            </span>
          </div>
        </div>
        {livraison.totalTTC !== null && livraison.totalTTC !== undefined && livraison.totalTTC > 0 && (
          <div className="pt-2 border-t border-[--border] flex justify-between items-center">
            <span className="text-sm text-[--foreground-muted]">Total commande</span>
            <span className="font-bold text-[--foreground]">
              {livraison.totalTTC.toLocaleString("fr-FR")} Ar
            </span>
          </div>
        )}
      </div>

      {/* Lignes commande */}
      {lignes.length > 0 && (
        <div className="rounded-2xl border border-[--border] bg-[--card] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[--foreground]">
            Détail de la commande ({lignes.length} article
            {lignes.length > 1 ? "s" : ""})
          </h2>
          <div className="space-y-2">
            {lignes.map((ligne) => (
              <div
                key={ligne.id}
                className="flex justify-between items-center text-sm py-1.5 border-b border-[--border] last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[--foreground] truncate">
                    {ligne.nomProduit}
                  </p>
                  <p className="text-xs text-[--foreground-muted]">
                    {ligne.quantite.toLocaleString("fr-FR")} {ligne.nomUnite}
                  </p>
                </div>
                {ligne.totalTTC > 0 && (
                  <span className="text-xs font-semibold text-[--foreground] ml-2 shrink-0">
                    {ligne.totalTTC.toLocaleString("fr-FR")} Ar
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer aide */}
      <div className="rounded-2xl border border-[--border] bg-[--background-subtle] p-5 text-center space-y-2">
        <p className="text-sm font-medium text-[--foreground]">
          Besoin d&apos;aide ?
        </p>
        <p className="text-sm text-[--foreground-muted]">Contactez-nous</p>
        {entreprise?.telephone && (
          <a
            href={`tel:${entreprise.telephone}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[--primary] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Phone className="w-4 h-4" />
            {entreprise.telephone}
          </a>
        )}
        {entreprise?.nom && (
          <p className="text-xs text-[--foreground-muted] pt-1">
            {entreprise.nom}
          </p>
        )}
      </div>
    </div>
  );
}
