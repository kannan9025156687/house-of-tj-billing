/* House of TJ Billing service worker. Raise VERSION whenever the app files change. */
const VERSION = 'tj-billing-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('tj-billing-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Pages: try the network first so updates arrive, fall back to the saved copy when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html').then(m => m || caches.match('./'))));
    return;
  }
  // Own files: saved copy first.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    })));
    return;
  }
  // Google Fonts: keep a copy for offline use.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(m => {
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => m);
      return m || net;
    })));
  }
});
