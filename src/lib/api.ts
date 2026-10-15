/**
 * Client for the studio backend (worker/woso-proxy.js on Cloudflare).
 * The woso token, client list and costs live only on the server.
 */
export const API = ((import.meta.env.VITE_SERVICE_URL as string | undefined) ?? '').replace(/\/$/, '')

export type Brand = { id?: string; name: string; phone: string; logo: string | null; free: number; vapidPublic: string | null }
export type ApiError = Error & { status?: number }

/** A neutral brand clients see until the owner names the shop in the admin panel. */
export const PLACEHOLDER_NAME = 'Auto Studio'
export const DEFAULT_BRAND: Brand = { name: '', phone: '', logo: null, free: 3, vapidPublic: null }
export const shopName = (b: Brand) => b.name.trim() || PLACEHOLDER_NAME
export type Me = { token: string; left: number; name?: string; /** started a render before leaving contacts */ anon?: boolean }

const ME_KEY = 'acs.me'

async function req<T>(path: string, init: RequestInit = {}, headers: Record<string, string> = {}): Promise<T> {
  if (!API) throw new Error('Сервис ещё не подключён')
  const r = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...headers, ...(init.headers as Record<string, string>) } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.error || `Ошибка сервиса (${r.status})`), { status: r.status, data: j })
  return j as T
}

// ---------- client ----------

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* ignore */ } },
}

/**
 * Each body shop has its own link (?s=<shop id>). The installed app opens with ?s=…&u=<client token>,
 * because a home-screen app on iPhone does not share storage with Safari.
 */
export function readLaunchParams() {
  const q = new URLSearchParams(location.search)
  const s = q.get('s')
  if (s && /^[a-z0-9]{4,20}$/.test(s) && s !== ls.get('acs.shop')) { ls.set('acs.shop', s); ls.set('acs.brand', null) }
  const u = q.get('u')
  if (u && /^[a-f0-9]{16,64}$/.test(u) && getMe()?.token !== u) setMe({ token: u, left: 0 })
  return { fromInstall: !!u }
}
export const currentShop = () => ls.get('acs.shop') || 'main'

/** Point the page's install manifest and iOS home-screen title at this shop (and this client, once signed up). */
export function syncInstallMeta(brand: Brand) {
  if (!API) return
  const me = getMe()
  const q = new URLSearchParams({ shop: currentShop() })
  if (me) q.set('u', me.token)
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (link) link.href = `${API}/manifest.webmanifest?${q}`
  const title = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
  if (title) title.content = shopName(brand)
  const icon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (icon) icon.href = brand.logo || './apple-touch-icon.png'
  // iPhone saves the current address with the icon, so keep the shop and the client in it.
  const url = new URL(location.href)
  url.searchParams.set('s', currentShop())
  if (me) url.searchParams.set('u', me.token)
  if (url.href !== location.href) history.replaceState(null, '', url)
}

let brandCache: Brand | null = null
export async function getBrand(): Promise<Brand> {
  if (brandCache) return brandCache
  try { const b = localStorage.getItem('acs.brand'); if (b) brandCache = JSON.parse(b) } catch { /* ignore */ }
  const fresh = req<Brand>(`/config?shop=${currentShop()}`).then((b) => { brandCache = b; try { localStorage.setItem('acs.brand', JSON.stringify(b)) } catch { /* ignore */ } return b })
  return brandCache ?? fresh
}
/** Always asks the server (getBrand may answer from the device cache). */
export async function refreshBrand(): Promise<Brand> {
  const b = await req<Brand>(`/config?shop=${currentShop()}`)
  brandCache = b
  try { localStorage.setItem('acs.brand', JSON.stringify(b)) } catch { /* ignore */ }
  return b
}
/** Last brand seen on this device, for an instant first paint. */
export function cachedBrand(): Brand {
  try { const b = localStorage.getItem('acs.brand'); if (b) return { ...DEFAULT_BRAND, ...JSON.parse(b) } } catch { /* ignore */ }
  return DEFAULT_BRAND
}
export const forgetMe = () => { try { localStorage.removeItem(ME_KEY) } catch { /* ignore */ } }

export function getMe(): Me | null {
  try { const v = localStorage.getItem(ME_KEY); return v ? JSON.parse(v) : null } catch { return null }
}
function setMe(m: Me) { try { localStorage.setItem(ME_KEY, JSON.stringify(m)) } catch { /* ignore */ } }

/** Phone + email unlock the free renders. Re-registering with the same contacts returns the same account. */
/** Starts a session without contacts, so the first render can run while the client fills them in. */
export async function startSession(): Promise<Me> {
  const r = await req<{ token: string; left: number }>('/start', { method: 'POST', body: JSON.stringify({ shop: currentShop() }) })
  const me: Me = { token: r.token, left: r.left, anon: true }
  setMe(me)
  return me
}

