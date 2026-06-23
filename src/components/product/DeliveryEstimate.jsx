import { useEffect, useState, useMemo, useRef } from 'react'
import { getShippingEstimate } from '../../api/shippingApi'
import { computeDeliveryWindow, formatDeliveryWindow } from '../../lib/shippingEstimate'

// Cache the public settings for the session — no need to refetch per PDP.
let cachedSettings = null
let inFlight       = null

function loadSettings() {
  if (cachedSettings) return Promise.resolve(cachedSettings)
  if (inFlight) return inFlight
  inFlight = getShippingEstimate()
    .then(r => { cachedSettings = r.data.data; inFlight = null; return cachedSettings })
    .catch(() => { inFlight = null; return null })
  return inFlight
}

/**
 * @param {object} props
 * @param {string} [props.releaseDate]  ISO date string; if set + future, used as the starting point
 * @param {boolean} [props.outOfStock]  Hide the badge entirely when true
 */
export default function DeliveryEstimate({ releaseDate, outOfStock }) {
  const [settings, setSettings] = useState(cachedSettings)
  const [openHelp, setOpenHelp] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!settings) loadSettings().then(setSettings)
  }, [settings])

  // Close the tooltip when clicking elsewhere.
  useEffect(() => {
    if (!openHelp) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenHelp(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openHelp])

  const release = useMemo(() => {
    if (!releaseDate) return null
    const d = new Date(String(releaseDate).slice(0, 10) + 'T00:00')
    return d > new Date() ? d : null
  }, [releaseDate])

  const windowVals = useMemo(
    () => computeDeliveryWindow(settings, release ? { from: release } : undefined),
    [settings, release]
  )

  if (outOfStock) return null
  if (!settings || !settings.enabled) return null
  if (!windowVals) return null

  const label = formatDeliveryWindow(windowVals)
  const headline = release
    ? `Ships after ${release.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · arrives ${label}`
    : `Get it ${label}`

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', gap: 10,
        background: '#F0FDF4', border: '1px solid #BBF7D0',
        borderRadius: 14, padding: '12px 16px',
      }}
    >
      <svg style={{ width: 20, height: 20, color: '#15803D', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13l5 5v5h-3a2 2 0 11-4 0H10a2 2 0 11-4 0H3V7z" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#15803D' }}>
          {release ? 'Pre-order delivery' : 'Estimated delivery'}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F' }}>
          {headline}
        </span>
      </div>
      <button
        type="button"
        aria-label="How is this calculated?"
        onClick={() => setOpenHelp(v => !v)}
        style={{
          marginLeft: 4, width: 22, height: 22, borderRadius: '50%',
          border: '1px solid #BBF7D0', background: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#15803D', flexShrink: 0,
        }}
      >
        <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v.01M11 12h1v4h1M22 12a10 10 0 11-20 0 10 10 0 0120 0z" />
        </svg>
      </button>
      {openHelp && (
        <div
          role="tooltip"
          style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 10,
            background: '#0F0F0F', color: '#fff', borderRadius: 12, padding: 14,
            fontSize: 12, lineHeight: 1.55, width: 280, zIndex: 30,
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
          }}
        >
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>How we estimate:</p>
          <p style={{ margin: 0, opacity: 0.85 }}>
            {release
              ? `Processing ${settings.processing_days_min}-${settings.processing_days_max} days after release + transit ${settings.transit_days_min}-${settings.transit_days_max} days.`
              : `Orders before ${settings.cutoff_hour}:00 ship same day · processing ${settings.processing_days_min}-${settings.processing_days_max} days + transit ${settings.transit_days_min}-${settings.transit_days_max} days.`}
            {settings.weekend_skip ? ' Weekends excluded.' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
