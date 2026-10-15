import { useEffect, useState, type ReactNode } from 'react'

let locks = 0
let savedY = 0
/** Freeze the page under an open sheet (iOS Safari ignores overflow:hidden on body alone). */
function lockScroll() {
  if (locks++ > 0) return
  savedY = window.scrollY
  Object.assign(document.body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', overflow: 'hidden' })
}
function unlockScroll() {
  if (--locks > 0) return
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', overflow: '' })
  window.scrollTo(0, savedY)
}

/** Bottom sheet with a scrim; closes on scrim tap or Escape. The page behind it does not scroll. */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const [mounted, setMounted] = useState(open)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
      return () => cancelAnimationFrame(r)
    }
    setOn(false)
    const t = setTimeout(() => setMounted(false), 380)
    return () => clearTimeout(t)
  }, [open])
  useEffect(() => {
    if (!open) return
    lockScroll()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k)
    return () => { removeEventListener('keydown', k); unlockScroll() }
  }, [open, onClose])
  if (!mounted) return null
  return (
    <>
      <div className={`scrim ${on ? 'on' : ''}`} onClick={onClose} onTouchMove={(e) => e.preventDefault()} />
      <div className={`sheet ${on ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </>
  )
}
