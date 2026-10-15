import { useCallback, useEffect, useState } from 'react'
import { API, adminClients, adminGenerations, adminLogin, adminLogout, adminPass, adminAddRenders, adminHome, adminShops, adminSubscribe, adminSummary, adminTestPush, b64uToBytes, shopName, type ApiError, type Brand, type Client, type GenLog, type Shop, type Summary } from '../lib/api'
import { loadImage } from '../lib/image'
import { BrandMark } from '../components/BrandMark'
import { Shops } from './Shops'
import { ClientBuilds, HomeCard, useHome } from './HomePicks'

type Data = { summary: Summary; clients: Client[]; renders: GenLog[]; shops: Shop[]; brand: Brand }

const L = {
  en: {
    title: 'Admin', pass: 'Admin password', enter: 'Open admin', wrong: 'Wrong password',
    openApp: 'Open client app', clients: 'Clients', renders: 'Renders', cost: 'Cost to you', costHint: 'woso credits charged to your account',
    balance: 'woso balance', perRender: (c: string, u: string) => `One render costs ${c} (${u})`,
    brandT: 'Your brand', brandP: 'Clients see this name and logo in the app.', name: 'Business name', namePh: 'Your Shop Name', phone: 'Phone clients can call', free: 'Free renders per client',
    logo: 'Logo', logoP: 'A square picture works best. It is cropped to a square.', upload: 'Upload logo', remove: 'Remove logo', save: 'Save', saved: 'Saved', preview: 'In the app',
    pushT: 'Notifications', pushOn: 'Turn on notifications', pushP: 'Get a push for every new client and every render, with its cost.',
    pushIos: 'On iPhone: Share → Add to Home Screen, open the admin from the home screen, then turn notifications on.',
    pushNoKeys: 'Push keys are not set on the server yet.', testSent: (n: number) => (n ? `Test sent to ${n} device${n === 1 ? '' : 's'}` : 'Subscribed, but the test did not arrive'), denied: 'Notifications are blocked in this browser settings.',
    clientsT: 'Clients', none: 'No clients yet. Share the app link and they will show up here.', joined: 'Joined', add10: '+10 renders', noContacts: 'No contacts yet', usedL: (u: number, l: number) => `${u} used · ${l} left`,
    rendersT: 'Recent renders', noRenders: 'No renders yet.', custom: 'Custom build', failed: 'Failed, not charged', lang: 'Русский', refresh: 'Refresh', err: 'Could not reach the service', notConf: 'The service URL is not configured in this build.', signOut: 'Sign out',
  },
  ru: {
    title: 'Админка', pass: 'Пароль админки', enter: 'Открыть админку', wrong: 'Неверный пароль',
    openApp: 'Открыть приложение клиента', clients: 'Клиенты', renders: 'Генерации', cost: 'Себестоимость', costHint: 'кредиты woso, списаны с вашего аккаунта',
    balance: 'Баланс woso', perRender: (c: string, u: string) => `Одна генерация стоит ${c} (${u})`,
    brandT: 'Ваш бренд', brandP: 'Клиенты видят это название и логотип в приложении.', name: 'Название бизнеса', namePh: 'Your Shop Name', phone: 'Телефон для клиентов', free: 'Бесплатных генераций на клиента',
    logo: 'Логотип', logoP: 'Лучше квадратная картинка. Она обрезается до квадрата.', upload: 'Загрузить логотип', remove: 'Убрать логотип', save: 'Сохранить', saved: 'Сохранено', preview: 'В приложении',
    pushT: 'Уведомления', pushOn: 'Включить уведомления', pushP: 'Пуш о каждом новом клиенте и каждой генерации с её себестоимостью.',
    pushIos: 'На iPhone: «Поделиться» → «На экран Домой», откройте админку с экрана Домой и включите уведомления.',
    pushNoKeys: 'На сервере ещё не заданы ключи для пушей.', testSent: (n: number) => (n ? `Проверочный пуш отправлен: ${n}` : 'Подписка есть, но проверочный пуш не дошёл'), denied: 'Уведомления запрещены в настройках браузера.',
    clientsT: 'Клиенты', none: 'Клиентов пока нет. Отправьте ссылку на приложение, и они появятся здесь.', joined: 'Регистрация', add10: '+10 генераций', noContacts: 'Ещё не оставил контакты', usedL: (u: number, l: number) => `сделано ${u} · осталось ${l}`,
    rendersT: 'Последние генерации', noRenders: 'Генераций пока нет.', custom: 'Своя сборка', failed: 'Ошибка, не списано', lang: 'English', refresh: 'Обновить', err: 'Сервис недоступен', notConf: 'В этой сборке не указан адрес сервиса.', signOut: 'Выйти',
  },
}

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
}

