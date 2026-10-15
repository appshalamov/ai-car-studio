import { useRef, useState } from 'react'

export function BeforeAfter({ before, after, labels = ['До', 'После'] }: { before: string; after: string; labels?: [string, string] }) {
  const [pos, setPos] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }
  return (
    <div
      className="ba"
      ref={box}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); move(e.clientX) }}
      onPointerMove={(e) => { if (e.buttons) move(e.clientX) }}
    >
      <img src={after} alt="" draggable={false} />
      <div className="ba-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt="" draggable={false} />
      </div>
      <div className="ba-handle" style={{ left: `${pos}%` }}><span>⇆</span></div>
      <span className="ba-tag left">{labels[0]}</span>
      <span className="ba-tag right">{labels[1]}</span>
    </div>
  )
}
