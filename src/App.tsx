import { useCallback, useEffect, useRef, useState } from 'react'
import { LangCtx, T, initialLang, useT, type Lang } from './lib/i18n'
import { cachedBrand, deleteBuild, forgetMe, generate, getMe, myBuilds, readLaunchParams, refreshBrand, refreshMe, register, shopName, subscribeMe, syncInstallMeta, type ApiError, type Brand, type Me } from './lib/api'
import { useCars } from './lib/cars'
import { shareUrl } from './lib/image'
import { askNotifyPermission, notify } from './lib/notify'
import { Home } from './screens/Home'
import { Tune, type TuneRequest } from './screens/Tune'
import { Gallery, examples, type GalleryItem } from './screens/Gallery'
import { Sheet } from './components/Sheet'
import { BeforeAfter } from './components/BeforeAfter'
import { BrandMark } from './components/BrandMark'
import { Install, installLater, isPhone, isStandalone } from './components/Install'
import { IGallery, IHome, IPhone, ITune } from './components/Icons'

type Tab = 'home' | 'tune' | 'gal'
type Pending = { photo: string; prompt: string; label: string; title: string; resolve: (img: string | null) => void }

// Read ?s=<shop>&u=<client> before anything else: the installed app opens with them.
const launch = readLaunchParams()
const startTab: Tab = new URLSearchParams(location.search).get('tab') === 'gal' || (launch.fromInstall && isStandalone()) ? 'gal' : 'home'
const pushPerm = () => ('Notification' in window ? Notification.permission : 'denied')

