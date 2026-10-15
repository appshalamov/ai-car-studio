import { useEffect, useState, type ReactNode } from 'react'

/** Bottom sheet with a scrim; closes on scrim tap or Escape. */
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
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [open, onClose])
  if (!mounted) return null
  return (
    <>
      <div className={`scrim ${on ? 'on' : ''}`} onClick={onClose} />
      <div className={`sheet ${on ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </>
  )
}
