/** Read a File into a JPEG/PNG data URL, downscaled so the longest side is <= maxSide. */
export async function fileToDataUrl(file: File, maxSide = 1600): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
  return downscale(raw, maxSide)
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Не удалось открыть изображение (HEIC поддерживается не во всех браузерах — сохраните как JPG).'))
    img.src = src
  })
}

export async function downscale(src: string, maxSide: number, mime = 'image/jpeg'): Promise<string> {
  const img = await loadImage(src)
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * k)
  const h = Math.round(img.naturalHeight * k)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.drawImage(img, 0, 0, w, h)
  return c.toDataURL(mime, 0.92)
}

export function dataUrlParts(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  if (!m) throw new Error('Bad data URL')
  return { mime: m[1], b64: m[2] }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const { mime, b64 } = dataUrlParts(dataUrl)
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const url = URL.createObjectURL(dataUrlToBlob(dataUrl))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function shareDataUrl(dataUrl: string, filename: string, text: string) {
  const file = new File([dataUrlToBlob(dataUrl)], filename, { type: dataUrlParts(dataUrl).mime })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: 'Car Studio', text })
    return true
  }
  downloadDataUrl(dataUrl, filename)
  return false
}

export function extFromDataUrl(dataUrl: string) {
  const mime = dataUrlParts(dataUrl).mime
  return mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
}
