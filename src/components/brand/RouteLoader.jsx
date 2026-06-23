/**
 * Pick&Go LB — Route Loader.
 *
 * Page-transition loader: the PG mark on top of a horizontal "route" that
 * draws across in the brand gradient (teal → lime). Reinforces the
 * "Pick → Go" forward-motion concept.
 *
 * Drop into <Suspense fallback={<RouteLoader />}> for lazy-route loading.
 */
import LogoIcon from './LogoIcon'

export default function RouteLoader({ label = 'Loading page' }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="min-h-[60vh] flex flex-col items-center justify-center gap-5"
    >
      <div style={{ animation: 'pg-route-mark 1.6s ease-in-out infinite' }}>
        <LogoIcon size={56} />
      </div>

      {/* The route — a thin pill with the gradient sweeping left → right */}
      <div
        aria-hidden="true"
        style={{
          width: 140, height: 4, borderRadius: 999,
          background: '#E4E1D9', position: 'relative', overflow: 'hidden',
        }}
      >
        <span style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, #00D1C1 0%, #54E89A 55%, #A3FF12 100%)',
          borderRadius: 999,
          transform: 'translateX(-100%)',
          animation: 'pg-route-sweep 1.6s cubic-bezier(0.65,0,0.35,1) infinite',
        }} />
      </div>

      <style>{`
        @keyframes pg-route-mark {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes pg-route-sweep {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="${label}"] > div { animation: none !important; }
          [aria-label="${label}"] span  { animation: none !important; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
