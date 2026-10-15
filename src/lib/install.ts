import { useEffect, useState } from 'react'

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIP | null = null
const subs = new Set<() => void>()
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIP; subs.forEach((f) => f()) })
window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()) })

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => { subs.delete(f) } }, [])
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return {
    canPrompt: !!deferred,
    standalone,
    ios,
    prompt: async () => { if (!deferred) return; await deferred.prompt(); deferred = null; force((x) => x + 1) },
  }
}
