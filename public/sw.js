/**
 * Service Worker for 日常菜谱 PWA.
 * Handles:
 * 1. Remote Web Push wake-ups (`push` event from Apple APNs / FCM / QStash) even when the phone screen is locked.
 * 2. Local foreground/active system notifications (`registration.showNotification`).
 * 3. Focusing or opening the app window when a timer notification is tapped.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '⏰ 辅助计时已到时';
  const options = {
    body: data.body || '日常菜谱烹饪计时已结束，请及时查看火候！',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/favicon.png',
    tag: data.tag || `recipe-push-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || './',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('message', (event) => {
  const payload = event.data;
  if (payload && payload.type === 'SHOW_TIMER_NOTIFICATION' && payload.title) {
    event.waitUntil(self.registration.showNotification(payload.title, payload.options || {}));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
