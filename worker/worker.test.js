import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './woso-proxy.js'

const ORIGIN = 'https://appshalamov.github.io'
const BASE = 'https://proxy.test'
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))

function memKV() {
  const m = new Map()
  return {
    m,
    get: async (k) => m.get(k)?.v ?? null,
    put: async (k, v, o) => void m.set(k, { v: String(v), metadata: o?.metadata }),
    delete: async (k) => void m.delete(k),
    list: async ({ prefix = '' } = {}) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name, metadata: m.get(name).metadata })), list_complete: true }),
  }
}
function memR2() {
  const m = new Map()
  return {
    m,
    put: async (k, bytes, o) => void m.set(k, { bytes, ct: o?.httpMetadata?.contentType }),
    get: async (k) => (m.has(k) ? { body: m.get(k).bytes, httpMetadata: { contentType: m.get(k).ct } } : null),
    delete: async (k) => void m.delete(k),
  }
}

let env, pushes, wosoBalance, vapid
beforeEach(async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  vapid = { pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), d: (await crypto.subtle.exportKey('jwk', kp.privateKey)).d, key: kp.publicKey }
  env = { DB: memKV(), IMAGES: memR2(), WOSO_TOKEN: 'tok', ADMIN_PASSWORD: 'pw', USD_PER_CREDIT: '0.15', FREE_GENERATIONS: '3', TOTAL_DAILY_LIMIT: '30', VAPID_PUBLIC: vapid.pub, VAPID_PRIVATE: vapid.d }
  pushes = []
  wosoBalance = 100
  vi.stubGlobal('fetch', vi.fn(async (input, init = {}) => {
    const url = String(input)
    if (url === 'https://woso.io/api/mcp') {
      const { params } = JSON.parse(init.body)
      const reply = (text) => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text }] } }))
      if (params.name === 'generate_image') {
        if (params.arguments.image_url) expect(params.arguments.image_url).toMatch(/^https:\/\/proxy\.test\/img\/refs\//) // woso only takes links
        return reply(`Price: 0.78 credits\nBalance: ${wosoBalance.toFixed(2)}\nconfirm_token: ct_123`)
      }
      if (params.name === 'generation_confirm') { wosoBalance -= 0.78; return reply('Status: Completed https://cdn.woso.test/out/abc.png') }
      return reply('Status: Completed')
    }
    if (url === 'https://cdn.woso.test/out/abc.png') return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } })
    if (url.startsWith('https://push.test/')) { pushes.push({ url, init }); return new Response(null, { status: 201 }) }
    throw new Error('unexpected fetch ' + url)
  }))
})

const call = async (path, { method = 'GET', body, user, admin, origin = ORIGIN } = {}) => {
  const headers = { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }
  if (user) headers['X-User'] = user
  if (admin) headers.Authorization = `Bearer ${admin}`
  const r = await worker.fetch(new Request(BASE + path, { method, headers, body: body && JSON.stringify(body) }), env, { waitUntil: () => {} })
  return { status: r.status, body: await r.json().catch(() => null) }
}
const register = (o = {}) => call('/register', { method: 'POST', body: { name: 'Mike', phone: '+1 (555) 010-2030', email: 'Mike@Example.com', ...o } })
const img = 'data:image/jpeg;base64,' + btoa('car')

describe('brand', () => {
  it('is empty until the owner names the shop, then shows name, phone and logo', async () => {
    expect((await call('/config')).body).toMatchObject({ name: '', logo: null, free: 3, vapidPublic: vapid.pub })
    expect((await call('/admin/brand', { method: 'PUT', admin: 'pw', body: { name: "Joe's Body Shop", phone: '+1 555 123 4567', free: 3 } })).status).toBe(200)
    const logo = await call('/admin/logo', { method: 'PUT', admin: 'pw', body: { image: 'data:image/png;base64,' + btoa('png') } })
    expect(logo.body.logo).toMatch(/^https:\/\/proxy\.test\/logo\?v=/)
    expect((await call('/config')).body).toMatchObject({ name: "Joe's Body Shop", phone: '+1 555 123 4567' })
    const file = await worker.fetch(new Request(BASE + '/logo'), env, {})
    expect(file.status).toBe(200)
    expect(file.headers.get('Content-Type')).toBe('image/png')
  })

  it('keeps admin routes behind the password and other sites out', async () => {
    expect((await call('/admin/summary')).status).toBe(401)
    expect((await call('/admin/summary', { admin: 'nope' })).status).toBe(401)
    expect((await call('/admin/brand', { method: 'PUT', body: { name: 'x' } })).status).toBe(401)
    expect((await call('/config', { origin: 'https://evil.test' })).status).toBe(403)
  })
})

