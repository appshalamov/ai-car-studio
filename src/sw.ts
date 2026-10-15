/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/admin\.html/] }))

// Admin pushes (new client, each render with its cost) and the client's "build is ready".
self.addEventListener('push', (e) => {
  let d: { title?: string; body?: string; url?: string; tag?: string; icon?: string } = {}
  try { d = e.data?.json() ?? {} } catch { d = { body: e.data?.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Auto Studio', {
    body: d.body || '',
    icon: d.icon || './pwa-192x192.png',
    badge: './pwa-192x192.png',
    tag: d.tag,
    data: { url: d.url || './' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL((e.notification.data?.url as string) || './', self.registration.scope).href
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const same = wins.find((w) => w.url.split('#')[0] === url.split('#')[0])
    if (same) { await same.focus(); if ('navigate' in same) await same.navigate(url).catch(() => {}); return }
    await self.clients.openWindow(url)
  })())
})
