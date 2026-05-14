"use client";

import { useEffect, useCallback } from "react";
import type { CommandeEvent, CommandeMiseAJourEvent } from "@/lib/sse/broadcast";

type Options = {
  onNouvelle?: (event: CommandeEvent) => void;
  onMiseAJour?: (event: CommandeMiseAJourEvent) => void;
};

export function useCommandeStream({ onNouvelle, onMiseAJour }: Options) {
  const stableNouvelle = useCallback(onNouvelle ?? (() => {}), [onNouvelle]);
  const stableMiseAJour = useCallback(onMiseAJour ?? (() => {}), [onMiseAJour]);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;
    const MAX_RETRIES = 10;

    const connect = () => {
      es = new EventSource("/api/stream/caisse");

      es.addEventListener("nouvelle_commande", (e) => {
        try {
          stableNouvelle(JSON.parse(e.data) as CommandeEvent);
        } catch { /* JSON malformé */ }
      });

      es.addEventListener("commande_modifiee", (e) => {
        try {
          stableMiseAJour(JSON.parse(e.data) as CommandeMiseAJourEvent);
        } catch { /* JSON malformé */ }
      });

      es.onerror = () => {
        es?.close();
        es = null;
        retries++;
        if (retries <= MAX_RETRIES) {
          const delay = Math.min(1000 * 2 ** retries, 30_000);
          retryTimeout = setTimeout(connect, delay);
        }
      };

      es.onopen = () => { retries = 0; };
    };

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
    };
  }, [stableNouvelle, stableMiseAJour]);
}
