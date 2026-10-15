import { useMemo, useState } from 'react'
import { useLang } from '../lib/i18n'
import { fileToDataUrl, loadImage } from '../lib/image'
import { runAI } from '../lib/ai'
import { saveHistory } from '../lib/db'
import { PATTERN_IDS, patternUrl } from '../lib/patterns'
import { Car3D, type BodyKind, type Finish } from '../components/Car3D'
import { Uploader } from '../components/Uploader'
import { ApiBanner } from '../components/ApiBanner'
import { PageHead } from '../components/PageHead'

const PATTERN_NAMES: Record<string, [string, string]> = {
  carbon: ['Карбон', 'Carbon'], camo: ['Камуфляж', 'Camo'], digital: ['Цифровой камо', 'Digital camo'],
  stripes: ['Полосы', 'Stripes'], sunset: ['Закат', 'Sunset'], hex: ['Соты', 'Hex'],
}

async function squarePng(src: string, size: number) {
  const img = await loadImage(src)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const s = Math.min(img.naturalWidth, img.naturalHeight)
  c.getContext('2d')!.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size)
  return new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'))
}

export default function TeslaWrap() {
  const { t, lang } = useLang()
  const [texture, setTexture] = useState<string | null>(null)
  const [kind, setKind] = useState<BodyKind>('sedan')
  const [finish, setFinish] = useState<Finish>('gloss')
  const [scale, setScale] = useState(1)
  const [base, setBase] = useState('#d0d4da')
  const [photo, setPhoto] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const thumbs = useMemo(() => Object.fromEntries(PATTERN_IDS.map((id) => [id, patternUrl(id, 160)])), [])

  const gen = async (fromPhoto: boolean) => {
    setBusy(true)
    setError(null)
    const p = fromPhoto
      ? `Turn this image into a seamless, tileable vinyl car wrap design. Flat 2D artwork only (no car, no perspective, no mockup), bold graphic style, vibrant print-ready colors, square composition.${prompt.trim() ? ' Style notes: ' + prompt.trim() : ''}`
      : `A seamless, tileable vinyl car wrap design: ${prompt.trim()}. Flat 2D artwork only (no car, no perspective, no mockup), print-ready, square composition.`
    try {
      const out = await runAI({ images: fromPhoto && photo ? [photo] : [], prompt: p, demo: { pattern: true } })
      setTexture(out)
      saveHistory({ tool: 'wrap', title: prompt.trim() || t('Винил из фото', 'Wrap from photo'), before: photo ?? undefined, after: out, prompt: p })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const exportPng = async () => {
    if (!texture) return
    let blob: Blob | null = null
    for (const size of [1024, 768, 512]) {
      blob = await squarePng(texture, size)
      if (blob.size <= 1024 * 1024) break
    }
    const url = URL.createObjectURL(blob!)
    const a = document.createElement('a')
    a.href = url
    a.download = `wrap-${Date.now()}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  return (
    <div className="page">
      <PageHead title={t('Генератор винила для Tesla', 'Tesla Wrap Generator')} badge={t('Новое', 'New')} sub={t('Превратите фото или идею в дизайн плёнки и сразу смотрите его на 3D-модели. Экспорт PNG до 1024×1024 и 1 МБ — формат для Tesla Paint Shop (флешка → папка Wraps).', 'Turn a photo or an idea into a wrap design with a live 3D preview. Exports PNG up to 1024×1024 and under 1 MB for Tesla Paint Shop (USB → Wraps folder).')} />
      <ApiBanner />
      <div className="studio">
        <section className="studio-main">
          <div className="viewer three">
            <Car3D texture={texture} kind={kind} finish={finish} scale={scale} base={base} />
            {busy && <div className="viewer-busy"><div className="spinner" />{t('Рисую дизайн…', 'Designing your wrap…')}</div>}
          </div>
          <div className="row gap wrap">
            <div className="seg">
              {(['sedan', 'crossover', 'truck'] as BodyKind[]).map((k) => (
                <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k === 'sedan' ? 'Model 3 / S' : k === 'crossover' ? 'Model Y / X' : 'Cybertruck'}</button>
              ))}
            </div>
            <div className="seg">
              {(['gloss', 'satin', 'matte', 'chrome'] as Finish[]).map((f) => (
                <button key={f} className={finish === f ? 'on' : ''} onClick={() => setFinish(f)}>{{ gloss: t('Глянец', 'Gloss'), satin: t('Сатин', 'Satin'), matte: t('Мат', 'Matte'), chrome: t('Хром', 'Chrome') }[f]}</button>
              ))}
            </div>
          </div>
          <label className="row gap small">{t('Масштаб узора', 'Pattern scale')} <input type="range" min={0.5} max={4} step={0.1} value={scale} onChange={(e) => setScale(+e.target.value)} /> {scale.toFixed(1)}×</label>
          {texture && (
            <div className="row gap wrap">
              <img src={texture} className="tex-thumb" alt="" />
              <button className="btn primary" onClick={exportPng}>⬇ {t('Скачать PNG для Tesla', 'Download PNG for Tesla')}</button>
              <button className="btn ghost" onClick={() => setTexture(null)}>{t('Убрать', 'Remove')}</button>
            </div>
          )}
        </section>
        <aside className="studio-side">
          <b>{t('1. Из фото', '1. From a photo')}</b>
          {photo ? (
            <div className="ref"><img src={photo} alt="" /><span className="small">{t('Исходник', 'Source')}</span><button className="x" onClick={() => setPhoto(null)}>×</button></div>
          ) : (
            <Uploader compact label={t('Загрузите картинку', 'Upload an image')} hint={t('Арт, логотип, фото природы…', 'Art, logo, landscape…')} onFiles={async (f) => setPhoto(await fileToDataUrl(f[0], 1536))} />
          )}
          <textarea className="input" rows={2} placeholder={t('Стиль или идея: «неоновый киберпанк», «японская волна»…', 'Style or idea: "neon cyberpunk", "Japanese wave"…')} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div className="row gap wrap">
            <button className="btn primary" disabled={busy || !photo} onClick={() => gen(true)}>✨ {t('Винил из фото', 'Wrap from photo')}</button>
            <button className="btn" disabled={busy || !prompt.trim()} onClick={() => gen(false)}>✨ {t('По описанию', 'From text')}</button>
            {photo && <button className="btn ghost" onClick={() => setTexture(photo)}>{t('Как есть', 'Use as is')}</button>}
          </div>
          {error && <div className="error">{error}</div>}
          <b>{t('2. Готовые узоры', '2. Ready patterns')}</b>
          <div className="patterns">
            {PATTERN_IDS.map((id) => (
              <button key={id} className="pattern" onClick={() => setTexture(patternUrl(id))}>
                <img src={thumbs[id]} alt="" />
                <span>{PATTERN_NAMES[id][lang === 'ru' ? 0 : 1]}</span>
              </button>
            ))}
          </div>
          <b>{t('3. Однотонный цвет', '3. Solid color')}</b>
          <div className="row gap">
            <input type="color" value={base} onChange={(e) => { setBase(e.target.value); setTexture(null) }} />
            <span className="muted small">{t('Без узора — просто цвет кузова', 'No pattern, just body color')}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
