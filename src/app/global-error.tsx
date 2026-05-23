"use client";

import { useEffect } from "react";

/**
 * Boundary global — capture toute erreur runtime non gérée côté React.
 * Envoie l'erreur à /api/log/client-error pour ingestion serveur.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort: ping le serveur
    try {
      fetch("/api/log/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#0a0a0f",
          color: "#e5e5e5",
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 500, textAlign: "center" }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              background: "linear-gradient(135deg, #FF4D00 0%, #FFB800 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Oups
          </div>
          <h1 style={{ fontSize: 22, margin: "12px 0 8px" }}>Une erreur est survenue</h1>
          <p style={{ color: "#888", margin: "0 0 24px", fontSize: 14 }}>
            L&apos;équipe technique a été notifiée. Vous pouvez réessayer ou rafraîchir la page.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 11, color: "#666", marginBottom: 16 }}>
              Référence : {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                background: "#FF4D00",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{
                padding: "10px 20px",
                background: "transparent",
                color: "#e5e5e5",
                border: "1px solid #2E2E3E",
                borderRadius: 8,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Retour à l&apos;accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
