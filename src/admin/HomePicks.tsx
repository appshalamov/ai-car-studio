import { useEffect, useState } from 'react'
import { adminAddHome, adminClientBuilds, adminHome, adminRemoveHome, type ApiError, type Build, type HomeCar } from '../lib/api'

const L = {
  en: { builds: 'Builds', hide: 'Hide', none: 'No saved builds.', toHome: 'Put on home screen', onHome: 'On home screen', homeT: 'Home screen photos', homeP: 'Shown first in the before/after carousel of the app. Pick builds from clients below.', empty: 'Nothing picked yet: the app shows the demo photos.', remove: 'Remove', model: 'Car model, e.g. Mercedes-Benz E-Class' },
  ru: { builds: 'Сборки', hide: 'Скрыть', none: 'Сохранённых сборок нет.', toHome: 'На главную', onHome: 'На главной', homeT: 'Фото на главной', homeP: 'Показываются первыми в карусели «до/после» в приложении. Выберите сборки клиентов ниже.', empty: 'Пока ничего не выбрано: в приложении демо-фото.', remove: 'Убрать', model: 'Модель машины, например Mercedes-Benz E-Class' },
}

export function HomeCard({ lang, items, onChange, onFail }: { lang: 'en' | 'ru'; items: HomeCar[]; onChange: (l: HomeCar[]) => void; onFail: (e: ApiError) => void }) {
  const t = L[lang]
  return (
    <section className="card">
      <h2>{t.homeT}</h2>
      <p className="muted">{t.homeP}</p>
      {!items.length && <p className="muted small">{t.empty}</p>}
      <div className="picks">
        {items.map((h) => (
          <figure key={h.slug}>
            <img src={h.after} alt="" />
            <figcaption><b>{h.model || '—'}</b><span>{h.mods_ru}</span></figcaption>
            <button className="lnk red" onClick={async () => { try { onChange(await adminRemoveHome(h.slug)) } catch (e) { onFail(e as ApiError) } }}>{t.remove}</button>
          </figure>
        ))}
      </div>
    </section>
  )
}

export function useHome(onFail: (e: ApiError) => void) {
  const [home, setHome] = useState<HomeCar[]>([])
  useEffect(() => { adminHome().then(setHome).catch(onFail) }, [onFail])
  return [home, setHome] as const
}

export function ClientBuilds({ lang, id, home, onHome, onFail }: { lang: 'en' | 'ru'; id: string; home: HomeCar[]; onHome: (l: HomeCar[]) => void; onFail: (e: ApiError) => void }) {
  const t = L[lang]
  const [open, setOpen] = useState(false)
  const [builds, setBuilds] = useState<Build[] | null>(null)
  const toggle = async () => {
    setOpen(!open)
    if (!builds) try { setBuilds(await adminClientBuilds(id)) } catch (e) { onFail(e as ApiError) }
  }
  return (
    <div className="cbuilds">
      <button className="lnk" onClick={toggle}>{open ? t.hide : t.builds}</button>
      {open && builds && (
        builds.length ? (
          <div className="picks">
            {builds.map((b) => {
              const on = home.some((h) => h.after === b.after)
              return (
                <figure key={b.id}>
                  {b.before && <img src={b.before} alt="" />}
                  <img src={b.after} alt="" />
                  <figcaption><span>{b.label}</span></figcaption>
                  <button className="btn y" disabled={on || !b.before} onClick={async () => {
                    const model = prompt(t.model, '') ?? ''
                    try { onHome(await adminAddHome({ before: b.before!, after: b.after, model, mods: b.label })) } catch (e) { onFail(e as ApiError) }
                  }}>{on ? t.onHome : t.toHome}</button>
                </figure>
              )
            })}
          </div>
        ) : <p className="muted small">{t.none}</p>
      )}
    </div>
  )
}
