import { useEffect, useState } from 'react'
import { useT } from '../lib/i18n'

/** Over the photo while a render runs: the photo dims, a scan line passes over it, and a card says what is happening. */
export function Rendering({ steps }: { steps: string[] }) {
  const { t } = useT()
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  // Renders take about 30 s; the bar eases toward 95% and never claims to be done.
  const pct = Math.min(95, Math.round(100 * (1 - Math.exp(-sec / 14))))
  const step = steps[Math.min(steps.length - 1, Math.floor(sec / 6))]
  return (
    <div className="rendering" role="status" aria-live="polite">
      <div className="scan" />
      <div className="rcard">
        <div className="ring" aria-hidden />
        <b>{sec > 40 ? t.renderLong : t.rendering}</b>
        <span key={step} className="rstep">{step}</span>
        <div className="rbar" aria-hidden><i style={{ width: `${pct}%` }} /></div>
        <small>{t.renderHint}</small>
      </div>
    </div>
  )
}
