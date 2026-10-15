/* Push notifications for the admin (imported into the generated service worker). */
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { body: event.data && event.data.text() } }
  event.waitUntil(self.registration.showNotification(d.title || 'Car Studio', {
    body: d.body || '',
    tag: d.tag,
    icon: 'pwa-192x192.png',
    badge: 'pwa-192x192.png',
    data: { url: d.url || 'admin.html' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || 'admin.html'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const hit = all.find((c) => c.url.includes('admin.html'))
    if (hit) return hit.focus()
    return self.clients.openWindow(url)
  })())
})
