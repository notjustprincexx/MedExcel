const CACHE_NAME = "medexcel-cache-v10";

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

self.addEventListener("fetch", event => {
  const request = event.request;

  // JS and CSS — always fetch from network, never cache
  // This ensures deployments take effect immediately
  if (request.url.includes(".js") || request.url.includes(".css")) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML navigation — network first, cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(res => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, res.clone());
            return res;
          });
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("/index.html")))
    );
    return;
  }

  // JSON — stale-while-revalidate
  if (request.url.includes(".json")) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request).then(res => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, res.clone());
            return res;
          });
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Everything else — cache first
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, res.clone());
          return res;
        });
      });
    })
  );
});
