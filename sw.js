/* Double D Grocery service worker */
const CACHE = 'ddg-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Live data (data.json / insights.json / coles_prices.json on raw.githubusercontent): network-first, fall back to cache.
  const isData = /raw\.githubusercontent\.com/.test(url.href) || /\.json(\?|$)/.test(url.href);
  if (isData) {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
                .catch(() => caches.match(req))
    );
    return;
  }
  // App shell & assets: cache-first, update in background.
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; }).catch(() => cached);
      return cached || net;
    })
  );
});
