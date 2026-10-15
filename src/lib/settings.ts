export type Provider = 'demo' | 'gemini' | 'openai'

export type Settings = {
  provider: Provider
  geminiKey: string
  geminiModel: string
  openaiKey: string
  openaiModel: string
  openaiBase: string
  quality: 'standard' | 'ultra'
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'demo',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash-image',
  openaiKey: '',
  openaiModel: 'gpt-image-1',
  openaiBase: 'https://api.openai.com/v1',
  quality: 'standard',
}

const KEY = 'acs.settings'
const listeners = new Set<() => void>()

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}

export function onSettingsChange(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function isConfigured(s: Settings) {
  if (s.provider === 'gemini') return !!s.geminiKey.trim()
  if (s.provider === 'openai') return !!s.openaiKey.trim()
  return true
}
