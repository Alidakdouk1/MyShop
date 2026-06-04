import { Link, useLocation } from 'react-router-dom'
import { useCompare, removeFromCompare, clearCompare, COMPARE_MAX } from '../../lib/compare'

const imgUrl = (src) => {
  if (!src) return 'https://placehold.co/120x120/F2F0EB/9C9894?text=%E2%80%A2'
  return src.startsWith('http') ? src : `/MyShop/backend/${src}`
}

// Floating "Compare ({n})" tray docked to the bottom of the viewport.
// Hidden when the list is empty or while the user is already on /compare.
export default function CompareBar() {
  const list     = useCompare()
  const location = useLocation()

  if (!list.length) return null
  if (location.pathname.startsWith('/compare')) return null

  const slots = Array.from({ length: COMPARE_MAX }, (_, i) => list[i] || null)

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 w-[min(100%-20px,720px)]"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="bg-surface rounded-2xl shadow-float ring-1 ring-border/70 px-3 py-3 md:px-4 md:py-3 flex items-center gap-3"
        style={{ animation: 'pop-in 0.28s var(--ease-out-back)' }}
      >
        <div className="flex-1 grid grid-cols-3 gap-2">
          {slots.map((p, i) => p ? (
            <div key={p.id} className="relative">
              <Link to={`/products/${p.slug}`} className="block bg-surface-alt rounded-lg overflow-hidden aspect-square ring-1 ring-border/40 hover:ring-ink/30 transition-all">
                <img src={imgUrl(p.primary_image)} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
              </Link>
              <button
                onClick={() => removeFromCompare(p.id)}
                aria-label={`Remove ${p.name} from compare`}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-white text-[10px] font-bold flex items-center justify-center shadow-md hover:scale-110 active:scale-90 transition-transform"
              >
                ×
              </button>
            </div>
          ) : (
            <div
              key={`slot-${i}`}
              className="aspect-square rounded-lg border border-dashed border-border bg-surface-alt/40 flex items-center justify-center text-ink-tertiary text-[10px] font-medium uppercase tracking-wider"
            >
              Empty
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Link
            to="/compare"
            className="shine inline-flex items-center justify-center gap-1.5 bg-ink text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-ink/90 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h13M3 12h9M3 18h6M17 6l4 3-4 3M21 18l-4-3 4-3" />
            </svg>
            Compare ({list.length})
          </Link>
          <button
            onClick={clearCompare}
            className="text-[11px] text-ink-tertiary hover:text-ink underline underline-offset-2 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