/** US numbers read as (555) 010-2030; anything else is shown as typed. */
const fmtPhone = (p = '') => {
  const m = /^1?(\d{3})(\d{3})(\d{4})$/.exec(p.replace(/\D/g, ''))
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p
}

async function squareLogo(file: File): Promise<string> {
  const src = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file) })
  const img = await loadImage(src)
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const out = Math.min(512, side)
  const c = document.createElement('canvas')
  c.width = c.height = out
  c.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out)
  return c.toDataURL('image/png')
}

const focusFromHash = () => /client=([\w]+)/.exec(location.hash)?.[1] ?? null

const onFailRef = (e: ApiError) => console.warn(e)

export default function Admin() {
  const [lang, setLang] = useState<'en' | 'ru'>(() => (ls.get('cs-admin-lang') as 'en' | 'ru') || (navigator.language.startsWith('ru') ? 'ru' : 'en'))
  const t = L[lang]
  const [authed, setAuthed] = useState(() => !!adminPass())
  const [passInput, setPassInput] = useState('')
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(focusFromHash)
  const [home, setHome] = useHome(onFailRef)

  const onFail = useCallback((e: ApiError) => {
    if (e.status === 401) { adminLogout(); setAuthed(false); setError(t.wrong) }
    else setError(e.status ? e.message : t.err)
  }, [t.err, t.wrong])

  const load = useCallback(async () => {
    if (!adminPass()) return
    try {
      const [summary, clients, renders, shops] = await Promise.all([adminSummary(), adminClients(), adminGenerations(), adminShops()])
      setData({ summary, clients, renders, shops, brand: shops.find((x) => x.id === 'main') ?? shops[0] })
      adminHome().then(setHome).catch(() => {})
      setError(null)
    } catch (e) {
      onFail(e as ApiError)
    }
  }, [onFail, setHome])

  useEffect(() => {
    if (!authed) return
    load()
    const iv = setInterval(load, 30000)
    const onHash = () => setFocus(focusFromHash())
    const onVis = () => document.visibilityState === 'visible' && load()
    addEventListener('hashchange', onHash)
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(iv); removeEventListener('hashchange', onHash); document.removeEventListener('visibilitychange', onVis) }
  }, [authed, load])

  useEffect(() => { document.documentElement.lang = lang; ls.set('cs-admin-lang', lang) }, [lang])
  useEffect(() => { if (focus && data) document.getElementById('c-' + focus)?.scrollIntoView({ block: 'center' }) }, [focus, data])

  const enablePush = async () => {
    setPushMsg(null)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setPushMsg(t.pushIos); return }
      const key = data?.brand.vapidPublic
      if (!key) { setPushMsg(t.pushNoKeys); return }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPushMsg(t.denied); return }
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      const appKey = b64uToBytes(key)
      if (sub && appKey.join() !== new Uint8Array(sub.options.applicationServerKey ?? new ArrayBuffer(0)).join()) { await sub.unsubscribe(); sub = null }
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey })
      await adminSubscribe(sub.toJSON())
      const r = (await adminTestPush()) as { sent?: number }
      setPushMsg(t.testSent(r.sent ?? 0))
    } catch (e) {
      setPushMsg((e as Error).message)
    }
  }

  const fmtTime = (ts: number) => new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(ts)
  const usd = (v: number | null | undefined) => (v == null ? '—' : `$${v < 1 ? v.toFixed(3) : v.toFixed(2)}`)
  const cr = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(2)} cr`)
  const appUrl = new URL('./', location.href).href

  if (!API) return <main className="adm narrow"><h1>{t.title}</h1><p className="err">{t.notConf}</p></main>

  if (!authed) {
    return (
      <main className="adm narrow">
        <h1>{t.title}</h1>
        <form className="card" onSubmit={async (e) => {
          e.preventDefault()
          try { await adminLogin(passInput.trim()); setError(null); setAuthed(true) } catch (e2) { const x = e2 as ApiError; setError(x.status === 401 ? t.wrong : t.err) }
        }}>
          <label className="fld"><span>{t.pass}</span><input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} autoComplete="current-password" /></label>
          {error && <p className="err">{error}</p>}
          <button className="btn y">{t.enter}</button>
        </form>
      </main>
    )
  }

  const s = data?.summary
  return (
    <main className="adm">
      <header className="top">
        <div className="who">{data && <BrandMark brand={data.brand} size={36} />}<div><b>{data ? shopName(data.brand) : '…'}</b><span>{t.title}</span></div></div>
        <nav>
          <a className="btn" href={appUrl} target="_blank" rel="noreferrer">{t.openApp}</a>
          <button className="btn ghost" onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>{t.lang}</button>
        </nav>
      </header>
      {error && <p className="err">{error} <button className="lnk" onClick={load}>{t.refresh}</button></p>}

      {data && s && (
        <>
          <section className="tiles">
            <div className="tile"><span>{t.clients}</span><b>{s.clients}</b></div>
            <div className="tile"><span>{t.renders}</span><b>{s.generations}</b></div>
            <div className="tile"><span>{t.cost}</span><b>{usd(s.spentUsd)}</b><small>{cr(s.spentCredits)} · {t.costHint}</small></div>
            <div className="tile"><span>{t.balance}</span><b>{s.balance != null ? s.balance.toFixed(2) : '—'}</b><small>{s.price != null ? t.perRender(cr(s.price), usd(s.price * s.usdPerCredit)) : ''}</small></div>
          </section>

          <HomeCard lang={lang} items={home} onChange={setHome} onFail={onFail} />

          <Shops lang={lang} shops={data.shops} clients={data.clients} squareLogo={squareLogo} onChanged={load} onFail={onFail} />

          <div className="cols">
            <section className="card">
              <h2>{t.pushT}</h2>
              <p className="muted">{t.pushP}</p>
              <button className="btn y" onClick={enablePush}>{t.pushOn}</button>
              {pushMsg && <p className="small">{pushMsg}</p>}
              {/iPhone|iPad/.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches && <p className="muted small">{t.pushIos}</p>}
            </section>

          </div>

          <section className="card">
            <h2>{t.clientsT} <span className="muted">{data.clients.length}</span></h2>
            {!data.clients.length && <p className="muted">{t.none}</p>}
            <ul className="list">
              {data.clients.map((c) => (
                <li key={c.id} id={'c-' + c.id} className={focus === c.id ? 'hl' : ''}>
                  <div className="main">
                    <b>{c.name || (c.anon ? t.noContacts : '—')}</b>
                    {c.shop && c.shop !== 'main' && <span className="chip">{c.shopName || c.shop}</span>}
                    <a href={`tel:${c.phone}`}>{fmtPhone(c.phone)}</a>
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                  </div>
                  <div className="meta">
                    <span>{t.joined} {fmtTime(c.createdAt)}</span>
                    <span>{t.usedL(c.used, c.left)}</span>
                    <button className="lnk" onClick={async () => { try { await adminAddRenders(c.id, 10); load() } catch (e) { onFail(e as ApiError) } }}>{t.add10}</button>
                  </div>
                  <ClientBuilds lang={lang} id={c.id} home={home} onHome={setHome} onFail={onFail} />
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>{t.rendersT}</h2>
            {!data.renders.length && <p className="muted">{t.noRenders}</p>}
            <ul className="list">
              {data.renders.map((g) => (
                <li key={`${g.at}-${g.userId}`}>
                  <div className="main"><b>{g.label || t.custom}</b><span>{g.name || fmtPhone(g.phone)}</span>{g.shop && g.shop !== 'main' && <span className="chip">{g.shopName || g.shop}</span>}</div>
                  <div className="meta">
                    <span>{fmtTime(g.at)}</span>
                    {g.ok ? <><span className="cost">{usd(g.usd)}</span><span>{cr(g.credits)} · {g.model}</span></> : <span className="err" title={g.error}>{t.failed}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <p className="foot"><button className="lnk" onClick={() => { adminLogout(); setAuthed(false); setData(null) }}>{t.signOut}</button></p>
        </>
      )}
    </main>
  )
}
