import { useT } from '../lib/i18n'
import { STYLES } from '../lib/build'
import type { Build } from '../lib/db'

export type GalleryItem = Build & { example?: boolean }

/** Shown until the client saves their own builds. */
export const EXAMPLES: GalleryItem[] = ['blackout', 'track', 'heritage', 'oem', 'nardo'].map((id, i) => ({
  id: 'ex-' + id,
  before: './img/stock.jpg',
  after: `./img/${id}.jpg`,
  label: '',
  sel: STYLES.find((s) => s.id === id)!.set,
  style: id,
  createdAt: 0 - i,
  example: true,
}))

export function Gallery({ active, items, onOpen }: { active: boolean; items: GalleryItem[]; onOpen: (b: GalleryItem) => void }) {
  const { t, lang } = useT()
  const fmt = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' })
  const today = new Date().toDateString()
  const name = (b: GalleryItem) => (b.style ? STYLES.find((s) => s.id === b.style)?.[lang][0] : null) ?? b.label
  const mine = items.filter((b) => !b.example).length
  return (
    <section className="screen" hidden={!active} aria-label={t.tGal}>
      <div className="g-head"><h1 className="t-title">{t.galT}</h1><span>{mine ? t.builds(mine) : ''}</span></div>
      <div className="grid">
        {items.map((b) => (
          <button key={b.id} onClick={() => onOpen(b)}>
            <img src={b.after} alt="" loading="lazy" />
            <b>{name(b)}</b>
            <span>{b.example ? t.example : new Date(b.createdAt).toDateString() === today ? t.today : fmt.format(b.createdAt)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
