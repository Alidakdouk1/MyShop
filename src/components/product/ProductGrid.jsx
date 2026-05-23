import ProductCard from './ProductCard'

function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-surface rounded-2xl overflow-hidden ${className}`}>
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="p-3.5 flex flex-col gap-2">
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-5 w-1/3 mt-1" />
      </div>
    </div>
  )
}

const SCROLL_WIDTHS = { sm: 'w-[160px]', md: 'w-[220px]', lg: 'w-[280px]' }

function gridStyle(cols, mobileCols) {
  const c = Number(cols) || 4
  const m = Number(mobileCols) || 2
  return { '--pg-cols': c, '--pg-mid': Math.min(3, c), '--pg-mobile': m }
}

export default function ProductGrid({
  products,
  loading,
  cols         = 4,
  mobileCols   = 2,
  cardShape    = 'rounded',
  layoutMode   = 'grid',
  scrollSize   = 'md',
  cardSettings = {},
  emptyState   = {},
}) {
  const isEmpty = !loading && !products?.length

  if (isEmpty) {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl mb-4">{emptyState.icon || '🛍️'}</div>
        <p className="text-ink-secondary font-medium">{emptyState.title || 'No products found'}</p>
        <p className="text-sm text-ink-tertiary mt-1">{emptyState.subtitle || 'Try adjusting your filters'}</p>
      </div>
    )
  }

  /* ── Scroll Row ── */
  if (layoutMode === 'scroll') {
    const itemW = SCROLL_WIDTHS[scrollSize] || SCROLL_WIDTHS.md
    const skeletonCount = cols + 1

    return (
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div key={i} className={`${itemW} shrink-0`}>
                  <SkeletonCard />
                </div>
              ))
            : products.map((p, i) => (
                <div key={p.id} className={`${itemW} shrink-0 snap-start animate-fade-in stagger-${Math.min(i % 6 + 1, 6)}`}>
                  <ProductCard product={p} cardShape={cardShape} cardSettings={cardSettings} />
                </div>
              ))
          }
        </div>
        {/* Fade hint on right edge */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white/60 to-transparent" />
      </div>
    )
  }

  /* ── Grid ── */
  const style = gridStyle(cols, mobileCols)

  if (loading) {
    return (
      <div className="grid pg-grid gap-4" style={style}>
        {Array.from({ length: (Number(cols) || 4) * 2 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid pg-grid gap-4" style={style}>
      {products.map((p, i) => (
        <div key={p.id} className={`animate-fade-in stagger-${Math.min(i % 6 + 1, 6)}`}>
          <ProductCard product={p} cardShape={cardShape} cardSettings={cardSettings} />
        </div>
      ))}
    </div>
  )
}
