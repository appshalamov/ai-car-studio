import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useLang } from './lib/i18n'
import { useInstall } from './lib/install'
import Home from './pages/Home'

const CarMods = lazy(() => import('./pages/CarMods'))
const BikeMods = lazy(() => import('./pages/BikeMods'))
const PhotoEditor = lazy(() => import('./pages/PhotoEditor'))
const Backgrounds = lazy(() => import('./pages/Backgrounds'))
const TeslaWrap = lazy(() => import('./pages/TeslaWrap'))
const Gallery = lazy(() => import('./pages/Gallery'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Settings = lazy(() => import('./pages/Settings'))

export default function App() {
  const { t, lang, setLang } = useLang()
  const inst = useInstall()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useEffect(() => { setMenu(false); window.scrollTo(0, 0) }, [loc.pathname])

  const nav = [
    ['/car', t('Тюнинг авто', 'Car Mods')],
    ['/editor', t('Редактор', 'Photo Editor')],
    ['/bike', t('Мото', 'Bike Mods')],
    ['/backgrounds', t('Фоны для дилеров', 'Dealer Backgrounds')],
    ['/wrap', t('Винил Tesla', 'Tesla Wraps')],
    ['/gallery', t('Галерея', 'Gallery')],
    ['/pricing', t('Тарифы', 'Pricing')],
  ]

  return (
    <div className="app">
      <header className="top">
        <Link to="/" className="logo"><img src="./favicon.svg" alt="" /><span>AI Car <b>Studio</b></span></Link>
        <nav className={`nav ${menu ? 'open' : ''}`}>
          {nav.map(([to, label]) => <NavLink key={to} to={to}>{label}{to === '/wrap' && <span className="badge">{t('Новое', 'New')}</span>}</NavLink>)}
        </nav>
        <div className="top-actions">
          {inst.canPrompt && !inst.standalone && <button className="btn small primary" onClick={inst.prompt}>📲 {t('Установить', 'Install')}</button>}
          <button className="btn small ghost" onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>{lang === 'ru' ? 'EN' : 'RU'}</button>
          <NavLink to="/settings" className="btn small ghost" title={t('Настройки', 'Settings')}>⚙︎</NavLink>
          <button className="btn small ghost burger" onClick={() => setMenu((m) => !m)} aria-label="menu">☰</button>
        </div>
      </header>
      <main>
        <Suspense fallback={<div className="page"><div className="spinner" /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/car" element={<CarMods />} />
            <Route path="/bike" element={<BikeMods />} />
            <Route path="/editor" element={<PhotoEditor />} />
            <Route path="/backgrounds" element={<Backgrounds />} />
            <Route path="/wrap" element={<TeslaWrap />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="foot">
        <div><b>AI Car Studio</b><p className="muted small">{t('AI-визуализация тюнинга и фото для автобизнеса.', 'AI mod previews and photos for auto businesses.')}</p></div>
        <div className="foot-links">
          {nav.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
          <Link to="/settings">{t('Настройки', 'Settings')}</Link>
        </div>
      </footer>
      <nav className="tabbar">
        <NavLink to="/" end><span>🏠</span>{t('Главная', 'Home')}</NavLink>
        <NavLink to="/car"><span>🏎️</span>{t('Тюнинг', 'Mods')}</NavLink>
        <NavLink to="/editor"><span>🧽</span>{t('Фото', 'Editor')}</NavLink>
        <NavLink to="/backgrounds"><span>🏢</span>{t('Фоны', 'Dealers')}</NavLink>
        <NavLink to="/gallery"><span>🖼️</span>{t('Галерея', 'Gallery')}</NavLink>
      </nav>
    </div>
  )
}
