import { useEffect, useRef, useState } from 'react'
import { T, useT } from '../lib/i18n'
import { DEF, PARTS, STYLES, buildPrompt, changes, summary, swatch, type Sel, type Style } from '../lib/build'
import { fileToDataUrl, shareDataUrl, urlToDataUrl } from '../lib/image'
import { shopName, type Brand } from '../lib/api'
import type { Car } from '../lib/cars'
import { BeforeAfter } from '../components/BeforeAfter'
import { Rendering } from '../components/Rendering'
import { IAngle, ICam, ICar, IPhone, ISun } from '../components/Icons'

type Version = { img: string; sel: Sel; style: string | null; label: string }

export type TuneRequest = { sample?: boolean; file?: File; url?: string; n: number }

type Props = {
  active: boolean
  brand: Brand
  cars: Car[]
  /** Requests from other screens: the sample car, a photo picked on Home, or a gallery build to tune again. */
  incoming: TuneRequest | null
  freeLeft: number | null
  render: (photo: string, prompt: string, label: string, title: string) => Promise<string | null>
  toast: (m: string) => void
}

export function Tune({ active, brand, cars, incoming, freeLeft, render, toast }: Props) {
  const { t, lang } = useT()
  const [photo, setPhoto] = useState<string | null>(null)
  const [sel, setSel] = useState<Sel>(DEF)
  const [style, setStyle] = useState<Style | null>(null)
  const [tab, setTab] = useState<'styles' | 'parts'>('styles')
  const [versions, setVersions] = useState<Version[]>([])
  const [cur, setCur] = useState(0)
  const [view, setView] = useState<'pick' | 'result'>('pick')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const top = useRef<HTMLDivElement>(null)

  const pickStyle = (id: string | null) => {
    const s = STYLES.find((x) => x.id === id) ?? null
    setStyle(s)
    setSel(s ? { ...s.set } : DEF)
  }

  const takePhoto = (p: string) => { setPhoto(p); setVersions([]); setView('pick') }

  const loadUrl = async (url: string) => {
    try { takePhoto(await urlToDataUrl(url, 1600)) } catch { toast(t.err) }
  }

  const onFile = async (f?: File) => {
    if (!f) return
    try { takePhoto(await fileToDataUrl(f, 1600)) } catch (e) { toast((e as Error).message) }
  }

  useEffect(() => {
    if (!incoming) return
    if (incoming.file) onFile(incoming.file)
    else if (incoming.url) loadUrl(incoming.url)
    else if (incoming.sample && !photo) loadUrl(cars[0].before)
    // Only react to a new request, not to state changes it causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.n])

  const label = summary(sel, t.o, { wheels: t.wheels, tint: t.tint }, style, lang)
  const n = changes(sel)

  const go = async () => {
    if (!photo || !n || busy) return
    setBusy(true)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    try {
      // The admin sees build names in English whatever the client's language.
      const img = await render(photo, buildPrompt(sel, style), summary(sel, T.en.o, { wheels: 'Wheels', tint: 'Tint' }, style, 'en'), label)
      if (img) {
        setCur(versions.length)
        setVersions([...versions, { img, sel, style: style?.id ?? null, label }])
        setView('result')
      }
    } finally {
      setBusy(false)
    }
  }

  const v = versions[cur]

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
          <button className="cta2" style={{ marginTop: 10 }} onClick={() => loadUrl(cars[0].before)}>{t.sample}</button>
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
                ? <BeforeAfter key={cur} before={photo} after={v.img} labels={[t.before, t.after]} />
                : <img src={photo} alt={t.yourCar} />}
              {busy && <Rendering steps={t.rsteps} />}
            </div>
          </div>
          {view === 'pick' ? (
            <div className={busy ? 'locked' : undefined}>
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'styles'} onClick={() => setTab('styles')}>{t.styles}</button>
                <button role="tab" aria-selected={tab === 'parts'} onClick={() => setTab('parts')}>{t.parts}</button>
              </div>
              {tab === 'styles' ? (
                <div className="looks">
                  {STYLES.map((s) => {
                    const c = swatch(s.set)
                    return (
                      <button key={s.id} aria-pressed={style?.id === s.id} onClick={() => pickStyle(style?.id === s.id ? null : s.id)}>
                        <span className="look" style={{ '--p': c.paint ?? 'transparent', '--w': c.wheels ?? 'transparent' } as React.CSSProperties} data-stock={c.paint ? undefined : ''} aria-hidden />
                        <b>{s[lang][0]}</b><span>{s[lang][1]}</span>
                      </button>
                    )
                  })}
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
              <div className="dock-space" />
            </div>
          ) : v && (
            <div>
              <div className="result">
                <p className="sum">{v.label}</p>
                <p className="kept">{t.inGallery}</p>
                <button className="cta" onClick={() => shareDataUrl(v.img, 'my-build.jpg', v.label).catch(() => {})}>{t.savePhotos}</button>
                <div className="row2">
                  <button className="cta2" onClick={() => setView('pick')}>{t.more}</button>
                  {brand.phone
                    ? <a className="cta2" href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`} aria-label={`${t.call} ${shopName(brand)}`}><IPhone />{t.callShort}</a>
                    : <button className="cta2" onClick={() => fileRef.current?.click()}>{t.newPhoto}</button>}
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
