import type { Settings } from './settings'
import { notify } from './notify'

/**
 * woso.io via its MCP endpoint (JSON-RPC over plain HTTP).
 * generate_image only returns a price quote + confirm_token; generation_confirm spends the credits.
 */
const ENDPOINT = 'https://woso.io/api/mcp'

/** Credits per photo at default resolution (woso quotes, 2026-10-15). The live quote before each render is authoritative. */
export const WOSO_PRICES: { model: string; credits: number }[] = [
  { model: 'nano-banana', credits: 0.78 },
  { model: 'nano-banana-2-1', credits: 0.9 },
  { model: 'nano-banana-2', credits: 1.6 },
  { model: 'nano-banana-pro', credits: 3.0 },
  { model: 'gpt-image-2-5', credits: 0.4 },
  { model: 'gpt-image-2', credits: 0.6 },
  { model: 'chatgpt-5', credits: 0.68 },
  { model: 'seedream-4-0', credits: 0.6 },
  { model: 'seedream-5-lite', credits: 0.7 },
  { model: 'seedream-4-5', credits: 0.8 },
  { model: 'seedream', credits: 1.8 },
]

/** Accepts either the raw token or the whole MCP link with ?token=… */
export function wosoToken(input: string): string {
  const v = input.trim()
  const m = /[?&]token=([^&\s]+)/.exec(v)
  return m ? decodeURIComponent(m[1]) : v
}

type ToolResult = { text: string; data: Record<string, unknown> | null; isError: boolean }

let rpcId = 0

async function call(token: string, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } }),
  })
  if (res.status === 401) throw new Error('woso: токен не принят. Скопируйте ссылку MCP заново в Настройках.')
  const raw = await res.text()
  // Tolerate an SSE-framed reply as well as plain JSON.
  const body = raw.trim().startsWith('{') ? raw : raw.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5)).pop() ?? ''
  let json: any
  try { json = JSON.parse(body) } catch { throw new Error(`woso: неожиданный ответ (${res.status})`) }
  if (json.error) throw new Error(`woso: ${json.error.message ?? JSON.stringify(json.error)}`)
  const r = json.result ?? {}
  const text = (r.content ?? []).map((c: { type: string; text?: string }) => (c.type === 'text' ? c.text : '')).filter(Boolean).join('\n')
  let data: Record<string, unknown> | null = r.structuredContent ?? null
  if (!data) { try { data = JSON.parse(text) } catch { /* plain text */ } }
  return { text, data, isError: !!r.isError }
}

function pick(res: ToolResult, key: string): string | undefined {
  const fromData = res.data && findKey(res.data, key)
  if (fromData != null) return String(fromData)
  const m = new RegExp(`${key}["'\\s:=]+([A-Za-z0-9._:-]+)`, 'i').exec(res.text)
  return m?.[1]
}

function findKey(o: unknown, key: string): unknown {
  if (!o || typeof o !== 'object') return undefined
  if (key in (o as object)) return (o as Record<string, unknown>)[key]
  for (const v of Object.values(o as object)) {
    const f = findKey(v, key)
    if (f != null) return f
  }
  return undefined
}

export type WosoCost = { model: string; price: number; balance?: number; at: number }

function parseCost(res: ToolResult, model: string): WosoCost | null {
  const price = /Price:\s*([\d.,]+)/i.exec(res.text)?.[1] ?? pick(res, 'price')
  if (price == null) return null
  const bal = /Balance:\s*([\d.,]+)/i.exec(res.text)?.[1] ?? pick(res, 'balance')
  const n = (v: string) => parseFloat(v.replace(',', '.'))
  return { model, price: n(price), balance: bal != null ? n(bal) : undefined, at: Date.now() }
}

// Last known cost per model, shared with the UI.
const costs = new Map<string, WosoCost>()
const costListeners = new Set<() => void>()
function setCost(c: WosoCost) { costs.set(c.model, c); costListeners.forEach((l) => l()) }
export function getCost(model: string) { return costs.get(model) }
export function onCostChange(fn: () => void) { costListeners.add(fn); return () => { costListeners.delete(fn) } }

/** Format credits, plus dollars when the user set a credit price. */
export function fmtCost(credits: number, usdPerCredit: number) {
  const c = `${credits.toFixed(2)} кр.`
  const usd = credits * usdPerCredit
  return usdPerCredit > 0 ? `${c} (≈ $${usd < 1 ? usd.toFixed(3) : usd.toFixed(2)})` : c
}

