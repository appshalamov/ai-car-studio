/**
 * Runs the real Worker (worker/woso-proxy.js) on Node with in-memory KV/R2 and a fake woso,
 * so the app and admin can be tested end to end without spending credits.
 *   node e2e/mock-service.mjs  → http://localhost:8787
 */
import http from 'node:http'
import { readFileSync } from 'node:fs'
import worker from '../worker/woso-proxy.js'

const kv = new Map()
const r2 = new Map()
const env = {
  WOSO_TOKEN: 'fake', ADMIN_PASSWORD: 'test-admin-pass', USD_PER_CREDIT: '0.15', FREE_GENERATIONS: '3', TOTAL_DAILY_LIMIT: '500',
  DB: {
    get: async (k) => kv.get(k)?.v ?? null,
    put: async (k, v, o) => void kv.set(k, { v: String(v), metadata: o?.metadata }),
    delete: async (k) => void kv.delete(k),
    list: async ({ prefix = '' }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name, metadata: kv.get(name).metadata })), list_complete: true }),
  },
  IMAGES: {
    put: async (k, b, o) => void r2.set(k, { b, ct: o?.httpMetadata?.contentType }),
    get: async (k) => (r2.has(k) ? { body: r2.get(k).b, httpMetadata: { contentType: r2.get(k).ct } } : null),
    delete: async (k) => void r2.delete(k),
  },
}

let balance = 50
const realFetch = globalThis.fetch
const result = readFileSync(new URL('../public/img/blackout.jpg', import.meta.url))
globalThis.fetch = async (input, init) => {
  const url = String(input)
  if (url === 'https://woso.io/api/mcp') {
    const { params } = JSON.parse(init.body)
    const reply = (text) => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text }] } }))
    if (params.name === 'generate_image') return reply(`Price: 0.78\nBalance: ${balance.toFixed(2)}\nconfirm_token: ct_x`)
    if (params.name === 'generation_confirm') {
      await new Promise((r) => setTimeout(r, Number(process.env.RENDER_MS || 1200)))
      balance -= 0.78
      return reply('Status: Completed https://cdn.fake/out.jpg')
    }
    return reply('Status: Completed')
  }
  if (url === 'https://cdn.fake/out.jpg') return new Response(result, { headers: { 'Content-Type': 'image/jpeg' } })
  return realFetch(input, init)
}

http.createServer(async (req, res) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  const r = await worker.fetch(new Request('http://localhost:8787' + req.url, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body }), env, { waitUntil: () => {} })
  res.writeHead(r.status, Object.fromEntries(r.headers))
  res.end(Buffer.from(await r.arrayBuffer()))
}).listen(8787, () => console.log('mock service on http://localhost:8787'))