describe('clients and free renders', () => {
  it('validates phone and email', async () => {
    expect((await register({ phone: '555 0102' })).status).toBe(400)
    expect((await register({ email: 'nope' })).status).toBe(400)
  })

  it('gives 3 free renders once per phone or email', async () => {
    const a = (await register()).body
    expect(a.left).toBe(3)
    expect((await register({ email: 'other@example.com' })).body.token).toBe(a.token)
    expect((await register({ phone: '+1 999 000 1111', email: ' mike@example.com' })).body.token).toBe(a.token)
  })

  it('needs sign-up to render', async () => {
    expect((await call('/generate', { method: 'POST', body: { prompt: 'x' } })).status).toBe(401)
    expect((await call('/generate', { method: 'POST', user: 'deadbeef', body: { prompt: 'x' } })).status).toBe(401)
  })

  it('renders without showing the client any cost, logs the cost for the admin, stops after 3', async () => {
    const { token } = (await register()).body
    for (const left of [2, 1, 0]) {
      const r = await call('/generate', { method: 'POST', user: token, body: { prompt: 'make it black', images: [img], label: 'Blackout' } })
      expect(r.status).toBe(200)
      expect(r.body.image).toMatch(/^data:image\/png;base64,/)
      expect(Object.keys(r.body).sort()).toEqual(['image', 'left'])
      expect(r.body.left).toBe(left)
    }
    expect((await call('/generate', { method: 'POST', user: token, body: { prompt: 'again', images: [img] } })).status).toBe(402)
    expect([...env.IMAGES.m.keys()].filter((k) => k.startsWith('refs/'))).toHaveLength(0) // reference photos removed

    const sum = (await call('/admin/summary', { admin: 'pw' })).body
    expect(sum).toMatchObject({ clients: 1, generations: 3, spentCredits: 2.34, spentUsd: 0.35, price: 0.78, balance: 97.66 })
    const clients = (await call('/admin/clients', { admin: 'pw' })).body
    expect(clients[0]).toMatchObject({ name: 'Mike', phone: '+15550102030', email: 'mike@example.com', used: 3, left: 0 })
    const gens = (await call('/admin/generations', { admin: 'pw' })).body
    expect(gens).toHaveLength(3)
    expect(gens[0]).toMatchObject({ label: 'Blackout', credits: 0.78, usd: 0.117, ok: true, model: 'nano-banana' })
  })

  it('does not count a failed render', async () => {
    const { token } = (await register()).body
    fetch.mockImplementationOnce(async () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'Error: model unavailable' }] } })))
    expect((await call('/generate', { method: 'POST', user: token, body: { prompt: 'x', images: [img] } })).status).toBe(502)
    expect((await call('/me', { user: token })).body.left).toBe(3)
    const gens = (await call('/admin/generations', { admin: 'pw' })).body
    expect(gens[0].ok).toBe(false)
  })
})

// Independent RFC 8291 decryption: proves a browser can read the admin push.
async function decrypt(body, ua, auth) {
  const salt = body.slice(0, 16)
  const asPublic = body.slice(21, 21 + body[20])
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256))
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey))
  const enc = new TextEncoder()
  const h = async (s, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8))
  const ikm = await h(auth, shared, new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic]), 32)
  const cek = await h(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await h(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), body.slice(21 + body[20])))
  return JSON.parse(new TextDecoder().decode(plain.slice(0, plain.lastIndexOf(2))))
}

describe('admin push', () => {
  it('sends a readable, VAPID-signed push on sign-up and on each render with its cost', async () => {
    const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
    const auth = crypto.getRandomValues(new Uint8Array(16))
    const subscription = { endpoint: 'https://push.test/sub/1', keys: { p256dh: b64u(await crypto.subtle.exportKey('raw', ua.publicKey)), auth: b64u(auth) } }
    expect((await call('/admin/push', { method: 'POST', admin: 'pw', body: { subscription } })).status).toBe(200)

    const { token } = (await register()).body
    expect(pushes).toHaveLength(1)
    const signup = await decrypt(new Uint8Array(pushes[0].init.body), ua, auth)
    expect(signup.title).toBe('Новый клиент')
    expect(signup.body).toContain('+15550102030')
    expect(signup.body).toContain('mike@example.com')

    const [, jwt] = /t=([^,]+)/.exec(pushes[0].init.headers.Authorization)
    const [h, c, sig] = jwt.split('.')
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, vapid.key, unb64u(sig), new TextEncoder().encode(`${h}.${c}`))).toBe(true)

    await call('/generate', { method: 'POST', user: token, body: { prompt: 'x', images: [img], label: 'Track day' } })
    const gen = await decrypt(new Uint8Array(pushes[1].init.body), ua, auth)
    expect(gen.body).toContain('Track day')
    expect(gen.body).toContain('0.78 кр.')
    expect(gen.body).toContain('$0.117')
  })

  it('test push reaches the subscribed device', async () => {
    const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
    const subscription = { endpoint: 'https://push.test/sub/2', keys: { p256dh: b64u(await crypto.subtle.exportKey('raw', ua.publicKey)), auth: b64u(new Uint8Array(16)) } }
    await call('/admin/push', { method: 'POST', admin: 'pw', body: { subscription } })
    expect((await call('/admin/push/test', { method: 'POST', admin: 'pw' })).body.sent).toBe(1)
  })
})
