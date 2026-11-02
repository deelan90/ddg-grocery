/* Double D Grocery service worker */
const CACHE = 'ddg-v2';
const NOTIF_CACHE = 'ddg-notif'; // reminder state — must survive cache clean-up below
const SHELL = ['./', './index.html', './notify-core.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
importScripts('notify-core.js');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== NOTIF_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* ---------- reminders ---------- */
// Runs in the background where the browser allows it (installed app on Android Chrome).
self.addEventListener('periodicsync', e => {
  if (e.tag === 'ddg-reminder-check') e.waitUntil(checkReminder());
});

async function checkReminder() {
  const base = self.registration.scope;
  const st = await ddgNotifStore.read(base);
  const r = ddgReminder(st.plan, st.sent);
  if (!r) return;
  await ddgNotifStore.write(base, { sent: r.key });
  await self.registration.showNotification(r.title, {
    body: r.body, tag: r.tag, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: r.url }
  });
}

// Tapping the notification opens the shopping list.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './?view=list';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ('focus' in c) { c.postMessage({ type: 'ddg-go', view: 'list' }); return c.focus(); }
    }
    return clients.openWindow(url);
  }));
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
