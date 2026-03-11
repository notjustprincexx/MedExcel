const CACHE_NAME = "medexcel-shell-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html"
];

self.addEventListener("install", event => {
  
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => cache.addAll(APP_SHELL))
  );
  
});

self.addEventListener("fetch", event => {
  
  if (event.request.mode === "navigate") {
    
    event.respondWith(
      
      caches.match("/index.html")
      .then(response => {
        
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            
            return networkResponse;
            
          });
        
        return response || fetchPromise;
        
      }).catch(() => caches.match("/offline.html"))
      
    );
    
  }
  
});