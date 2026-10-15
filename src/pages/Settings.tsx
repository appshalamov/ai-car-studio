import { useState } from 'react'
import { useLang } from '../lib/i18n'
import { loadSettings, saveSettings, type Provider, type Settings as S } from '../lib/settings'
import { useInstall } from '../lib/install'
import { clearHistory } from '../lib/db'
import { PageHead } from '../components/PageHead'
import { WOSO_PRICES, fmtCost, wosoQuote } from '../lib/woso'
import { askNotifyPermission } from '../lib/notify'

export default function Settings() {
  const { t, lang, setLang } = useLang()
  const [s, setS] = useState<S>(loadSettings)
  const [saved, setSaved] = useState(false)
  const [test, setTest] = useState<string | null>(null)
  const inst = useInstall()
  const up = (p: Partial<S>) => { setS((x) => ({ ...x, ...p })); setSaved(false) }
  const save = () => { saveSettings(s); setSaved(true); if (s.provider === 'woso' && s.wosoNotify) askNotifyPermission() }

  const check = async () => {
    setTest('…')
    try {
      if (s.provider === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel)}`, { headers: { 'x-goog-api-key': s.geminiKey.trim() } })
        const j = await r.json()
        setTest(r.ok ? `✓ ${t('Ключ работает, модель', 'Key works, model')} ${j.displayName ?? s.geminiModel}` : `✗ ${j?.error?.message ?? r.status}`)
      } else if (s.provider === 'openai') {
        const base = s.openaiBase.replace(/\/$/, '')
        const r = await fetch(`${base}/models/${encodeURIComponent(s.openaiModel)}`, { headers: { Authorization: `Bearer ${s.openaiKey.trim()}` } })
        const j = await r.json().catch(() => ({}))
        setTest(r.ok ? `✓ ${t('Ключ работает, модель', 'Key works, model')} ${j.id ?? s.openaiModel}` : `✗ ${j?.error?.message ?? r.status}`)
      } else if (s.provider === 'woso') {
        const c = await wosoQuote(s)
        setTest(`✓ ${t('Токен работает', 'Token works')} · ${c.model}: ${fmtCost(c.price, s.wosoUsdPerCredit)} ${t('за фото', 'per photo')}${c.balance != null ? ` · ${t('баланс', 'balance')} ${c.balance.toFixed(2)} кр.` : ''}`)
      } else setTest(t('Демо-режим не требует ключа.', 'Demo mode needs no key.'))
    } catch (e) {
      setTest(`✗ ${(e as Error).message}`)
    }
  }

  const providers: { id: Provider; name: string; text: string }[] = [
    { id: 'woso', name: 'woso.io', text: t('Ваш аккаунт woso: Nano Banana, GPT Image, Seedream. Оплата кредитами woso, цена видна перед каждой генерацией.', 'Your woso account: Nano Banana, GPT Image, Seedream. Paid with woso credits, price shown before each render.') },
    { id: 'gemini', name: 'Google Gemini', text: t('Рекомендуем. Бесплатный ключ в Google AI Studio, отлично редактирует фото.', 'Recommended. Free key in Google AI Studio, great at photo edits.') },
    { id: 'openai', name: 'OpenAI', text: t('gpt-image-1: высокое качество, платно по токенам. Подходит любой OpenAI-совместимый API.', 'gpt-image-1: high quality, pay per use. Any OpenAI-compatible API works.') },
    { id: 'demo', name: t('Демо', 'Demo'), text: t('Без ключа: грубая имитация на устройстве, чтобы посмотреть интерфейс.', 'No key: rough on-device simulation to explore the UI.') },
  ]

  return (
    <div className="page narrow">
      <PageHead title={t('Настройки', 'Settings')} />
      <section className="card pad stack">
        <b>{t('AI-провайдер', 'AI provider')}</b>
        {providers.map((p) => (
          <label key={p.id} className={`check ${s.provider === p.id ? 'on' : ''}`}>
            <input type="radio" checked={s.provider === p.id} onChange={() => up({ provider: p.id })} />
            <span><b>{p.name}</b><br /><small className="muted">{p.text}</small></span>
          </label>
        ))}
        {s.provider === 'gemini' && (
          <>
            <label className="field">{t('Ключ Gemini API', 'Gemini API key')}
              <input className="input" type="password" autoComplete="off" value={s.geminiKey} onChange={(e) => up({ geminiKey: e.target.value })} placeholder="AIza…" />
            </label>
            <a className="link small" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">{t('Получить ключ бесплатно →', 'Get a free key →')}</a>
            <label className="field">{t('Модель', 'Model')}
              <input className="input" list="gem-models" value={s.geminiModel} onChange={(e) => up({ geminiModel: e.target.value })} />
              <datalist id="gem-models"><option value="gemini-2.5-flash-image" /><option value="gemini-3-pro-image-preview" /></datalist>
            </label>
          </>
        )}
        {s.provider === 'openai' && (
          <>
            <label className="field">{t('Ключ OpenAI API', 'OpenAI API key')}
              <input className="input" type="password" autoComplete="off" value={s.openaiKey} onChange={(e) => up({ openaiKey: e.target.value })} placeholder="sk-…" />
            </label>
            <a className="link small" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">{t('Получить ключ →', 'Get a key →')}</a>
            <label className="field">{t('Модель', 'Model')}
              <input className="input" list="oa-models" value={s.openaiModel} onChange={(e) => up({ openaiModel: e.target.value })} />
              <datalist id="oa-models"><option value="gpt-image-1" /><option value="gpt-image-1-mini" /></datalist>
            </label>
            <label className="field">Base URL
              <input className="input" value={s.openaiBase} onChange={(e) => up({ openaiBase: e.target.value })} />
            </label>
          </>
        )}
        {s.provider === 'woso' && (
          <>
            <label className="field">{t('Ссылка MCP или токен woso', 'woso MCP link or token')}
              <input className="input" type="password" autoComplete="off" value={s.wosoToken} onChange={(e) => up({ wosoToken: e.target.value })} placeholder="https://woso.io/api/mcp?token=ara_pat_…" />
            </label>
            <a className="link small" href="https://woso.io" target="_blank" rel="noreferrer">{t('Ссылка MCP — в вашем кабинете woso →', 'The MCP link is in your woso account →')}</a>
            <label className="field">{t('Модель', 'Model')}
              <select className="input" value={s.wosoModel} onChange={(e) => up({ wosoModel: e.target.value })}>
                {WOSO_PRICES.map((m) => <option key={m.model} value={m.model}>{m.model} · {fmtCost(m.credits, s.wosoUsdPerCredit)}</option>)}
              </select>
            </label>
            <label className="field">{t('Цена 1 кредита, $', 'Price of 1 credit, $')}
              <input className="input" type="number" step="0.001" min="0" value={s.wosoUsdPerCredit} onChange={(e) => up({ wosoUsdPerCredit: Math.max(0, parseFloat(e.target.value) || 0) })} />
            </label>
            <label className="check"><input type="checkbox" checked={s.wosoAsk} onChange={(e) => up({ wosoAsk: e.target.checked })} /><span>{t('Показывать цену и спрашивать перед генерацией', 'Show price and ask before each render')}</span></label>
            <label className="check"><input type="checkbox" checked={s.wosoNotify} onChange={async (e) => { const on = e.target.checked; if (on) await askNotifyPermission(); up({ wosoNotify: on }) }} /><span>{t('Уведомление после генерации: сколько списано', 'Notify after each render: credits charged')}</span></label>
            <details className="small">
              <summary>{t('Себестоимость фото по моделям', 'Cost per photo by model')}</summary>
              <table className="small" style={{ width: '100%', marginTop: 8 }}>
                <tbody>
                  {WOSO_PRICES.map((m) => <tr key={m.model}><td>{m.model}</td><td style={{ textAlign: 'right' }}>{fmtCost(m.credits, s.wosoUsdPerCredit)}</td></tr>)}
                </tbody>
              </table>
              <p className="muted">{t('Цены woso на 15.10.2026 при стандартном разрешении. Точная цена приходит от woso перед каждой генерацией.', 'woso prices as of 2026-10-15 at default resolution. The exact price comes from woso before each render.')}</p>
            </details>
          </>
        )}
        <label className="field">{t('Качество по умолчанию', 'Default quality')}
          <select className="input" value={s.quality} onChange={(e) => up({ quality: e.target.value as S['quality'] })}>
            <option value="standard">Standard</option>
            <option value="ultra">Ultra</option>
          </select>
        </label>
        <div className="row gap wrap">
          <button className="btn primary" onClick={save}>{saved ? '✓ ' + t('Сохранено', 'Saved') : t('Сохранить', 'Save')}</button>
          <button className="btn" onClick={check}>{t(s.provider === 'woso' ? 'Проверить и узнать цену' : 'Проверить ключ', s.provider === 'woso' ? 'Test and get price' : 'Test key')}</button>
        </div>
        {test && <div className="small">{test}</div>}
        <p className="muted small">🔒 {t('Ключи хранятся только в этом браузере и отправляются напрямую провайдеру. Не используйте приложение с ключом на чужих устройствах.', 'Keys stay in this browser and are sent only to the provider. Don’t store your key on shared devices.')}</p>
      </section>

      <section className="card pad stack">
        <b>{t('Приложение', 'App')}</b>
        <div className="row gap wrap">
          <div className="seg">
            <button className={lang === 'ru' ? 'on' : ''} onClick={() => setLang('ru')}>Русский</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
          </div>
        </div>
        {inst.standalone ? (
          <div className="small">✓ {t('Приложение установлено', 'App is installed')}</div>
        ) : inst.canPrompt ? (
          <button className="btn primary" onClick={inst.prompt}>📲 {t('Установить приложение', 'Install app')}</button>
        ) : (
          <div className="muted small">📲 {inst.ios ? t('iPhone: нажмите «Поделиться» → «На экран Домой».', 'iPhone: tap Share → Add to Home Screen.') : t('Установка: меню браузера → «Установить приложение».', 'Install: browser menu → Install app.')}</div>
        )}
        <button className="btn ghost" onClick={async () => { if (confirm(t('Удалить историю генераций?', 'Delete render history?'))) await clearHistory() }}>🗑 {t('Очистить историю', 'Clear history')}</button>
      </section>
    </div>
  )
}
