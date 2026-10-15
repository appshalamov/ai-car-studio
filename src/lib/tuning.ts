import type { Lang } from './i18n'
import { dataUrlParts, dataUrlToBlob, downloadDataUrl, downscale } from './image'

export type PartKey = 'paint' | 'finish' | 'wheels' | 'stance' | 'tint'
export type Sel = Record<PartKey, string>

/** "stock" everywhere means "leave this part as it is on the photo". */
export const DEF: Sel = { paint: 'stock', finish: 'stock', wheels: 'stock', stance: 'stock', tint: 'stock' }

type Two = [string, string]
export type Style = { id: string; ru: Two; en: Two; set: Sel }

export const STYLES: Style[] = [
  { id: 'street', en: ['Street', 'Black wheels, lower, tint'], ru: ['Стрит', 'Чёрные диски, ниже, тонировка'], set: { paint: 'stock', finish: 'stock', wheels: 'black', stance: 'lowered', tint: 'dark' } },
  { id: 'blackout', en: ['Blackout', 'Matte black everything'], ru: ['Блэкаут', 'Всё матово-чёрное'], set: { paint: 'black', finish: 'matte', wheels: 'black', stance: 'lowered', tint: 'dark' } },
  { id: 'oem', en: ['Clean OEM+', 'White, bronze wheels'], ru: ['Чистый OEM+', 'Белый, бронзовые диски'], set: { paint: 'white', finish: 'gloss', wheels: 'bronze', stance: 'lowered', tint: 'light' } },
  { id: 'track', en: ['Track day', 'Red, graphite wheels, low'], ru: ['Трек', 'Красный, графит, низко'], set: { paint: 'red', finish: 'gloss', wheels: 'graphite', stance: 'slammed', tint: 'dark' } },
  { id: 'heritage', en: ['British green', 'Deep green, gold wheels'], ru: ['Британский зелёный', 'Тёмно-зелёный, золото'], set: { paint: 'green', finish: 'gloss', wheels: 'gold', stance: 'stock', tint: 'stock' } },
  { id: 'nardo', en: ['Nardo matte', 'Flat grey, black wheels'], ru: ['Матовый серый', 'Серый мат, чёрные диски'], set: { paint: 'grey', finish: 'matte', wheels: 'black', stance: 'lowered', tint: 'dark' } },
]
export const styleById = (id: string | null | undefined) => STYLES.find((s) => s.id === id)

type Opt = { v: string; ru: string; en: string; c?: string; prompt?: string }
export type Part = { k: PartKey; type: 'sw' | 'opt'; ru: string; en: string; opts: Opt[] }

const keep = (ru = 'Как есть', en = 'As is'): Opt => ({ v: 'stock', ru, en })

export const PARTS: Part[] = [
  { k: 'paint', type: 'sw', ru: 'Цвет', en: 'Paint', opts: [
    keep(),
    { v: 'silver', ru: 'Серебро', en: 'Silver', c: '#aeb3b9', prompt: 'metallic silver' },
    { v: 'black', ru: 'Чёрный', en: 'Black', c: '#1f2022', prompt: 'deep black' },
    { v: 'white', ru: 'Белый', en: 'White', c: '#ecedec', prompt: 'pure white' },
    { v: 'red', ru: 'Красный', en: 'Red', c: '#a3161c', prompt: 'deep red' },
    { v: 'green', ru: 'Зелёный', en: 'Green', c: '#1f3d30', prompt: 'dark British racing green' },
    { v: 'grey', ru: 'Серый', en: 'Grey', c: '#8a8d8f', prompt: 'flat Nardo grey' },
  ] },
  { k: 'finish', type: 'opt', ru: 'Покрытие', en: 'Finish', opts: [
    keep(),
    { v: 'gloss', ru: 'Глянец', en: 'Gloss', prompt: 'high-gloss' },
    { v: 'satin', ru: 'Сатин', en: 'Satin', prompt: 'satin' },
    { v: 'matte', ru: 'Мат', en: 'Matte', prompt: 'matte' },
  ] },
  { k: 'wheels', type: 'sw', ru: 'Диски', en: 'Wheels', opts: [
    keep(),
    { v: 'silver', ru: 'Серебро', en: 'Silver', c: '#c4c7cb', prompt: 'silver' },
    { v: 'black', ru: 'Чёрные', en: 'Black', c: '#1d1f21', prompt: 'gloss black' },
    { v: 'bronze', ru: 'Бронза', en: 'Bronze', c: '#7d5f34', prompt: 'bronze' },
    { v: 'gold', ru: 'Золото', en: 'Gold', c: '#b89a5a', prompt: 'gold' },
    { v: 'graphite', ru: 'Графит', en: 'Graphite', c: '#3a3d40', prompt: 'dark graphite' },
  ] },
  { k: 'stance', type: 'opt', ru: 'Посадка', en: 'Stance', opts: [
    keep('Заводская', 'Stock'),
    { v: 'lowered', ru: 'Ниже', en: 'Lowered' },
    { v: 'slammed', ru: 'Низко', en: 'Slammed' },
  ] },
  { k: 'tint', type: 'opt', ru: 'Тонировка', en: 'Window tint', opts: [
    keep(),
    { v: 'light', ru: 'Светлая', en: 'Light' },
    { v: 'dark', ru: 'Тёмная', en: 'Dark' },
  ] },
]

