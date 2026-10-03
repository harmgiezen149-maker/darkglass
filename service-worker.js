// Service Worker voor Darkglass Anagram PWA.
// Strategie: netwerk eerst (altijd de nieuwste versie na een deploy), cache
// alleen als reserve wanneer je offline bent.
var CACHE_NAAM = 'anagram-v6';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/auth-ui.js',
  '/shared/catalogus.js',
  '/shared/validatie.js',
  '/shared/preset-render.js',
  '/shared/legacy.js',
  '/js/i18n.js',
  '/js/util.js',
  '/js/bibliotheek.js',
  '/js/extra.js',
  '/js/app.js',
  '/manifest.json',
  '/icon-192.png'
];

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

self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // API en externe bestanden nooit via de cache
  if (url.origin !== self.location.origin || url.pathname.indexOf('/api/') === 0 || url.pathname.indexOf('/_vercel/') === 0) return;

  event.respondWith(
    fetch(req).then(function(resp) {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        var kopie = resp.clone();
        caches.open(CACHE_NAAM).then(function(cache) { cache.put(req, kopie); });
      }
      return resp;
    }).catch(function() {
      return caches.match(req).then(function(c) { return c || caches.match('/index.html'); });
    })
  );
});
