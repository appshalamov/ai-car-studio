import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Ui = { root: HTMLElement | null; toast: (m: string) => void }
export const UiCtx = createContext<Ui>({ root: null, toast: () => {} })
export const useUi = () => useContext(UiCtx)

/** Renders into the app frame so it sits above the screens and the tab bar. */
export function Layer({ children }: { children: ReactNode }) {
  const { root } = useUi()
  return root ? createPortal(children, root) : null
}

export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
      const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', esc)
      return () => { cancelAnimationFrame(r); window.removeEventListener('keydown', esc) }
    }
    setOn(false)
    const t = setTimeout(() => setMounted(false), 380)
    return () => clearTimeout(t)
  }, [open, onClose])
  if (!mounted) return null
  return (
    <Layer>
      <div className={`scrim ${on ? 'on' : ''}`} onClick={onClose} />
      <div className={`sheet ${on ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </Layer>
  )
}
