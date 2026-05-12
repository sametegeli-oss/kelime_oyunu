const CACHE_NAME = 'word-mode-v7';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;
  self.registration.showNotification(event.data.title || '📚 Word Mode', {
    body: event.data.body || 'Kelime çalışma zamanı!',
    icon: '/kelime_oyunu/icon-192.png',
    badge: '/kelime_oyunu/icon-192.png',
    vibrate: [200, 100, 200],
    tag: event.data.tag || 'word-mode',
    renotify: true
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/kelime_oyunu/');
    })
  );
});
