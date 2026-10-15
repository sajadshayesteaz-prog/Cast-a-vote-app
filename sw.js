/* Cast a Vote — service worker
   یک رأی بینداز — سرویس‌ورکر

   Bump CACHE on every release. Two things depend on it: a byte-different sw.js
   is what makes the browser install a new worker at all, and a new cache name
   is what drops the previous version's files.

   This worker precaches only what is certain to be there. The manifests, the
   icons and anything a later version adds are kept on the way past the first
   time they are fetched — which happens on the first online open anyway — so a
   renamed or added asset can never leave the install half-written. */

var CACHE = "cast-a-vote-v16";
var CORE  = ["./", "./index.html"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(CORE); })
      .catch(function () { /* a failed precache must not block the install */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? Promise.resolve() : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function keep(req, res) {
  /* opaque and error responses are not worth storing, and a partial 206 would
     be served back as if it were the whole file */
  if (!res || res.status !== 200 || res.type !== "basic") return res;
  var copy = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
  return res;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  var wantsHTML = req.mode === "navigate" ||
                  (req.headers.get("accept") || "").indexOf("text/html") > -1;

  /* The page itself is network-first, so a new index.html is picked up the
     next time the app opens online instead of waiting for the cache to turn
     over. Offline, the stored copy answers. */
  if (wantsHTML) {
    e.respondWith(
      fetch(req)
        .then(function (res) { return keep(req, res); })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            if (hit) return hit;
            return caches.match("./index.html").then(function (h2) {
              return h2 || caches.match("./");
            });
          });
        })
    );
    return;
  }

  /* Everything else is cache-first: fonts and icons never change under a
     given CACHE name, and when they do, the name changes with them. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) { return keep(req, res); });
    })
  );
});
