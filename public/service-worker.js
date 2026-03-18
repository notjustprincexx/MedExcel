const CACHE_NAME = "medexcel-cache-v4";

// 🔥 CORE FILES + IMPORTANT JSON
const APP_SHELL = [
  "/",
  "/index.html",
  "/homepage.html",
  "/offline.html",
  
  // 🔥 IMPORTANT JSON (add your main ones here)
  "/fire.json",
  "/Loader.json",
  "/scan.json",
  "/trophy.json",
  "/crown.json",
  "/YayJump.json",
  "/WonderThings.json",
  "/Blue Working Cat Animation.json",
  "/Walkinganddrinking.json",
  "/profile.json",
  "/library.json",
  "/create.json"
];

// ==============================
// INSTALL
// ==============================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching core files + main JSON...");
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
  // A. HTML (FAST LOAD)
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
          .catch(() => caches.match("/offline.html"))
        );
      })
    );
    return;
  }
  
  // ==========================
  // B. ALL JSON (SMART STRATEGY)
  // ==========================
  if (request.url.includes(".json")) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request)
          .then(res => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(request, res.clone()); // 🔄 update cache
              return res;
            });
          })
          .catch(() => cached);
        
        // ⚡ instant response + background update
        return cached || networkFetch;
      })
    );
    return;
  }
  
  // ==========================
  // C. OTHER FILES
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