export default function App() {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const t = T[lang]
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('cs-lang', l) } catch { /* private mode */ } }

  const cars = useCars()
  const [brand, setBrand] = useState<Brand>(cachedBrand)
  const [client, setClient] = useState<Me | null>(getMe)
  const [tab, setTab] = useState<Tab>(startTab)
  const [incoming, setIncoming] = useState<TuneRequest | null>(null)
  const [builds, setBuilds] = useState<GalleryItem[]>([])
  const [rendering, setRendering] = useState(false)
  const [serverPending, setServerPending] = useState(false)
  const [perm, setPerm] = useState(pushPerm)
  const [sheet, setSheet] = useState<null | 'settings' | 'signup' | 'out' | 'item' | 'install'>(null)
  const [firstInstall, setFirstInstall] = useState(false)
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

  const loadBuilds = useCallback(() => {
    myBuilds().then((r) => { setBuilds(r.builds); setServerPending(r.pending) }).catch((e: ApiError) => { if (e.status === 401) { forgetMe(); setClient(null) } })
  }, [])

  useEffect(() => {
    refreshBrand().then((b) => { setBrand(b); syncInstallMeta(b) }).catch(() => {})
    refreshMe().then((m) => m && setClient(m)).catch((e: ApiError) => { if (e.status === 401) { forgetMe(); setClient(null) } })
    loadBuilds()
    const u = new URL(location.href)
    if (u.searchParams.has('tab')) { u.searchParams.delete('tab'); history.replaceState(null, '', u) }
  }, [loadBuilds])

  // A render started elsewhere (Safari before the app was installed) is still running: check back until it lands.
  useEffect(() => {
    if (!serverPending || rendering) return
    const id = setInterval(loadBuilds, 6000)
    return () => clearInterval(id)
  }, [serverPending, rendering, loadBuilds])

  // The installed app refreshes when it comes back to the screen (for example from a push).
  useEffect(() => {
    const on = () => { if (document.visibilityState === 'visible') { loadBuilds(); setPerm(pushPerm()) } }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [loadBuilds])

  useEffect(() => { document.title = shopName(brand); document.documentElement.lang = lang }, [brand, lang])
  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  const freeLeft = client ? client.left : brand.free

  const enablePush = async () => {
    const ok = await askNotifyPermission()
    setPerm(pushPerm())
    if (ok) subscribeMe(brand, lang).then((done) => done && toast(t.pushOn)).catch(() => {})
  }

  /** Runs one render for a signed-up client. Returns the image, or null when it did not happen. */
  const doRender = async (c: Me, p: Omit<Pending, 'resolve'>): Promise<string | null> => {
    if (c.left <= 0) { setSheet('out'); return null }
    // Still inside the tap that started the render, so iPhone allows the permission prompt.
    askNotifyPermission().then((ok) => { setPerm(pushPerm()); if (ok) subscribeMe(brand, lang).catch(() => {}) }).catch(() => {})
    setRendering(true)
    try {
      const r = await generate({ prompt: p.prompt, images: [p.photo], label: p.label, title: p.title })
      setClient({ ...c, left: r.left })
      notify(t.readyT, t.readyP, brand.logo ?? undefined)
      return r.image
    } catch (e) {
      const err = e as ApiError
      if (err.status === 401) { forgetMe(); setClient(null); setSheet('signup'); return null }
      if (err.status === 402) { setClient({ ...c, left: 0 }); setSheet('out'); return null }
      toast(!err.status ? t.offline : err.status === 429 ? t.busyT : t.err)
      return null
    } finally {
      setRendering(false)
      loadBuilds()
    }
  }

  const requestRender = (photo: string, prompt: string, label: string, title: string) => {
    if (client) return doRender(client, { photo, prompt, label, title })
    return new Promise<string | null>((resolve) => {
      pending.current = { photo, prompt, label, title, resolve }
      setSheet('signup')
    })
  }

  const closeSheet = () => {
    if (pending.current) { pending.current.resolve(null); pending.current = null }
    setSheet(null)
    setConfirmDel(false)
  }

  const openTune = (req: Omit<TuneRequest, 'n'>) => {
    setIncoming({ ...req, n: Date.now() })
    setTab('tune')
  }

  const standalone = isStandalone()
  const gallery = builds.length ? builds : examples(cars, lang)
  const showInstall = (first: boolean) => { setFirstInstall(first); setSheet('install') }

  return (
    <LangCtx.Provider value={{ lang, t, setLang }}>
      <div className="app">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) openTune({ file: f }) }} />
        {tab === 'home' && <Home brand={brand} cars={cars} freeLeft={freeLeft} onUpload={() => fileRef.current?.click()} onSettings={() => setSheet('settings')} />}
        <Tune active={tab === 'tune'} brand={brand} cars={cars} incoming={incoming} freeLeft={client ? client.left : null} render={requestRender} toast={toast} />
        <Gallery
          active={tab === 'gal'}
          items={gallery}
          pending={rendering || serverPending}
          askPush={!!client && standalone && perm === 'default' && !!brand.vapidPublic}
          installBanner={!!client && !standalone && isPhone()}
          onPush={enablePush}
          onInstall={() => showInstall(false)}
          onOpen={(b) => { setItem(b); setConfirmDel(false); setSheet('item') }}
        />

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
          {!standalone && (
            <div className="field"><label>{t.inst.title(shopName(brand))}</label>
              <button className="cta2" onClick={() => showInstall(false)}>{t.inst.go}</button>
            </div>
          )}
          <div className="field"><small>{t.privacy}</small></div>
          <button className="cta" style={{ marginTop: 22 }} onClick={closeSheet}>{t.done}</button>
        </Sheet>

        <Sheet open={sheet === 'signup'} onClose={closeSheet} label={t.signT}>
          <SignUp brand={brand} onDone={(c, returning) => {
            setClient(c)
            syncInstallMeta(brand)
            if (returning) toast(t.welcomeBack)
            const p = pending.current
            pending.current = null
            // The render starts right away; the install pop-up covers the wait, before the result.
            if (!standalone && !installLater()) showInstall(!returning)
            else setSheet(null)
            if (p) doRender(c, p).then(p.resolve)
          }} />
        </Sheet>

        <Sheet open={sheet === 'install'} onClose={closeSheet} label={t.inst.title(shopName(brand))}>
          <Install brand={brand} first={firstInstall} onClose={closeSheet} />
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
              <h3>{item.label || t.custom}</h3>
              {item.before
                ? <BeforeAfter key={item.id} before={item.before} after={item.after} labels={[t.before, t.after]} />
                : <img className="item-img" src={item.after} alt="" />}
              <div className="row2">
                <button className="cta" onClick={() => shareUrl(item.after, 'my-build.jpg', item.label).catch(() => toast(t.err))}>{t.savePhotos}</button>
                <button className="cta2" onClick={() => { closeSheet(); openTune(item.example ? { sample: true, url: item.before ?? undefined } : { url: item.before ?? item.after }) }}>{item.example ? t.sample : t.again}</button>
              </div>
              {!item.example && (!confirmDel ? (
                <button className="danger" onClick={() => setConfirmDel(true)}>{t.del}</button>
              ) : (
                <div className="confirm">
                  <p>{t.delQ}</p>
                  <div className="row2">
                    <button className="cta2" onClick={() => setConfirmDel(false)}>{t.keep}</button>
                    <button className="cta2 red" onClick={async () => { await deleteBuild(item.id).catch(() => {}); closeSheet(); loadBuilds(); toast(t.deleted) }}>{t.del2}</button>
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
