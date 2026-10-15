import { useRef, useState } from 'react'
import JSZip from 'jszip'
import { lbl, useLang } from '../lib/i18n'
import { SCENES } from '../lib/catalog'
import { dataUrlToBlob, downloadDataUrl, extFromDataUrl, fileToDataUrl } from '../lib/image'
import { runAI } from '../lib/ai'
import { saveHistory, uid } from '../lib/db'
import { Uploader } from '../components/Uploader'
import { BeforeAfter } from '../components/BeforeAfter'
import { ApiBanner } from '../components/ApiBanner'
import { PageHead } from '../components/PageHead'

const MAX = 20
type Item = { id: string; name: string; src: string; status: 'queued' | 'running' | 'done' | 'error'; out?: string; error?: string }

export default function Backgrounds() {
  const { t, lang } = useLang()
  const [items, setItems] = useState<Item[]>([])
  const [scene, setScene] = useState(SCENES[0].id)
  const [customScene, setCustomScene] = useState<string | null>(null)
  const [mode, setMode] = useState<'preserve' | 'blend'>('preserve')
  const [naming, setNaming] = useState<'original' | 'affix' | 'number'>('original')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('_bg')
  const [base, setBase] = useState('stock')
  const [running, setRunning] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const add = async (files: File[]) => {
    const room = MAX - items.length
    const next: Item[] = []
    for (const f of files.slice(0, room)) {
      try {
        next.push({ id: uid(), name: f.name, src: await fileToDataUrl(f, 2048), status: 'queued' })
      } catch { /* skip unreadable */ }
    }
    setItems((x) => [...x, ...next])
  }

  const patch = (id: string, p: Partial<Item>) => setItems((x) => x.map((i) => (i.id === id ? { ...i, ...p } : i)))

  const process = async (item: Item) => {
    const sc = SCENES.find((s) => s.id === scene)!
    const where = customScene ? 'the location shown in the second image (use it as the new background)' : sc.p
    const modeText = mode === 'preserve'
      ? 'Do NOT change the vehicle at all: keep its exact shape, angle, position in the frame, color, wheels, glass, plates and visible condition pixel-faithful. Only replace everything around it.'
      : 'Blend the vehicle naturally into the new scene: adapt lighting, reflections on paint and glass, and add realistic contact shadows, while keeping the vehicle itself unchanged.'
    const prompt = `Replace the background of this vehicle photo with ${where}. ${modeText} Add a realistic ground shadow under the tires. Professional dealership listing photo, photorealistic, no text or watermarks.`
    patch(item.id, { status: 'running', error: undefined })
    try {
      const out = await runAI({ images: customScene ? [item.src, customScene] : [item.src], prompt, demo: { scene: sc.demo } })
      patch(item.id, { status: 'done', out })
      saveHistory({ tool: 'background', title: `${item.name} → ${customScene ? t('своя сцена', 'custom scene') : lbl(sc, lang)}`, before: item.src, after: out, prompt })
    } catch (e) {
      patch(item.id, { status: 'error', error: (e as Error).message })
    }
  }

  const runBatch = async (onlyFailed = false) => {
    setRunning(true)
    const queue = itemsRef.current.filter((i) => (onlyFailed ? i.status === 'error' : i.status === 'queued' || i.status === 'error'))
    const workers = Array.from({ length: 2 }, async () => {
      while (queue.length) await process(queue.shift()!)
    })
    await Promise.all(workers)
    setRunning(false)
  }

  const outName = (item: Item, idx: number) => {
    const ext = extFromDataUrl(item.out!)
    const stem = item.name.replace(/\.[^.]+$/, '')
    if (naming === 'number') return `${base || 'photo'}_${String(idx + 1).padStart(3, '0')}.${ext}`
    if (naming === 'affix') return `${prefix}${stem}${suffix}.${ext}`
    return `${stem}.${ext}`
  }

  const exportZip = async () => {
    const zip = new JSZip()
    const done = items.filter((i) => i.status === 'done' && i.out)
    const manifest = done.map((i, idx) => {
      const file = outName(i, idx)
      zip.file(file, dataUrlToBlob(i.out!))
      return { output: file, source: i.name, scene: customScene ? 'custom' : scene, mode }
    })
    zip.file('manifest.json', JSON.stringify({ createdAt: new Date().toISOString(), items: manifest }, null, 2))
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backgrounds-${new Date().toISOString().slice(0, 10)}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const done = items.filter((i) => i.status === 'done').length
  const failed = items.filter((i) => i.status === 'error').length
  const pending = items.filter((i) => i.status === 'queued' || i.status === 'error').length
  const sel = items.find((i) => i.id === preview && i.out)

  return (
    <div className="page">
      <PageHead title={t('Замена фона для дилеров', 'Dealer Background Replacement')} sub={t('Пакетно заменяйте фон фото со стоянки на студию или шоурум. Одна сцена на всю партию, экспорт ZIP с исходными именами файлов.', 'Batch-replace lot backgrounds with a studio or showroom. One scene per batch, ZIP export with original filenames.')} />
      <ApiBanner />
      <div className="studio">
        <section className="studio-main">
          <div className="row between">
            <b>1. {t('Фото', 'Photos')} <span className="muted">{items.length} / {MAX}</span></b>
            {items.length > 0 && <button className="link" onClick={() => setItems([])} disabled={running}>{t('Очистить', 'Clear')}</button>}
          </div>
          {items.length < MAX && <Uploader multiple compact={items.length > 0} onFiles={add} label={t('Добавьте фото автомобилей', 'Add vehicle photos')} hint={t('До 20 фото за раз. JPG, PNG, WebP.', 'Up to 20 photos. JPG, PNG, WebP.')} />}
          {sel && <BeforeAfter before={sel.src} after={sel.out!} />}
          <div className="batch">
            {items.map((i, idx) => (
              <div key={i.id} className={`batch-item ${i.status} ${preview === i.id ? 'on' : ''}`} onClick={() => i.out && setPreview(i.id)}>
                <img src={i.out ?? i.src} alt="" />
                <div className="batch-meta">
                  <span className="name" title={i.name}>{i.out ? outName(i, items.filter((x) => x.out).indexOf(i)) : i.name}</span>
                  <span className={`st ${i.status}`}>
                    {i.status === 'queued' && t('в очереди', 'queued')}
                    {i.status === 'running' && <><span className="spinner sm" /> {t('обработка', 'processing')}</>}
                    {i.status === 'done' && '✓ ' + t('готово', 'done')}
                    {i.status === 'error' && <span title={i.error}>⚠ {t('ошибка', 'failed')}</span>}
                  </span>
                </div>
                <div className="batch-actions">
                  {i.out && <button className="x" title={t('Скачать', 'Download')} onClick={(e) => { e.stopPropagation(); downloadDataUrl(i.out!, outName(i, idx)) }}>⬇</button>}
                  {i.status === 'error' && <button className="x" title={t('Повторить', 'Retry')} onClick={(e) => { e.stopPropagation(); process(i) }}>↻</button>}
                  {!running && <button className="x" onClick={(e) => { e.stopPropagation(); setItems((x) => x.filter((y) => y.id !== i.id)) }}>×</button>}
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="studio-side">
          <b>2. {t('Сцена', 'Background')}</b>
          <div className="scenes">
            {SCENES.map((s) => (
              <button key={s.id} className={`scene ${scene === s.id && !customScene ? 'on' : ''}`} onClick={() => { setScene(s.id); setCustomScene(null) }}>
                <i style={{ background: `linear-gradient(${s.demo[0]}, ${s.demo[1]})` }} />
                {lbl(s, lang)}
              </button>
            ))}
          </div>
          {customScene ? (
            <div className="ref"><img src={customScene} alt="" /><span className="small">{t('Свой шоурум / площадка', 'Your own showroom / lot')}</span><button className="x" onClick={() => setCustomScene(null)}>×</button></div>
          ) : (
            <Uploader compact label={t('Свой шоурум или площадка', 'Use your own showroom')} hint={t('Фото вашего салона станет фоном', 'A photo of your lot becomes the background')} onFiles={async (f) => setCustomScene(await fileToDataUrl(f[0], 1536))} />
          )}
          <b>3. {t('Режим', 'Processing mode')}</b>
          <label className={`check ${mode === 'preserve' ? 'on' : ''}`}><input type="radio" checked={mode === 'preserve'} onChange={() => setMode('preserve')} />
            <span><b>{t('Сохранить авто как есть', 'Preserve original vehicle')}</b> <span className="pill">{t('рекомендуем', 'recommended')}</span><br /><small className="muted">{t('Машина, ракурс и состояние без изменений.', 'Vehicle, angle and condition unchanged.')}</small></span></label>
          <label className={`check ${mode === 'blend' ? 'on' : ''}`}><input type="radio" checked={mode === 'blend'} onChange={() => setMode('blend')} />
            <span><b>{t('Естественное смешивание света', 'Natural light blend')}</b><br /><small className="muted">{t('Отражения и тени под сцену; возможны мелкие изменения стёкол и дисков.', 'Matches reflections and shadows; may slightly alter glass and wheels.')}</small></span></label>
          <b>4. {t('Имена файлов', 'File names')}</b>
          <select className="input" value={naming} onChange={(e) => setNaming(e.target.value as typeof naming)}>
            <option value="original">{t('Как в оригинале', 'Keep original names')}</option>
            <option value="affix">{t('Префикс / суффикс', 'Prefix / suffix')}</option>
            <option value="number">{t('Нумерация', 'Numbering')}</option>
          </select>
          {naming === 'affix' && <div className="row gap"><input className="input" placeholder="prefix_" value={prefix} onChange={(e) => setPrefix(e.target.value)} /><input className="input" placeholder="_suffix" value={suffix} onChange={(e) => setSuffix(e.target.value)} /></div>}
          {naming === 'number' && <input className="input" placeholder="stock" value={base} onChange={(e) => setBase(e.target.value)} />}
          <div className="build">
            <div className="row between small"><span>{t('Фото', 'Images')}: {items.length}</span><span>✓ {done}{failed ? ` · ⚠ ${failed}` : ''}</span></div>
            <button className="btn primary big" disabled={running || !pending} onClick={() => runBatch()}>{running ? t('Обработка…', 'Processing…') : t(`Запустить (${pending})`, `Generate (${pending})`)}</button>
            {failed > 0 && !running && <button className="btn" onClick={() => runBatch(true)}>↻ {t('Повторить неудачные', 'Retry failed')}</button>}
            <button className="btn" disabled={!done} onClick={exportZip}>🗜 {t('Скачать ZIP + manifest', 'Download ZIP + manifest')}</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
