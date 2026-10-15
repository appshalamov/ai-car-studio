import { useMemo, useState } from 'react'
import { lbl, useLang } from '../lib/i18n'
import { PAINT_FINISHES, PRESET_EXTRA, STARTERS, findOpt, type Category, type Preset } from '../lib/catalog'
import { fileToDataUrl } from '../lib/image'
import { runAI } from '../lib/ai'
import { saveHistory } from '../lib/db'
import { loadSettings, saveSettings } from '../lib/settings'
import { useSettings } from '../lib/useSettings'
import { starterPng, starterThumb } from '../lib/starters'
import { Uploader } from './Uploader'
import { BeforeAfter } from './BeforeAfter'
import { ResultActions } from './ResultActions'
import { ApiBanner } from './ApiBanner'

const MAX_MODS = 6

type Props = {
  tool: 'car' | 'bike'
  vehicle: string
  categories: Category[]
  presets: Preset[]
  withStarters?: boolean
}

type Version = { image: string; summary: string }

export function ModStudio({ tool, vehicle, categories, presets, withStarters }: Props) {
  const { t, lang } = useLang()
  const settings = useSettings()
  const [source, setSource] = useState<string | null>(null)
  const [original, setOriginal] = useState<string | null>(null)
  const [tab, setTab] = useState<'presets' | 'catalog'>('presets')
  const [cat, setCat] = useState(categories[0].id)
  const [mods, setMods] = useState<string[]>([])
  const [finish, setFinish] = useState('gloss')
  const [customColor, setCustomColor] = useState('#00b3ff')
  const [customText, setCustomText] = useState('')
  const [customMods, setCustomMods] = useState<string[]>([])
  const [refs, setRefs] = useState<{ img: string; desc: string }[]>([])
  const [presetExtra, setPresetExtra] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [active, setActive] = useState(0)

  const count = mods.length + customMods.length + refs.length
  const activeCat = categories.find((c) => c.id === cat)!

  const setImage = (img: string) => {
    setSource(img)
    setOriginal(img)
    setVersions([])
    setError(null)
  }

  const toggle = (key: string) => {
    setPresetExtra(null)
    setMods((m) => {
      if (m.includes(key)) return m.filter((x) => x !== key)
      const [c] = key.split(':')
      // one option per category for paint / suspension / wheels / tint, stack the rest
      const single = ['paint', 'wheels', 'suspension', 'tint', 'wrap', 'calipers', 'spoiler', 'bars', 'seat', 'fairing']
      const base = single.includes(c) ? m.filter((x) => !x.startsWith(c + ':')) : m
      if (base.length + customMods.length + refs.length >= MAX_MODS) return m
      return [...base, key]
    })
  }

  const applyPreset = (p: Preset) => {
    setMods(p.mods.slice(0, MAX_MODS))
    setCustomMods([])
    setPresetExtra(PRESET_EXTRA[p.id] ?? null)
  }

  const lines = useMemo(() => {
    const out: { label: string; prompt: string; key: string }[] = []
    for (const key of mods) {
      if (key === 'paint:custom') {
        const f = PAINT_FINISHES.find((x) => x.id === finish)!
        out.push({ key, label: `${t('Цвет', 'Paint')} ${customColor} · ${lbl(f, lang)}`, prompt: `repaint the body in ${f.p} paint, color ${customColor}` })
        continue
      }
      const hit = findOpt(categories, key)
      if (!hit) continue
      if (hit.cat.id === 'paint') {
        const f = PAINT_FINISHES.find((x) => x.id === finish)!
        out.push({ key, label: `${lbl(hit.opt, lang)} · ${lbl(f, lang)}`, prompt: `repaint the body in ${f.p} ${hit.opt.p} paint` })
      } else {
        out.push({ key, label: `${lbl(hit.cat, lang)}: ${lbl(hit.opt, lang)}`, prompt: hit.opt.p })
      }
    }
    customMods.forEach((c, i) => out.push({ key: `custom:${i}`, label: `✍️ ${c}`, prompt: c }))
    return out
  }, [mods, customMods, finish, customColor, categories, lang, t])

  const demoTint = () => {
    const paint = mods.find((m) => m.startsWith('paint:'))
    if (paint === 'paint:custom') return customColor
    if (paint) return findOpt(categories, paint)?.opt.hex
    if (mods.includes('wrap:satin-black') || mods.includes('blackout:full')) return '#1a1a1a'
    return undefined
  }

  const generate = async () => {
    if (!source || (!lines.length && !refs.length && !presetExtra)) return
    setBusy(true)
    setError(null)
    const list = lines.map((l) => `- ${l.prompt}`)
    if (presetExtra) list.push(`- ${presetExtra}`)
    refs.forEach((r, i) => list.push(`- install the part shown in reference image ${i + 2}${r.desc ? ` (${r.desc})` : ''}`))
    const prompt = `Photorealistic automotive photo edit. Modify the ${vehicle} in the first image with these aftermarket modifications:
${list.join('\n')}
Keep the exact same vehicle make and model, body proportions, camera angle, framing, background, reflections and lighting. Every change must look like a real, professionally installed part photographed in the same scene. ${settings.quality === 'ultra' ? 'Maximum detail, crisp textures, high resolution.' : ''} Do not add any text, logos or watermarks.`
    try {
      const out = await runAI({ images: [source, ...refs.map((r) => r.img)], prompt, demo: { tint: demoTint() } })
      const summary = [...lines.map((l) => l.label), ...(presetExtra ? [presetExtra] : []), ...refs.map((r) => `🔧 ${r.desc || t('своя деталь', 'custom part')}`)].join(', ')
      setVersions((v) => {
        setActive(v.length)
        return [...v, { image: out, summary }]
      })
      saveHistory({ tool, title: summary.slice(0, 120), before: original ?? source, after: out, prompt })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const current = versions[active]

  if (!source) {
    return (
      <div className="stack">
        <ApiBanner />
        <Uploader onFiles={async (f) => setImage(await fileToDataUrl(f[0]))} />
        {withStarters && (
          <>
            <h3 className="sub">{t('…или выберите стартовую машину', '…or pick a starter car')}</h3>
            <div className="grid starters">
              {STARTERS.map((s) => (
                <button key={s.id} className="card starter" onClick={async () => setImage(await starterPng(s.kind, s.color))}>
                  <img src={starterThumb(s.kind, s.color)} alt="" />
                  <span>{lbl(s, lang)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="stack">
      <ApiBanner />
      <div className="studio">
        <section className="studio-main">
          <div className="viewer">
            {current && original ? (
              <BeforeAfter before={original} after={current.image} labels={[t('Оригинал', 'Original'), t('Сборка', 'Build') + ` v${active + 1}`]} />
            ) : (
              <img src={source} alt="" />
            )}
            {busy && <div className="viewer-busy"><div className="spinner" />{t('Генерирую сборку…', 'Rendering your build…')}</div>}
          </div>
          {versions.length > 0 && (
            <div className="versions">
              {versions.map((v, i) => (
                <button key={i} className={`version ${i === active ? 'on' : ''}`} onClick={() => setActive(i)} title={v.summary}>
                  <img src={v.image} alt="" />
                  <span>v{i + 1}</span>
                </button>
              ))}
            </div>
          )}
          {current && (
            <div className="card pad">
              <div className="muted small">{current.summary}</div>
              <ResultActions image={current.image} name={`${tool}-build`} onIterate={() => { setSource(current.image); setMods([]); setCustomMods([]); setRefs([]); setPresetExtra(null) }} />
            </div>
          )}
          <div className="row gap wrap">
            <button className="btn ghost" onClick={() => { setSource(null); setOriginal(null); setVersions([]) }}>← {t('Другое фото', 'Change photo')}</button>
            {source !== original && <span className="pill">{t('Редактируем результат', 'Editing the result')} · <a onClick={() => setSource(original)}>{t('вернуться к оригиналу', 'back to original')}</a></span>}
          </div>
        </section>

        <aside className="studio-side">
          <div className="seg">
            <button className={tab === 'presets' ? 'on' : ''} onClick={() => setTab('presets')}>{t('Пресеты', 'Presets')}</button>
            <button className={tab === 'catalog' ? 'on' : ''} onClick={() => setTab('catalog')}>{t('Каталог', 'Mod Catalog')}</button>
          </div>

          {tab === 'presets' ? (
            <div className="presets">
              {presets.map((p) => (
                <button key={p.id} className="preset" onClick={() => applyPreset(p)}>
                  <span className="preset-icon">{p.icon}</span>
                  <span><b>{lbl(p, lang)}</b><small>{lbl(p.desc, lang)}</small></span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="chips scroll">
                {categories.map((c) => (
                  <button key={c.id} className={`chip ${c.id === cat ? 'on' : ''}`} onClick={() => setCat(c.id)}>
                    {c.icon} {lbl(c, lang)}
                  </button>
                ))}
              </div>
              <div className="opts">
                {activeCat.options.map((op) => {
                  const key = `${activeCat.id}:${op.id}`
                  return (
                    <button key={key} className={`opt ${mods.includes(key) ? 'on' : ''}`} onClick={() => toggle(key)}>
                      {op.hex && <i className="sw" style={{ background: op.hex }} />}
                      {lbl(op, lang)}
                    </button>
                  )
                })}
                {activeCat.id === 'paint' && (
                  <label className={`opt ${mods.includes('paint:custom') ? 'on' : ''}`}>
                    <input type="color" value={customColor} onChange={(e) => { setCustomColor(e.target.value); if (!mods.includes('paint:custom')) toggle('paint:custom') }} />
                    {t('Свой цвет', 'Custom')}
                  </label>
                )}
              </div>
              {activeCat.id === 'paint' && (
                <div className="chips">
                  {PAINT_FINISHES.map((f) => (
                    <button key={f.id} className={`chip ${finish === f.id ? 'on' : ''}`} onClick={() => setFinish(f.id)}>{lbl(f, lang)}</button>
                  ))}
                </div>
              )}
              <div className="custom">
                <div className="row gap">
                  <input className="input" placeholder={t('Своя доработка: напр. «жёлтые фары как у Ferrari F40»', 'Custom request, e.g. "pop-up headlights"')} value={customText} onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && customText.trim() && count < MAX_MODS) { setCustomMods((c) => [...c, customText.trim()]); setCustomText('') } }} />
                  <button className="btn" disabled={!customText.trim() || count >= MAX_MODS} onClick={() => { setCustomMods((c) => [...c, customText.trim()]); setCustomText('') }}>+</button>
                </div>
                {refs.length < 2 && count < MAX_MODS && (
                  <Uploader compact label={t('Своя деталь по фото', 'Upload your own part')} hint={t('Фото диска, спойлера, наклейки…', 'Photo of a wheel, wing, decal…')}
                    onFiles={async (f) => { const img = await fileToDataUrl(f[0], 1024); setRefs((r) => [...r, { img, desc: '' }]) }} />
                )}
                {refs.map((r, i) => (
                  <div key={i} className="ref">
                    <img src={r.img} alt="" />
                    <input className="input" placeholder={t('Что это? напр. «диски»', 'What is it? e.g. "wheels"')} value={r.desc} onChange={(e) => setRefs((all) => all.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} />
                    <button className="x" onClick={() => setRefs((all) => all.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="build">
            <div className="row between">
              <b>{t('Ваша сборка', 'Your Build')} <span className="muted">{count} / {MAX_MODS}</span></b>
              {(count > 0 || presetExtra) && <button className="link" onClick={() => { setMods([]); setCustomMods([]); setRefs([]); setPresetExtra(null) }}>{t('Очистить', 'Clear all')}</button>}
            </div>
            {lines.length === 0 && !presetExtra && refs.length === 0 ? (
              <div className="muted small">{t('Выберите пресет или добавьте доработки из каталога.', 'Pick a preset or add mods from the catalog.')}</div>
            ) : (
              <ul className="build-list">
                {lines.map((l) => (
                  <li key={l.key}>{l.label}<button className="x" onClick={() => l.key.startsWith('custom:') ? setCustomMods((c) => c.filter((_, i) => `custom:${i}` !== l.key)) : toggle(l.key)}>×</button></li>
                ))}
                {presetExtra && <li>✨ {presetExtra}</li>}
              </ul>
            )}
            <div className="seg small">
              <button className={settings.quality === 'standard' ? 'on' : ''} onClick={() => saveSettings({ ...loadSettings(), quality: 'standard' })}>Standard</button>
              <button className={settings.quality === 'ultra' ? 'on' : ''} onClick={() => saveSettings({ ...loadSettings(), quality: 'ultra' })}>Ultra</button>
            </div>
            {error && <div className="error">{error}</div>}
            <button className="btn primary big" disabled={busy || (!lines.length && !refs.length && !presetExtra)} onClick={generate}>
              {busy ? t('Генерация…', 'Generating…') : t('Сгенерировать', 'Generate')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
