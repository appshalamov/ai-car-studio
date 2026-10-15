import { useT } from '../lib/i18n'
import type { Build } from '../lib/api'
import type { Car } from '../lib/cars'
import { IBell } from '../components/Icons'

export type GalleryItem = Build & { example?: boolean }

/** Real before/after pairs shown until the client has builds of their own. */
export const examples = (cars: Car[], lang: 'en' | 'ru'): GalleryItem[] =>
  cars.map((c, i) => ({ id: 'ex-' + c.slug, at: -i, label: `${c.model} · ${lang === 'ru' ? c.mods_ru : c.mods_en}`, before: c.before, after: c.after, example: true }))

type Props = {
  active: boolean
  items: GalleryItem[]
  pending: boolean
  /** Shown in the installed app until the client allows "build is ready" pushes. */
  askPush: boolean
  installBanner: boolean
  onPush: () => void
  onInstall: () => void
  onOpen: (b: GalleryItem) => void
}

export function Gallery({ active, items, pending, askPush, installBanner, onPush, onInstall, onOpen }: Props) {
  const { t, lang } = useT()
  const fmt = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' })
  const today = new Date().toDateString()
  const mine = items.filter((b) => !b.example).length
  return (
    <section className="screen" hidden={!active} aria-label={t.tGal}>
      <div className="g-head"><h1 className="t-title">{t.galT}</h1><span>{mine ? t.builds(mine) : ''}</span></div>
      {installBanner && (
        <button className="banner" onClick={onInstall}><span>{t.inst.banner}</span><b>{t.inst.go}</b></button>
      )}
      {askPush && (
        <button className="banner" onClick={onPush}><IBell /><span>{t.pushAsk}</span><b>{t.pushGo}</b></button>
      )}
      {!mine && !pending && <p className="g-note">{t.galEmpty}</p>}
      <div className="grid">
        {pending && (
          <div className="tile pending" role="status"><div className="sweep" /><b>{t.rendering}</b><span>{t.pendingP}</span></div>
        )}
        {items.map((b) => (
          <button key={b.id} className="tile" onClick={() => onOpen(b)}>
            <img src={b.after} alt="" loading="lazy" />
            <b>{b.label || t.custom}</b>
            <span>{b.example ? t.example : new Date(b.at).toDateString() === today ? t.today : fmt.format(b.at)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
