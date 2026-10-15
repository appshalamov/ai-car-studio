import { useState } from 'react'
import { PLACEHOLDER_NAME, adminCreateShop, adminDeleteShop, adminShopLogo, adminUpdateShop, shopLink, shopName, type ApiError, type Client, type Shop, type ShopInput } from '../lib/api'
import { BrandMark } from '../components/BrandMark'
import { useCars } from '../lib/cars'

const L = {
  en: {
    title: 'Body shops and links', sub: 'Each shop gets its own link. Clients who open it see that shop\'s name, logo and phone, and show up here marked with the shop.',
    main: 'Main link', add: 'Add a body shop', edit: 'Edit', del: 'Delete', delQ: 'Delete this shop? Its link stops showing its brand; clients stay in the list.',
    copy: 'Copy link', copied: 'Copied', share: 'Send', open: 'Open',
    name: 'Shop name', phone: 'Phone clients can call', free: 'Free renders per client', logo: 'Logo', logoP: 'Square works best; it is cropped to a square.',
    upload: 'Upload logo', remove: 'Remove logo', create: 'Create link', save: 'Save', cancel: 'Cancel', preview: 'What clients see',
    clients: (n: number) => (n === 1 ? '1 client' : `${n} clients`), free_: (n: number) => `${n} free`, newT: 'New body shop', editT: 'Edit shop',
    ready: 'Link is ready. Send it to the shop or to clients:', cta: 'See your car in a new color', call: 'Call',
  },
  ru: {
    title: 'Автосервисы и ссылки', sub: 'У каждого сервиса своя ссылка. Клиент, открывший её, видит название, логотип и телефон этого сервиса, а здесь появляется с пометкой сервиса.',
    main: 'Основная ссылка', add: 'Добавить автосервис', edit: 'Изменить', del: 'Удалить', delQ: 'Удалить сервис? Его ссылка перестанет показывать его бренд, клиенты останутся в списке.',
    copy: 'Скопировать ссылку', copied: 'Скопировано', share: 'Отправить', open: 'Открыть',
    name: 'Название сервиса', phone: 'Телефон для клиентов', free: 'Бесплатных генераций на клиента', logo: 'Логотип', logoP: 'Лучше квадратный, обрезается до квадрата.',
    upload: 'Загрузить логотип', remove: 'Убрать логотип', create: 'Создать ссылку', save: 'Сохранить', cancel: 'Отмена', preview: 'Так увидит клиент',
    clients: (n: number) => `клиентов: ${n}`, free_: (n: number) => `бесплатно: ${n}`, newT: 'Новый автосервис', editT: 'Изменить сервис',
    ready: 'Ссылка готова. Отправьте её сервису или клиентам:', cta: 'Посмотрите машину в новом цвете', call: 'Позвонить',
  },
}

type Props = {
  lang: 'en' | 'ru'
  shops: Shop[]
  clients: Client[]
  squareLogo: (f: File) => Promise<string>
  onChanged: () => void
  onFail: (e: ApiError) => void
}

type Draft = { id: string | null; form: ShopInput; logo: string | null; logoChanged: boolean }

