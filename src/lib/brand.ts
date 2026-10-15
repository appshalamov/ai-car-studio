import { useEffect, useState } from 'react'
import { API, getBrand, type Brand } from './api'

const EMPTY: Brand = { name: '', phone: '', logo: null, free: 3, vapidPublic: null }

function cached(): Brand {
  try { const b = localStorage.getItem('acs.brand'); if (b) return { ...EMPTY, ...JSON.parse(b) } } catch { /* ignore */ }
  return EMPTY
}

/** White-label branding from the server. Shows the cached copy at once and refreshes it in the background. */
export function useBrand(): Brand {
  const [brand, setBrand] = useState<Brand>(cached)
  useEffect(() => {
    if (!API) return
    let alive = true
    const load = () => {
      // getBrand() may answer from cache; fetch /config directly to pick up admin changes.
      fetch(API + '/config').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((b: Brand) => {
        if (!alive) return
        const next = { ...EMPTY, ...b }
        setBrand(next)
        try { localStorage.setItem('acs.brand', JSON.stringify(next)) } catch { /* ignore */ }
      }).catch(() => { getBrand().then((b) => alive && setBrand({ ...EMPTY, ...b })).catch(() => {}) })
    }
    load()
    const vis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', vis)
    return () => { alive = false; document.removeEventListener('visibilitychange', vis) }
  }, [])
  return brand
}
