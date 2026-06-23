// MyShop service worker.
//
// Three cache tiers, each with its own strategy:
//   1. shell   – precached on install (root + offline fallback)
//   2. assets  – runtime cache-first, populated as hashed JS/CSS/fonts load
//   3. images  – runtime stale-while-revalidate with an LRU cap so the cache
//                doesn't grow forever on browse-heavy sessions
//
// API calls (/backend/) and non-GET/cross-origin requests are passthrough.
// Bump SW_VERSION below to invalidate all caches on deploy.

const SW_VERSION = 'v3'
const SHELL      = `myshop-shell-${SW_VERSION}`
const ASSETS     = `myshop-assets-${SW_VERSION}`
const IMAGES     = `myshop-images-${SW_VERSION}`
const IMAGE_CAP  = 60

const SHELL_URLS = ['/', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(SHELL_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => ![SHELL, ASSETS, IMAGES].includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// Listen for an explicit message from the page when the user accepts an update.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.includes('/backend/')) return // API + uploads stay live

  // SPA navigation — network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Refresh the shell on each successful navigation.
          if (res.ok) {
            const copy = res.clone()
            caches.open(SHELL).then((c) => c.put('/', copy))
          }
          return res
        })
        .catch(() => caches.match('/').then((c) => c || caches.match(req)))
    )
    return
  }

  // Images — stale-while-revalidate with an LRU-style cap.
  if (req.destination === 'image') {
    e.respondWith(
      caches.open(IMAGES).then((c) =>
        c.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            if (res.ok) {
              c.put(req, res.clone())
              trimCache(IMAGES, IMAGE_CAP)
            }
            return res
          }).catch(() => cached)
          return cached || network
        })
      )
    )
    return
  }

  // Hashed JS/CSS/fonts — cache-first (immutable per Vite hashed filename).
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res.ok && (req.destination === 'script' || req.destination === 'style' || req.destination === 'font')) {
          const copy = res.clone()
          caches.open(ASSETS).then((c) => c.put(req, copy))
        }
        return res
      }).catch(() => cached)
    )
  )
})

// ─────────────────────────────────────────────────────────────────────────
// Web Push
// ─────────────────────────────────────────────────────────────────────────
// The backend posts an aes128gcm-encrypted JSON payload to the push service;
// the browser decrypts it and fires a `push` event here. Format:
//   { title, body, url?, tag?, icon?, badge? }

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text?.() || '' } }
  const title = data.title || 'Pick&Go LB'
  const opts  = {
    body:  data.body  || '',
    icon:  data.icon  || '/brand/icon.svg',
    badge: data.badge || '/brand/icon.svg',
    tag:   data.tag   || 'pickgo-push',           // collapse same-tag notifications
    data:  { url: data.url || '/' },
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, opts))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification?.data?.url || '/'
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Re-use an already-open tab on the same origin if there is one.
      for (const client of list) {
        if (client.url.startsWith(self.location.origin)) {
          client.navigate(target)
          return client.focus()
        }
      }
      // Otherwise pop a fresh tab.
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })()
  )
})

// Browser cleared its push state (uninstalled, permission revoked) — tell the
// page so it can drop the subscription on the server next time it boots.
self.addEventListener('pushsubscriptionchange', () => {
  self.registration.showNotification('Notifications were disabled', {
    body: 'Re-enable push from your account settings.',
    tag:  'pickgo-push-disabled',
    icon: '/brand/icon.svg',
  })
})

function trimCache(name, max) {
  caches.open(name).then((c) =>
    c.keys().then((keys) => {
      if (keys.length <= max) return
      // Drop the oldest entries first (insertion order of Cache.keys()).
      const drop = keys.length - max
      for (let i = 0; i < drop; i++) c.delete(keys[i])
    })
  )
}
