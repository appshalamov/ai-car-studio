import { downloadDataUrl, extFromDataUrl, shareDataUrl } from '../lib/image'
import { useLang } from '../lib/i18n'

export function ResultActions({ image, name, onIterate }: { image: string; name: string; onIterate?: () => void }) {
  const { t } = useLang()
  const file = `${name}-${Date.now()}.${extFromDataUrl(image)}`
  return (
    <div className="row gap wrap">
      <button className="btn primary" onClick={() => downloadDataUrl(image, file)}>⬇ {t('Скачать', 'Download')}</button>
      <button className="btn" onClick={() => shareDataUrl(image, file, t('Сделано в AI Car Studio', 'Made with AI Car Studio')).catch(() => {})}>↗ {t('Поделиться', 'Share')}</button>
      {onIterate && <button className="btn" onClick={onIterate}>↻ {t('Продолжить с результата', 'Keep iterating')}</button>}
    </div>
  )
}
