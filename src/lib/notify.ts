/** System notification for a finished render (works when the app is in the background). */
export async function askNotifyPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try { return (await Notification.requestPermission()) === 'granted' } catch { return false }
}

export async function notify(title: string, body: string, icon = './pwa-192x192.png') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return // the screen already shows it
  const opts = { body, icon, badge: './pwa-192x192.png', tag: 'build-ready' }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return void (await reg.showNotification(title, opts))
    new Notification(title, opts)
  } catch { /* nothing else to do */ }
}
