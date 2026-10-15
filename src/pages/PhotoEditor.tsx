import { useState } from 'react'
import { lbl, useLang } from '../lib/i18n'
import { EDITOR_FIXES } from '../lib/catalog'
import { fileToDataUrl } from '../lib/image'
import { runAI } from '../lib/ai'
import { saveHistory } from '../lib/db'
import { Uploader } from '../components/Uploader'
import { BeforeAfter } from '../components/BeforeAfter'
import { ResultActions } from '../components/ResultActions'
import { ApiBanner } from '../components/ApiBanner'
import { PageHead } from '../components/PageHead'

export default function PhotoEditor() {
  const { t, lang } = useLang()
  const [src, setSrc] = useState<string | null>(null)
  const [fixes, setFixes] = useState<string[]>(['stickers', 'plates'])
  const [extra, setExtra] = useState('')
  const [out, setOut] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!src) return
    const items = EDITOR_FIXES.filter((f) => fixes.includes(f.id)).map((f) => `- ${f.p}`)
    if (extra.trim()) items.push(`- ${extra.trim()}`)
    if (!items.length) return
    const prompt = `Retouch this vehicle photo like a professional automotive photo editor:
${items.join('\n')}
Keep the vehicle itself, its color, trim, wheels, angle, framing and the rest of the scene exactly the same and consistent. Photorealistic, no new text or watermark.`
    setBusy(true)
    setError(null)
    try {
      const r = await runAI({ images: [src], prompt })
      setOut(r)
      saveHistory({ tool: 'editor', title: EDITOR_FIXES.filter((f) => fixes.includes(f.id)).map((f) => lbl(f, lang)).join(', ') || extra, before: src, after: r, prompt })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHead
        title={t('AI-редактор автофото', 'AI Car Photo Editor')}
        sub={t('Убирает надписи на стёклах, наклейки, номера, грязь и мелкий мусор, сохраняя машину и сцену.', 'Removes windshield writing, stickers, plates and small distractions while keeping the car and scene consistent.')}
      />
      <ApiBanner />
      {!src ? (
        <Uploader onFiles={async (f) => { setSrc(await fileToDataUrl(f[0])); setOut(null) }} />
      ) : (
        <div className="studio">
          <section className="studio-main">
            <div className="viewer">
              {out ? <BeforeAfter before={src} after={out} labels={[t('До', 'Before'), t('После', 'After')]} /> : <img src={src} alt="" />}
              {busy && <div className="viewer-busy"><div className="spinner" />{t('Обрабатываю…', 'Retouching…')}</div>}
            </div>
            {out && <div className="card pad"><ResultActions image={out} name="clean-photo" onIterate={() => { setSrc(out); setOut(null) }} /></div>}
            <button className="btn ghost" onClick={() => { setSrc(null); setOut(null) }}>← {t('Другое фото', 'Change photo')}</button>
          </section>
          <aside className="studio-side">
            <b>{t('Что убрать или исправить', 'What to remove or fix')}</b>
            <div className="checks">
              {EDITOR_FIXES.map((f) => (
                <label key={f.id} className={`check ${fixes.includes(f.id) ? 'on' : ''}`}>
                  <input type="checkbox" checked={fixes.includes(f.id)} onChange={() => setFixes((x) => (x.includes(f.id) ? x.filter((y) => y !== f.id) : [...x, f.id]))} />
                  {lbl(f, lang)}
                </label>
              ))}
            </div>
            <textarea className="input" rows={3} placeholder={t('Дополнительно: напр. «убрать трещину на лобовом»', 'Anything else, e.g. "remove the crack on the windshield"')} value={extra} onChange={(e) => setExtra(e.target.value)} />
            {error && <div className="error">{error}</div>}
            <button className="btn primary big" disabled={busy || (!fixes.length && !extra.trim())} onClick={run}>{busy ? t('Обработка…', 'Working…') : t('Очистить фото', 'Clean photo')}</button>
          </aside>
        </div>
      )}
    </div>
  )
}
