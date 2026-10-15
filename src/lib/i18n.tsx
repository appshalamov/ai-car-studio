import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'ru' | 'en'
export type Tr = (ru: string, en: string) => string

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Tr }
const LangCtx = createContext<Ctx>({ lang: 'ru', setLang: () => {}, t: (ru) => ru })

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('acs.lang')
    if (saved === 'ru' || saved === 'en') return saved
  } catch { /* ignore */ }
  return 'ru'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('acs.lang', l) } catch { /* ignore */ }
    document.documentElement.lang = l
  }
  const t: Tr = (ru, en) => (lang === 'ru' ? ru : en)
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>
}

export const useLang = () => useContext(LangCtx)

/** Bilingual label used by catalogs. */
export type L = { ru: string; en: string }
export const lbl = (l: L, lang: Lang) => (lang === 'ru' ? l.ru : l.en)
