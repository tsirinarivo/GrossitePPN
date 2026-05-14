// GrossistePPN Service Worker — v2
// Stratégie: cache-first assets statiques, network-first pages HTML

const CACHE_VERSION = "2025-05-14";
const SHELL_CACHE = `ppn-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `ppn-static-${CACHE_VERSION}`;
const ALL_CACHES = [SHELL_CACHE, STATIC_CACHE];

// Pages précachées à l'installation (coquille de l'app)
const SHELL_URLS = [
  "/login",
  "/pos/agent",
  "/pos/caisse",
  "/manifest.json",
];

// ── Install : précache la coquille ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // allSettled : si une URL redirige (auth), ça ne bloque pas l'install
      Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// ── Activate : supprime les vieux caches ────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : routing des stratégies ──────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et cross-origin
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // SSE streams : ne pas intercepter
  if (url.pathname.startsWith("/api/stream/")) return;

  // API : network-only (jamais cacher des données dynamiques)
  if (url.pathname.startsWith("/api/")) return;

  // Assets Next.js (JS, CSS hashés) : cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Fichiers statiques (fonts, images, icons) : cache-first
  if (/\.(woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp|avif)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Pages HTML : network-first (5s timeout) avec fallback cache
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

// ── Stratégie cache-first ───────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok || response.status === 0) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Ressource non disponible", { status: 503 });
  }
}

// ── Stratégie network-first avec timeout ────────────────────────────────────
async function networkFirst(request, cacheName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timeoutId);

    // Fallback : chercher dans le cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback ultime : page offline
    return new Response(offlinePage(), {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

// ── Page offline de secours ─────────────────────────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connexion interrompue — GrossistePPN</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0e0f1a;color:#e2e8f0;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem}
    .card{text-align:center;max-width:360px;width:100%;padding:2rem;
          background:#161b22;border:1px solid #30363d;border-radius:1rem}
    .icon{font-size:3rem;margin-bottom:1rem}
    h1{font-size:1.25rem;font-weight:700;margin-bottom:.5rem}
    p{color:#8b949e;font-size:.9rem;line-height:1.5;margin-bottom:1.5rem}
    button{background:#d97706;color:#fff;border:none;padding:.75rem 1.5rem;
           border-radius:.5rem;font-size:1rem;cursor:pointer;width:100%;font-weight:600}
    button:active{opacity:.85}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Connexion interrompue</h1>
    <p>Vérifiez votre connexion internet ou WiFi, puis réessayez.</p>
    <button onclick="window.location.reload()">Réessayer</button>
  </div>
</body>
</html>`;
}
