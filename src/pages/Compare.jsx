import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useCompare, removeFromCompare, clearCompare, COMPARE_MAX } from '../lib/compare'
import { addToCartThunk } from '../store/slices/cartSlice'
import { useToast } from '../hooks/useToast'
import { useCurrency } from '../context/CurrencyContext'
import StarRating from '../components/common/StarRating'

const imgUrl = (src) => {
  if (!src) return 'https://placehold.co/600x600/F2F0EB/9C9894?text=Product'
  return src.startsWith('http') ? src : `/MyShop/backend/${src}`
}

const fmtDate = (d) => {
  if (!d) return null
  try {
    return new Date(String(d).slice(0, 10) + 'T00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return d }
}

// Highlight a row when its values differ across the selected products.
// Returns true if there are 2+ products and at least one value differs.
function rowDiffers(values) {
  const present = values.filter(v => v !== null && v !== undefined && v !== '')
  if (present.length < 2) return false
  return present.some(v => String(v) !== String(present[0]))
}

function StockBadge({ qty, releaseDate }) {
  const isPreorder = releaseDate && new Date(String(releaseDate).slice(0, 10) + 'T00:00') > new Date()
  if (isPreorder) {
    return (
      <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-white" style={{ background: '#7C3AED' }}>
        Pre-order
      </span>
    )
  }
  if (qty === 0) {
    return <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-ink/85 text-white">Out of stock</span>
  }
  if (qty <= 10) {
    return <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-800">Only {qty} left</span>
  }
  return <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">In stock</span>
}

function ProductColumn({ product, onAdd, adding }) {
  const { format } = useCurrency()
  const isPreorder = product.release_date && new Date(String(product.release_date).slice(0, 10) + 'T00:00') > new Date()
  const stockQty   = Number(product.stock_qty || 0)
  const cantAdd    = isPreorder || (!product.variant_count && stockQty === 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl overflow-hidden bg-surface-alt ring-1 ring-border/60 aspect-square">
        <Link to={`/products/${product.slug}`}>
          <img src={imgUrl(product.primary_image)} alt={product.name} className="w-full h-full object-cover" />
        </Link>
        <button
          onClick={() => removeFromCompare(product.id)}
          aria-label={`Remove ${product.name}`}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur text-ink-tertiary hover:text-ink shadow-md hover:scale-110 active:scale-90 transition-all flex items-center justify-center text-base font-bold"
        >
          ×
        </button>
      </div>
      <Link to={`/products/${product.slug}`} className="text-sm font-semibold text-ink line-clamp-2 leading-snug hover:underline">
        {product.name}
      </Link>
      <button
        onClick={onAdd}
        disabled={adding || cantAdd}
        className="shine w-full bg-ink text-white text-xs font-bold py-2.5 rounded-xl hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={cantAdd && isPreorder ? { background: '#7C3AED' } : undefined}
      >
        {adding ? 'Adding…' : cantAdd ? (isPreorder ? 'Pre-order' : 'Out of stock') : (product.variant_count ? 'View options' : 'Add to cart')}
      </button>
    </div>
  )
}

export default function Compare() {
  const list  = useCompare()
  const dispatch = useDispatch()
  const toast = useToast()
  const { format } = useCurrency()
  const [addingId, setAddingId] = useState(null)

  const handleAdd = async (product) => {
    if (product.variant_count) {
      // Variant products need option selection — bounce to the PDP.
      window.location.href = `/products/${product.slug}`
      return
    }
    setAddingId(product.id)
    const result = await dispatch(addToCartThunk({ product_id: product.id, quantity: 1 }))
    setAddingId(null)
    if (!result.error) toast.success('Added to cart')
    else toast.error(result.payload || 'Failed to add')
  }

  // Pre-compute every row's diff state so we can apply highlight uniformly.
  const rows = useMemo(() => {
    if (!list.length) return []
    const effPrice = p => (p.sale_price && p.sale_price > 0 ? p.sale_price : p.base_price) || 0
    return [
      { label: 'Price',        diff: rowDiffers(list.map(effPrice)),
        render: p => (
          <div>
            <div className="font-bold text-ink text-lg">{format(effPrice(p))}</div>
            {p.sale_price && p.sale_price > 0 && Number(p.sale_price) < Number(p.base_price) && (
              <div className="text-xs text-ink-tertiary line-through">{format(p.base_price)}</div>
            )}
          </div>
        ),
      },
      { label: 'Availability', diff: rowDiffers(list.map(p => {
          const pre = p.release_date && new Date(String(p.release_date).slice(0,10)+'T00:00') > new Date()
          return pre ? 'preorder' : (Number(p.stock_qty||0) === 0 ? 'out' : 'in')
        })),
        render: p => <StockBadge qty={Number(p.stock_qty || 0)} releaseDate={p.release_date} />,
      },
      { label: 'Rating', diff: rowDiffers(list.map(p => p.rating_avg ? Math.round(p.rating_avg * 2) / 2 : null)),
        render: p => p.rating_avg ? <StarRating value={p.rating_avg} count={p.review_count} /> : <span className="text-ink-tertiary text-sm">No reviews yet</span>,
      },
      { label: 'Category', diff: rowDiffers(list.map(p => p.category_name)),
        render: p => <span className="text-sm text-ink">{p.category_name || '—'}</span>,
      },
      { label: 'Weight', diff: rowDiffers(list.map(p => p.weight)),
        render: p => <span className="text-sm text-ink">{p.weight ? `${p.weight} kg` : '—'}</span>,
      },
      { label: 'Has variants', diff: rowDiffers(list.map(p => p.variant_count > 0 ? 'yes' : 'no')),
        render: p => <span className="text-sm text-ink">{p.variant_count > 0 ? 'Yes' : 'No'}</span>,
      },
      { label: 'Release date', diff: rowDiffers(list.map(p => p.release_date)),
        render: p => <span className="text-sm text-ink">{fmtDate(p.release_date) || '—'}</span>,
        showIf: list.some(p => p.release_date),
      },
      { label: 'Description', diff: false,
        render: p => (
          <p className="text-xs text-ink-secondary leading-relaxed line-clamp-6">
            {p.description ? String(p.description).replace(/<[^>]+>/g, '') : '—'}
          </p>
        ),
      },
    ].filter(r => r.showIf === undefined || r.showIf)
  }, [list, format])

  if (!list.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex w-16 h-16 rounded-full bg-surface-alt items-center justify-center mb-4 text-ink-tertiary">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h13M3 12h9M3 18h6M17 6l4 3-4 3M21 18l-4-3 4-3" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Nothing to compare yet</h1>
        <p className="text-ink-tertiary mb-6">
          Tap the compare icon on any product card to add up to {COMPARE_MAX} items here.
        </p>
        <Link to="/shop" className="inline-block bg-ink text-white font-semibold px-6 py-3 rounded-xl hover:bg-ink/90 transition-colors">
          Browse products
        </Link>
      </div>
    )
  }

  // Grid: 1 fixed label column + N product columns (capped at COMPARE_MAX).
  const colsClass = list.length === 1 ? 'grid-cols-[140px_1fr]'
                  : list.length === 2 ? 'grid-cols-[140px_1fr_1fr]'
                  : 'grid-cols-[140px_1fr_1fr_1fr]'

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">Compare products</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            {list.length} of {COMPARE_MAX} · differences highlighted
          </p>
        </div>
        <button
          onClick={clearCompare}
          className="text-sm font-semibold text-ink-tertiary hover:text-ink px-3 py-2 rounded-lg hover:bg-surface-alt transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className={`grid ${colsClass} gap-x-4 md:gap-x-6 gap-y-3 min-w-[640px]`}>
          {/* Header row: empty corner + product columns */}
          <div />
          {list.map(p => (
            <ProductColumn
              key={p.id}
              product={p}
              onAdd={() => handleAdd(p)}
              adding={addingId === p.id}
            />
          ))}

          {/* Spacer below header */}
          <div className="h-2 col-span-full border-b border-border/60" />

          {/* Attribute rows */}
          {rows.map(row => (
            <div key={row.label} className="contents">
              <div className={`py-3 text-xs font-bold uppercase tracking-wider self-start ${row.diff ? 'text-accent' : 'text-ink-tertiary'}`}>
                {row.label}
              </div>
              {list.map(p => (
                <div
                  key={p.id + row.label}
                  className={`py-3 px-3 -mx-3 rounded-lg ${row.diff ? 'bg-amber-50/60' : ''}`}
                >
                  {row.render(p)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
