import { useRef, useState } from 'react'
import { useLang } from '../lib/i18n'

type Props = {
  onFiles: (files: File[]) => void
  multiple?: boolean
  compact?: boolean
  label?: string
  hint?: string
  accept?: string
}

export function Uploader({ onFiles, multiple, compact, label, hint, accept = 'image/*,.heic,.heif' }: Props) {
  const { t } = useLang()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const take = (list: FileList | null) => {
    if (!list) return
    const files = Array.from(list).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }
  return (
    <div
      className={`drop ${over ? 'over' : ''} ${compact ? 'compact' : ''}`}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') input.current?.click() }}
    >
      <div className="drop-icon">⬆</div>
      <div className="drop-label">{label ?? t('Загрузите фото', 'Upload a photo')}</div>
      <div className="drop-hint">{hint ?? t('Перетащите сюда или нажмите. JPG, PNG, WebP. Лучше всего — вид сбоку.', 'Drag & drop or click. JPG, PNG, WebP. A clear side view works best.')}</div>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { take(e.target.files); e.target.value = '' }} />
    </div>
  )
}
