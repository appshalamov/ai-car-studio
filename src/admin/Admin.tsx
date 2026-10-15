import { useCallback, useEffect, useState } from 'react'
import {
  API, adminClients, adminGenerations, adminLogin, adminLogout, adminPass, adminSaveBrand, adminSaveLogo, adminSubscribe, adminSummary, adminTestPush, refreshBrand,
  type Brand, type Client, type GenLog, type Summary,
} from '../lib/api'

const APP_URL = new URL('./', location.href).href
const money = (credits: number | null | undefined, rate: number) => (credits == null ? '—' : `${credits.toFixed(2)} кр. · $${(credits * rate).toFixed(credits * rate < 1 ? 3 : 2)}`)
const when = (t: number) => new Date(t).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function Admin() {
  const [authed, setAuthed] = useState(!!adminPass())
  if (!API) return <main className="wrap"><h1>Админка</h1><p className="muted">Сервер ещё не подключён.</p></main>
  return authed ? <Dashboard onLogout={() => { adminLogout(); setAuthed(false) }} /> : <Login onOk={() => setAuthed(true)} />
}

function Login({ onOk }: { onOk: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <main className="wrap narrow">
      <h1>Админка</h1>
      <form className="card stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr('')
        try { await adminLogin(pw.trim()); onOk() } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
      }}>
        <label className="field">Пароль<input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
        {err && <p className="err">{err}</p>}
        <button className="cta" disabled={!pw || busy}>{busy ? 'Проверяю…' : 'Войти'}</button>
      </form>
    </main>
  )
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [sum, setSum] = useState<Summary | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [gens, setGens] = useState<GenLog[]>([])
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    try {
      const [s, c, g] = await Promise.all([adminSummary(), adminClients(), adminGenerations()])
      setSum(s); setClients(c); setGens(g); setErr('')
    } catch (x) {
      if ((x as { status?: number }).status === 401) onLogout()
      else setErr((x as Error).message)
    }
  }, [onLogout])
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t) }, [load])
  const rate = sum?.usdPerCredit ?? 0.15

  return (
    <main className="wrap">
      <header className="top">
        <h1>Админка</h1>
        <div className="row"><a className="btn" href={APP_URL} target="_blank" rel="noreferrer">Открыть приложение</a><button className="btn ghost" onClick={onLogout}>Выйти</button></div>
      </header>
      {err && <p className="err">{err}</p>}

      <section className="tiles">
        <Tile label="Баланс woso" value={sum?.balance != null ? money(sum.balance, rate) : '…'} />
        <Tile label="Себестоимость фото" value={sum?.price != null ? money(sum.price, rate) : '…'} />
        <Tile label="Клиентов" value={sum ? String(sum.clients) : '…'} />
        <Tile label="Генераций" value={sum ? String(sum.generations) : '…'} />
        <Tile label="Потрачено всего" value={sum ? money(sum.spentCredits, rate) : '…'} />
      </section>

      <div className="cols">
        <BrandCard />
        <PushCard />
      </div>

      <section className="card">
        <h2>Клиенты <span className="muted">{clients.length}</span></h2>
        {clients.length ? (
          <div className="table"><table>
            <thead><tr><th>Когда</th><th>Имя</th><th>Телефон</th><th>Email</th><th>Сборки</th></tr></thead>
            <tbody>{clients.map((c) => (
              <tr key={c.id}><td>{when(c.createdAt)}</td><td>{c.name || '—'}</td><td><a href={`tel:${c.phone}`}>{c.phone}</a></td><td><a href={`mailto:${c.email}`}>{c.email}</a></td><td>{c.used} из {c.used + c.left}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted">Пока никто не зарегистрировался.</p>}
      </section>

      <section className="card">
        <h2>Генерации <span className="muted">последние {gens.length}</span></h2>
        {gens.length ? (
          <div className="table"><table>
            <thead><tr><th>Когда</th><th>Клиент</th><th>Модель</th><th>Себестоимость</th><th>Статус</th></tr></thead>
            <tbody>{gens.map((g, i) => (
              <tr key={i}><td>{when(g.at)}</td><td>{g.name || g.phone || '—'}</td><td>{g.model}</td><td>{g.ok ? money(g.credits, rate) : '—'}</td><td>{g.ok ? 'Готово' : <span className="err" title={g.error}>Ошибка</span>}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted">Генераций пока не было.</p>}
      </section>
    </main>
  )
}

const Tile = ({ label, value }: { label: string; value: string }) => <div className="tile"><span>{label}</span><b>{value}</b></div>

function BrandCard() {
  const [b, setB] = useState<Brand | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [free, setFree] = useState(3)
  const [msg, setMsg] = useState('')
  useEffect(() => { refreshBrand().then((x) => { setB(x); setName(x.name); setPhone(x.phone); setFree(x.free) }).catch((e) => setMsg(e.message)) }, [])

  const upload = async (file: File) => {
    setMsg('Загружаю логотип…')
    try { setB(await adminSaveLogo(await squarePng(file, 512))); setMsg('✓ Логотип обновлён') } catch (e) { setMsg((e as Error).message) }
  }
  return (
    <section className="card stack">
      <h2>Ваш бренд в приложении</h2>
      <div className="preview">
        {b?.logo ? <img src={b.logo} alt="" /> : <div className="ph">Лого</div>}
        <div><b>{name || 'Ваша компания'}</b><small>{phone || 'телефон компании'}</small></div>
      </div>
      <label className="field">Логотип (квадратная картинка)
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      </label>
      {b?.logo && <button className="btn ghost" onClick={async () => { setB(await adminSaveLogo(null)); setMsg('Логотип убран') }}>Убрать логотип</button>}
      <label className="field">Название компании<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Например, Miami Detail Pro" /></label>
      <label className="field">Телефон компании<input value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} placeholder="+1 305 555 0100" inputMode="tel" /></label>
      <label className="field">Бесплатных сборок на клиента<input type="number" min={0} max={100} value={free} onChange={(e) => setFree(parseInt(e.target.value, 10) || 0)} /></label>
      <button className="cta" onClick={async () => {
        try { setB(await adminSaveBrand({ name, phone, free })); setMsg('✓ Сохранено, клиенты увидят при следующем открытии') } catch (e) { setMsg((e as Error).message) }
      }}>Сохранить</button>
      {msg && <p className="muted small">{msg}</p>}
    </section>
  )
}

function PushCard() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const ios = /iphone|ipad/i.test(navigator.userAgent)
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
  const [state, setState] = useState(supported ? Notification.permission : 'unsupported')
  const [msg, setMsg] = useState('')
  const enable = async () => {
    setMsg('')
    try {
      const brand = await refreshBrand()
      if (!brand.vapidPublic) throw new Error('На сервере не настроены ключи уведомлений')
      const perm = await Notification.requestPermission()
      setState(perm)
      if (perm !== 'granted') throw new Error('Уведомления запрещены в настройках браузера')
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(brand.vapidPublic) }))
      await adminSubscribe(sub.toJSON())
      await adminTestPush()
      setMsg('✓ Готово, сейчас придёт тестовое уведомление')
    } catch (e) { setMsg((e as Error).message) }
  }
  return (
    <section className="card stack">
      <h2>Уведомления</h2>
      <p className="muted small">Пуш на это устройство: новая регистрация (с контактами клиента) и каждая генерация с её себестоимостью.</p>
      {ios && !standalone ? (
        <p className="small">На iPhone сначала добавьте эту страницу на экран «Домой»: «Поделиться» → «На экран Домой», затем откройте её оттуда и нажмите кнопку ниже.</p>
      ) : null}
      {supported ? <button className="cta" onClick={enable}>{state === 'granted' ? 'Переподключить уведомления' : 'Включить уведомления'}</button> : <p className="err">Этот браузер не поддерживает пуш-уведомления.</p>}
      {state === 'granted' && <button className="btn ghost" onClick={async () => { try { const r = await adminTestPush() as { sent: number }; setMsg(`Отправлено на устройств: ${r.sent}`) } catch (e) { setMsg((e as Error).message) } }}>Отправить тестовое</button>}
      {msg && <p className="muted small">{msg}</p>}
    </section>
  )
}

function b64ToBytes(s: string) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

/** Center-crop to a square and scale, so any photo works as a logo. */
async function squarePng(file: File, size: number): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Не удалось открыть картинку')); i.src = url })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const c = document.createElement('canvas')
    c.width = c.height = Math.min(size, side)
    c.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, c.width, c.height)
    return c.toDataURL('image/png')
  } finally { URL.revokeObjectURL(url) }
}
