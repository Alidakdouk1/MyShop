/**
 * Pick&Go LB — Pulse Loader.
 *
 * Tiny inline loading state: the PG mark scales 1.0 → 1.08 → 1.0 on a
 * 1.4-s loop. Use as a replacement for the generic <Spinner /> on
 * brand-significant surfaces (splash transitions, full-page loading,
 * cart drawer empty state, etc.).
 */
import LogoIcon from './LogoIcon'

export default function Loader({ size = 48, label = 'Loading' }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ animation: 'pg-loader-pulse 1.4s ease-in-out infinite' }}>
        <LogoIcon size={size} withChevron={false} />
      </div>
      <style>{`
        @keyframes pg-loader-pulse {
          0%, 100% { transform: scale(1.0);  opacity: 0.85; }
          50%      { transform: scale(1.08); opacity: 1.0;  }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="${label}"] > div { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
