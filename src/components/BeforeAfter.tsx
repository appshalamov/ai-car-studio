import { useEffect, useRef, useState } from 'react'
import { IArrows } from './Icons'

type Props = {
  before: string
  after: string
  labels?: [string, string]
  /** The seam sweeps once to show it can be dragged. */
  hint?: boolean
  /** Inside a swipeable carousel: only the knob drags the seam, so a swipe on the photo turns the page. */
  knobOnly?: boolean
  className?: string
}

/**
 * Before/after with a draggable seam. The frame takes the before photo's shape (portrait photos are
 * capped at 4:5), and both photos fill it the same way, so they line up even when the AI result
 * comes back at a slightly different size.
 */
export function BeforeAfter({ before, after, labels, hint, knobOnly, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [cut, setCut] = useState(50)
  const [anim, setAnim] = useState(!!hint)
  const [ratio, setRatio] = useState(16 / 10)
  const drag = useRef(false)

  useEffect(() => {
    if (!hint) return
    const ts = [setTimeout(() => setCut(22), 900), setTimeout(() => setCut(62), 1900), setTimeout(() => setCut(50), 2900), setTimeout(() => setAnim(false), 3800)]
    return () => ts.forEach(clearTimeout)
  }, [hint])

  const set = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    setCut(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)))
  }
  const nearKnob = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    return Math.abs(x - (r.left + (r.width * cut) / 100)) < 36
  }

  return (
    <div
      ref={ref}
      className={`ba ${anim ? 'hint' : ''} ${knobOnly ? 'knob-only' : ''} ${className}`}
      style={{ '--cut': `${cut}%`, aspectRatio: String(Math.max(ratio, 0.8)) } as React.CSSProperties}
      onPointerDown={(e) => {
        if (knobOnly && !nearKnob(e.clientX)) return
        drag.current = true
        setAnim(false)
        e.currentTarget.setPointerCapture(e.pointerId)
        set(e.clientX)
      }}
      onPointerMove={(e) => drag.current && set(e.clientX)}
      onPointerUp={() => { drag.current = false }}
      onPointerCancel={() => { drag.current = false }}
    >
      <img src={before} alt="" draggable={false} onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth) setRatio(i.naturalWidth / i.naturalHeight) }} />
      <img className="after" src={after} alt="" draggable={false} />
      {labels && <><span className="tag l">{labels[0]}</span><span className="tag r">{labels[1]}</span></>}
      <div className="seam" />
      <div className="knob"><IArrows /></div>
    </div>
  )
}
