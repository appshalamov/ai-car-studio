/**
 * AI Car Studio → woso.io proxy (Cloudflare Worker).
 * Keeps the woso token server-side and exposes only photo generation.
 *
 * Secrets / vars (Cloudflare → Worker → Settings → Variables):
 *   WOSO_TOKEN    (secret)  token from the woso MCP link (ara_pat_…)
 *   WOSO_MODEL    (var)     default "nano-banana"
 *   USD_PER_CREDIT(var)     default "0.15"
 *   DAILY_LIMIT   (var)     generations per client IP per day, default "20" (needs KV binding LIMITS)
 *   TOTAL_DAILY_LIMIT (var) generations for the whole service per day, default "30" (needs KV binding LIMITS)
 *   ALLOWED_ORIGIN(var)     default "https://appshalamov.github.io"
 * Bindings: R2 bucket IMAGES (reference photos; woso only accepts https links), optional KV LIMITS
 */
const MCP = 'https://woso.io/api/mcp'

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://appshalamov.github.io'
    const reqOrigin = request.headers.get('Origin') || ''
    const allowed = reqOrigin === origin || reqOrigin.startsWith('http://localhost')
    const cors = {
      'Access-Control-Allow-Origin': allowed ? reqOrigin : origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(request.url)

    // Reference photos for woso to download (random unguessable keys, removed after the render).
    if (url.pathname.startsWith('/img/') && request.method === 'GET') {
      const obj = env.IMAGES && (await env.IMAGES.get(url.pathname.slice(5)))
      if (!obj) return new Response('not found', { status: 404 })
      return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } })
    }

    if (!allowed) return json({ error: 'forbidden' }, 403)
    if (!env.WOSO_TOKEN) return json({ error: 'WOSO_TOKEN не задан на сервере' }, 500)

    const model = env.WOSO_MODEL || 'nano-banana'
    const rate = parseFloat(env.USD_PER_CREDIT || '0.15')
    const call = (name, args) => callTool(env.WOSO_TOKEN, name, args)

    try {
      if (url.pathname === '/price') {
        const q = await call('generate_image', { model, prompt: 'price check' })
        const price = num(/Price:\s*([\d.,]+)/i.exec(q)?.[1])
        return json({ model, credits: price, usd: price != null ? +(price * rate).toFixed(4) : null })
      }

      if (url.pathname === '/generate' && request.method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
        const left = await takeQuota(env, ip)
        if (left < 0) return json({ error: 'Дневной лимит генераций исчерпан. Попробуйте завтра.' }, 429)

        const { prompt, images = [], resolution } = await request.json()
        if (!prompt || typeof prompt !== 'string') return json({ error: 'prompt required' }, 400)
        const args = { model, prompt: prompt.slice(0, 4000) }
        if (resolution) args.resolution = resolution
        const refs = await storeRefs(env, url.origin, images.slice(0, 4))
        if (refs.urls.length === 1) args.image_url = refs.urls[0]
        else if (refs.urls.length > 1) args.image_urls = refs.urls
        try {

        const quote = await call('generate_image', args)
        const token = /confirm_token:\s*(\S+)/i.exec(quote)?.[1]
        if (!token) return json({ error: errText(quote) }, 502)
        const before = num(/Balance:\s*([\d.,]+)/i.exec(quote)?.[1])
        const price = num(/Price:\s*([\d.,]+)/i.exec(quote)?.[1])

        let res = await call('generation_confirm', { confirm_token: token })
        const deadline = Date.now() + 4 * 60_000
        while (!imageUrl(res)) {
          if (/INSUFFICIENT_CREDITS/i.test(res)) return json({ error: 'На балансе сервиса закончились кредиты' }, 402)
          const id = /generation_id[^\w]*(\S+)/i.exec(res)?.[1]?.replace(/[",.]+$/, '')
          if (!id || Date.now() > deadline) return json({ error: errText(res) }, 502)
          await new Promise((r) => setTimeout(r, 3000))
          res = await call('generation_status', { generation_id: id })
        }

        // Real charge = balance before − balance after (a quote is free).
        let charged = price
        try {
          const after = num(/Balance:\s*([\d.,]+)/i.exec(await call('generate_image', { model, prompt: 'balance check' }))?.[1])
          if (before != null && after != null) charged = +(before - after).toFixed(2)
        } catch { /* keep quoted price */ }

        return json({ image: await inlineImage(imageUrl(res)), model, credits: charged, usd: charged != null ? +(charged * rate).toFixed(4) : null, left })
        } finally {
          await Promise.all(refs.keys.map((k) => env.IMAGES.delete(k))).catch(() => {})
        }
      }
      return json({ error: 'not found' }, 404)
    } catch (e) {
      return json({ error: String(e.message || e) }, 502)
    }
  },
}

