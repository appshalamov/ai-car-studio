import { useRef, useState } from 'react'
import { LANGS, useT, type Lang } from '../lib/i18n'
import { shopName, type Brand } from '../lib/api'
import { STYLES, swatch } from '../lib/build'
import { mods, type Car } from '../lib/cars'
import { BeforeAfter } from '../components/BeforeAfter'
import { BrandMark } from '../components/BrandMark'
import { IGear, ILock, IPhone } from '../components/Icons'

type Props = { brand: Brand; cars: Car[]; freeLeft: number; onUpload: () => void; onStyle: (id: string) => void; onSettings: () => void }

export function Home({ brand, cars, freeLeft, onUpload, onStyle, onSettings }: Props) {
  const { t, lang, setLang } = useT()
  const [idx, setIdx] = useState(0)
  const rail = useRef<HTMLDivElement>(null)
  const go = (i: number) => rail.current?.scrollTo({ left: i * rail.current.clientWidth, behavior: 'smooth' })
  const car = cars[Math.min(idx, cars.length - 1)]

  return (
    <section className="screen" aria-label={t.tHome}>
      <div className="bar">
        <span className="brand"><BrandMark brand={brand} /><span className="word">{shopName(brand)}</span></span>
        <span className="barr">
          <select className="langsel" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t.langL}>
            {LANGS.map(([l, n]) => <option key={l} value={l}>{n}</option>)}
          </select>
          <button className="ibtn" onClick={onSettings} aria-label={t.setT}><IGear /></button>
        </span>
      </div>

      <div className="hero">
        <div className="hero-rail" ref={rail} onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))) }}>
          {cars.map((c, i) => (
            <div className="hero-slide" key={c.slug}>
              <BeforeAfter before={c.before} after={c.after} labels={[t.before, t.after]} hint={i === 0} knobOnly={cars.length > 1} />
            </div>
          ))}
        </div>
        <div className="hero-cap pad">
          <div><b>{car.model}</b><span>{mods(car, lang)}</span></div>
          {cars.length > 1 && (
            <div className="dots" role="tablist" aria-label={t.examplesT}>
              {cars.map((c, i) => <button key={c.slug} role="tab" aria-selected={i === idx} aria-label={c.model} onClick={() => go(i)} />)}
            </div>
          )}
        </div>
      </div>

      <div className="pad">
        <h1 className="hero-t">{t.heroT}</h1>
        <p className="hero-p">{t.heroP}</p>
        <button className="cta" onClick={onUpload}>{t.ctaUpload}</button>
        <p className="note"><ILock /><span>{t.freeNote(freeLeft)}</span></p>
      </div>
      <h2 className="h2 pad">{t.startT}</h2>
      <div className="rail looks-rail">
        {STYLES.map((s) => {
          const c = swatch(s.set)
          return (
            <button key={s.id} onClick={() => onStyle(s.id)}>
              <span className="look" style={{ '--p': c.paint ?? 'transparent', '--w': c.wheels ?? 'transparent' } as React.CSSProperties} data-stock={c.paint ? undefined : ''} aria-hidden />
              <b>{s[lang][0]}</b><span>{s[lang][1]}</span>
            </button>
          )
        })}
      </div>
      <div className="pad">
        <h2 className="h2">{t.howT}</h2>
        <ol className="steps">
          <li><span className="num">1</span><div><b>{t.s1}</b><span>{t.s1p}</span></div></li>
          <li><span className="num">2</span><div><b>{t.s2}</b><span>{t.s2p}</span></div></li>
          <li><span className="num">3</span><div><b>{t.s3}</b><span>{t.s3p}</span></div></li>
        </ol>
      </div>
      <footer className="shopfoot pad">
        <BrandMark brand={brand} size={44} />
        <div><b>{shopName(brand)}</b><span>{t.shopLine}</span></div>
        {brand.phone && <a className="callbtn" href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`} aria-label={t.call}><IPhone /></a>}
      </footer>
    </section>
  )
}
