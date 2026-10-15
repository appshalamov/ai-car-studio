import { useEffect, useRef, useState, type ReactNode } from 'react'
import { T, useT } from '../lib/i18n'
import { DEF, PARTS, STYLES, buildPrompt, changes, summary, swatch, type Sel, type Style } from '../lib/build'
import { fileToDataUrl, shareDataUrl, urlToDataUrl } from '../lib/image'
import { shopName, type Brand } from '../lib/api'
import type { Car } from '../lib/cars'
import { BeforeAfter } from '../components/BeforeAfter'
import { Rendering } from '../components/Rendering'
import { IAngle, ICam, ICar, IPhone, ISun } from '../components/Icons'

type Version = { img: string; sel: Sel; style: string | null; label: string }

export type TuneRequest = { sample?: boolean; file?: File; url?: string; style?: string; n: number }

type Props = {
  active: boolean
  brand: Brand
  cars: Car[]
  /** Requests from other screens: the sample car, a photo picked on Home, a look, or a gallery build to tune again. */
  incoming: TuneRequest | null
  freeLeft: number | null
  /** Shown in place of the options while the first render runs, until the client leaves contacts. */
  contacts: ReactNode | null
  render: (photo: string, prompt: string, label: string, title: string) => Promise<string | null>
  toast: (m: string) => void
}

const opt = (k: keyof Sel) => PARTS.find((p) => p.k === k)!.opts

export function Tune({ active, brand, cars, incoming, freeLeft, contacts, render, toast }: Props) {
  const { t, lang } = useT()
  const [photo, setPhoto] = useState<string | null>(null)
  const [sel, setSel] = useState<Sel>(DEF)
  const [style, setStyle] = useState<Style | null>(null)
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
  const set = (k: keyof Sel, o: string) => {
    setStyle(null)
    // Tapping the chosen color or wheels again goes back to how the car is now.
    setSel((s) => ({ ...s, [k]: s[k] === o && (k === 'paint' || k === 'wheels') ? DEF[k] : o }))
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
    if (incoming.style) pickStyle(incoming.style)
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
  const locked = !!contacts && view === 'result' && !busy
  const name = (k: keyof Sel, o: string) => (o === 'stock' ? t.o.asIs : t.o[k === 'wheels' ? 'w_' + o : o])

  return (
    <section className={`screen ${contacts && (busy || locked) ? 'contacting' : ''}`} hidden={!active} aria-label={t.tTune}>
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
            <div className="vtop"><b>{t.yourCar}</b><button className="ibtn" onClick={() => fileRef.current?.click()} aria-label={t.addPhoto} disabled={busy || !!contacts}><ICam /></button></div>
            <div className="vimg">
              {view === 'result' && v && !busy
                ? locked
                  ? <div className="lockedres"><img src={v.img} alt="" /><p><b>{t.readyLockT}</b><span>{t.readyLockP}</span></p></div>
                  : <BeforeAfter key={cur} before={photo} after={v.img} labels={[t.before, t.after]} />
                : <img src={photo} alt={t.yourCar} />}
              {busy && <Rendering steps={t.rsteps} />}
            </div>
          </div>

          {contacts && (busy || locked) ? (
            <div className="contacts pad">{contacts}</div>
          ) : busy ? (
            <div className="waiting pad"><b>{t.waitT}</b><span>{t.waitP}</span></div>
          ) : view === 'pick' ? (
            <div className="cfg">
              <h4 className="cfg-h pad">{t.looksT}</h4>
              <div className="rail looks-rail compact">
                {STYLES.map((s) => {
                  const c = swatch(s.set)
                  return (
                    <button key={s.id} aria-pressed={style?.id === s.id} onClick={() => pickStyle(style?.id === s.id ? null : s.id)}>
                      <span className="look" style={{ '--p': c.paint ?? 'transparent', '--w': c.wheels ?? 'transparent' } as React.CSSProperties} data-stock={c.paint ? undefined : ''} aria-hidden />
                      <b>{s[lang][0]}</b>
                    </button>
                  )
                })}
              </div>

              <section className="part">
                <h4><span className="pn">1</span>{t.paint}<em>{name('paint', sel.paint)}</em></h4>
                <div className="sw2">
                  {[['stock', ''] as [string, string?], ...opt('paint')].map(([o, c]) => (
                    <button key={o} aria-pressed={sel.paint === o} onClick={() => set('paint', o)}>
                      <i style={{ '--c': c || 'transparent' } as React.CSSProperties} data-stock={c ? undefined : ''} />
                      <span>{name('paint', o)}</span>
                    </button>
                  ))}
                </div>
                <div className="seg" role="group" aria-label={t.finish}>
                  {opt('finish').map(([o]) => <button key={o} aria-pressed={sel.finish === o} onClick={() => set('finish', sel.finish === o ? 'stock' : o)}>{t.o[o]}</button>)}
                </div>
              </section>

              <section className="part">
                <h4><span className="pn">2</span>{t.wheels}<em>{name('wheels', sel.wheels)}</em></h4>
                <div className="sw2 wheels">
                  {[['stock', ''] as [string, string?], ...opt('wheels')].map(([o, c]) => (
                    <button key={o} aria-pressed={sel.wheels === o} onClick={() => set('wheels', o)}>
                      <i style={{ '--c': c || 'transparent' } as React.CSSProperties} data-stock={c ? undefined : ''} />
                      <span>{name('wheels', o)}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="part">
                <h4><span className="pn">3</span>{t.tint}<em>{t.o[sel.tint]}</em></h4>
                <div className="seg tints" role="group" aria-label={t.tint}>
                  {opt('tint').map(([o]) => <button key={o} aria-pressed={sel.tint === o} onClick={() => set('tint', o)}><i data-t={o} />{t.o[o]}</button>)}
                </div>
              </section>

              <section className="part">
                <h4><span className="pn">4</span>{t.stance}<em>{t.o[sel.stance]}</em></h4>
                <div className="seg" role="group" aria-label={t.stance}>
                  {opt('stance').map(([o]) => <button key={o} aria-pressed={sel.stance === o} onClick={() => set('stance', o)}>{t.o[o]}</button>)}
                </div>
              </section>
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
              <p className="cnt">{n ? `${label}${freeLeft != null ? ' · ' + t.left(freeLeft) : ''}` : t.none}</p>
              <button className="cta" onClick={go} disabled={!n}>{t.render}</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
