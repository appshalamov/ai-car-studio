import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useSettings } from '../lib/useSettings'
import { SERVICE_URL, fmtCharge, getServicePrice, loadServicePrice, onServicePrice } from '../lib/service'
import { WOSO_PRICES, fmtCost, getCost, onCostChange, wosoQuote } from '../lib/woso'

export function ApiBanner() {
  const { t } = useLang()
  const s = useSettings()
  if (SERVICE_URL) return <ServiceCost />
  if (s.provider === 'woso') return <WosoCost />
  if (s.provider !== 'demo') return null
  return (
    <div className="banner">
      <span>⚡ {t('Демо-режим: результаты — грубая имитация. Подключите бесплатный ключ Gemini или ключ OpenAI для фотореалистичной генерации.', 'Demo mode: results are a rough simulation. Add a Gemini or OpenAI key for photoreal renders.')}</span>
      <Link className="btn small primary" to="/settings">{t('Подключить AI', 'Connect AI')}</Link>
    </div>
  )
}

/** Cost per photo for the selected woso model, refreshed from a free price quote. */
function WosoCost() {
  const { t } = useLang()
  const s = useSettings()
  const model = s.wosoModel.trim() || 'nano-banana'
  const [, tick] = useState(0)
  useEffect(() => onCostChange(() => tick((n) => n + 1)), [])
  useEffect(() => {
    const c = getCost(model)
    if (s.wosoToken.trim() && (!c || Date.now() - c.at > 10 * 60_000)) wosoQuote(s, model).catch(() => {})
  }, [model, s.wosoToken]) // eslint-disable-line react-hooks/exhaustive-deps
  const live = getCost(model)
  const credits = live?.price ?? WOSO_PRICES.find((m) => m.model === model)?.credits
  if (!s.wosoToken.trim()) {
    return (
      <div className="banner">
        <span>🔑 {t('Вставьте ссылку MCP woso в настройках, чтобы генерировать.', 'Paste your woso MCP link in Settings to start rendering.')}</span>
        <Link className="btn small primary" to="/settings">{t('Настройки', 'Settings')}</Link>
      </div>
    )
  }
  return (
    <div className="banner">
      <span>💰 {t('Себестоимость фото', 'Cost per photo')} · {model}: <b>{credits != null ? fmtCost(credits, s.wosoUsdPerCredit) : '…'}</b>
        {live?.balance != null && <> · {t('баланс', 'balance')} {live.balance.toFixed(2)} кр.</>}</span>
      <Link className="btn small" to="/settings">{t('Модель', 'Model')}</Link>
    </div>
  )
}

/** Hosted mode: free for the client, shows what one photo costs the studio. */
function ServiceCost() {
  const { t } = useLang()
  const [, tick] = useState(0)
  useEffect(() => onServicePrice(() => tick((n) => n + 1)), [])
  useEffect(() => { if (!getServicePrice()) loadServicePrice().catch(() => {}) }, [])
  const p = getServicePrice()
  return (
    <div className="banner">
      <span>🎁 {t('Генерация для вас бесплатна', 'Rendering is free for you')} · {t('себестоимость фото', 'cost per photo')}: <b>{p ? fmtCharge(p.credits, p.usd) : '…'}</b></span>
    </div>
  )
}
