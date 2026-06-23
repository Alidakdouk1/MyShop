/**
 * Pick&Go LB — Splash screen.
 *
 * The full-bleed brand entrance per the master prompt:
 *   - Midnight Navy backdrop
 *   - PG mark centred, fades in + scales 0.9 → 1.0
 *   - Soft teal glow halo behind the mark
 *   - Lime sweep ribbon crossing the mark at ~50% of the animation
 *   - 2-second loop, then `onDone` (parent removes the splash from the tree)
 *
 * Honors `prefers-reduced-motion` — skips animations and just shows the
 * final state for the same duration.
 */
import { useEffect } from 'react'
import LogoIcon from './LogoIcon'

export default function SplashScreen({ onDone, duration = 2000 }) {
  useEffect(() => {
    if (!onDone) return
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [onDone, duration])

  return (
    <div
      role="status"
      aria-label="Loading Pick&Go LB"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0F172A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        animation: 'pg-splash-fadeout 0.4s ease-out forwards',
        animationDelay: `${duration - 350}ms`,
      }}
    >
      {/* Soft teal halo behind the mark */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,209,193,0.28) 0%, rgba(0,209,193,0) 70%)',
          filter: 'blur(8px)',
          animation: 'pg-splash-halo 2s ease-in-out infinite',
        }}
      />

      {/* PG mark — fades in + scales up */}
      <div
        style={{
          position: 'relative',
          animation: 'pg-splash-mark 1s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        <LogoIcon size={140} />
      </div>

      {/* Lime diagonal sweep crossing the mark */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%', left: 0,
          width: '40%', height: 4,
          background: 'linear-gradient(90deg, transparent, #A3FF12, transparent)',
          transform: 'translateY(-50%) translateX(-100%) skewX(-12deg)',
          animation: 'pg-splash-sweep 1.4s cubic-bezier(0.65,0,0.35,1) 0.4s both',
          opacity: 0.9,
        }}
      />

      {/* Scoped keyframes — no need to leak these into the global stylesheet
          because the splash is the only consumer. */}
      <style>{`
        @keyframes pg-splash-mark {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1.0); }
        }
        @keyframes pg-splash-halo {
          0%, 100% { opacity: 0.7; transform: scale(1.0); }
          50%      { opacity: 1.0; transform: scale(1.08); }
        }
        @keyframes pg-splash-sweep {
          0%   { transform: translateY(-50%) translateX(-30vw) skewX(-12deg); opacity: 0; }
          50%  { opacity: 1; }
          100% { transform: translateY(-50%) translateX(100vw)  skewX(-12deg); opacity: 0; }
        }
        @keyframes pg-splash-fadeout {
          to { opacity: 0; pointer-events: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="Loading Pick&Go LB"] * { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
