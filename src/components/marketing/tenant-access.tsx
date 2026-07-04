"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ROOT_DOMAIN } from "@/lib/tenant-host";

/**
 * Champ « Accéder à mon espace » : l'entreprise saisit son identifiant
 * (slug) et est redirigée vers son sous-domaine dédié.
 */
export function TenantAccess() {
  const [slug, setSlug] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const s = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!s) return;
    window.location.href = `https://${s}.${ROOT_DOMAIN}`;
  }

  return (
    <form onSubmit={go} className="flex flex-col sm:flex-row items-stretch gap-2 w-full max-w-md mx-auto">
      <div className="flex items-center flex-1 rounded-xl border border-[--border] bg-[--card] focus-within:ring-2 focus-within:ring-[#FF4D00]/40 overflow-hidden">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="votre-entreprise"
          aria-label="Identifiant de votre espace"
          className="flex-1 min-w-0 bg-transparent px-4 py-3 text-[--foreground] placeholder:text-[--foreground-subtle] focus:outline-none"
        />
        <span className="pr-4 text-sm text-[--foreground-subtle] whitespace-nowrap hidden sm:block">
          .{ROOT_DOMAIN}
        </span>
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D00] hover:bg-[#E04400] transition-colors px-5 py-3 font-semibold text-white"
      >
        Accéder <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
