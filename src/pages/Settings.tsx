import { useState } from 'react'
import { useLang } from '../lib/i18n'
import { loadSettings, saveSettings, type Provider, type Settings as S } from '../lib/settings'
import { useInstall } from '../lib/install'
import { clearHistory } from '../lib/db'
import { PageHead } from '../components/PageHead'

export default function Settings() {
  const { t, lang, setLang } = useLang()
  const [s, setS] = useState<S>(loadSettings)
  const [saved, setSaved] = useState(false)
  const [test, setTest] = useState<string | null>(null)
  const inst = useInstall()
  const up = (p: Partial<S>) => { setS((x) => ({ ...x, ...p })); setSaved(false) }
  const save = () => { saveSettings(s); setSaved(true) }

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
      } else setTest(t('Демо-режим не требует ключа.', 'Demo mode needs no key.'))
    } catch (e) {
      setTest(`✗ ${(e as Error).message}`)
    }
  }

  const providers: { id: Provider; name: string; text: string }[] = [
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
        <label className="field">{t('Качество по умолчанию', 'Default quality')}
          <select className="input" value={s.quality} onChange={(e) => up({ quality: e.target.value as S['quality'] })}>
            <option value="standard">Standard</option>
            <option value="ultra">Ultra</option>
          </select>
        </label>
        <div className="row gap wrap">
          <button className="btn primary" onClick={save}>{saved ? '✓ ' + t('Сохранено', 'Saved') : t('Сохранить', 'Save')}</button>
          <button className="btn" onClick={check}>{t('Проверить ключ', 'Test key')}</button>
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
