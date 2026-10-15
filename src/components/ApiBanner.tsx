import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useSettings } from '../lib/useSettings'

export function ApiBanner() {
  const { t } = useLang()
  const s = useSettings()
  if (s.provider !== 'demo') return null
  return (
    <div className="banner">
      <span>⚡ {t('Демо-режим: результаты — грубая имитация. Подключите бесплатный ключ Gemini или ключ OpenAI для фотореалистичной генерации.', 'Demo mode: results are a rough simulation. Add a Gemini or OpenAI key for photoreal renders.')}</span>
      <Link className="btn small primary" to="/settings">{t('Подключить AI', 'Connect AI')}</Link>
    </div>
  )
}
