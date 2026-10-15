/**
 * Client for the studio backend (worker/woso-proxy.js on Cloudflare).
 * The woso token, client list and costs live only on the server.
 */
export const API = ((import.meta.env.VITE_SERVICE_URL as string | undefined) ?? '').replace(/\/$/, '')

export type Brand = { name: string; phone: string; logo: string | null; free: number; vapidPublic: string | null }
export type Me = { token: string; left: number; name?: string }

const ME_KEY = 'acs.me'

async function req<T>(path: string, init: RequestInit = {}, headers: Record<string, string> = {}): Promise<T> {
  if (!API) throw new Error('Сервис ещё не подключён')
  const r = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...headers, ...(init.headers as Record<string, string>) } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.error || `Ошибка сервиса (${r.status})`), { status: r.status, data: j })
  return j as T
}

// ---------- client ----------

let brandCache: Brand | null = null
export async function getBrand(): Promise<Brand> {
  if (brandCache) return brandCache
  try { const b = localStorage.getItem('acs.brand'); if (b) brandCache = JSON.parse(b) } catch { /* ignore */ }
  const fresh = req<Brand>('/config').then((b) => { brandCache = b; try { localStorage.setItem('acs.brand', JSON.stringify(b)) } catch { /* ignore */ } return b })
  return brandCache ?? fresh
}
export const refreshBrand = () => { brandCache = null; return getBrand() }

export function getMe(): Me | null {
  try { const v = localStorage.getItem(ME_KEY); return v ? JSON.parse(v) : null } catch { return null }
}
function setMe(m: Me) { try { localStorage.setItem(ME_KEY, JSON.stringify(m)) } catch { /* ignore */ } }

/** Phone + email unlock the free renders. Re-registering with the same contacts returns the same account. */
export async function register(p: { name?: string; phone: string; email: string }): Promise<Me> {
  const r = await req<Me>('/register', { method: 'POST', body: JSON.stringify(p) })
  const me = { ...r, name: p.name }
  setMe(me)
  return me
}

export async function refreshMe(): Promise<Me | null> {
  const me = getMe()
  if (!me) return null
  const r = await req<{ left: number }>('/me', {}, { 'X-User': me.token })
  const next = { ...me, left: r.left }
  setMe(next)
  return next
}

/** Renders a build. Throws with status 401 (not registered) or 402 (free renders used up). */
export async function generate(p: { prompt: string; images: string[]; signal?: AbortSignal }): Promise<{ image: string; left: number }> {
  const me = getMe()
  if (!me) throw Object.assign(new Error('Нужна регистрация'), { status: 401 })
  const r = await req<{ image: string; left: number }>('/generate', { method: 'POST', body: JSON.stringify({ prompt: p.prompt, images: p.images }), signal: p.signal }, { 'X-User': me.token })
  setMe({ ...me, left: r.left })
  return r
}

// ---------- admin ----------

export type Client = { id: string; name?: string; phone: string; email: string; createdAt: number; used: number; left: number }
export type GenLog = { at: number; userId: string; name?: string; phone?: string; email?: string; model: string; credits: number | null; usd: number | null; ok: boolean; error?: string }
export type Summary = { balance: number | null; price: number | null; usdPerCredit: number; clients: number; generations: number; spentCredits: number; spentUsd: number }

const ADMIN_KEY = 'acs.admin'
export const adminPass = () => { try { return localStorage.getItem(ADMIN_KEY) } catch { return null } }
const A = () => ({ Authorization: `Bearer ${adminPass() ?? ''}` })

export async function adminLogin(password: string) {
  await req('/admin/summary', {}, { Authorization: `Bearer ${password}` })
  try { localStorage.setItem(ADMIN_KEY, password) } catch { /* ignore */ }
}
export const adminLogout = () => { try { localStorage.removeItem(ADMIN_KEY) } catch { /* ignore */ } }
export const adminSummary = () => req<Summary>('/admin/summary', {}, A())
export const adminClients = () => req<Client[]>('/admin/clients', {}, A())
export const adminGenerations = () => req<GenLog[]>('/admin/generations', {}, A())
export const adminSaveBrand = (b: { name: string; phone: string; free: number }) => req<Brand>('/admin/brand', { method: 'PUT', body: JSON.stringify(b) }, A())
export const adminSaveLogo = (dataUrl: string | null) => req<Brand>('/admin/logo', { method: 'PUT', body: JSON.stringify({ image: dataUrl }) }, A())
export const adminSubscribe = (subscription: PushSubscriptionJSON) => req('/admin/push', { method: 'POST', body: JSON.stringify({ subscription }) }, A())
export const adminTestPush = () => req('/admin/push/test', { method: 'POST' }, A())
