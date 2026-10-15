import { useCallback, useEffect, useRef, useState } from 'react'
import { LangCtx, T, initialLang, useT, type Lang } from './lib/i18n'
import { cachedBrand, forgetMe, generate, getMe, refreshBrand, refreshMe, register, shopName, type ApiError, type Brand, type Me } from './lib/api'
import { deleteBuild, listBuilds } from './lib/db'
import { STYLES } from './lib/build'
import { shareDataUrl } from './lib/image'
import { askNotifyPermission, notify } from './lib/notify'
import { Home } from './screens/Home'
import { Tune } from './screens/Tune'
import { EXAMPLES, Gallery, type GalleryItem } from './screens/Gallery'
import { Sheet } from './components/Sheet'
import { BeforeAfter } from './components/BeforeAfter'
import { BrandMark } from './components/BrandMark'
import { IGallery, IHome, IPhone, ITune } from './components/Icons'

type Tab = 'home' | 'tune' | 'gal'
type Pending = { photo: string; prompt: string; label: string; resolve: (img: string | null) => void }

export default function App() {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const t = T[lang]
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('cs-lang', l) } catch { /* private mode */ } }

  const [brand, setBrand] = useState<Brand>(cachedBrand)
  const [client, setClient] = useState<Me | null>(getMe)
  const [tab, setTab] = useState<Tab>('home')
  const [incoming, setIncoming] = useState<{ style?: string | null; sample?: boolean; file?: File; n: number } | null>(null)
  const [builds, setBuilds] = useState<GalleryItem[]>([])
  const [sheet, setSheet] = useState<null | 'settings' | 'signup' | 'out' | 'item'>(null)
  const [item, setItem] = useState<GalleryItem | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const pending = useRef<Pending | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined)

  const toast = useCallback((m: string) => {
    setToastMsg(m)
    clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToastMsg(null), 2600)
  }, [])

  const loadBuilds = useCallback(() => { listBuilds().then((b) => setBuilds(b)) }, [])

  useEffect(() => {
    refreshBrand().then(setBrand).catch(() => {})
    refreshMe().then((m) => m && setClient(m)).catch((e: ApiError) => { if (e.status === 401) { forgetMe(); setClient(null) } })
    loadBuilds()
  }, [loadBuilds])

  useEffect(() => { document.title = shopName(brand); document.documentElement.lang = lang }, [brand, lang])
  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  const freeLeft = client ? client.left : brand.free

  /** Runs one render for a signed-up client. Returns the image, or null when it did not happen. */
  const doRender = async (c: Me, p: Omit<Pending, 'resolve'>): Promise<string | null> => {
    if (c.left <= 0) { setSheet('out'); return null }
    askNotifyPermission().catch(() => {}) // still inside the tap that started the render
    try {
      const r = await generate({ prompt: p.prompt, images: [p.photo], label: p.label })
      setClient({ ...c, left: r.left })
      notify(t.readyT, t.readyP, brand.logo ?? undefined)
      return r.image
    } catch (e) {
      const err = e as ApiError
      if (err.status === 401) { forgetMe(); setClient(null); setSheet('signup'); return null }
      if (err.status === 402) { setClient({ ...c, left: 0 }); setSheet('out'); return null }
      toast(!err.status ? t.offline : err.status === 429 ? t.busyT : t.err)
      return null
    }
  }

  const requestRender = (photo: string, prompt: string, label: string) => {
    if (client) return doRender(client, { photo, prompt, label })
    return new Promise<string | null>((resolve) => {
      pending.current = { photo, prompt, label, resolve }
      setSheet('signup')
    })
  }

  const closeSheet = () => {
    if (pending.current) { pending.current.resolve(null); pending.current = null }
    setSheet(null)
    setConfirmDel(false)
  }

  const openTune = (req: Omit<NonNullable<typeof incoming>, 'n'>) => {
    setIncoming({ ...req, n: Date.now() })
    setTab('tune')
  }

  const gallery = builds.length ? builds : EXAMPLES

  return (
    <LangCtx.Provider value={{ lang, t, setLang }}>
      <div className="app">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) openTune({ file: f }) }} />
        {tab === 'home' && <Home brand={brand} freeLeft={freeLeft} onUpload={() => fileRef.current?.click()} onStyle={(id) => openTune({ style: id, sample: true })} onSettings={() => setSheet('settings')} />}
        <Tune active={tab === 'tune'} incoming={incoming} freeLeft={client ? client.left : null} render={requestRender} toast={toast} onSaved={loadBuilds} />
        <Gallery active={tab === 'gal'} items={gallery} onOpen={(b) => { setItem(b); setConfirmDel(false); setSheet('item') }} />

        <nav className="tabbar">
          <button onClick={() => setTab('home')} aria-current={tab === 'home' ? 'page' : undefined}><IHome /><span>{t.tHome}</span><i className="dot" /></button>
          <button onClick={() => setTab('tune')} aria-current={tab === 'tune' ? 'page' : undefined}><ITune /><span>{t.tTune}</span><i className="dot" /></button>
          <button onClick={() => setTab('gal')} aria-current={tab === 'gal' ? 'page' : undefined}><IGallery /><span>{t.tGal}</span><i className="dot" /></button>
        </nav>

        <Sheet open={sheet === 'settings'} onClose={closeSheet} label={t.setT}>
          <h3>{t.setT}</h3>
          <div className="field"><label>{t.langL}</label>
            <div className="opt">
              <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
              <button aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>Русский</button>
            </div>
          </div>
          {client && (
            <div className="field"><label>{t.account}</label>
              <small>{client.name ? client.name + ' · ' : ''}{client.left > 0 ? t.left(client.left) : t.noneLeft}</small>
              <button className="linkbtn" onClick={() => { forgetMe(); setClient(null) }}>{t.signOut}</button>
            </div>
          )}
          <div className="field"><small>{t.privacy}</small></div>
          <button className="cta" style={{ marginTop: 22 }} onClick={closeSheet}>{t.done}</button>
        </Sheet>

        <Sheet open={sheet === 'signup'} onClose={closeSheet} label={t.signT}>
          <SignUp brand={brand} onDone={async (c, returning) => {
            setClient(c)
            if (returning) toast(t.welcomeBack)
            const p = pending.current
            pending.current = null
            setSheet(null)
            if (p) p.resolve(await doRender(c, p))
          }} />
        </Sheet>

        <Sheet open={sheet === 'out'} onClose={closeSheet} label={t.outT}>
          <div className="out">
            <BrandMark brand={brand} size={56} />
            <h3>{t.outT}</h3>
            <p>{t.outP(shopName(brand))}</p>
            {brand.phone && <a className="cta" href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`}><IPhone />{t.call}</a>}
            <button className="cta2" onClick={closeSheet}>{t.done}</button>
          </div>
        </Sheet>

        <Sheet open={sheet === 'item'} onClose={closeSheet} label={t.galT}>
          {item && (
            <>
              <h3>{(item.style ? STYLES.find((s) => s.id === item.style)?.[lang][0] : null) ?? item.label}</h3>
              <BeforeAfter key={item.id} before={item.before} after={item.after} labels={[t.before, t.after]} fit="contain" />
              <div className="row2">
                <button className="cta" onClick={() => shareDataUrl(item.after, 'my-build.jpg', item.label).catch(() => toast(t.err))} disabled={item.example}>{t.share}</button>
                <button className="cta2" onClick={() => { closeSheet(); openTune({ style: item.style, sample: true }) }}>{t.again}</button>
              </div>
              {!item.example && (!confirmDel ? (
                <button className="danger" onClick={() => setConfirmDel(true)}>{t.del}</button>
              ) : (
                <div className="confirm">
                  <p>{t.delQ}</p>
                  <div className="row2">
                    <button className="cta2" onClick={() => setConfirmDel(false)}>{t.keep}</button>
                    <button className="cta2 red" onClick={async () => { await deleteBuild(item.id); closeSheet(); loadBuilds(); toast(t.deleted) }}>{t.del2}</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </Sheet>

        <div className={`toast ${toastMsg ? 'on' : ''}`} role="status">{toastMsg}</div>
      </div>
    </LangCtx.Provider>
  )
}

function SignUp({ brand, onDone }: { brand: Brand; onDone: (c: Me, returning: boolean) => void }) {
  const { t } = useT()
  const [f, setF] = useState({ name: '', phone: '', email: '' })
  const [err, setErr] = useState<{ phone?: string; email?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ne: typeof err = {}
    if (f.phone.replace(/\D/g, '').length < 10) ne.phone = t.badPhone
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) ne.email = t.badEmail
    setErr(ne)
    if (ne.phone || ne.email) return
    setBusy(true)
    try {
      const before = getMe()?.token
      const m = await register(f)
      onDone(m, m.token === before)
    } catch (e2) {
      const x = e2 as ApiError
      if (x.status === 400) setErr(/email/i.test(x.message) ? { email: t.badEmail } : { phone: t.badPhone })
      else setErr({ form: !x.status ? t.offline : x.status === 429 ? t.busyT : t.err })
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h3>{t.signT}</h3>
      <p className="sheet-p">{t.signP(brand.free, shopName(brand))}</p>
      <div className="field"><label htmlFor="su-name">{t.name}</label><input id="su-name" autoComplete="given-name" placeholder={t.namePh} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="field"><label htmlFor="su-phone">{t.phone}</label><input id="su-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} aria-invalid={!!err.phone} />{err.phone && <small className="bad">{err.phone}</small>}</div>
      <div className="field"><label htmlFor="su-email">{t.email}</label><input id="su-email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-invalid={!!err.email} />{err.email && <small className="bad">{err.email}</small>}</div>
      {err.form && <p className="bad">{err.form}</p>}
      <button className="cta" style={{ marginTop: 22 }} disabled={busy}>{busy ? t.signing : t.signGo}</button>
    </form>
  )
}
