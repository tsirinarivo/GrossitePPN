import { db } from "@/lib/db";
import { sql, type SQL } from "drizzle-orm";

/** Vrai si l'erreur est une violation de contrainte d'unicité Postgres (23505). */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

/**
 * Calcule le prochain numéro séquentiel `PREFIX0001` pour une table/colonne.
 * À combiner avec `retryOnUniqueViolation` : deux créations concurrentes peuvent
 * calculer le même numéro (course sur max+1), le retry régénère alors le numéro.
 */
export async function computeNextNumero(table: SQL, column: SQL, prefix: string): Promise<string> {
  const rows = await db.execute<{ maxn: string | null }>(
    sql`select max(${column}) as maxn from ${table} where ${column} like ${prefix + "%"}`
  );
  const maxn = rows[0]?.maxn ?? null;
  let next = 1;
  if (maxn) {
    const last = parseInt(maxn.split("-").pop() ?? "", 10);
    if (!isNaN(last)) next = last + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/**
 * Exécute `fn(numero)` en régénérant le numéro à chaque collision d'unicité.
 * Sérialise proprement la numérotation séquentielle sans verrou global.
 */
export async function retryOnUniqueViolation<T>(
  genNumero: () => Promise<string>,
  fn: (numero: string) => Promise<T>,
  retries = 6
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    const numero = await genNumero();
    try {
      return await fn(numero);
    } catch (e) {
      if (isUniqueViolation(e)) { lastErr = e; continue; }
      throw e;
    }
  }
  throw lastErr;
}
