// Procedural wrap patterns drawn on a canvas, returned as data URLs.
type Draw = (ctx: CanvasRenderingContext2D, s: number) => void

const rnd = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

const PATTERNS: Record<string, Draw> = {
  carbon: (ctx, s) => {
    const n = 32
    const c = s / n
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const g = ctx.createLinearGradient(x * c, y * c, (x + 1) * c, (y + 1) * c)
      const on = (x + y) % 2 === 0
      g.addColorStop(0, on ? '#2b2e33' : '#15171a')
      g.addColorStop(1, on ? '#121315' : '#2a2c30')
      ctx.fillStyle = g
      ctx.fillRect(x * c, y * c, c, c)
    }
  },
  camo: (ctx, s) => {
    const r = rnd(7)
    const cols = ['#4b5320', '#2f3a1f', '#7d7a4f', '#1c1f14']
    ctx.fillStyle = '#5c6236'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = cols[i % cols.length]
      ctx.beginPath()
      const x = r() * s, y = r() * s
      for (let k = 0; k < 7; k++) ctx.lineTo(x + (r() - 0.5) * s * 0.18, y + (r() - 0.5) * s * 0.12)
      ctx.fill()
    }
  },
  digital: (ctx, s) => {
    const r = rnd(3)
    const cols = ['#9aa3ad', '#5d6670', '#2c3238', '#c9cfd6']
    const c = s / 48
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      ctx.fillStyle = cols[Math.floor(r() * cols.length)]
      ctx.fillRect(x * c, y * c, c, c)
    }
  },
  stripes: (ctx, s) => {
    ctx.fillStyle = '#f5f5f2'
    ctx.fillRect(0, 0, s, s)
    const cols = ['#0a2a66', '#c1121f', '#0a2a66']
    cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, s * (0.42 + i * 0.06), s, s * 0.04) })
  },
  sunset: (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s)
    g.addColorStop(0, '#ff3c7e'); g.addColorStop(0.5, '#ff9f1c'); g.addColorStop(1, '#5b2bff')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  },
  hex: (ctx, s) => {
    ctx.fillStyle = '#101418'
    ctx.fillRect(0, 0, s, s)
    ctx.strokeStyle = '#1fd1c0'
    ctx.lineWidth = s / 260
    const r = s / 22
    for (let y = 0; y < s + r * 2; y += r * 1.5) for (let x = 0; x < s + r * 2; x += r * Math.sqrt(3)) {
      const ox = (Math.round(y / (r * 1.5)) % 2) * r * Math.sqrt(3) / 2
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 3 * k + Math.PI / 6
        ctx.lineTo(x + ox + r * 0.92 * Math.cos(a), y + r * 0.92 * Math.sin(a))
      }
      ctx.closePath()
      ctx.stroke()
    }
  },
}

export const PATTERN_IDS = Object.keys(PATTERNS)

export function patternUrl(id: string, size = 1024) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  PATTERNS[id](c.getContext('2d')!, size)
  return c.toDataURL('image/png')
}
