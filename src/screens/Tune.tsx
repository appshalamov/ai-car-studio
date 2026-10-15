import { useEffect, useRef, useState } from 'react'
import { T, useT } from '../lib/i18n'
import { DEF, PARTS, STYLES, buildPrompt, changes, summary, type Sel, type Style } from '../lib/build'
import { fileToDataUrl, shareDataUrl } from '../lib/image'
import { saveBuild } from '../lib/db'
import { BeforeAfter } from '../components/BeforeAfter'
import { IAngle, ICam, ICar, ISun } from '../components/Icons'

type Version = { img: string; sel: Sel; style: string | null; label: string }

type Props = {
  active: boolean
  /** Requests from other screens: a style picked on Home, the sample car, or a photo chosen there. */
  incoming: { style?: string | null; sample?: boolean; file?: File; n: number } | null
  freeLeft: number | null
  render: (photo: string, prompt: string, label: string) => Promise<string | null>
  toast: (m: string) => void
  onSaved: () => void
}

export function Tune({ active, incoming, freeLeft, render, toast, onSaved }: Props) {
  const { t, lang } = useT()
  const [photo, setPhoto] = useState<string | null>(null)
  const [sel, setSel] = useState<Sel>(DEF)
  const [style, setStyle] = useState<Style | null>(null)
  const [tab, setTab] = useState<'styles' | 'parts'>('styles')
  const [versions, setVersions] = useState<Version[]>([])
  const [cur, setCur] = useState(0)
  const [view, setView] = useState<'pick' | 'result'>('pick')
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  const [savedIdx, setSavedIdx] = useState<number[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const top = useRef<HTMLDivElement>(null)

  const pickStyle = (id: string | null) => {
    const s = STYLES.find((x) => x.id === id) ?? null
    setStyle(s)
    setSel(s ? { ...s.set } : DEF)
  }

  const loadSample = async () => {
    const blob = await fetch('./img/stock.jpg').then((r) => r.blob())
    const url = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(blob) })
    setPhoto(url)
    setVersions([])
    setView('pick')
  }


  const onFile = async (f?: File) => {
    if (!f) return
    try {
      setPhoto(await fileToDataUrl(f, 1600))
      setVersions([])
      setView('pick')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  useEffect(() => {
    if (!incoming) return
    if (incoming.file) onFile(incoming.file)
    else if (incoming.sample && !photo) loadSample()
    if (incoming.style !== undefined) pickStyle(incoming.style)
    // Only react to a new request, not to state changes it causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.n])

  const label = summary(sel, t.o, { wheels: t.wheels, tint: t.tint }, style, lang)
  const n = changes(sel)

  const go = async () => {
    if (!photo || !n || busy) return
    setBusy(true)
    setSlow(false)
    const slowT = setTimeout(() => setSlow(true), 25000)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    try {
      // The admin sees build names in English whatever the client's language.
      const img = await render(photo, buildPrompt(sel, style), summary(sel, T.en.o, { wheels: 'Wheels', tint: 'Tint' }, style, 'en'))
      if (img) {
        setCur(versions.length)
        setVersions([...versions, { img, sel, style: style?.id ?? null, label }])
        setView('result')
      }
    } finally {
      clearTimeout(slowT)
      setBusy(false)
    }
  }

  const v = versions[cur]
  const save = async () => {
    if (!v || !photo) return
    await saveBuild({ before: photo, after: v.img, label: v.label, sel: v.sel, style: v.style })
    setSavedIdx((s) => [...s, cur])
    toast(t.saved)
    onSaved()
  }

  return (
    <section className="screen" hidden={!active} aria-label={t.tTune}>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      {!photo ? (
        <div className="pad">
          <h1 className="t-title">{t.tuneT}</h1>
          <p className="hero-p" style={{ margin: 0 }}>{t.tuneP}</p>
          <button className="drop" onClick={() => fileRef.current?.click()}>
            <span className="cam"><ICam /></span>
            <b>{t.addPhoto}</b>
            <span>{t.addPhotoP}</span>
          </button>
          <button className="cta2" style={{ marginTop: 10 }} onClick={loadSample}>{t.sample}</button>
          <ul className="tips">
            <li><ICar /><span>{t.tip1}</span></li>
            <li><ISun /><span>{t.tip2}</span></li>
            <li><IAngle /><span>{t.tip3}</span></li>
          </ul>
        </div>
      ) : (
        <>
          <div className="viewer" ref={top}>
            <div className="vtop"><b>{t.yourCar}</b><button className="ibtn" onClick={() => fileRef.current?.click()} aria-label={t.addPhoto} disabled={busy}><ICam /></button></div>
            <div className="vimg">
              {view === 'result' && v && !busy
                ? <BeforeAfter key={cur} before={photo} after={v.img} labels={[t.before, t.after]} fit="contain" />
                : <img src={photo} alt={t.yourCar} />}
              {busy && <><div className="sweep" /><p className="busy" role="status">{slow ? t.renderLong : t.rendering}</p></>}
            </div>
          </div>
          {view === 'pick' ? (
            <div>
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'styles'} onClick={() => setTab('styles')}>{t.styles}</button>
                <button role="tab" aria-selected={tab === 'parts'} onClick={() => setTab('parts')}>{t.parts}</button>
              </div>
              {tab === 'styles' ? (
                <div className="styles">
                  {STYLES.map((s) => (
                    <button key={s.id} aria-pressed={style?.id === s.id} onClick={() => pickStyle(style?.id === s.id ? null : s.id)}>
                      <img src={`./img/${s.id}.jpg`} alt="" loading="lazy" />
                      <b>{s[lang][0]}</b><span>{s[lang][1]}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  {PARTS.map((p) => {
                    const val = sel[p.k]
                    const name = (o: string) => t.o[p.k === 'wheels' ? 'w_' + o : o]
                    const set = (o: string) => { setStyle(null); setSel((s) => ({ ...s, [p.k]: s[p.k] === o && p.k !== 'stance' && p.k !== 'tint' ? DEF[p.k] : o })) }
                    return (
                      <div className="part" key={p.k}>
                        <h4>{t[p.k]}<span>{val === 'stock' ? t.o.stock : name(val)}</span></h4>
                        {p.type === 'sw' ? (
                          <div className="sw">{p.opts.map(([o, c]) => <button key={o} style={{ '--c': c } as React.CSSProperties} aria-pressed={val === o} aria-label={name(o)} onClick={() => set(o)} />)}</div>
                        ) : (
                          <div className="opt">{p.opts.map(([o]) => <button key={o} aria-pressed={val === o} onClick={() => set(o)}>{name(o)}</button>)}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ height: 120 }} />
            </div>
          ) : v && (
            <div>
              <div className="result">
                <p className="sum">{v.label}</p>
                <button className="cta" onClick={save} disabled={savedIdx.includes(cur)}>{savedIdx.includes(cur) ? t.saved : t.save}</button>
                <div className="row2">
                  <button className="cta2" onClick={() => shareDataUrl(v.img, 'my-build.jpg', v.label).catch(() => {})}>{t.share}</button>
                  <button className="cta2" onClick={() => setView('pick')}>{t.more}</button>
                </div>
                {freeLeft != null && <p className="cnt">{freeLeft > 0 ? t.left(freeLeft) : t.noneLeft}</p>}
              </div>
              {versions.length > 1 && (
                <div className="vers">
                  {versions.map((x, i) => <button key={i} aria-pressed={i === cur} onClick={() => setCur(i)}><img src={x.img} alt="" />{t.vN(i + 1)}</button>)}
                </div>
              )}
            </div>
          )}
          {active && view === 'pick' && !busy && (
            <div className="dock">
              <p className="cnt">{n ? `${t.changes(n)}${freeLeft != null ? ' · ' + t.left(freeLeft) : ''}` : t.none}</p>
              <button className="cta" onClick={go} disabled={!n}>{t.render}</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

