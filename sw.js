const CACHE_NAME = 'word-mode-v4';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/kelime_oyunu/', '/kelime_oyunu/index.html'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request))
  );
});

// Uygulama'dan mesaj al
let reminderHour = 9;
let reminderMinute = 0;
let reminderMsg = '📚 Bugün kelime çalışma zamanı!';

self.addEventListener('message', e => {
  if(!e.data) return;

  if(e.data.type === 'SHOW_NOTIFICATION'){
    e.waitUntil(
      self.registration.showNotification(e.data.title || '📚 Word Mode', {
        body: e.data.body || reminderMsg,
        icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
        tag: 'word-mode-reminder',
        vibrate: [200, 100, 200],
        renotify: true
      })
    );
  }

  if(e.data.type === 'SET_REMINDER'){
    reminderHour = e.data.hour;
    reminderMinute = e.data.minute;
    reminderMsg = e.data.msg || reminderMsg;
  }
});

// Periodic Background Sync — sayfa kapalıyken
self.addEventListener('periodicsync', event => {
  if(event.tag === 'daily-reminder'){
    event.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify(){
  const now = new Date();
  // Son bildirim bugün gönderildiyse tekrar gönderme
  const cache = await caches.open(CACHE_NAME);
  const lastFiredResp = await cache.match('reminder-last-fired');
  const lastFired = lastFiredResp ? await lastFiredResp.text() : '';
  const today = now.toDateString();
  if(lastFired === today) return;

  await cache.put('reminder-last-fired', new Response(today));
  await self.registration.showNotification('📚 Kelime Çalışma Zamanı!', {
    body: reminderMsg,
    icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
    tag: 'daily-reminder',
    vibrate: [200, 100, 200],
    actions: [{ action: 'open', title: 'Uygulamayı Aç' }]
  });
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if(list.length > 0) return list[0].focus();
      return clients.openWindow('/kelime_oyunu/');
    })
  );
});
