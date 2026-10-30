/**
 * Service Worker for 日常菜谱 PWA.
 * Enables mobile/desktop OS-level system notifications (`registration.showNotification`)
 * and brings the app window to focus when a timer notification is tapped.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const payload = event.data;
  if (payload && payload.type === 'SHOW_TIMER_NOTIFICATION' && payload.title) {
    event.waitUntil(self.registration.showNotification(payload.title, payload.options || {}));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

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
          return self.clients.openWindow('./');
        }
        return undefined;
      })
  );
});

