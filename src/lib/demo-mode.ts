/**
 * Helper centralisé pour les fallbacks démo.
 *
 * En production, on désactive les données démo pour ne pas masquer les vraies erreurs
 * et éviter d'induire les utilisateurs en erreur.
 *
 * Override via env :
 *  - `DEMO_FALLBACK=on`  → force l'activation même en prod
 *  - `DEMO_FALLBACK=off` → force la désactivation même en dev
 */
export function isDemoFallbackEnabled(): boolean {
  const override = process.env.DEMO_FALLBACK?.toLowerCase();
  if (override === "on") return true;
  if (override === "off") return false;
  return process.env.NODE_ENV !== "production";
}

/**
 * Renvoie le payload démo si activé, sinon le payload vide (production-safe).
 */
export function withDemoFallback<T, E>(realData: T, demoData: T, emptyData: E): T | E {
  if (Array.isArray(realData) && realData.length === 0) {
    return isDemoFallbackEnabled() ? demoData : emptyData;
  }
  if (typeof realData === "object" && realData !== null && "length" in (realData as object)) {
    return isDemoFallbackEnabled() ? demoData : emptyData;
  }
  return realData;
}
