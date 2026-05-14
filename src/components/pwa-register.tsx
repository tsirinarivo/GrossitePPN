"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Écoute les mises à jour du SW (nouveau déploiement)
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Un nouveau SW est prêt — proposer de rafraîchir
              toast.info("Mise à jour disponible", {
                description: "Une nouvelle version de l'app est prête.",
                duration: Infinity,
                action: {
                  label: "Actualiser",
                  onClick: () => window.location.reload(),
                },
              });
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] Enregistrement échoué :", err);
      });

    // Rechargement automatique quand le nouveau SW prend le contrôle
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  return null;
}
