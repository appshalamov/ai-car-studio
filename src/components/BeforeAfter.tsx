import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { IconArrows } from './Icons'

/** Drag the seam to compare. With `hint`, the seam slides once on its own to show it can be moved. */
export function BeforeAfter({ before, after, labels, hint = false, className = '' }: { before: string; after: string; labels?: [string, string]; hint?: boolean; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const [cut, setCut] = useState(50)
  const [hinting, setHinting] = useState(hint)

  useEffect(() => {
    if (!hint) return
    const t1 = setTimeout(() => setCut(22), 900)
    const t2 = setTimeout(() => setCut(56), 1900)
    const t3 = setTimeout(() => setHinting(false), 2900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [hint])

  const set = (x: number) => {
    const r = box.current?.getBoundingClientRect()
    if (r) setCut(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)))
  }

  return (
    <div
      ref={box}
      className={`ba ${hinting ? 'hint' : ''} ${className}`}
      style={{ '--cut': `${cut}%` } as CSSProperties}
      onPointerDown={(e) => { drag.current = true; setHinting(false); e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX) }}
      onPointerMove={(e) => { if (drag.current) set(e.clientX) }}
      onPointerUp={() => { drag.current = false }}
      onPointerCancel={() => { drag.current = false }}
    >
      <img src={before} alt="" draggable={false} />
      <img className="after" src={after} alt="" draggable={false} />
      {labels && <><span className="tag l">{labels[0]}</span><span className="tag r">{labels[1]}</span></>}
      <div className="seam" />
      <div className="knob"><IconArrows /></div>
    </div>
  )
}
