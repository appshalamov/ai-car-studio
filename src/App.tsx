import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from './lib/i18n'
import { useInstall } from './lib/install'
import { useBrand } from './lib/brand'
import type { Sel } from './lib/tuning'
import { Sheet, UiCtx } from './components/ui'
import { brandName } from './components/Brand'
import { IconGallery, IconHome, IconPhone, IconTune } from './components/Icons'
import Home from './pages/Home'
import Tuning from './pages/Tuning'
import Gallery from './pages/Gallery'

export type Tab = 'home' | 'tune' | 'gal'
/** A request to open Tuning with a given photo and selection (from Home or Gallery). */
export type TuneReq = { n: number; photo?: string; style?: string | null; sel?: Sel }

export default function App() {
  const { t, lang, setLang } = useLang()
  const brand = useBrand()
  const inst = useInstall()
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [settings, setSettings] = useState(false)
  const [req, setReq] = useState<TuneReq>({ n: 0 })
  const [msg, setMsg] = useState<{ text: string; on: boolean }>({ text: '', on: false })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const toast = useCallback((text: string) => {
    setMsg({ text, on: true })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg((m) => ({ ...m, on: false })), 2400)
  }, [])

  const name = brandName(brand, t)
  useEffect(() => { document.title = brand.name.trim() || 'Car Studio' }, [brand.name])
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const openTune = (r: Omit<TuneReq, 'n'>) => { setReq((p) => ({ ...r, n: p.n + 1 })); setTab('tune') }
  const closeSettings = useCallback(() => setSettings(false), [])

  const tabs: [Tab, string, () => React.JSX.Element][] = [
    ['home', t('Главная', 'Home'), IconHome],
    ['tune', t('Тюнинг', 'Tuning'), IconTune],
    ['gal', t('Галерея', 'Gallery'), IconGallery],
  ]

  return (
    <UiCtx.Provider value={{ root, toast }}>
      <div className="app" id="app" ref={setRoot}>
        <Home active={tab === 'home'} brand={brand} onSettings={() => setSettings(true)} onStart={() => setTab('tune')} onStyle={(style) => openTune({ photo: 'sample', style })} />
        <Tuning active={tab === 'tune'} brand={brand} req={req} />
        <Gallery active={tab === 'gal'} brand={brand} onAgain={openTune} />

        <nav className="tabbar">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Icon /><span>{label}</span><i className="dot" />
            </button>
          ))}
        </nav>

        <Sheet open={settings} onClose={closeSettings} label={t('Настройки', 'Settings')}>
          <h3>{t('Настройки', 'Settings')}</h3>
          <div className="field">
            <span className="label">{t('Язык', 'Language')}</span>
            <div className="opt">
              <button aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>Русский</button>
              <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
            </div>
          </div>
          {!inst.standalone && (inst.canPrompt || inst.ios) && (
            <div className="field">
              <span className="label">{t('Приложение', 'App')}</span>
              {inst.canPrompt
                ? <button className="cta2" onClick={inst.prompt}>{t('Установить приложение', 'Install the app')}</button>
                : <small>{t('Чтобы установить: нажмите «Поделиться» в Safari, затем «На экран Домой».', 'To install: tap Share in Safari, then Add to Home Screen.')}</small>}
            </div>
          )}
          {brand.phone && (
            <div className="field">
              <span className="label">{name}</span>
              <a className="cta2 call" href={`tel:${brand.phone.replace(/[^\d+]/g, '')}`}><IconPhone />{brand.phone}</a>
            </div>
          )}
          <button className="cta" style={{ marginTop: 22 }} onClick={closeSettings}>{t('Готово', 'Done')}</button>
        </Sheet>

        <div className={`toast ${msg.on ? 'on' : ''}`} role="status">{msg.text}</div>
      </div>
    </UiCtx.Provider>
  )
}
