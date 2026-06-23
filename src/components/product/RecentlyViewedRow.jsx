import { useMemo } from 'react'
import ProductCard from './ProductCard'
import { useRecentlyViewed, clearRecentlyViewed } from '../../lib/recentlyViewed'

/**
 * Renders the "Recently Viewed" row anywhere in the app.
 *
 * @param {object} props
 * @param {string} [props.excludeSlug]  Hide this slug (use on PDP to avoid showing the current product)
 * @param {string} [props.title]        Default "Recently Viewed"
 * @param {string} [props.eyebrow]      Default "Keep Exploring"
 * @param {number} [props.limit]        Max items shown (default 6)
 * @param {number} [props.minToShow]    Don't render unless there are at least this many (default 2)
 * @param {boolean} [props.showClear]   Show a "Clear history" link (default true)
 * @param {string} [props.variant]      'full' (default) – page-style with eyebrow/title
 *                                       'compact' – tighter, no eyebrow (good for cart)
 */
export default function RecentlyViewedRow({
  excludeSlug,
  title    = 'Recently Viewed',
  eyebrow  = 'Keep Exploring',
  limit    = 6,
  minToShow = 2,
  showClear = true,
  variant  = 'full',
}) {
  const all = useRecentlyViewed()

  const items = useMemo(
    () => all.filter(p => p && p.slug && p.slug !== excludeSlug).slice(0, limit),
    [all, excludeSlug, limit]
  )

  if (items.length < minToShow) return null

  if (variant === 'compact') {
    return (
      <section className="max-w-screen-xl mx-auto px-4 py-8 border-t border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ink tracking-wide">{title}</h2>
          {showClear && (
            <button
              onClick={clearRecentlyViewed}
              className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary hover:text-ink transition-colors"
            >
              Clear history
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {items.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    )
  }

  return (
    <section
      style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px' }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 32, borderTop: '1px solid #E4E1D9', paddingTop: 48,
          gap: 16, flexWrap: 'wrap',
        }}
      >
        <div>
          {eyebrow && (
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#9C9894', marginBottom: 6 }}>
              {eyebrow}
            </p>
          )}
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
            fontWeight: 400, letterSpacing: '0.03em',
            color: '#0F0F0F', margin: 0, lineHeight: 1,
          }}>
            {title}
          </h2>
        </div>
        {showClear && (
          <button
            onClick={clearRecentlyViewed}
            className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary hover:text-ink transition-colors"
          >
            Clear history
          </button>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {items.map((p, i) => (
          <div key={p.id} style={{ animation: 'fadeIn 0.4s ease both', animationDelay: `${Math.min(i * 0.06, 0.4)}s` }}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  )
}
