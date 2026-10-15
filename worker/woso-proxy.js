/**
 * Car Studio backend (Cloudflare Worker).
 * Keeps the woso token server-side, registers clients (phone + email → N free renders),
 * hosts reference photos for woso, stores the white-label brand and pushes admin notifications.
 *
 * Secrets: WOSO_TOKEN (ara_pat_… from the woso MCP link), ADMIN_PASSWORD, VAPID_PRIVATE, VAPID_PUBLIC
 * Vars:    WOSO_MODEL (nano-banana), USD_PER_CREDIT (0.15), FREE_GENERATIONS (3), TOTAL_DAILY_LIMIT (30),
 *          ALLOWED_ORIGIN (https://appshalamov.github.io), ADMIN_URL (link opened from a push)
 * Bindings: KV namespace DB, R2 bucket IMAGES
 */
const MCP = 'https://woso.io/api/mcp'
const DAY = 24 * 60 * 60

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://appshalamov.github.io'
    const reqOrigin = request.headers.get('Origin') || ''
    const allowed = reqOrigin === origin || /^http:\/\/localhost(:\d+)?$/.test(reqOrigin)
    const cors = {
      'Access-Control-Allow-Origin': allowed ? reqOrigin : origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User',
      Vary: 'Origin',
    }
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(request.url)
    const path = url.pathname

    // Public files: reference photos for woso, and the brand logo.
    if (request.method === 'GET' && (path.startsWith('/img/') || path === '/logo')) {
      const key = path === '/logo' ? (await getBrand(env)).logoKey : path.slice(5)
      const obj = key && env.IMAGES && (await env.IMAGES.get(key))
      if (!obj) return new Response('not found', { status: 404 })
      return new Response(obj.body, { headers: { ...cors, 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'public, max-age=300' } })
    }

    if (!allowed) return json({ error: 'forbidden' }, 403)
    if (!env.DB) return json({ error: 'На сервере не подключена база DB' }, 500)

    try {
      if (path === '/config' && request.method === 'GET') return json(await publicBrand(env, url.origin))
      if (path === '/register' && request.method === 'POST') return json(await register(request, env))
      if (path === '/me' && request.method === 'GET') {
        const user = await userFrom(request, env)
        return json({ left: left(env, user) })
      }
      if (path === '/generate' && request.method === 'POST') return json(await generate(request, env, url.origin))
      if (path.startsWith('/admin/')) {
        if (!env.ADMIN_PASSWORD || request.headers.get('Authorization') !== `Bearer ${env.ADMIN_PASSWORD}`) return json({ error: 'Неверный пароль' }, 401)
        return json(await admin(request, env, path.slice(7), url.origin))
      }
      return json({ error: 'not found' }, 404)
    } catch (e) {
      return json({ error: String(e.message || e) }, e.status || 502)
    }
  },
}

const fail = (message, status) => Object.assign(new Error(message), { status })
const today = () => new Date().toISOString().slice(0, 10)
const getJ = async (env, key, dflt) => { const v = await env.DB.get(key); return v ? JSON.parse(v) : dflt }
const putJ = (env, key, v, opts) => env.DB.put(key, JSON.stringify(v), opts)

// ---------- brand ----------

async function getBrand(env) {
  return getJ(env, 'brand', { name: '', phone: '', free: parseInt(env.FREE_GENERATIONS || '3', 10), logoKey: null })
}
async function publicBrand(env, origin) {
  const b = await getBrand(env)
  return { name: b.name, phone: b.phone, free: b.free, logo: b.logoKey ? `${origin}/logo?v=${encodeURIComponent(b.logoKey)}` : null, vapidPublic: env.VAPID_PUBLIC || null }
}

// ---------- clients ----------

async function sha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const normPhone = (p) => String(p || '').replace(/[^\d+]/g, '')
const normEmail = (e) => String(e || '').trim().toLowerCase()

