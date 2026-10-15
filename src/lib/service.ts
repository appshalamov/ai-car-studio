import { notify, askNotifyPermission } from './notify'
import { API, generate, getMe, register } from './api'

/**
 * Hosted mode: renders go through the studio's woso account behind worker/woso-proxy.js.
 * Free for the client (N free renders after phone + email); the cost is visible only in the admin.
 */
export const SERVICE_URL = API

const listeners = new Set<() => void>()
export const onServiceChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
export const freeLeft = () => getMe()?.left ?? null

async function ensureRegistered() {
  if (getMe()) return
  const phone = prompt('Получите 3 бесплатные сборки.\nВаш телефон:')?.trim()
  if (!phone) throw new Error('Для бесплатных сборок нужен телефон и email')
  const email = prompt('Ваш email:')?.trim()
  if (!email) throw new Error('Для бесплатных сборок нужен телефон и email')
  await register({ phone, email })
  listeners.forEach((l) => l())
}

export async function serviceGenerate(req: { images: string[]; prompt: string; signal?: AbortSignal }): Promise<string> {
  askNotifyPermission().catch(() => {}) // still inside the tap that started the render
  await ensureRegistered()
  let r
  try {
    r = await generate(req)
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 401) { localStorage.removeItem('acs.me'); await ensureRegistered(); r = await generate(req) }
    else if (status === 402) throw new Error('Бесплатные сборки закончились. Свяжитесь с нами, чтобы продолжить.')
    else throw e
  }
  listeners.forEach((l) => l())
  notify('Ваша машина готова', `Осталось бесплатных сборок: ${r.left}`)
  return r.image
}
