import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRecentActivity } from '../../api/activityApi'

const DISMISS_KEY = 'myshop_activity_dismissed'
const DEFAULTS    = { enabled: 1, show_duration_sec: 7, gap_sec: 2, first_delay_sec: 3 }

const imgUrl = (src) => {
  if (!src) return 'https://placehold.co/80x80/F2F0EB/9C9894?text=•'
  return src.startsWith('http') ? src : `/MyShop/backend/${src}`
}

function timeAgo(ts) {
  const d   = new Date(String(ts).replace(' ', 'T'))
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60)    return 'just now'
  if (sec < 3600)  return `${Math.floor(sec / 60)} min ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`
  return `${Math.floor(sec / 86400)} days ago`
}

export default function LiveActivityTicker() {
  const [list,      setList]      = useState([])
  const [settings,  setSettings]  = useState(DEFAULTS)
  const [index,     setIndex]     = useState(0)
  const [visible,   setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })
  const cycleRef = useRef({ cancelled: false, timer: null })

  // Load real recent orders + admin-tuned settings once.
  useEffect(() => {
    if (dismissed) return
    getRecentActivity()
      .then(r => {
        const payload = r.data.data || {}
        setSettings({ ...DEFAULTS, ...(payload.settings || {}) })
        setList(payload.items || [])
      })
      .catch(() => {})
  }, [dismissed])

  // Cycle through bubbles: show → hide → next → show …
  useEffect(() => {
    if (!list.length || dismissed || !settings.enabled) return
    const ref      = cycleRef.current
    ref.cancelled  = false
    const showFor  = Math.max(1000, Number(settings.show_duration_sec) * 1000)
    const offGap   = Math.max(500,  Number(settings.gap_sec)           * 1000)
    const first    = Math.max(0,    Number(settings.first_delay_sec)   * 1000)
    const cycle = () => {
      if (ref.cancelled) return
      setVisible(true)
      ref.timer = setTimeout(() => {
        if (ref.cancelled) return
        setVisible(false)
        ref.timer = setTimeout(() => {
          if (ref.cancelled) return
          setIndex(i => (i + 1) % list.length)
          cycle()
        }, offGap)
      }, showFor)
    }
    ref.timer = setTimeout(cycle, first)
    return () => { ref.cancelled = true; clearTimeout(ref.timer) }
  }, [list, dismissed, settings])

  const dismiss = () => {
    setVisible(false)
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  if (dismissed || !list.length || !settings.enabled) return null
  const item = list[index]

  return (
    <div
      className="fixed left-4 z-40 print:hidden"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 148px)',
        maxWidth: 320,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity:   visible ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Link
        to={item.product_slug ? `/products/${item.product_slug}` : '#'}
        className="flex items-stretch gap-3 bg-white pr-2 rounded-2xl overflow-hidden"
        style={{
          boxShadow: '0 10px 30px rgba(15,15,15,0.18), 0 2px 6px rgba(15,15,15,0.06)',
          border: '1px solid rgba(0,0,0,0.04)',
          textDecoration: 'none',
        }}
      >
        <img
          src={imgUrl(item.product_image)}
          alt=""
          style={{ width: 52, height: 52, objectFit: 'cover', background: '#F0EEE9', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0, padding: '8px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: '#0F0F0F', margin: 0, lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: '#16A34A', marginRight: 6, verticalAlign: 'middle',
              animation: 'pulseGlow 1.6s ease-in-out infinite',
            }} />
            {item.customer_name}{item.customer_city ? ` from ${item.customer_city}` : ''} bought
          </p>
          <p style={{
            fontSize: 11, color: '#5C5854', margin: '2px 0 0', lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.product_name}
          </p>
          <p style={{ fontSize: 10, color: '#9C9894', margin: '2px 0 0' }}>
            {timeAgo(item.created_at)}
          </p>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss() }}
          aria-label="Dismiss"
          style={{
            alignSelf: 'flex-start', marginTop: 4, padding: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9C9894', lineHeight: 1,
          }}
        >
          <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </Link>
    </div>
  )
}
