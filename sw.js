const CACHE_NAME = 'word-mode-v4';

self.addEventListener('install', event => {
  console.log('Service Worker yüklendi');
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/kelime_oyunu/')
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
      vibrate: [200, 100, 200],
      tag: event.data.tag || 'daily-reminder'
    });
  }
});