/** Save data: URLs to R2 and return https links woso can fetch; https links pass through. */
async function storeRefs(env, origin, images) {
  const keys = []
  const urls = []
  for (const img of images) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(img || '')
    if (!m) { if (/^https:\/\//.test(img)) urls.push(img); continue }
    if (!env.IMAGES) throw new Error('На сервере не подключено хранилище IMAGES')
    const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg'
    const key = `${crypto.randomUUID()}.${ext}`
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
    await env.IMAGES.put(key, bytes, { httpMetadata: { contentType: m[1] } })
    keys.push(key)
    urls.push(`${origin}/img/${key}`)
  }
  return { keys, urls }
}

let id = 0
async function callTool(token, name, args) {
  const r = await fetch(MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name, arguments: args } }),
  })
  if (r.status === 401) throw new Error('woso: токен сервиса не принят')
  const raw = await r.text()
  const body = raw.trim().startsWith('{') ? raw : raw.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5)).pop() || ''
  const j = JSON.parse(body)
  if (j.error) throw new Error(`woso: ${j.error.message || JSON.stringify(j.error)}`)
  const text = (j.result?.content || []).map((c) => c.text || '').join('\n')
  if (j.result?.isError) throw new Error(`woso: ${text.slice(0, 300)}`)
  return text + (j.result?.structuredContent ? '\n' + JSON.stringify(j.result.structuredContent) : '')
}

function imageUrl(text) {
  const urls = text.match(/https?:\/\/[^\s"'<>)\]\\]+/g) || []
  return urls.find((u) => /\.(png|jpe?g|webp)(\?|$)/i.test(u)) || (/Completed/i.test(text) ? urls.find((u) => !/woso\.io/i.test(u)) : undefined)
}

/** Fetch the result here so the app gets a data: URL (no CORS issues on the provider's CDN). */
async function inlineImage(src) {
  try {
    const r = await fetch(src)
    if (!r.ok) return src
    const buf = new Uint8Array(await r.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return `data:${r.headers.get('Content-Type') || 'image/png'};base64,${btoa(bin)}`
  } catch {
    return src
  }
}

const num = (v) => (v == null ? null : parseFloat(String(v).replace(',', '.')))
const errText = (t) => (t || 'woso не вернул результат').slice(0, 300)

/** Returns generations left today for this IP (−1 = over the limit). Without KV, no limit. */
async function takeQuota(env, ip) {
  const limit = parseInt(env.DAILY_LIMIT || '20', 10)
  const total = parseInt(env.TOTAL_DAILY_LIMIT || '30', 10)
  if (!env.LIMITS) return limit
  const day = new Date().toISOString().slice(0, 10)
  const key = `${day}:${ip}`
  const [used, all] = await Promise.all([env.LIMITS.get(key), env.LIMITS.get(`${day}:all`)]).then((v) => v.map((x) => parseInt(x || '0', 10)))
  if (used >= limit || all >= total) return -1
  await Promise.all([
    env.LIMITS.put(key, String(used + 1), { expirationTtl: 60 * 60 * 26 }),
    env.LIMITS.put(`${day}:all`, String(all + 1), { expirationTtl: 60 * 60 * 26 }),
  ])
  return Math.min(limit - used, total - all) - 1
}
