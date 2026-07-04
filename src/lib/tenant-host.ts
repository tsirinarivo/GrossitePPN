/**
 * Résolution de l'hôte (multi-tenant par sous-domaine + console master isolée).
 *
 *   grossiste.dago-it.com            → apex : landing marketing (aucun login)
 *   www.grossiste.dago-it.com        → apex
 *   master.grossiste.dago-it.com     → console plateforme (gestion des tenants)
 *   angelos.grossiste.dago-it.com    → tenant slug "angelos"
 *
 * Domaine racine configurable via NEXT_PUBLIC_ROOT_DOMAIN.
 * Sous-domaine master via NEXT_PUBLIC_MASTER_SUBDOMAIN (défaut "master").
 * Slug de repli pour l'apex via NEXT_PUBLIC_DEFAULT_TENANT_SLUG (défaut "demo").
 */

export const ROOT_DOMAIN = (
  process.env["NEXT_PUBLIC_ROOT_DOMAIN"] ?? "grossiste.dago-it.com"
).toLowerCase();

export const MASTER_SUBDOMAIN = (
  process.env["NEXT_PUBLIC_MASTER_SUBDOMAIN"] ?? "master"
).toLowerCase();

export const DEFAULT_TENANT_SLUG = (
  process.env["NEXT_PUBLIC_DEFAULT_TENANT_SLUG"] ?? "demo"
).toLowerCase();

export type HostKind = "apex" | "master" | "tenant";

/** Enlève le port et normalise. */
function hostname(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Renvoie le premier label de sous-domaine, ou `null` pour l'apex, `www`,
 * localhost, une IP, ou un host hors du domaine racine.
 */
function firstLabel(host: string | null | undefined): string | null {
  const h = hostname(host);
  if (!h) return null;

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

  return null; // host inconnu (preview, custom domain)
}

/** Classe un host en apex / master / tenant. */
export function parseHost(host: string | null | undefined): { kind: HostKind; slug: string | null } {
  const label = firstLabel(host);
  if (!label) return { kind: "apex", slug: null };
  if (label === MASTER_SUBDOMAIN) return { kind: "master", slug: null };
  return { kind: "tenant", slug: label };
}

/** Slug tenant d'un host (null pour apex, www ET master). */
export function parseTenantSlug(host: string | null | undefined): string | null {
  const { kind, slug } = parseHost(host);
  return kind === "tenant" ? slug : null;
}

/** Vrai si le host est la console master. */
export function isMasterHost(host: string | null | undefined): boolean {
  return parseHost(host).kind === "master";
}

/** Construit l'URL absolue de l'espace d'un tenant. */
export function tenantUrl(slug: string, protocol = "https"): string {
  return `${protocol}://${slug}.${ROOT_DOMAIN}`;
}
