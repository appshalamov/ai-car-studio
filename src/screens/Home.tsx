import { useT } from '../lib/i18n'
import { STYLES } from '../lib/build'
import { shopName, type Brand } from '../lib/api'
import { BeforeAfter } from '../components/BeforeAfter'
import { BrandMark } from '../components/BrandMark'
import { IGear, ILock } from '../components/Icons'

type Props = { brand: Brand; freeLeft: number; onUpload: () => void; onStyle: (id: string) => void; onSettings: () => void }

export function Home({ brand, freeLeft, onUpload, onStyle, onSettings }: Props) {
  const { t, lang } = useT()
  return (
    <section className="screen" aria-label={t.tHome}>
      <div className="bar">
        <span className="brand"><BrandMark brand={brand} /><span className="word">{shopName(brand)}</span></span>
        <button className="ibtn" onClick={onSettings} aria-label={t.setT}><IGear /></button>
      </div>
      <BeforeAfter before="./img/stock.jpg" after="./img/blackout.jpg" labels={[t.before, t.after]} hint />
      <div className="pad">
        <h1 className="hero-t">{t.heroT}</h1>
        <p className="hero-p">{t.heroP}</p>
        <button className="cta" onClick={onUpload}>{t.ctaUpload}</button>
        <p className="note"><ILock /><span>{t.freeNote(freeLeft)}</span></p>
        <h2 className="h2">{t.howT}</h2>
        <ol className="steps">
          <li><span className="num">1</span><div><b>{t.s1}</b><span>{t.s1p}</span></div></li>
          <li><span className="num">2</span><div><b>{t.s2}</b><span>{t.s2p}</span></div></li>
          <li><span className="num">3</span><div><b>{t.s3}</b><span>{t.s3p}</span></div></li>
        </ol>
        <h2 className="h2">{t.startT}</h2>
      </div>
      <div className="rail">
        {STYLES.map((s) => (
          <button key={s.id} onClick={() => onStyle(s.id)}>
            <img src={`./img/${s.id}.jpg`} alt="" loading="lazy" />
            <b>{s[lang][0]}</b>
            <span>{s[lang][1]}</span>
          </button>
        ))}
      </div>
      <footer className="shopfoot pad">
        <BrandMark brand={brand} size={40} />
        <div><b>{shopName(brand)}</b>{brand.phone && <a href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`}>{brand.phone}</a>}</div>
      </footer>
    </section>
  )
}
