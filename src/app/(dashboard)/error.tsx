"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[--foreground]">Une erreur est survenue</h2>
          <p className="text-sm text-[--foreground-muted] mt-1">
            Cette page n&apos;a pas pu se charger. Réessayez, ou revenez plus tard.
          </p>
          {error.message && (
            <p className="text-xs text-[--foreground-subtle] mt-2 font-mono bg-[--background-subtle] rounded px-2 py-1 break-all">
              {error.message}
            </p>
          )}
        </div>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
