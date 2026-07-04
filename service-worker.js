// Service Worker voor Darkglass Anagram PWA
var CACHE_NAAM = 'anagram-v1';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Installeer: cache statische bestanden
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAAM).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(e) {
        console.warn('Cache add failed:', e);
      });
    })
  );
  self.skipWaiting();
});

// Activeer: oude caches opruimen
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(namen) {
      return Promise.all(namen.map(function(naam) {
        if (naam !== CACHE_NAAM) return caches.delete(naam);
      }));
    })
  );
  self.clients.claim();
});

// Fetch: statische assets uit cache, API calls altijd via netwerk
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // API calls nooit cachen — altijd live
  if (url.indexOf('/api/') !== -1) {
    return;
  }

  // Alleen GET requests cachen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // Update op de achtergrond
        fetch(event.request).then(function(resp) {
          if (resp && resp.status === 200) {
            caches.open(CACHE_NAAM).then(function(cache) {
              cache.put(event.request, resp);
            });
          }
        }).catch(function() {});
        return cached;
      }
      return fetch(event.request).then(function(resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var respClone = resp.clone();
          caches.open(CACHE_NAAM).then(function(cache) {
            cache.put(event.request, respClone);
          });
        }
        return resp;
      });
    })
  );
});
