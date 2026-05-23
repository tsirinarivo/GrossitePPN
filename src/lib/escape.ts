/**
 * Helpers de sécurisation pour la génération de contenu HTML (PDFs imprimés)
 * et de CSV (export Excel).
 *
 * À utiliser systématiquement quand on interpole de la donnée utilisateur dans
 * un template string HTML ou un fichier CSV.
 */

/**
 * Échappe les caractères HTML dangereux dans une chaîne de caractères.
 * Convertit `<`, `>`, `&`, `"`, `'`, `/` en entités HTML.
 *
 * À utiliser pour TOUTE interpolation de données utilisateur dans les templates
 * HTML des PDFs (factures, avoirs, feuilles de route, devis, etc.).
 */
export function escapeHtml(value: unknown): string {
  if (value == null) return "";
  const str = typeof value === "string" ? value : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Alias court pour les templates : `${e(client.nom)}`
 */
export const e = escapeHtml;

/**
 * Neutralise les "formules CSV" (injection Excel/LibreOffice).
 *
 * Une cellule commençant par `=`, `+`, `-`, `@`, tabulation ou retour chariot
 * est interprétée comme formule par Excel. On la préfixe d'une apostrophe pour
 * forcer son interprétation textuelle.
 *
 * À utiliser sur toutes les cellules CSV contenant des données utilisateur.
 */
export function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const str = typeof value === "string" ? value : String(value);
  // Caractères dangereux d'amorce de formule
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
