import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { LoginForm } from "@/components/domain/auth/login-form";
import { parseHost } from "@/lib/tenant-host";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const metadata: Metadata = { title: "Connexion" };

const ERROR_MESSAGES: Record<string, string> = {
  compte_desactive: "Votre compte a été désactivé. Contactez votre administrateur.",
  reserve_admin: "Cette console est réservée à l'administrateur de la plateforme.",
  espace_inconnu: "Cet espace n'existe pas.",
  mauvais_espace: "Votre compte n'appartient pas à cet espace. Connectez-vous à votre propre espace.",
  espace_inactif: "Cet espace n'est pas actif (paiement en attente ou suspendu).",
  impersonation_invalide: "Lien d'accès expiré ou invalide.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;
  const { kind, slug } = parseHost((await headers()).get("host"));

  // Titre affiché : console master, nom du tenant, ou générique.
  let titre = "GrossistePPN";
  let sousTitre = "Madagascar — Gestion PPN";

  if (kind === "master") {
    titre = "Console plateforme";
    sousTitre = "Administration des tenants";
  } else if (kind === "tenant" && slug) {
    try {
      const [t] = await db
        .select({ nom: schema.tenants.nom })
        .from(schema.tenants)
        .where(eq(schema.tenants.slug, slug))
        .limit(1);
      if (t?.nom) {
        titre = t.nom;
        sousTitre = "Espace professionnel";
      }
    } catch {
      /* fallback générique */
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--background] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[--primary] flex items-center justify-center mx-auto mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-6 h-6 text-white"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[--foreground]">
            {titre}
          </h1>
          <p className="text-sm text-[--foreground-muted] mt-1">
            {sousTitre}
          </p>
        </div>
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
            {errorMessage}
          </div>
        )}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
