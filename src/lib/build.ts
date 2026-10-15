export type Sel = { paint: string; finish: string; wheels: string; stance: string; tint: string }
export type Style = { id: string; en: [string, string]; ru: [string, string]; set: Sel; extra?: string }

export const DEF: Sel = { paint: 'stock', finish: 'stock', wheels: 'stock', stance: 'stock', tint: 'clear' }

// Ready looks: a new color and new wheels, the two things clients most often ask a shop for.
export const STYLES: Style[] = [
  { id: 'rosso', en: ['Rosso red', 'Gloss red, black wheels'], ru: ['Красный Rosso', 'Красный глянец, чёрные диски'], set: { paint: 'red', finish: 'gloss', wheels: 'black', stance: 'stock', tint: 'clear' } },
  { id: 'blackout', en: ['Blackout', 'Matte black, black wheels, tint'], ru: ['Блэкаут', 'Чёрный мат, чёрные диски, тонировка'], set: { paint: 'black', finish: 'matte', wheels: 'black', stance: 'lowered', tint: 'dark' }, extra: 'blacked-out trim, badges and grille' },
  { id: 'nardo', en: ['Nardo grey', 'Satin grey, bronze wheels'], ru: ['Серый Nardo', 'Серый сатин, бронзовые диски'], set: { paint: 'grey', finish: 'satin', wheels: 'bronze', stance: 'lowered', tint: 'light' } },
  { id: 'heritage', en: ['British green', 'Deep green, gold wheels'], ru: ['Британский зелёный', 'Тёмно-зелёный, золотые диски'], set: { paint: 'green', finish: 'gloss', wheels: 'gold', stance: 'stock', tint: 'clear' } },
  { id: 'oem', en: ['Pearl white', 'White, graphite wheels'], ru: ['Белый перламутр', 'Белый, диски графит'], set: { paint: 'white', finish: 'gloss', wheels: 'graphite', stance: 'lowered', tint: 'light' } },
  { id: 'street', en: ['Wheels only', 'Black wheels, lower, tint'], ru: ['Только диски', 'Чёрные диски, ниже, тонировка'], set: { paint: 'stock', finish: 'stock', wheels: 'black', stance: 'lowered', tint: 'dark' } },
]

type Part = { k: keyof Sel; type: 'sw' | 'opt'; opts: [string, string?][] }
export const PARTS: Part[] = [
  { k: 'paint', type: 'sw', opts: [['silver', '#aeb3b9'], ['black', '#1f2022'], ['white', '#ecedec'], ['red', '#c4161c'], ['blue', '#1f4fa8'], ['green', '#1e4a36'], ['grey', '#8a8d8f'], ['yellow', '#e9b815']] },
  { k: 'finish', type: 'opt', opts: [['gloss'], ['satin'], ['matte']] },
  { k: 'wheels', type: 'sw', opts: [['silver', '#c4c7cb'], ['black', '#1d1f21'], ['bronze', '#7d5f34'], ['gold', '#b89a5a'], ['graphite', '#3a3d40']] },
  { k: 'stance', type: 'opt', opts: [['stock'], ['lowered'], ['slammed']] },
  { k: 'tint', type: 'opt', opts: [['clear'], ['light'], ['dark']] },
]

const PAINT: Record<string, string> = { silver: 'metallic silver', black: 'deep black', white: 'pure white', red: 'Rosso Corsa red (the classic Ferrari red)', blue: 'deep blue', green: 'British racing green', grey: 'Nardo grey', yellow: 'vivid yellow' }
const FINISH: Record<string, string> = { gloss: 'high-gloss', satin: 'satin', matte: 'flat matte' }
const WHEELS: Record<string, string> = { silver: 'silver multi-spoke alloy wheels', black: 'gloss black 5-spoke alloy wheels', bronze: 'bronze forged 6-spoke wheels', gold: 'gold mesh wheels', graphite: 'graphite forged wheels' }
const STANCE: Record<string, string> = { lowered: 'lowered about 40 mm on coilovers with flush wheel fitment', slammed: 'slammed low on air suspension with wheels tucked into the arches' }
const TINT: Record<string, string> = { light: 'light 35% window tint', dark: 'dark 15% limo window tint' }

export const changes = (s: Sel) => (Object.keys(DEF) as (keyof Sel)[]).filter((k) => s[k] !== DEF[k]).length

/** The edit instruction sent to the image model. */
export function buildPrompt(s: Sel, style?: Style | null) {
  const mods: string[] = []
  if (s.paint !== 'stock') mods.push(`repaint the body ${FINISH[s.finish] ?? 'gloss'} ${PAINT[s.paint]}`)
  else if (s.finish !== 'stock') mods.push(`change the paint finish to ${FINISH[s.finish]}, keeping the original color`)
  if (s.wheels !== 'stock') mods.push(`fit ${WHEELS[s.wheels]}`)
  if (STANCE[s.stance]) mods.push(STANCE[s.stance])
  if (TINT[s.tint]) mods.push(`add ${TINT[s.tint]}`)
  if (style?.extra) mods.push(style.extra)
  return [
    'Edit this photo of a car. Keep exactly the same car model, body shape, camera angle, framing, background and lighting.',
    `Apply these modifications: ${mods.join('; ')}.`,
    'Photorealistic result that looks like a professional automotive photo of the real modified car, no text, no watermark.',
  ].join(' ')
}

/** Human summary of a build, e.g. "Blackout" or "Red gloss, black wheels, lowered". */
export function summary(s: Sel, o: Record<string, string>, labels: { wheels: string; tint: string }, style?: Style | null, lang: 'en' | 'ru' = 'en') {
  if (style) return style[lang][0]
  const parts: string[] = []
  if (s.paint !== 'stock') parts.push(`${o[s.paint]}${s.finish !== 'stock' ? ' ' + o[s.finish].toLowerCase() : ''}`)
  else if (s.finish !== 'stock') parts.push(o[s.finish])
  if (s.wheels !== 'stock') parts.push(`${labels.wheels.toLowerCase()} ${o['w_' + s.wheels].toLowerCase()}`)
  if (s.stance !== 'stock') parts.push(o[s.stance].toLowerCase())
  if (s.tint !== 'clear') parts.push(`${labels.tint.toLowerCase()} ${o[s.tint].toLowerCase()}`)
  const str = parts.join(', ')
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Swatch colors of a look: body paint and wheels (stock shows as a neutral outline). */
export function swatch(s: Sel) {
  const hex = (k: 'paint' | 'wheels') => PARTS.find((p) => p.k === k)!.opts.find(([o]) => o === s[k])?.[1] ?? null
  return { paint: hex('paint'), wheels: hex('wheels') }
}