export async function register(p: { name?: string; phone: string; email: string }): Promise<Me & { returning: boolean }> {
  const cur = getMe()
  const r = await req<Me & { returning?: boolean }>('/register', { method: 'POST', body: JSON.stringify({ ...p, shop: currentShop() }) }, cur?.anon ? { 'X-User': cur.token } : {})
  const me: Me = { token: r.token, left: r.left, name: r.name || p.name }
  setMe(me)
  return Object.assign(me, { returning: !!r.returning })
}

export async function refreshMe(): Promise<Me | null> {
  const me = getMe()
  if (!me) return null
  const r = await req<{ left: number; name?: string; anon?: boolean }>('/me', {}, { 'X-User': me.token })
  const next = { ...me, left: r.left, name: me.name || r.name, anon: !!r.anon }
  setMe(next)
  return next
}

/** Renders a build. Throws with status 401 (not registered) or 402 (free renders used up). */
export async function generate(p: { prompt: string; images: string[]; label?: string; title?: string; signal?: AbortSignal }): Promise<{ image: string; left: number }> {
  const me = getMe()
  if (!me) throw Object.assign(new Error('Нужна регистрация'), { status: 401 })
  const r = await req<{ image: string; left: number }>('/generate', { method: 'POST', body: JSON.stringify({ prompt: p.prompt, images: p.images, label: p.label, title: p.title }), signal: p.signal }, { 'X-User': me.token })
  // The client may have left contacts (new token, no longer anonymous) while this ran.
  const now = getMe()
  if (now) setMe({ ...now, left: r.left })
  return r
}

export type Build = { id: string; at: number; label: string; before: string | null; after: string }
/** The client's builds kept on the server (shown in the installed app too); pending = a render is running. */
export async function myBuilds(): Promise<{ builds: Build[]; pending: boolean }> {
  const me = getMe()
  if (!me) return { builds: [], pending: false }
  return req('/builds', {}, { 'X-User': me.token })
}
export async function deleteBuild(id: string) {
  const me = getMe()
  if (me) await req(`/builds/${encodeURIComponent(id)}`, { method: 'DELETE' }, { 'X-User': me.token })
}

export const b64uToBytes = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

/** Subscribes this phone to "your build is ready" pushes. Needs notification permission already granted. */
export async function subscribeMe(brand: Brand, lang: string): Promise<boolean> {
  const me = getMe()
  if (!me || !brand.vapidPublic || !('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const key = b64uToBytes(brand.vapidPublic)
  let sub = await reg.pushManager.getSubscription()
  if (sub && key.join() !== new Uint8Array(sub.options.applicationServerKey ?? new ArrayBuffer(0)).join()) { await sub.unsubscribe(); sub = null }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  await req('/me/push', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON(), lang }) }, { 'X-User': me.token })
  return true
}

// ---------- admin ----------

export type Client = { id: string; anon?: boolean; name?: string; phone: string; email: string; createdAt: number; used: number; left: number; shop?: string; shopName?: string }
export type GenLog = { at: number; userId: string; name?: string; phone?: string; email?: string; shop?: string; shopName?: string; label?: string; model: string; credits: number | null; usd: number | null; ok: boolean; error?: string }
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

export type Shop = Brand & { id: string; createdAt?: number }
export type ShopInput = { name: string; phone: string; free: number }
export const adminAddRenders = (id: string, add: number) => req<{ free: number; left: number }>(`/admin/clients/${id}`, { method: 'PUT', body: JSON.stringify({ add }) }, A())
export const adminShops = () => req<Shop[]>('/admin/shops', {}, A())
export const adminCreateShop = (b: ShopInput & { logo?: string | null }) => req<Shop>('/admin/shops', { method: 'POST', body: JSON.stringify(b) }, A())
export const adminUpdateShop = (id: string, b: ShopInput) => req<Shop>(id === 'main' ? '/admin/brand' : `/admin/shops/${id}`, { method: 'PUT', body: JSON.stringify(b) }, A())
export const adminShopLogo = (id: string, image: string | null) => req<Shop>(id === 'main' ? '/admin/logo' : `/admin/shops/${id}/logo`, { method: 'PUT', body: JSON.stringify({ image }) }, A())
export const adminDeleteShop = (id: string) => req(`/admin/shops/${id}`, { method: 'DELETE' }, A())
/** The link the owner sends to a shop's clients. */
export const shopLink = (id: string) => new URL(id === 'main' ? './' : `./?s=${id}`, location.href.replace(/admin\.html.*$/, '')).href
