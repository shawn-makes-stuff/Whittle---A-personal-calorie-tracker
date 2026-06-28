// Minimal service worker — enables PWA install. Passthrough (no caching; the app is local).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* let the network handle it */ });
