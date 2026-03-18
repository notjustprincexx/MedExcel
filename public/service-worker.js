// Change to v2 so the browser knows to update the cache!
const CACHE_NAME = "medexcel-cache-v2";

const urlsToCache = [
  "/",
  "/index.html",
  "/homepagemain.html", // Ensure the homepage is cached
  "/offline.html",
  "/fire.json" // <--- THE MAGIC INGREDIENT
];

// 1. Install Event (Downloads the files)
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Opened cache and saving files");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // Forces the new service worker to activate immediately
});

// 2. Activate Event (Cleans up old caches if you change the v2 to v3 later)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch Event (Intercepts requests)
self.addEventListener("fetch", event => {
  
  // A. Handle HTML Page Navigations (Your original offline logic)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline.html");
      })
    );
    return; // Stop here for HTML pages so it doesn't run the code below
  }
  
  // B. Handle Assets like fire.json, images, and scripts
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // If the file (like fire.json) is found in the cache, serve it instantly!
      if (cachedResponse) {
        return cachedResponse;
      }
      // If it's not in the cache, go get it from the internet normally
      return fetch(event.request);
    })
  );
  
});