// Service worker de "Una Más".
// Guarda el shell de la app para que abra sin conexión y actualiza los assets en segundo plano.
// Solo intercepta el mismo origen: Supabase, Google Fonts y wger quedan afuera.
const CACHE = 'unamas-v1'
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (new URL(req.url).origin !== self.location.origin) return
  event.respondWith(req.mode === 'navigate' ? desdeLaRed(req) : desdeCache(event))
})

// Navegación: red primero (para agarrar el deploy nuevo) y, sin conexión, el shell cacheado
async function desdeLaRed(req) {
  const cache = await caches.open(CACHE)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put('/', res.clone())
    return res
  } catch {
    return (await cache.match('/')) || Response.error()
  }
}

// Assets: lo cacheado al toque y la copia nueva se guarda para la próxima
function desdeCache(event) {
  const req = event.request
  const red = caches.open(CACHE).then((cache) =>
    fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone())
      return res
    })
  ).catch(() => null)
  event.waitUntil(red)
  return caches.match(req).then((cached) => cached || red.then((res) => res || Response.error()))
}