const opt = (k: PartKey, v: string) => PARTS.find((p) => p.k === k)!.opts.find((o) => o.v === v)
export const optLabel = (k: PartKey, v: string, lang: Lang) => { const o = opt(k, v); return o ? o[lang] : v }
export const partLabel = (k: PartKey, lang: Lang) => PARTS.find((p) => p.k === k)![lang]

export const changes = (s: Sel) => (Object.keys(DEF) as PartKey[]).filter((k) => s[k] !== DEF[k]).length

/** English instruction for the image-editing model. Only changed parts are mentioned. */
export function buildPrompt(s: Sel): string {
  const out = ['Edit this photo of a car.']
  const color = opt('paint', s.paint)?.prompt
  const finish = opt('finish', s.finish)?.prompt
  if (color) out.push(`Repaint the body ${color}${finish ? ` with a ${finish} finish` : ''}.`)
  else if (finish) out.push(`Change the paint finish to ${finish}, keeping the same body color.`)
  const wheels = opt('wheels', s.wheels)?.prompt
  if (wheels) out.push(`Replace the wheels with ${wheels} aftermarket alloy wheels.`)
  if (s.stance === 'lowered') out.push('Lower the suspension slightly.')
  if (s.stance === 'slammed') out.push('Slam the car very low on the suspension with minimal wheel gap.')
  if (s.tint === 'light') out.push('Light window tint.')
  if (s.tint === 'dark') out.push('Dark window tint.')
  out.push('Keep the same car model, body shape, camera angle, framing, background and lighting. Photorealistic, no text or watermark.')
  return out.join(' ')
}

export function summary(s: Sel, style: string | null | undefined, lang: Lang): string {
  const st = styleById(style)
  const bits = (Object.keys(DEF) as PartKey[]).filter((k) => s[k] !== DEF[k]).map((k) => `${partLabel(k, lang)}: ${optLabel(k, s[k], lang).toLowerCase()}`)
  const body = bits.join(', ')
  return st ? `${st[lang][0]}. ${body.charAt(0).toUpperCase()}${body.slice(1)}` : body.charAt(0).toUpperCase() + body.slice(1)
}

export function plural(n: number, lang: Lang, ru: [string, string, string], en: [string, string]) {
  if (lang === 'en') return `${n} ${n === 1 ? en[0] : en[1]}`
  const m = n % 10, c = n % 100
  const w = m === 1 && c !== 11 ? ru[0] : m >= 2 && m <= 4 && (c < 10 || c >= 20) ? ru[1] : ru[2]
  return `${n} ${w}`
}

export const IMG = (n: string) => `./img/${n}.jpg`

/** Any image URL (including ./img/x.jpg) as a data URL. */
export async function urlToDataUrl(url: string, maxSide?: number): Promise<string> {
  if (url.startsWith('data:')) return maxSide ? downscale(url, maxSide) : url
  const blob = await (await fetch(url)).blob()
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
  return maxSide ? downscale(raw, maxSide) : raw
}

/** Web Share with the image file; falls back to a download. */
export async function shareImage(src: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const dataUrl = await urlToDataUrl(src)
  const mime = dataUrlParts(dataUrl).mime
  const name = `car-build-${Date.now()}.${mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'}`
  const file = new File([dataUrlToBlob(dataUrl)], name, { type: mime })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title }); return 'shared' }
    catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled' }
  }
  downloadDataUrl(dataUrl, name)
  return 'downloaded'
}
