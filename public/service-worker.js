// Bumped from v11 → v12 to force every client to drop its old cache on
// activate. Needed because earlier deploys may have cached a partial
// app.bundle.js (truncated mid-file → "Unexpected end of input" on parse).
// Bumping the cache name is the only reliable way to make all installed
// clients re-fetch fresh JS.
const CACHE_NAME = "medexcel-cache-v13";

const APP_SHELL = [
  "/",
  "/index.html",
  "/homepage.html",
  "/fire.json",
  "/Loader.json",
  "/scan.json",
  "/trophy.json",
  "/Crown.json",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      )
    )
  );
  self.clients.claim();
});

// ── Helpers ─────────────────────────────────────────────────────────────────

// Only cache successful, non-opaque responses. Caching opaque responses
// (no-cors cross-origin) wastes storage and can serve broken content; caching
// 4xx/5xx responses serves errors back to users later as if they succeeded.
function shouldCacheResponse(response) {
  return response && response.ok && response.type === "basic";
}

// Wraps cache.put so a single bad response can never crash the fetch handler.
function safeCachePut(request, response) {
  caches.open(CACHE_NAME)
    .then(cache => cache.put(request, response))
    .catch(() => {});
}

// ── Fetch handler ───────────────────────────────────────────────────────────
//
// Design principle: the SW only intercepts requests it can safely cache.
// Anything else (POSTs, cross-origin API calls, third-party assets) is left
// alone — we don't even call respondWith, so the browser handles it natively.
// This eliminates the previous bug where Firestore reads, Cloud Function calls,
// and auth endpoints were being silently cached.

self.addEventListener("fetch", event => {
  const request = event.request;

  // ── Filter 1: skip non-GET requests ──────────────────────────────────────
  // cache.put rejects on POST/PUT/DELETE. The previous SW didn't filter, so
  // every Firestore write attempted to go through the cache logic and threw.
  if (request.method !== "GET") return;

  // ── Filter 2: skip cross-origin requests ─────────────────────────────────
  // CRITICAL: this blocks the previous SW's "everything else cache first"
  // from caching:
  //   • firestore.googleapis.com  (could leak one user's data to another)
  //   • identitytoolkit/securetoken (stale auth tokens)
  //   • *.cloudfunctions.net      (your API responses)
  //   • api.paystack.co           (payment data)
  //   • generativelanguage.googleapis.com (AI responses)
  // All of these now go straight to network, never touched by the SW.
  let url;
  try { url = new URL(request.url); } catch(_) { return; }
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // ── JS / CSS — always network (so deploys take effect immediately) ──────
  // Use a proper extension test instead of `.includes(".js")` which previously
  // matched URLs like `/foo.json` or `?type=js` by accident.
  if (/\.(js|mjs|css)$/i.test(path)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // ── HTML navigation — network first, cache fallback ────────────────────
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (shouldCacheResponse(res)) safeCachePut(request, res.clone());
          return res;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("/index.html")))
    );
    return;
  }

  // ── JSON (Lottie animations etc.) — stale-while-revalidate ─────────────
  if (path.endsWith(".json")) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request).then(res => {
          if (shouldCacheResponse(res)) safeCachePut(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // ── Static assets (images, fonts, icons) — cache first ─────────────────
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i.test(path)) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(res => {
          if (shouldCacheResponse(res)) safeCachePut(request, res.clone());
          return res;
        });
      })
    );
    return;
  }

  // ── Anything else — let the browser handle it ──────────────────────────
  // Don't call respondWith. Default behavior, no SW interference, no cache
  // poisoning. This is what the previous SW got wrong with its blanket
  // "cache first" rule for unrecognized URLs.
});
