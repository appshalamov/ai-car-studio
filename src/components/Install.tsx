import { useEffect, useState } from 'react'
import { useT } from '../lib/i18n'
import { shopName, type Brand } from '../lib/api'
import { BrandMark } from './BrandMark'
import { IPlusSq, IShare } from './Icons'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
type W = Window & { __installPrompt?: PromptEvent }

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isPhone = () => /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)

const LATER = 'acs.install-later'
export const installLater = () => { try { return !!localStorage.getItem(LATER) } catch { return false } }

/**
 * "Install the app" pop-up, after the Everpact partner-hub install page:
 * a dark card with the logo and why, then the native button (Android), 3 steps (iPhone) or the address to open on a phone (computer).
 */
export function Install({ brand, first, onClose }: { brand: Brand; first: boolean; onClose: () => void }) {
  const { t } = useT()
  const [canPrompt, setCanPrompt] = useState(() => !!(window as W).__installPrompt)
  const [done, setDone] = useState(isStandalone)
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/i.test(ua)
  const mobile = isPhone()
  const inApp = /Telegram|FBAN|FBAV|Instagram|TikTok|Line\//i.test(ua)
  const iosOther = ios && /CriOS|FxiOS|EdgiOS|YaBrowser/i.test(ua)

  useEffect(() => {
    const on = () => setCanPrompt(true)
    window.addEventListener('install-available', on)
    return () => window.removeEventListener('install-available', on)
  }, [])

  const install = async () => {
    const p = (window as W).__installPrompt
    if (!p) return
    await p.prompt()
    if ((await p.userChoice).outcome === 'accepted') { setDone(true); (window as W).__installPrompt = undefined }
  }

  const later = () => { try { localStorage.setItem(LATER, String(Date.now())) } catch { /* private mode */ } onClose() }

  return (
    <div className="inst">
      {first && (
        <div className="inst-first"><b>{t.inst.firstT}</b><span>{t.inst.firstP}</span></div>
      )}
      <div className="inst-hero">
        <BrandMark brand={brand} size={44} />
        <h3>{t.inst.title(shopName(brand))}</h3>
        <p>{t.inst.why}</p>
      </div>
      {done ? (
        <p className="inst-done">{t.inst.done}</p>
      ) : (
        <div className="inst-body">
          {inApp && <p className="inst-warn">{t.inst.openBrowser}</p>}
          {canPrompt && <button className="cta" onClick={install}>{t.inst.go}</button>}
          {!canPrompt && !mobile && (
            <div className="inst-card">
              <p>{t.inst.desktop}</p>
              <p className="inst-url">{location.href}</p>
              <small>{t.inst.desktopHint}</small>
            </div>
          )}
          {!canPrompt && mobile && (
            <div className="inst-card">
              <b>{ios ? t.inst.iosT : t.inst.andT}</b>
              <ol>
                {ios && <li><span className="n">1</span><span>{iosOther ? t.inst.ios1other : t.inst.ios1}</span></li>}
                <li><span className="n">{ios ? 2 : 1}</span><span>{ios ? t.inst.ios2 : t.inst.and1}</span><i>{ios ? <IShare /> : '⋮'}</i></li>
                <li><span className="n">{ios ? 3 : 2}</span><span>{ios ? t.inst.ios3 : t.inst.and2}</span><i><IPlusSq /></i></li>
              </ol>
            </div>
          )}
        </div>
      )}
      <button className="linkbtn inst-later" onClick={done ? onClose : later}>{done ? t.done : t.inst.later}</button>
    </div>
  )
}
