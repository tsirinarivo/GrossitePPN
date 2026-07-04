/**
 * Résolution du tenant à partir du nom d'hôte (multi-tenant par sous-domaine).
 *
 *   grossiste.dago-it.com            → landing marketing (pas de tenant)
 *   www.grossiste.dago-it.com        → landing marketing (pas de tenant)
 *   angelos.grossiste.dago-it.com    → tenant slug "angelos"
 *
 * Le domaine racine est configurable via NEXT_PUBLIC_ROOT_DOMAIN.
 */

export const ROOT_DOMAIN = (
  process.env["NEXT_PUBLIC_ROOT_DOMAIN"] ?? "grossiste.dago-it.com"
).toLowerCase();

/** Enlève le port et normalise. */
function hostname(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Extrait le slug tenant d'un host. Renvoie `null` pour l'apex, `www`,
 * localhost, une IP, ou un host hors du domaine racine.
 */
export function parseTenantSlug(host: string | null | undefined): string | null {
  const h = hostname(host);
  if (!h) return null;

  // localhost / IP → pas de tenant (mais on gère angelos.localhost en dev)
  if (h === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return null;
  if (h.endsWith(".localhost")) {
    const label = h.slice(0, -".localhost".length).split(".")[0];
    return label && label !== "www" ? label : null;
  }

  if (h === ROOT_DOMAIN || h === `www.${ROOT_DOMAIN}`) return null;

  if (h.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = h.slice(0, -(ROOT_DOMAIN.length + 1));
    const label = sub.split(".")[0]; // premier label uniquement
    return label && label !== "www" ? label : null;
  }

  // Host inconnu (preview, custom domain non géré) → pas de tenant
  return null;
}

/** Construit l'URL absolue de l'espace d'un tenant. */
export function tenantUrl(slug: string, protocol = "https"): string {
  return `${protocol}://${slug}.${ROOT_DOMAIN}`;
}