async function register(request, env) {
  const body = await request.json()
  const phone = normPhone(body.phone)
  const email = normEmail(body.email)
  const name = String(body.name || '').trim().slice(0, 60)
  if (phone.replace(/\D/g, '').length < 10) throw fail('Укажите телефон полностью', 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Проверьте email', 400)

  // Same phone or same email = same client (no second set of free renders).
  const [byPhone, byEmail] = await Promise.all([env.DB.get(`ix:p:${await sha(phone)}`), env.DB.get(`ix:e:${await sha(email)}`)])
  const existing = byPhone || byEmail
  if (existing) {
    const user = await getJ(env, `user:${existing}`, null)
    if (user) return { token: user.id, left: left(env, user, await getBrand(env)) }
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const regKey = `lim:reg:${today()}:${ip}`
  const regs = parseInt((await env.DB.get(regKey)) || '0', 10)
  if (regs >= 5) throw fail('Слишком много регистраций с этого устройства сегодня', 429)
  await env.DB.put(regKey, String(regs + 1), { expirationTtl: 2 * DAY })

  const brand = await getBrand(env)
  const id = crypto.randomUUID().replace(/-/g, '')
  const user = { id, name, phone, email, createdAt: Date.now(), used: 0, free: brand.free }
  await saveUser(env, user)
  await Promise.all([env.DB.put(`ix:p:${await sha(phone)}`, id), env.DB.put(`ix:e:${await sha(email)}`, id)])
  await pushAll(env, { title: 'Новый клиент', body: `${name || 'Без имени'} · ${phone} · ${email}`, tag: `reg-${id}` })
  return { token: id, left: left(env, user, brand) }
}

const left = (env, user, brand) => Math.max(0, (user.free ?? brand?.free ?? parseInt(env.FREE_GENERATIONS || '3', 10)) - user.used)

async function saveUser(env, u) {
  // Metadata lets the admin list clients without reading every record.
  await putJ(env, `user:${u.id}`, u, { metadata: { name: u.name, phone: u.phone, email: u.email, createdAt: u.createdAt, used: u.used, free: u.free } })
}

async function userFrom(request, env) {
  const id = (request.headers.get('X-User') || '').replace(/[^a-f0-9]/g, '')
  const user = id && (await getJ(env, `user:${id}`, null))
  if (!user) throw fail('Нужна регистрация', 401)
  return user
}

// ---------- generation ----------

async function generate(request, env, origin) {
  const user = await userFrom(request, env)
  const brand = await getBrand(env)
  if (left(env, user, brand) <= 0) throw fail('Бесплатные сборки закончились', 402)

  const totalKey = `lim:all:${today()}`
  const total = parseInt((await env.DB.get(totalKey)) || '0', 10)
  if (total >= parseInt(env.TOTAL_DAILY_LIMIT || '30', 10)) throw fail('Сервис перегружен, попробуйте завтра', 429)

  const { prompt, images = [] } = await request.json()
  if (!prompt || typeof prompt !== 'string') throw fail('prompt required', 400)

  // Reserve the render first so parallel taps can't exceed the free count.
  user.used += 1
  await saveUser(env, user)
  await env.DB.put(totalKey, String(total + 1), { expirationTtl: 2 * DAY })

  const model = env.WOSO_MODEL || 'nano-banana'
  const rate = parseFloat(env.USD_PER_CREDIT || '0.15')
  const refs = await storeRefs(env, origin, images.slice(0, 4))
  const log = { at: Date.now(), userId: user.id, name: user.name, phone: user.phone, email: user.email, model, credits: null, usd: null, ok: false }
  try {
    const args = { model, prompt: prompt.slice(0, 4000) }
    if (refs.urls.length === 1) args.image_url = refs.urls[0]
    else if (refs.urls.length > 1) args.image_urls = refs.urls

    const quote = await callTool(env, 'generate_image', args)
    const token = /confirm_token:\s*(\S+)/i.exec(quote)?.[1]
    if (!token) throw fail(errText(quote), 502)
    const before = num(/Balance:\s*([\d.,]+)/i.exec(quote)?.[1])
    const price = num(/Price:\s*([\d.,]+)/i.exec(quote)?.[1])

    let res = await callTool(env, 'generation_confirm', { confirm_token: token })
    const deadline = Date.now() + 4 * 60_000
    while (!imageUrl(res)) {
      if (/INSUFFICIENT_CREDITS/i.test(res)) throw fail('Сервис временно недоступен', 503)
      const id = /generation_id[^\w]*(\S+)/i.exec(res)?.[1]?.replace(/[",.]+$/, '')
      if (!id || Date.now() > deadline) throw fail(errText(res), 502)
      await new Promise((r) => setTimeout(r, 3000))
      res = await callTool(env, 'generation_status', { generation_id: id })
    }

    // Real charge = balance before − balance after (a quote is free).
    let charged = price
    let after = null
    try {
      after = num(/Balance:\s*([\d.,]+)/i.exec(await callTool(env, 'generate_image', { model, prompt: 'balance check' }))?.[1])
      if (before != null && after != null) charged = +(before - after).toFixed(2)
    } catch { /* keep quoted price */ }

    Object.assign(log, { ok: true, credits: charged, usd: charged != null ? +(charged * rate).toFixed(4) : null, balance: after })
    const stats = await getJ(env, 'stats', { spentCredits: 0, generations: 0 })
    stats.spentCredits = +(stats.spentCredits + (charged || 0)).toFixed(2)
    stats.generations += 1
    await putJ(env, 'stats', stats)
    await pushAll(env, {
      title: 'Новая генерация',
      body: `${user.name || user.phone}: себестоимость ${fmt(charged, rate)}${after != null ? ` · баланс woso ${after.toFixed(2)} кр.` : ''}`,
      tag: `gen-${log.at}`,
    })
    return { image: await inlineImage(imageUrl(res)), left: left(env, user, brand) }
  } catch (e) {
    user.used = Math.max(0, user.used - 1) // failed render is not counted
    await saveUser(env, user)
    log.error = String(e.message || e).slice(0, 200)
    throw e
  } finally {
    await writeLog(env, log)
    await Promise.all(refs.keys.map((k) => env.IMAGES.delete(k))).catch(() => {})
  }
}

async function writeLog(env, log) {
  const key = `gen:${String(9e15 - log.at).padStart(16, '0')}:${log.userId.slice(0, 6)}`
  const { name, phone, email, model, credits, usd, ok, error, at } = log
  await putJ(env, key, log, { metadata: { at, name, phone, email, model, credits, usd, ok, error: error?.slice(0, 120) } })
}

const fmt = (c, rate) => (c == null ? '—' : `${c.toFixed(2)} кр. (≈ $${(c * rate).toFixed(3)})`)

// ---------- admin ----------

async function admin(request, env, route, origin) {
  const m = request.method
  if (route === 'summary' && m === 'GET') {
    const stats = await getJ(env, 'stats', { spentCredits: 0, generations: 0 })
    const rate = parseFloat(env.USD_PER_CREDIT || '0.15')
    let balance = null
    let price = null
    try {
      const q = await callTool(env, 'generate_image', { model: env.WOSO_MODEL || 'nano-banana', prompt: 'price check' })
      balance = num(/Balance:\s*([\d.,]+)/i.exec(q)?.[1])
      price = num(/Price:\s*([\d.,]+)/i.exec(q)?.[1])
    } catch { /* woso unreachable: show the rest */ }
    const clients = await countPrefix(env, 'user:')
    return { balance, price, usdPerCredit: rate, clients, generations: stats.generations, spentCredits: stats.spentCredits, spentUsd: +(stats.spentCredits * rate).toFixed(2) }
  }
  if (route === 'clients' && m === 'GET') {
    const keys = await listPrefix(env, 'user:', 1000)
    return keys.map((k) => ({ id: k.name.slice(5), ...k.metadata, left: Math.max(0, (k.metadata?.free ?? 3) - (k.metadata?.used ?? 0)) })).sort((a, b) => b.createdAt - a.createdAt)
  }
  if (route === 'generations' && m === 'GET') {
    const keys = await listPrefix(env, 'gen:', 300)
    return keys.map((k) => ({ userId: k.name.split(':')[2], ...k.metadata }))
  }
  if (route === 'brand' && m === 'PUT') {
    const b = await request.json()
    const brand = await getBrand(env)
    brand.name = String(b.name ?? brand.name).trim().slice(0, 60)
    brand.phone = String(b.phone ?? brand.phone).trim().slice(0, 30)
    if (b.free != null) brand.free = Math.max(0, Math.min(100, parseInt(b.free, 10) || 0))
    await putJ(env, 'brand', brand)
    return publicBrand(env, origin)
  }
  if (route === 'logo' && m === 'PUT') {
    const { image } = await request.json()
    const brand = await getBrand(env)
    if (brand.logoKey) await env.IMAGES.delete(brand.logoKey).catch(() => {})
    brand.logoKey = null
    if (image) {
      const d = /^data:(image\/(png|jpeg|webp));base64,(.*)$/.exec(image)
      if (!d) throw fail('Нужна картинка PNG, JPG или WebP', 400)
      const bytes = b64bytes(d[3])
      if (bytes.length > 2_000_000) throw fail('Логотип больше 2 МБ', 400)
      brand.logoKey = `brand/logo-${Date.now()}.${d[2] === 'jpeg' ? 'jpg' : d[2]}`
      await env.IMAGES.put(brand.logoKey, bytes, { httpMetadata: { contentType: d[1] } })
    }
    await putJ(env, 'brand', brand)
    return publicBrand(env, origin)
  }
  if (route === 'push' && m === 'POST') {
    const { subscription } = await request.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh) throw fail('bad subscription', 400)
    const subs = (await getJ(env, 'push:subs', [])).filter((s) => s.endpoint !== subscription.endpoint)
    subs.push(subscription)
    await putJ(env, 'push:subs', subs.slice(-10))
    return { ok: true, devices: subs.length }
  }
  if (route === 'push/test' && m === 'POST') {
    const sent = await pushAll(env, { title: 'Car Studio', body: 'Уведомления работают', tag: 'test' })
    return { ok: true, sent }
  }
  throw fail('not found', 404)
}

async function listPrefix(env, prefix, max) {
  const out = []
  let cursor
  do {
    const r = await env.DB.list({ prefix, cursor, limit: 1000 })
    out.push(...r.keys)
    cursor = r.list_complete ? undefined : r.cursor
  } while (cursor && out.length < max)
  return out.slice(0, max)
}
const countPrefix = async (env, prefix) => (await listPrefix(env, prefix, 100000)).length

// ---------- woso ----------

let rpcId = 0
async function callTool(env, name, args) {
  if (!env.WOSO_TOKEN) throw fail('WOSO_TOKEN не задан на сервере', 500)
  const r = await fetch(MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${env.WOSO_TOKEN}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } }),
  })
  if (r.status === 401) throw fail('woso: токен сервиса не принят', 502)
  const raw = await r.text()
  const body = raw.trim().startsWith('{') ? raw : raw.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5)).pop() || ''
  const j = JSON.parse(body)
  if (j.error) throw fail(`woso: ${j.error.message || JSON.stringify(j.error)}`, 502)
  const text = (j.result?.content || []).map((c) => c.text || '').join('\n')
  if (j.result?.isError) throw fail(`woso: ${text.slice(0, 300)}`, 502)
  return text + (j.result?.structuredContent ? '\n' + JSON.stringify(j.result.structuredContent) : '')
}

