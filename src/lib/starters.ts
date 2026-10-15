import { loadImage } from './image'

type Shape = { body: string; glass: string; wheels: [number, number]; r: number }

// Side profiles in a 1000x460 space, car facing right. Ground at y=400.
const SHAPES: Record<string, Shape> = {
  coupe: {
    body: 'M90 330 Q92 290 140 280 L300 262 Q380 200 470 190 Q560 186 640 222 L760 262 Q880 272 905 300 Q915 330 905 352 L95 352 Z',
    glass: 'M330 262 Q395 212 470 206 Q545 204 610 232 L640 262 Z',
    wheels: [235, 760], r: 58,
  },
  sedan: {
    body: 'M70 320 Q72 280 130 272 L270 262 Q350 196 450 186 Q570 182 650 222 L730 262 Q880 270 915 300 Q925 330 915 355 L75 355 Z',
    glass: 'M300 262 Q365 206 450 200 Q560 198 625 236 L660 262 Z',
    wheels: [225, 765], r: 58,
  },
  suv: {
    body: 'M70 300 Q72 250 130 240 L250 232 Q290 160 380 150 L690 150 Q760 156 790 232 Q900 244 920 280 Q930 320 920 360 L75 360 Z',
    glass: 'M280 232 Q315 172 390 166 L680 166 Q740 172 765 232 Z',
    wheels: [230, 770], r: 66,
  },
  hatch: {
    body: 'M120 320 Q122 270 170 262 L290 254 Q340 186 430 174 L650 172 Q720 176 760 250 Q870 262 890 300 Q900 330 890 356 L125 356 Z',
    glass: 'M320 254 Q360 196 435 188 L640 188 Q700 194 730 250 Z',
    wheels: [255, 755], r: 58,
  },
  pickup: {
    body: 'M60 300 L60 250 L470 250 L480 170 Q500 150 560 150 L690 150 Q750 156 780 240 Q900 250 930 285 Q940 320 930 365 L60 365 Z',
    glass: 'M505 240 L515 172 Q525 166 560 166 L680 166 Q730 172 755 240 Z',
    wheels: [215, 785], r: 70,
  },
  roadster: {
    body: 'M100 330 Q102 292 150 284 L360 272 Q420 236 470 236 L520 270 L770 270 Q880 280 905 306 Q915 334 905 356 L105 356 Z',
    glass: 'M440 244 L470 244 L505 270 L470 270 Z',
    wheels: [240, 760], r: 56,
  },
  wagon: {
    body: 'M70 320 Q72 270 120 262 L240 256 Q300 190 390 180 L690 182 Q760 190 790 262 Q895 272 915 302 Q925 330 915 356 L75 356 Z',
    glass: 'M270 256 Q320 198 395 194 L680 196 Q740 204 765 256 Z',
    wheels: [225, 770], r: 58,
  },
  muscle: {
    body: 'M70 300 Q72 262 120 256 L310 252 Q390 196 480 192 Q560 192 620 234 L700 256 Q890 258 925 290 Q935 325 925 360 L75 360 Z',
    glass: 'M340 252 Q400 208 480 206 Q550 208 600 240 L620 252 Z',
    wheels: [235, 770], r: 64,
  },
}

export function starterSvg(kind: string, color: string) {
  const s = SHAPES[kind] ?? SHAPES.coupe
  const wheel = (cx: number) => `
    <circle cx="${cx}" cy="${400 - s.r}" r="${s.r}" fill="#111"/>
    <circle cx="${cx}" cy="${400 - s.r}" r="${s.r * 0.62}" fill="#9aa0a6"/>
    <circle cx="${cx}" cy="${400 - s.r}" r="${s.r * 0.5}" fill="#c9ced3"/>
    ${[0, 72, 144, 216, 288].map((a) => `<rect x="${cx - 5}" y="${400 - s.r - s.r * 0.5}" width="10" height="${s.r * 0.5}" fill="#6b7177" transform="rotate(${a} ${cx} ${400 - s.r})"/>`).join('')}
    <circle cx="${cx}" cy="${400 - s.r}" r="${s.r * 0.12}" fill="#333"/>`
  const arch = (cx: number) => `<circle cx="${cx}" cy="${400 - s.r}" r="${s.r + 12}" fill="#1c1d21"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 460" width="1200" height="552">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eceff2"/><stop offset=".78" stop-color="#cfd4da"/><stop offset="1" stop-color="#b7bec6"/></linearGradient>
    <linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
  </defs>
  <rect width="1000" height="460" fill="url(#bg)"/>
  <ellipse cx="500" cy="402" rx="440" ry="16" fill="#000" opacity=".25"/>
  ${arch(s.wheels[0])}${arch(s.wheels[1])}
  <path d="${s.body}" fill="${color}"/>
  <path d="${s.body}" fill="url(#paint)"/>
  ${arch(s.wheels[0]).replace('#1c1d21', '#151618')}${arch(s.wheels[1]).replace('#1c1d21', '#151618')}
  <path d="${s.glass}" fill="#1d2a36" opacity=".92"/>
  <path d="M120 318 L900 318" stroke="#000" stroke-opacity=".15" stroke-width="3"/>
  <rect x="880" y="292" width="26" height="12" rx="4" fill="#ffe9a8"/>
  <rect x="78" y="290" width="22" height="12" rx="4" fill="#b3001b"/>
  ${wheel(s.wheels[0])}${wheel(s.wheels[1])}
</svg>`
}

export async function starterPng(kind: string, color: string): Promise<string> {
  const svg = starterSvg(kind, color)
  const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 552
  c.getContext('2d')!.drawImage(img, 0, 0, 1200, 552)
  return c.toDataURL('image/jpeg', 0.92)
}

export const starterThumb = (kind: string, color: string) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(starterSvg(kind, color))
