"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const LANGS = [
  { code: "fr", label: "FR" },
  { code: "mg", label: "MG" },
] as const;

interface Props {
  className?: string;
}

export function LocaleSwitcher({ className }: Props) {
  const router = useRouter();
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  const setLocale = (code: string) => {
    if (code === current) return;
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className={cn("inline-flex rounded-lg border border-[--border] p-0.5 text-xs font-medium", className)}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          disabled={pending}
          className={cn(
            "px-2 py-1 rounded-md transition-colors",
            current === l.code
              ? "bg-[--primary] text-[--primary-foreground]"
              : "text-[--foreground-muted] hover:text-[--foreground]"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
