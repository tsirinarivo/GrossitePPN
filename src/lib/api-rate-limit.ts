// Rate limiting simple en mémoire (en prod : Redis)
type Bucket = { count: number; resetAt: number };
const BUCKETS = new Map<string, Bucket>();

const LIMIT = 60; // requêtes
const WINDOW_MS = 60_000; // par minute

export function checkRateLimit(key: string): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = BUCKETS.get(key);
  if (!bucket || bucket.resetAt < now) {
    const nb = { count: 1, resetAt: now + WINDOW_MS };
    BUCKETS.set(key, nb);
    return { ok: true, remaining: LIMIT - 1, resetAt: nb.resetAt };
  }
  bucket.count++;
  if (bucket.count > LIMIT) return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  return { ok: true, remaining: LIMIT - bucket.count, resetAt: bucket.resetAt };
}

// Clés API valides — en prod : DB
const VALID_KEYS = new Set([
  "demo-public-key-12345",
  process.env.PUBLIC_API_KEY ?? "",
].filter(Boolean));

export function isValidApiKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return VALID_KEYS.has(key);
}
