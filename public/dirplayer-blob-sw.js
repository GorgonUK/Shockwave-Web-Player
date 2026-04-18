/**
 * Serves locally uploaded .dcr bytes at synthetic same-origin URLs so the
 * DirPlayer WASM can parse a normal http(s) base (blob: URLs panic in get_base_url).
 *
 * The page populates the Cache API; this worker only intercepts /__dirplayer-blob/*.
 */
const CACHE_NAME = 'dirplayer-blob-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/__dirplayer-blob/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request, { ignoreSearch: false }).then((hit) => {
        if (hit) return hit;
        return new Response('DirPlayer blob not in cache (reload and try again)', {
          status: 404,
          statusText: 'Not Found',
        });
      }),
    ),
  );
});
