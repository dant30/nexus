/**
 * Nexus Trading Bot Service Worker
 * Handles offline caching, background sync, and push notifications
 */

const CACHE_NAME = 'nexus-trading-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

const RUNTIME_CACHE = 'nexus-runtime';
const API_CACHE = 'nexus-api-v1';
const IMAGE_CACHE = 'nexus-images-v1';

// Cache strategies
const CACHE_FIRST = 'cache-first';
const NETWORK_FIRST = 'network-first';
const STALE_WHILE_REVALIDATE = 'stale-while-revalidate';

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('Cache addAll error:', err);
        // Fail gracefully if some assets don't exist yet
      });
    })
  );
  self.skipWaiting();
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name !== CACHE_NAME &&
              name !== RUNTIME_CACHE &&
              name !== API_CACHE &&
              name !== IMAGE_CACHE
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch Event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other non-http(s) protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network First with timeout
  if (url.pathname.startsWith('/api/') || url.hostname.includes('api.')) {
    event.respondWith(
      networkFirstStrategy(request, API_CACHE, 5000)
    );
    return;
  }

  // Image requests - Cache First
  if (request.destination === 'image') {
    event.respondWith(
      cacheFirstStrategy(request, IMAGE_CACHE)
    );
    return;
  }

  // Font requests - Stale While Revalidate
  if (url.pathname.includes('/fonts/') || request.destination === 'font') {
    event.respondWith(
      staleWhileRevalidateStrategy(request, CACHE_NAME)
    );
    return;
  }

  // HTML requests - Network First
  if (request.destination === 'document') {
    event.respondWith(
      networkFirstStrategy(request, RUNTIME_CACHE, 3000)
    );
    return;
  }

  // Default - Stale While Revalidate
  event.respondWith(
    staleWhileRevalidateStrategy(request, RUNTIME_CACHE)
  );
});

/**
 * Network First Strategy - Try network, fall back to cache
 */
async function networkFirstStrategy(request, cacheName, timeout = 5000) {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, timeout);
  });

  try {
    const networkPromise = fetch(request).then((response) => {
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }
      // Clone the response
      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseToCache);
      });
      return response;
    });

    const response = await Promise.race([networkPromise, timeoutPromise]);

    if (response) {
      return response;
    }

    // Network timeout, try cache
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse();
  } catch (error) {
    console.log('[SW] Network error, using cache:', error);
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse();
  }
}

/**
 * Cache First Strategy - Try cache, fall back to network
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (!networkResponse || networkResponse.status !== 200) {
      return networkResponse;
    }

    const responseToCache = networkResponse.clone();
    caches.open(cacheName).then((cache) => {
      cache.put(request, responseToCache);
    });

    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first error:', error);
    return createOfflineResponse();
  }
}

/**
 * Stale While Revalidate - Return cached, update in background
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (!response || response.status !== 200 || response.type === 'error') {
      return response;
    }

    const responseToCache = response.clone();
    caches.open(cacheName).then((cache) => {
      cache.put(request, responseToCache);
    });

    return response;
  });

  return cachedResponse || fetchPromise;
}

/**
 * Create offline response
 */
function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'You are offline',
      message: 'Please check your internet connection',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );
}

/**
 * Handle Push Notifications
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push notification with no data');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New trading signal',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-144.png',
      tag: data.tag || 'nexus-trading',
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
        tradeId: data.tradeId,
        symbol: data.symbol,
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Nexus Trading', options)
    );
  } catch (error) {
    console.log('[SW] Push notification parse error:', error);
  }
});

/**
 * Handle Notification Click
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Background Sync for failed API requests
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncFailedTrades());
  }
});

async function syncFailedTrades() {
  try {
    const cache = await caches.open(API_CACHE);
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request.clone());
        if (response.ok) {
          // Remove from failed cache after successful retry
          await cache.delete(request);
        }
      } catch (error) {
        console.log('[SW] Sync retry failed:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync error:', error);
  }
}

/**
 * Periodic background sync
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-signals') {
    event.waitUntil(updateTradingSignals());
  }
});

async function updateTradingSignals() {
  try {
    const response = await fetch('/api/v1/signals/latest');
    if (response.ok) {
      // Notify all clients of new signals
      const data = await response.json();
      const clients = await self.clients.matchAll();

      clients.forEach((client) => {
        client.postMessage({
          type: 'SIGNALS_UPDATE',
          data: data,
        });
      });
    }
  } catch (error) {
    console.log('[SW] Signal update error:', error);
  }
}

/**
 * Message Handler - Communicate with clients
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'CLEAR_CACHE':
      handleClearCache(payload);
      break;
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'LOG':
      console.log('[SW Message]', payload);
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

async function handleClearCache(cacheName) {
  try {
    if (cacheName) {
      await caches.delete(cacheName);
    } else {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    console.log('[SW] Cache cleared successfully');
  } catch (error) {
    console.log('[SW] Cache clear error:', error);
  }
}

console.log('[SW] Service Worker loaded');
