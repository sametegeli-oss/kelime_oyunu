const CACHE_NAME = 'word-mode-v3';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.groq.com') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('gutenberg.org')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return response;
    }))
  );
});

// Uygulama içinden mesaj alınca bildirim göster
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    e.waitUntil(
      self.registration.showNotification(e.data.title || '📚 Word Mode', {
        body: e.data.body || 'Kelime çalışma zamanı!',
        icon: e.data.icon || './icon-192.png',
        badge: './icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'word-mode-reminder',
        renotify: true
      })
    );
  }
});

// Push notifications (backend'den)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: '📚 Word Mode', body: 'Bugün kelime çalışma zamanı!' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./'));
});
