import { dataUrlParts, dataUrlToBlob, loadImage } from './image'
import { loadSettings, type Settings } from './settings'
import { wosoGenerate } from './woso'
import { SERVICE_URL, serviceGenerate } from './service'

export type DemoHint = { tint?: string; scene?: [string, string]; pattern?: boolean }

export type EditRequest = {
  /** Main image first, optional reference images after it. Empty = pure generation. */
  images: string[]
  prompt: string
  demo?: DemoHint
  signal?: AbortSignal
}

export async function runAI(req: EditRequest, settings: Settings = loadSettings()): Promise<string> {
  if (SERVICE_URL) return serviceGenerate(req)
  switch (settings.provider) {
    case 'gemini':
      return gemini(req, settings)
    case 'openai':
      return openai(req, settings)
    case 'woso':
      return wosoGenerate(req, settings)
    default:
      return demo(req)
  }
}

async function gemini(req: EditRequest, s: Settings): Promise<string> {
  if (!s.geminiKey) throw new Error('Не указан ключ Gemini API (Настройки).')
  const model = s.geminiModel.trim() || 'gemini-2.5-flash-image'
  const parts: unknown[] = req.images.map((img) => {
    const { mime, b64 } = dataUrlParts(img)
    return { inline_data: { mime_type: mime, data: b64 } }
  })
  parts.push({ text: req.prompt })
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    signal: req.signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey.trim() },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Gemini: ${json?.error?.message || res.status}`)
  const outParts: Array<{ inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string }; text?: string }> =
    json?.candidates?.[0]?.content?.parts ?? []
  for (const p of outParts) {
    if (p.inlineData) return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`
    if (p.inline_data) return `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`
  }
  const text = outParts.map((p) => p.text).filter(Boolean).join(' ')
  const reason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason
  throw new Error(`Gemini не вернул изображение${reason ? ` (${reason})` : ''}${text ? `: ${text.slice(0, 200)}` : ''}`)
}

async function openai(req: EditRequest, s: Settings): Promise<string> {
  if (!s.openaiKey) throw new Error('Не указан ключ OpenAI API (Настройки).')
  const base = (s.openaiBase.trim() || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = s.openaiModel.trim() || 'gpt-image-1'
  const quality = s.quality === 'ultra' ? 'high' : 'medium'
  let res: Response
  if (req.images.length) {
    const fd = new FormData()
    fd.append('model', model)
    fd.append('prompt', req.prompt)
    fd.append('quality', quality)
    fd.append('size', 'auto')
    if (model === 'gpt-image-1') fd.append('input_fidelity', 'high')
    const field = req.images.length > 1 ? 'image[]' : 'image'
    req.images.forEach((img, i) => {
      const blob = dataUrlToBlob(img)
      fd.append(field, blob, `image${i}.${blob.type.includes('png') ? 'png' : 'jpg'}`)
    })
    res = await fetch(`${base}/images/edits`, {
      method: 'POST',
      signal: req.signal,
      headers: { Authorization: `Bearer ${s.openaiKey.trim()}` },
      body: fd,
    })
  } else {
    res = await fetch(`${base}/images/generations`, {
      method: 'POST',
      signal: req.signal,
      headers: { Authorization: `Bearer ${s.openaiKey.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: req.prompt, quality, size: '1024x1024' }),
    })
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`OpenAI: ${json?.error?.message || res.status}`)
  const item = json?.data?.[0]
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`
  if (item?.url) return item.url
  throw new Error('OpenAI не вернул изображение')
}

/** Offline demo: a rough canvas approximation so the whole flow works without an API key. */
async function demo(req: EditRequest): Promise<string> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700))
  if (req.signal?.aborted) throw new Error('Отменено')
  const hint = req.demo ?? {}
  let w = 1024
  let h = 1024
  let img: HTMLImageElement | null = null
  if (req.images[0]) {
    img = await loadImage(req.images[0])
    w = img.naturalWidth
    h = img.naturalHeight
  }
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  if (hint.pattern || !img) {
    const colors = ['#ff5a1f', '#ffb21f', '#1fb6ff', '#7a5cff', '#12d39a', '#ff2f6d']
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, w, h)
    if (img) {
      ctx.globalAlpha = 0.55
      ctx.drawImage(img, 0, 0, w, h)
      ctx.globalAlpha = 1
    }
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = colors[i % colors.length]
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      const x = Math.random() * w
      const y = Math.random() * h
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.random() * w * 0.5, y + (Math.random() - 0.5) * h * 0.3)
      ctx.lineTo(x + Math.random() * w * 0.2, y + Math.random() * h * 0.35)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else if (hint.scene) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, hint.scene[0])
    g.addColorStop(1, hint.scene[1])
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(0,0,0,.25)'
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.86, w * 0.42, h * 0.05, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.55, w * 0.46, h * 0.4, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, 0, 0, w, h)
    ctx.restore()
  } else {
    ctx.drawImage(img, 0, 0, w, h)
    if (hint.tint) {
      ctx.globalCompositeOperation = 'color'
      ctx.globalAlpha = 0.6
      ctx.fillStyle = hint.tint
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    } else {
      ctx.filter = 'contrast(1.12) saturate(1.25)'
      ctx.drawImage(c, 0, 0)
      ctx.filter = 'none'
    }
  }
  const fs = Math.max(14, Math.round(w / 40))
  ctx.font = `700 ${fs}px system-ui, sans-serif`
  const label = 'DEMO · подключите AI-ключ в настройках'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = 'rgba(0,0,0,.6)'
  ctx.fillRect(fs * 0.6, fs * 0.6, tw + fs, fs * 1.8)
  ctx.fillStyle = '#ffb21f'
  ctx.fillText(label, fs * 1.1, fs * 1.85)
  return c.toDataURL('image/jpeg', 0.9)
}
