self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));
self.addEventListener('push', e => {
  if (e.data) {
    const d = e.data.json();
    e.waitUntil(self.registration.showNotification(d.notification.title, d.notification));
  }
});
