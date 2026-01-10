const CACHE_NAME = 'vamos-v1'
const URLS_TO_CACHE = [
  '/',
  '/products',
  '/activity',
  '/offline.html',
]

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        // Ignore errors for optional pages
        return cache.addAll(['/'])
      })
    })
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event
self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip API calls and external resources
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response
      }

      return fetch(event.request)
        .then(response => {
          // Don't cache failed responses
          if (!response || response.status !== 200 || response.type === 'basic' && response.url.includes('/api/')) {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Return offline page or cached page
          return caches.match('/') || new Response('Offline')
        })
    })
  )
})