function resultUrl(res: ToolResult): string | undefined {
  const all = JSON.stringify(res.data ?? '') + '\n' + res.text
  const urls = all.match(/https?:\/\/[^\s"'<>)\]\\]+/g) ?? []
  const img = urls.find((u) => /\.(png|jpe?g|webp)(\?|$)/i.test(u))
  if (img) return img
  // A link without an image extension counts only once the job reports completion.
  return /Completed/i.test(res.text) ? urls.find((u) => !/woso\.io/i.test(u)) : undefined
}

function failIfError(res: ToolResult) {
  if (/INSUFFICIENT_CREDITS/i.test(res.text)) throw new Error(`woso: недостаточно кредитов. ${res.text.slice(0, 300)}`)
  if (res.isError) throw new Error(`woso: ${res.text.slice(0, 300)}`)
}

async function toDataUrl(url: string): Promise<string> {
  try {
    const r = await fetch(url)
    if (!r.ok) return url
    const blob = await r.blob()
    return await new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = () => resolve(url)
      fr.readAsDataURL(blob)
    })
  } catch {
    return url
  }
}

export async function wosoGenerate(
  req: { images: string[]; prompt: string; signal?: AbortSignal },
  s: Settings,
): Promise<string> {
  const token = wosoToken(s.wosoToken)
  if (!token) throw new Error('Не указан токен woso (Настройки).')
  const args: Record<string, unknown> = { model: s.wosoModel.trim() || 'nano-banana', prompt: req.prompt }
  if (s.quality === 'ultra') args.resolution = '2K'
  if (req.images.length === 1) args.image_url = req.images[0]
  else if (req.images.length > 1) args.image_urls = req.images

  const quote = await call(token, 'generate_image', args, req.signal)
  const confirmToken = pick(quote, 'confirm_token')
  failIfError(quote)
  if (!confirmToken) throw new Error(`woso: ${quote.text.slice(0, 300) || 'не удалось получить цену'}`)

  const cost = parseCost(quote, String(args.model))
  if (cost) setCost(cost)

  if (s.wosoAsk) {
    const price = cost ? fmtCost(cost.price, s.wosoUsdPerCredit) : '?'
    const balance = cost?.balance != null ? `\nБаланс: ${cost.balance.toFixed(2)} кр.` : ''
    const ok = confirm(`woso · ${args.model}\nСебестоимость: ${price}${balance}\n\nГенерировать?`)
    if (!ok) throw new Error('Отменено')
  }

  let res = await call(token, 'generation_confirm', { confirm_token: confirmToken }, req.signal)
  failIfError(res)
  const deadline = Date.now() + 5 * 60_000
  while (!resultUrl(res) || /NOT FINISHED/i.test(res.text)) {
    const id = pick(res, 'generation_id')
    if (!id) throw new Error(`woso: ${res.text.slice(0, 300) || 'нет результата'}`)
    if (Date.now() > deadline) throw new Error('woso: генерация идёт слишком долго, проверьте историю на woso.io')
    await new Promise((r) => setTimeout(r, 3000))
    if (req.signal?.aborted) throw new Error('Отменено')
    res = await call(token, 'generation_status', { generation_id: id }, req.signal)
    failIfError(res)
    if (/Completed/i.test(res.text) && resultUrl(res)) break
  }
  if (cost) {
    // Real charge = balance before minus balance after (a fresh quote is free).
    let left = cost.balance != null ? +(cost.balance - cost.price).toFixed(2) : undefined
    let charged = cost.price
    try {
      const after = parseCost(await call(token, 'generate_image', { model: args.model, prompt: 'balance check' }), String(args.model))
      if (after?.balance != null && cost.balance != null) { left = after.balance; charged = +(cost.balance - after.balance).toFixed(2) }
    } catch { /* keep the quoted price */ }
    setCost({ ...cost, balance: left, at: Date.now() })
    if (s.wosoNotify) notify('Генерация готова', `Списано ${fmtCost(charged, s.wosoUsdPerCredit)} · ${args.model}${left != null ? ` · остаток ${left.toFixed(2)} кр.` : ''}`)
  }
  return toDataUrl(resultUrl(res)!)
}

/** Free price quote for the current model (spends nothing). */
export async function wosoQuote(s: Settings, model = s.wosoModel.trim() || 'nano-banana'): Promise<WosoCost> {
  const q = await call(wosoToken(s.wosoToken), 'generate_image', { model, prompt: 'price check' })
  if (q.isError) throw new Error(q.text.slice(0, 200))
  const c = parseCost(q, model)
  if (!c) throw new Error('woso не вернул цену')
  setCost(c)
  return c
}
