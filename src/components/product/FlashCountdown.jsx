import { useState, useEffect } from 'react'

const msUntil = (endsAt) =>
  Math.max(0, new Date(String(endsAt).replace(' ', 'T')).getTime() - Date.now())

const pad = (n) => String(n).padStart(2, '0')

function parts(ms) {
  const t = Math.floor(ms / 1000)
  return {
    days: Math.floor(t / 86400),
    h: Math.floor((t % 86400) / 3600),
    m: Math.floor((t % 3600) / 60),
    s: t % 60,
  }
}

/**
 * Live countdown to `endsAt`. `variant="boxed"` renders styled segments (for the
 * product page); the default renders compact mono text (for cards). Calls
 * `onExpire` once the timer hits zero so callers can revert to the normal price.
 */
export default function FlashCountdown({ endsAt, onExpire, variant = 'inline' }) {
  const [ms, setMs] = useState(() => msUntil(endsAt))

  useEffect(() => {
    setMs(msUntil(endsAt))
    const iv = setInterval(() => {
      const left = msUntil(endsAt)
      setMs(left)
      if (left <= 0) { clearInterval(iv); onExpire?.() }
    }, 1000)
    return () => clearInterval(iv)
  }, [endsAt])

  if (ms <= 0) return null
  const { days, h, m, s } = parts(ms)

  if (variant === 'boxed') {
    const Box = ({ v, label }) => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{
          minWidth: 38, textAlign: 'center', fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.5rem', lineHeight: 1, color: '#fff', background: 'rgba(0,0,0,0.25)',
          borderRadius: 8, padding: '6px 8px',
        }}>{pad(v)}</span>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      </div>
    )
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {days > 0 && <Box v={days} label="days" />}
        <Box v={h} label="hrs" />
        <Box v={m} label="min" />
        <Box v={s} label="sec" />
      </div>
    )
  }

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
      {days > 0 ? `${days}d ` : ''}{pad(h)}:{pad(m)}:{pad(s)}
    </span>
  )
}
