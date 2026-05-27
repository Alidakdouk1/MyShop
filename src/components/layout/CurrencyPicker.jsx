import { useState, useRef, useEffect } from 'react'
import { useCurrency } from '../../context/CurrencyContext'

export default function CurrencyPicker() {
  const { currencies, current, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Nothing to switch between — hide the control.
  if (!currencies || currencies.length <= 1) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-semibold text-ink-secondary hover:text-ink hover:bg-surface-alt transition-colors"
        aria-label="Change currency"
      >
        <span style={{ width: 14, display: 'inline-block', textAlign: 'center' }}>{current.symbol}</span>
        <span className="hidden sm:inline">{current.code}</span>
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-surface rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-slide-down py-1">
          {currencies.map(c => {
            const active = c.code === current.code
            return (
              <button
                key={c.code}
                onClick={() => { setCurrency(c.code); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${active ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`}
              >
                <span className="w-5 text-center font-semibold text-ink">{c.symbol}</span>
                <span className="flex-1 text-ink">{c.code}</span>
                <span className="text-xs text-ink-tertiary">{c.name}</span>
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
