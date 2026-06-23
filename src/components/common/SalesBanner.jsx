import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getSalesBanner } from '../../api/salesBannerApi'

const DISMISS_KEY = 'myshop_sales_banner_dismissed'

// Session-cache the config so navigating around doesn't refetch.
let _cache = null

// Show timer parts as right-padded 2-digit blocks for a clean countdown look.
function pad(n) { return String(Math.max(0, n)).padStart(2, '0') }

function useCountdown(endsAt) {
  const target = useMemo(() => {
    if (!endsAt) return null
    const d = new Date(String(endsAt).replace(' ', 'T'))
    return isNaN(d) ? null : d.getTime()
  }, [endsAt])

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!target) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!target) return null
  const left = Math.max(0, target - now)
  if (left <= 0) return { expired: true, d: 0, h: 0, m: 0, s: 0 }
  const d = Math.floor(left / 86_400_000)
  const h = Math.floor((left % 86_400_000) / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  return { expired: false, d, h, m, s }
}

/**
 * Props are optional — when omitted the banner fetches the live config itself.
 * Passing `config` is how the admin live-preview avoids the round-trip.
 */
export default function SalesBanner({ config, previewOnly = false }) {
  const [cfg, setCfg] = useState(() => config ?? _cache)
  const [dismissed, setDismissed] = useState(() => {
    if (previewOnly || typeof sessionStorage === 'undefined') return false
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    if (config) { setCfg(config); return }
    if (_cache) return
    getSalesBanner()
      .then(r => { _cache = r.data.data; setCfg(_cache) })
      .catch(() => setCfg(null))
  }, [config])

  const countdown = useCountdown(cfg?.ends_at)

  if (!cfg || !cfg.enabled) return null
  if (dismissed && !previewOnly) return null
  if (countdown?.expired) return null  // also defended server-side

  const dismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  const internal = (cfg.cta_url || '').startsWith('/')
  const CtaTag   = internal ? Link : 'a'
  const ctaProps = internal
    ? { to: cfg.cta_url }
    : { href: cfg.cta_url || '#', target: '_blank', rel: 'noopener noreferrer' }

  return (
    <div
      role="region"
      aria-label={cfg.title}
      style={{
        background: cfg.bg_color,
        color: cfg.text_color,
        position: previewOnly ? 'relative' : undefined,
      }}
      className="w-full"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap text-sm">
        <span className="font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.18)' }}>
          {cfg.title}
        </span>
        <span className="font-medium">{cfg.message}</span>

        {countdown && !countdown.expired && (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs">
            <span>·</span>
            {countdown.d > 0 && (
              <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(255,255,255,0.18)' }}>{countdown.d}d</span>
            )}
            <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(255,255,255,0.18)', fontVariantNumeric: 'tabular-nums' }}>{pad(countdown.h)}</span>
            <span>:</span>
            <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(255,255,255,0.18)', fontVariantNumeric: 'tabular-nums' }}>{pad(countdown.m)}</span>
            <span>:</span>
            <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(255,255,255,0.18)', fontVariantNumeric: 'tabular-nums' }}>{pad(countdown.s)}</span>
          </span>
        )}

        {cfg.cta_text && cfg.cta_url && (
          <CtaTag
            {...ctaProps}
            className="font-bold underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {cfg.cta_text} →
          </CtaTag>
        )}
      </div>

      {cfg.dismissible && !previewOnly && (
        <button
          onClick={dismiss}
          aria-label="Dismiss banner"
          className="absolute top-1/2 -translate-y-1/2 right-3 hover:opacity-80 transition-opacity"
          style={{ position: 'absolute', color: cfg.text_color }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
