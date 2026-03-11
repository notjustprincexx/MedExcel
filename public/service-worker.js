const CACHE_NAME = "medexcel-cache-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/offline.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  
  if (event.request.mode === "navigate") {
    
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline.html");
      })
    );
    
  }
  
});