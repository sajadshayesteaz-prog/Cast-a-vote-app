/* Offline shell for Cast a Vote.
   The whole app is one HTML file plus its icons, so the cache is small and a
   version bump simply replaces it. Bump CACHE whenever index.html changes. */
var CACHE = "cast-a-vote-v11";
var ASSETS = [
  "./", "./index.html",
  "./manifest.en-modern.webmanifest", "./manifest.en-persian.webmanifest",
  "./manifest.fa-modern.webmanifest", "./manifest.fa-persian.webmanifest",
  "./icon-modern-192.png", "./icon-modern-512.png", "./icon-modern-maskable-512.png",
  "./apple-touch-icon-modern.png", "./favicon-modern-32.png",
  "./icon-persian-192.png", "./icon-persian-512.png", "./icon-persian-maskable-512.png",
  "./apple-touch-icon-persian.png", "./favicon-persian-32.png"
];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    /* one bad asset must not fail the whole install */
    return Promise.all(ASSETS.map(function(u){ return c.add(u).catch(function(){}); }));
  }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  if(new URL(req.url).origin !== self.location.origin) return;

  /* Opening the app always resolves to the shell, so it starts with no network.
     Network first while there is one, so a redeploy is picked up. */
  if(req.mode === "navigate"){
    e.respondWith(fetch(req).then(function(r){
      var copy = r.clone();
      caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
      return r;
    }).catch(function(){
      return caches.match("./index.html").then(function(m){ return m || caches.match("./"); });
    }));
    return;
  }

  e.respondWith(caches.match(req).then(function(m){
    return m || fetch(req).then(function(r){
      if(r && r.ok){
        var copy = r.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return r;
    });
  }));
});