function imageUrl(text) {
  const urls = text.match(/https?:\/\/[^\s"'<>)\]\\]+/g) || []
  return urls.find((u) => /\.(png|jpe?g|webp)(\?|$)/i.test(u)) || (/Completed/i.test(text) ? urls.find((u) => !/woso\.io/i.test(u)) : undefined)
}

/** Save data: URLs to R2 and return https links woso can fetch (woso rejects data: URLs). */
async function storeRefs(env, origin, images) {
  const keys = []
  const urls = []
  for (const img of images) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(img || '')
    if (!m) { if (/^https:\/\//.test(img)) urls.push(img); continue }
    if (!env.IMAGES) throw fail('На сервере не подключено хранилище IMAGES', 500)
    const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg'
    const key = `refs/${crypto.randomUUID()}.${ext}`
    await env.IMAGES.put(key, b64bytes(m[2]), { httpMetadata: { contentType: m[1] } })
    keys.push(key)
    urls.push(`${origin}/img/${key}`)
  }
  return { keys, urls }
}

/** Fetch the result here so the app gets a data: URL (no CORS issues on the provider's CDN). */
async function inlineImage(src) {
  try {
    const r = await fetch(src)
    if (!r.ok) return src
    return `data:${r.headers.get('Content-Type') || 'image/png'};base64,${bytesB64(new Uint8Array(await r.arrayBuffer()))}`
  } catch {
    return src
  }
}

const num = (v) => (v == null ? null : parseFloat(String(v).replace(',', '.')))
const errText = (t) => (t || 'woso не вернул результат').slice(0, 300)

// ---------- bytes ----------

const b64bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
function bytesB64(buf) {
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}
const b64u = (buf) => bytesB64(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s) => b64bytes(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
const concat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length } return o }
const utf8 = (s) => new TextEncoder().encode(s)

// ---------- Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) ----------

async function pushAll(env, payload) {
  if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return 0
  const subs = await getJ(env, 'push:subs', [])
  if (!subs.length) return 0
  const data = JSON.stringify({ url: env.ADMIN_URL || 'https://appshalamov.github.io/ai-car-studio/admin.html', ...payload })
  const results = await Promise.all(subs.map((s) => sendPush(env, s, data).then((r) => [s, r.status]).catch(() => [s, 0])))
  const alive = results.filter(([, st]) => st !== 404 && st !== 410).map(([s]) => s)
  if (alive.length !== subs.length) await putJ(env, 'push:subs', alive)
  return results.filter(([, st]) => st >= 200 && st < 300).length
}

async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

export async function encryptPush(sub, plaintext, salt = crypto.getRandomValues(new Uint8Array(16)), serverKeys) {
  const uaPublic = unb64u(sub.keys.p256dh)
  const auth = unb64u(sub.keys.auth)
  const as = serverKeys || (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']))
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256))
  const prkKey = await hmac(auth, shared)
  const ikm = await hmac(prkKey, concat(utf8('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(utf8('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(utf8('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(utf8(plaintext), new Uint8Array([2]))))
  const header = new Uint8Array(21)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = 65
  return concat(header, asPublic, ct)
}

async function vapidJwt(env, endpoint) {
  const pub = unb64u(env.VAPID_PUBLIC)
  const jwk = { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)) }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const head = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const body = b64u(utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'https://appshalamov.github.io/ai-car-studio/' })))
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(`${head}.${body}`)))
  return `${head}.${body}.${b64u(sig)}`
}

async function sendPush(env, sub, data) {
  const body = await encryptPush(sub, data)
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(DAY),
      Urgency: 'high',
      Authorization: `vapid t=${await vapidJwt(env, sub.endpoint)}, k=${env.VAPID_PUBLIC}`,
    },
    body,
  })
}
