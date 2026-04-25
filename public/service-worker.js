const CACHE_NAME = "medexcel-cache-v5";

// Core files that are guaranteed to exist
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

// ==============================
// INSTALL
// ==============================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching core files...");
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ==============================
// ACTIVATE
// ==============================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ==============================
// FETCH
// ==============================
self.addEventListener("fetch", event => {
  const request = event.request;

  // ==========================
  // A. HTML — cache-first with network fallback
  // ==========================
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then(cached => {
        return (
          cached ||
          fetch(request)
            .then(res => {
              return caches.open(CACHE_NAME).then(cache => {
                cache.put(request, res.clone());
                return res;
              });
            })
            .catch(() => caches.match("/index.html"))
        );
      })
    );
    return;
  }

  // ==========================
  // B. JSON — stale-while-revalidate
  // ==========================
  if (request.url.includes(".json")) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request)
          .then(res => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(request, res.clone());
              return res;
            });
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  // ==========================
  // C. JS / CSS — stale-while-revalidate
  // Always serve from cache immediately for speed, but ALSO fetch from
  // network in the background and update the cache. This means deployed
  // updates reach users on the NEXT load rather than never.
  // ==========================
  if (request.url.includes(".js") || request.url.includes(".css")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cached => {
          const networkFetch = fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => cached);

          // Serve cached immediately, refresh in background
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // ==========================
  // D. ALL OTHER FILES — cache-first
  // ==========================
  event.respondWith(
    caches.match(request).then(cached => {
      return (
        cached ||
        fetch(request).then(res => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, res.clone());
            return res;
          });
        })
      );
    })
  );
});
