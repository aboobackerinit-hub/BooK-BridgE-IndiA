/* BookBridge Unified Production Service Worker (PWA Caching & Firebase FCM Background Messaging) */

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// 1. Initialize Firebase inside Service Worker for Background Messaging
try {
  firebase.initializeApp({
    apiKey: "AIzaSyC1_gTlEJ_PMmd4GHdbforK7l3R9IcOQ9I",
    projectId: "book-bridge-india-hopwhi",
    messagingSenderId: "725916822917",
    appId: "1:725916822917:web:bookbridge"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || "New Message — BookBridge";
    const options = {
      body: payload.notification?.body || payload.data?.body || "You received a new message.",
      icon: "/pwa-192x192.png",
      badge: "/favicon.png",
      data: payload.data || { action_url: "/chat" },
      tag: payload.data?.action_url || "chat-notification",
      renotify: true
    };

    self.registration.showNotification(title, options);
  });
} catch (e) {
  console.warn("FCM background initialization warning in SW:", e.message);
}

// 2. PWA App-Shell Caching Logic
const CACHE_NAME = 'bookbridge-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/favicon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // self.skipWaiting(); -- disabled to prevent dev reload loops
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  // self.clients.claim(); -- disabled to prevent dev reload loops
});

self.addEventListener('fetch', (event) => {
  // CRITICAL SECURITY RULE: Never cache non-GET requests or backend API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  const isStaticAsset = event.request.destination === 'script' || 
                        event.request.destination === 'style' || 
                        event.request.destination === 'image' ||
                        event.request.destination === 'font' ||
                        event.request.url.includes('/static/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        });
      })
    );
  } else {
    // Network-First strategy for documents / navigation with offline fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.destination === 'document' || event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
        })
    );
  }
});

// 3. Push Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.action_url || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: actionUrl });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});
