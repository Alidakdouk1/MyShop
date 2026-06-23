import { useState, useRef, useEffect } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS, getLocaleConfig } from '../../i18n/translations'

export default function LanguagePicker() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (LOCALES.length <= 1) return null

  const current = getLocaleConfig(locale)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-semibold text-ink-secondary hover:text-ink hover:bg-surface-alt transition-colors"
        aria-label={t('misc.language')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
        </svg>
        <span className="hidden sm:inline uppercase text-xs tracking-wider">{locale}</span>
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className={`absolute top-full mt-2 w-44 bg-surface rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-slide-down py-1 ${current.dir === 'rtl' ? 'left-0' : 'right-0'}`}>
          {LOCALES.map(code => {
            const active = code === locale
            return (
              <button
                key={code}
                onClick={() => { setLocale(code); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors ${active ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`}
              >
                <span className="w-5 text-center text-base leading-none">{LOCALE_FLAGS[code]}</span>
                <span className="flex-1 text-ink">{LOCALE_LABELS[code]}</span>
                {active && (
                  <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
