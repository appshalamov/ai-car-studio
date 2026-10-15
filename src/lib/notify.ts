/** Local notification (works in the installed PWA too); falls back to an in-app toast. */
export async function askNotifyPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export async function notify(title: string, body: string) {
  toast(`${title}: ${body}`)
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const opts = { body, icon: './pwa-192x192.png', badge: './pwa-192x192.png', tag: 'acs-charge-' + Date.now() }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return void (await reg.showNotification(title, opts))
    new Notification(title, opts)
  } catch { /* toast already shown */ }
}

function toast(text: string) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = text
  document.body.appendChild(el)
  setTimeout(() => el.classList.add('out'), 5000)
  setTimeout(() => el.remove(), 5600)
}
