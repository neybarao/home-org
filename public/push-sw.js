// Notificações push do Dia. Carregado pelo service worker gerado pelo vite-plugin-pwa
// (workbox.importScripts no vite.config.ts).
self.addEventListener('push', (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch {
    d = { title: 'Dia', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(d.title || 'Dia', {
      body: d.body || '',
      tag: d.tag,
      icon: 'icon-192-v2.png',
      badge: 'icon-192-v2.png',
    }),
  )
})

// Tocar na notificação abre o app (ou traz para a frente se já estiver aberto).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.startsWith(url) && 'focus' in c) return c.focus()
      return self.clients.openWindow(url)
    }),
  )
})
