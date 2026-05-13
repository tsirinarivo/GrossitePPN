"use client";

import { useEffect, useCallback } from "react";
import type { CommandeEvent } from "@/lib/sse/broadcast";

export function useCommandeStream(onCommande: (event: CommandeEvent) => void) {
  const stableCallback = useCallback(onCommande, [onCommande]);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;
    const MAX_RETRIES = 10;

    const connect = () => {
      es = new EventSource("/api/stream/caisse");

      es.addEventListener("nouvelle_commande", (e) => {
        try {
          const data = JSON.parse(e.data) as CommandeEvent;
          stableCallback(data);
        } catch {
          // JSON malformé — ignorer
        }
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

      es.onopen = () => {
        retries = 0;
      };
    };

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
    };
  }, [stableCallback]);
}
