import ProductCard from './ProductCard'

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl overflow-hidden">
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

export default function ProductGrid({ products, loading, cols = 4 }) {
  const gridCols = {
    2: 'grid-cols-2 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  }

  if (loading) {
    return (
      <div className={`grid ${gridCols[cols] || gridCols[4]} gap-4`}>
        {Array.from({ length: cols * 2 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!products?.length) {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl mb-4">🛍️</div>
        <p className="text-ink-secondary font-medium">No products found</p>
        <p className="text-sm text-ink-tertiary mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className={`grid ${gridCols[cols] || gridCols[4]} gap-4`}>
      {products.map((p, i) => (
        <div key={p.id} className={`animate-fade-in stagger-${Math.min(i % 6 + 1, 6)}`}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  )
}
