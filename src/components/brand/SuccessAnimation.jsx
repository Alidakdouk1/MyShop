/**
 * Pick&Go LB — Success Animation.
 *
 * Confirmation moment used after an order is placed, a review is submitted,
 * a subscription confirmed, etc. The choreography per the master prompt:
 *   1. PG mark fades in + scales up
 *   2. A route draws beneath it (teal → lime gradient)
 *   3. A checkmark traces inside a brand-tinted circle
 *   4. Soft glow expands once and settles
 *   5. Optional `onDone` fires after the full sequence (default 1800ms)
 *
 * Drop-in: `<SuccessAnimation message="Order placed" onDone={...} />`
 */
import { useEffect } from 'react'
import LogoIcon from './LogoIcon'

export default function SuccessAnimation({
  message = 'Success',
  duration = 1800,
  onDone,
}) {
  useEffect(() => {
    if (!onDone) return
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [onDone, duration])

  return (
    <div
      role="status"
      aria-label={message}
      className="flex flex-col items-center justify-center gap-4 py-8"
    >
      {/* Stack: mark on top, checkmark badge on bottom-right */}
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pg-success-mark 0.5s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          <LogoIcon size={72} />
        </div>

        {/* Glow halo — fades in then out */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: -16, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,209,193,0.35) 0%, rgba(163,255,18,0.18) 50%, transparent 75%)',
          animation: 'pg-success-glow 1.2s ease-out 0.2s both',
          pointerEvents: 'none',
        }}/>

        {/* Checkmark circle — bottom-right, scales in after the mark */}
        <svg
          viewBox="0 0 36 36"
          style={{
            position: 'absolute', right: -6, bottom: -6,
            width: 36, height: 36,
            animation: 'pg-success-check 0.45s cubic-bezier(0.34,1.4,0.64,1) 0.6s both',
          }}
        >
          <circle cx="18" cy="18" r="16" fill="#A3FF12" />
          <path
            d="M 11 18 L 16 23 L 25 13"
            fill="none"
            stroke="#0F172A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="22"
            strokeDashoffset="22"
            style={{ animation: 'pg-success-trace 0.4s ease-out 0.85s both' }}
          />
        </svg>
      </div>

      {/* Route beneath — same gradient as RouteLoader, but draws once */}
      <div style={{
        width: 120, height: 3, borderRadius: 999,
        background: 'linear-gradient(90deg, #00D1C1 0%, #54E89A 55%, #A3FF12 100%)',
        transformOrigin: 'left center',
        animation: 'pg-success-route 0.55s cubic-bezier(0.16,1,0.3,1) 0.25s both',
      }}/>

      <p style={{
        margin: 0,
        fontFamily: "'Poppins','Inter',system-ui,sans-serif",
        fontSize: 15, fontWeight: 600,
        color: '#0F172A',
        animation: 'pg-success-msg 0.4s ease-out 0.7s both',
      }}>{message}</p>

      <style>{`
        @keyframes pg-success-mark   { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1.0); } }
        @keyframes pg-success-glow   { 0% { opacity: 0; transform: scale(0.6); } 40% { opacity: 1; } 100% { opacity: 0; transform: scale(1.3); } }
        @keyframes pg-success-check  { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
        @keyframes pg-success-trace  { to { stroke-dashoffset: 0; } }
        @keyframes pg-success-route  { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes pg-success-msg    { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          [aria-label] svg, [aria-label] div { animation: none !important; }
          [aria-label] path { stroke-dashoffset: 0 !important; }
        }
      `}</style>
    </div>
  )
}