export function Shops({ lang, shops, clients, squareLogo, onChanged, onFail }: Props) {
  const t = L[lang]
  const cars = useCars()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const count = (id: string) => clients.filter((c) => (c.shop || 'main') === id).length

  const copy = async (id: string) => {
    const url = shopLink(id)
    try { await navigator.clipboard.writeText(url) } catch {
      const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(id)
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800)
  }
  const share = (s: Shop) => navigator.share?.({ title: shopName(s), url: shopLink(s.id) }).catch(() => {})

  const startNew = () => { setFresh(null); setDraft({ id: null, form: { name: '', phone: '', free: shops[0]?.free ?? 3 }, logo: null, logoChanged: false }) }
  const startEdit = (s: Shop) => { setFresh(null); setDraft({ id: s.id, form: { name: s.name, phone: s.phone, free: s.free }, logo: s.logo, logoChanged: false }) }

  const save = async () => {
    if (!draft) return
    setBusy(true)
    try {
      if (draft.id) {
        await adminUpdateShop(draft.id, draft.form)
        if (draft.logoChanged) await adminShopLogo(draft.id, draft.logo)
      } else {
        const s = await adminCreateShop({ ...draft.form, logo: draft.logo })
        setFresh(s.id)
      }
      setDraft(null)
      onChanged()
    } catch (e) {
      onFail(e as ApiError)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    try { await adminDeleteShop(id); setConfirmDel(null); onChanged() } catch (e) { onFail(e as ApiError) }
  }

  const preview = draft && { name: draft.form.name, phone: draft.form.phone, logo: draft.logo, free: draft.form.free, vapidPublic: null }

  return (
    <section className="card shops">
      <div className="h2row">
        <h2>{t.title}</h2>
        {!draft && <button className="btn y" onClick={startNew}>{t.add}</button>}
      </div>
      <p className="muted">{t.sub}</p>

      {draft && preview && (
        <div className="editor">
          <div className="ed-form">
            <h3>{draft.id ? t.editT : t.newT}</h3>
            <label className="fld"><span>{t.name}</span><input autoFocus value={draft.form.name} maxLength={60} placeholder={PLACEHOLDER_NAME} onChange={(e) => setDraft({ ...draft, form: { ...draft.form, name: e.target.value } })} /></label>
            <label className="fld"><span>{t.phone}</span><input type="tel" value={draft.form.phone} maxLength={30} placeholder="(555) 123-4567" onChange={(e) => setDraft({ ...draft, form: { ...draft.form, phone: e.target.value } })} /></label>
            <label className="fld"><span>{t.free}</span><input type="number" min={0} max={100} value={draft.form.free} onChange={(e) => setDraft({ ...draft, form: { ...draft.form, free: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) } })} /></label>
            <div className="fld"><span>{t.logo}</span>
              <div className="logo-row">
                <BrandMark brand={preview} size={56} />
                <div>
                  <label className="btn">{t.upload}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setDraft({ ...draft, logo: await squareLogo(f), logoChanged: true }) }} /></label>
                  {draft.logo && <button className="lnk" onClick={() => setDraft({ ...draft, logo: null, logoChanged: true })}>{t.remove}</button>}
                  <small className="muted">{t.logoP}</small>
                </div>
              </div>
            </div>
            <div className="ed-actions">
              <button className="btn y" onClick={save} disabled={busy}>{draft.id ? t.save : t.create}</button>
              <button className="btn ghost" onClick={() => setDraft(null)}>{t.cancel}</button>
            </div>
          </div>
          <div className="phone-prev" aria-label={t.preview}>
            <small className="muted">{t.preview}</small>
            <div className="phone">
              <div className="ph-bar"><BrandMark brand={preview} size={26} /><b>{shopName(preview)}</b></div>
              <div className="ph-photo"><img src={cars[0].after} alt="" /></div>
              <p className="ph-t">{t.cta}</p>
              <div className="ph-cta" />
              <div className="ph-foot"><BrandMark brand={preview} size={22} /><span>{shopName(preview)}</span>{preview.phone && <i>{t.call}</i>}</div>
            </div>
          </div>
        </div>
      )}

      <ul className="list shop-list">
        {shops.map((s) => (
          <li key={s.id} className={fresh === s.id ? 'hl' : ''}>
            <div className="shop-main">
              <BrandMark brand={s} size={40} />
              <div>
                <b>{s.id === 'main' ? `${shopName(s)} · ${t.main}` : shopName(s)}</b>
                <span className="muted small">{[s.phone, t.free_(s.free), t.clients(count(s.id))].filter(Boolean).join(' · ')}</span>
              </div>
            </div>
            {fresh === s.id && <p className="small">{t.ready}</p>}
            <div className="linkrow">
              <input readOnly value={shopLink(s.id)} onFocus={(e) => e.currentTarget.select()} aria-label={t.copy} />
              <button className="btn y" onClick={() => copy(s.id)}>{copied === s.id ? t.copied : t.copy}</button>
              {'share' in navigator && <button className="btn" onClick={() => share(s)}>{t.share}</button>}
              <a className="btn" href={shopLink(s.id)} target="_blank" rel="noreferrer">{t.open}</a>
              <button className="btn ghost" onClick={() => startEdit(s)}>{t.edit}</button>
              {s.id !== 'main' && (confirmDel === s.id
                ? <><span className="small">{t.delQ}</span><button className="btn red" onClick={() => remove(s.id)}>{t.del}</button><button className="btn ghost" onClick={() => setConfirmDel(null)}>{t.cancel}</button></>
                : <button className="lnk red" onClick={() => setConfirmDel(s.id)}>{t.del}</button>)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
