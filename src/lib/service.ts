import { notify, askNotifyPermission } from './notify'
import { toDataUrl } from './woso'

/**
 * Hosted mode: generation goes through the studio's own woso account behind a proxy
 * (worker/woso-proxy.js). Free for the client; the app shows what each render costs the studio.
 */
export const SERVICE_URL = ((import.meta.env.VITE_SERVICE_URL as string | undefined) ?? '').replace(/\/$/, '')

export type ServicePrice = { model: string; credits: number | null; usd: number | null }

let price: ServicePrice | null = null
const listeners = new Set<() => void>()
export const getServicePrice = () => price
export function onServicePrice(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
function setPrice(p: ServicePrice) { price = p; listeners.forEach((l) => l()) }

export async function loadServicePrice() {
  const r = await fetch(`${SERVICE_URL}/price`)
  if (r.ok) setPrice(await r.json())
}

export function fmtCharge(credits: number | null, usd: number | null) {
  if (credits == null) return '—'
  return `${credits.toFixed(2)} кр.${usd != null ? ` (≈ $${usd < 1 ? usd.toFixed(3) : usd.toFixed(2)})` : ''}`
}

export async function serviceGenerate(req: { images: string[]; prompt: string; signal?: AbortSignal }, ultra: boolean): Promise<string> {
  askNotifyPermission().catch(() => {}) // still inside the tap that started the render
  const r = await fetch(`${SERVICE_URL}/generate`, {
    method: 'POST',
    signal: req.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: req.prompt, images: req.images, resolution: ultra ? '2K' : undefined }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.image) throw new Error(j.error || `Сервис недоступен (${r.status})`)
  setPrice({ model: j.model, credits: j.credits, usd: j.usd })
  notify('Генерация готова', `Для вас бесплатно. Себестоимость: ${fmtCharge(j.credits, j.usd)}${j.left != null ? ` · осталось сегодня: ${j.left}` : ''}`)
  return toDataUrl(j.image)
}
