import { useEffect, useRef, useState } from 'react'
import { IArrows } from './Icons'

type Props = { before: string; after: string; labels?: [string, string]; hint?: boolean; className?: string; fit?: 'cover' | 'contain' }

/** Drag the seam to compare. With `hint`, the seam sweeps once to show it can be dragged. */
export function BeforeAfter({ before, after, labels, hint, className = '', fit = 'cover' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [cut, setCut] = useState(50)
  const [anim, setAnim] = useState(!!hint)
  const drag = useRef(false)

  useEffect(() => {
    if (!hint) return
    const ts = [setTimeout(() => setCut(22), 900), setTimeout(() => setCut(56), 1900), setTimeout(() => setAnim(false), 2900)]
    return () => ts.forEach(clearTimeout)
  }, [hint])

  const set = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    setCut(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)))
  }

  return (
    <div
      ref={ref}
      className={`ba ${anim ? 'hint' : ''} ${className}`}
      style={{ '--cut': `${cut}%` } as React.CSSProperties}
      data-fit={fit}
      onPointerDown={(e) => { drag.current = true; setAnim(false); e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX) }}
      onPointerMove={(e) => drag.current && set(e.clientX)}
      onPointerUp={() => { drag.current = false }}
      onPointerCancel={() => { drag.current = false }}
    >
      <img src={before} alt="" draggable={false} />
      <img className="after" src={after} alt="" draggable={false} />
      {labels && <><span className="tag l">{labels[0]}</span><span className="tag r">{labels[1]}</span></>}
      <div className="seam" />
      <div className="knob"><IArrows /></div>
    </div>
  )
}
