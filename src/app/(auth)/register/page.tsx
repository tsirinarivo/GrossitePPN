import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--background] p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Créer un compte</h1>
          <p className="text-sm text-[--foreground-muted] mt-1">
            L&apos;inscription se fait sur demande pour les grossistes partenaires.
          </p>
        </div>
        <div className="rounded-xl border border-[--border] bg-[--background-subtle] p-6 space-y-3">
          <p className="text-sm text-[--foreground]">
            Contactez-nous pour ouvrir un compte professionnel :
          </p>
          <p className="font-semibold text-[--primary]">+261 34 12 000 00</p>
          <p className="text-sm text-[--foreground-muted]">contact@grossiteppn.mg</p>
        </div>
        <Link href="/login" className="text-sm text-[--primary] hover:underline">
          Déjà un compte ? Se connecter
        </Link>
      </div>
    </div>
  );
}
