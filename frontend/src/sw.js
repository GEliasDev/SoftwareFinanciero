import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses (production URL)
registerRoute(
  ({ url }) => url.href.match(/^https:\/\/debti-api\.onrender\.com\/api\//i),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let pushData;
  try { pushData = event.data.json(); } catch { pushData = { title: 'Debti', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(pushData.title || 'Debti', {
      body: pushData.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: pushData.url || '/' },
    })
  );
});

// Notification click: focus existing window or open new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const found = list.find(c => c.url.includes(url));
      if (found) return found.focus();
      return self.clients.openWindow(url);
    })
  );
});
