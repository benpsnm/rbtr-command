// ═══════════════════════════════════════════════════════════════════════════
// Rocko Mobile Service Worker
// Caches PWA shell for offline access
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'rocko-mobile-v1';
const urlsToCache = [
  '/m/jarvis.html',
  '/m/manifest.json',
  '/m/icon-192.png',
  '/m/icon-512.png',
];

// Install event - cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  // API requests: always network (don't cache dynamic data)
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Cache hit
        }

        // Clone request for fetch
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Don't cache if not OK or not basic response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response for cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Network failed, try cache anyway
          return caches.match(event.request);
        });
      })
  );
});
