import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import dict, { LOCALES, getLocaleConfig } from './translations'

const STORAGE_KEY = 'myshop_locale'
const DEFAULT     = 'en'

const I18nContext = createContext({
  locale: DEFAULT,
  dir:    'ltr',
  t:      (key) => key,
  setLocale: () => {},
})

function readInitialLocale() {
  if (typeof window === 'undefined') return DEFAULT
  // 1. Honor an explicit user choice.
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && LOCALES.includes(stored)) return stored
  } catch { /* ignore */ }
  // 2. Browser preference, if we ship that language.
  const browser = (navigator.language || '').slice(0, 2).toLowerCase()
  if (LOCALES.includes(browser)) return browser
  return DEFAULT
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readInitialLocale)
  const cfg = getLocaleConfig(locale)

  // Keep document.documentElement in sync so CSS `dir` and screen readers work.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = locale
    document.documentElement.dir  = cfg.dir
    document.documentElement.setAttribute('data-locale', locale)
  }, [locale, cfg.dir])

  const setLocale = useCallback((next) => {
    if (!LOCALES.includes(next)) return
    setLocaleState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }, [])

  // t(key, vars?) — falls back to English then to the raw key if missing.
  // {placeholder} interpolation uses simple regex replace; no plurals (keep it tiny).
  const t = useCallback((key, vars) => {
    const value = (dict[locale]?.[key]) ?? (dict.en?.[key]) ?? key
    if (!vars) return value
    return String(value).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
  }, [locale])

  const ctx = useMemo(() => ({
    locale,
    dir: cfg.dir,
    isRTL: cfg.dir === 'rtl',
    t,
    setLocale,
  }), [locale, cfg.dir, t, setLocale])

  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
