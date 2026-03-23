// Melegy PWA Service Worker — Network-First strategy
// API calls always go to network; only static assets are cached
const CACHE_NAME = 'melegy-static-v2';

const STATIC_ASSETS = [
  '/',
  '/images/logo.jpg',
];

// Routes that must NEVER be served from cache
const NETWORK_ONLY_PATTERNS = [
  /^\/api\//,
  /^\/auth\//,
];

// ── Install: pre-cache static shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently ignore if any asset fails — don't block install
      })
    )
  );
});

// ── Activate: clean up old caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// ── Fetch: Network-First with static fallback ──────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // API / auth routes: always network, never cache
  const isNetworkOnly = NETWORK_ONLY_PATTERNS.some((pattern) =>
    pattern.test(url.pathname)
  );
  if (isNetworkOnly) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation requests: Network-First, fallback to cached '/'
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  // Static assets: Cache-First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache only successful GET responses for static assets
        if (
          request.method === 'GET' &&
          response.status === 200 &&
          (request.url.includes('/icons/') ||
            request.url.includes('/images/') ||
            request.url.includes('/fonts/'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
