// Web Push service worker. Kept as a plain file (not compiled by Next/TS) —
// browsers fetch it directly from /sw.js, so it can't depend on app modules.

// Must match REMINDER_TAG in src/lib/notifications.ts. The app raises its own
// `Notification` for a due batch while a tab is open; sharing the tag lets the
// OS collapse that and a server push into one instead of pinging twice.
const REMINDER_TAG = 'memorize-due-reminder';

self.addEventListener('install', () => {
  // Nothing is cached here, so there is no warm-up to protect — take over as
  // soon as a new sw.js is fetched rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Đến giờ ôn tập rồi! 📚';
  const options = {
    body: data.body || '',
    tag: data.tag || REMINDER_TAG,
    renotify: true,
    // Lives on `main` with the PWA manifest, not yet on this PR's base branch —
    // a 404 here just falls back to the browser's default icon.
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        return existing.focus().then((focused) => {
          const target = focused || existing;
          // `navigate` rejects on a window this worker does not control (a tab
          // loaded before the first activation) — focusing it is enough there.
          if ('navigate' in target) return target.navigate(targetUrl).catch(() => undefined);
          return undefined;
        });
      }

      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
