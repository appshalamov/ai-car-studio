import { useLang } from '../lib/i18n'
import type { Brand } from '../lib/api'
import { IMG, STYLES } from '../lib/tuning'
import { BeforeAfter } from '../components/BeforeAfter'
import { BrandMark } from '../components/Brand'
import { IconGear, IconLock } from '../components/Icons'

export default function Home({ active, brand, onSettings, onStart, onStyle }: { active: boolean; brand: Brand; onSettings: () => void; onStart: () => void; onStyle: (id: string) => void }) {
  const { t, lang } = useLang()
  return (
    <section className="screen" hidden={!active}>
      <div className="bar">
        <BrandMark brand={brand} />
        <button className="ibtn" onClick={onSettings} aria-label={t('Настройки', 'Settings')}><IconGear /></button>
      </div>
      <BeforeAfter before={IMG('stock')} after={IMG('blackout')} hint labels={[t('Ваше фото', 'Your photo'), t('Ваша сборка', 'Your build')]} />
      <div className="pad">
        <h1 className="hero-t">{t('Посмотрите на свою машину с тюнингом до покупки деталей', 'See your car tuned before you buy a single part')}</h1>
        <p className="hero-p">{t('Загрузите фото своей машины, выберите стиль и получите реалистичную картинку сборки примерно за минуту.', 'Upload a photo of your own car, pick a style, and get a realistic picture of the build in about a minute.')}</p>
        <button className="cta" onClick={onStart}>{t('Загрузить машину', 'Upload your car')}</button>
        <p className="note"><IconLock /><span>{t('Фото отправляется, только когда нажмёте «Собрать»', 'Your photo is sent only when you tap Render')}</span></p>
        <h2 className="h2">{t('Как это работает', 'How it works')}</h2>
        <ol className="steps">
          <li><span className="num">1</span><div><b>{t('Сфотографируйте машину', 'Take a photo')}</b><span>{t('Целиком в кадре, сбоку или в три четверти, лучше днём.', 'Whole car in frame, side or three-quarter view, daylight works best.')}</span></div></li>
          <li><span className="num">2</span><div><b>{t('Выберите стиль или детали', 'Pick a style or parts')}</b><span>{t('Начните с готового стиля или подберите цвет, диски, посадку и тонировку сами.', 'Start from a ready style, or choose paint, wheels, stance and tint yourself.')}</span></div></li>
          <li><span className="num">3</span><div><b>{t('Сравните и сохраните', 'Compare and keep it')}</b><span>{t('Проведите по фото, чтобы сравнить, сохраните сборку или отправьте её мастеру.', 'Drag across the photo to compare, then save the build or send it to the shop.')}</span></div></li>
        </ol>
        <h2 className="h2">{t('Популярные стили', 'Popular styles')}</h2>
      </div>
      <div className="rail">
        {STYLES.map((s) => (
          <button key={s.id} onClick={() => onStyle(s.id)}>
            <img src={IMG(s.id)} alt="" loading="lazy" /><b>{s[lang][0]}</b><span>{s[lang][1]}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
