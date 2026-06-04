import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getCartRecommendations } from '../../api/cartApi'
import { addToCartThunk, selectCartItems } from '../../store/slices/cartSlice'
import { selectUser } from '../../store/slices/authSlice'
import { useToast } from '../../hooks/useToast'
import { useCurrency } from '../../context/CurrencyContext'

const imgUrl = (p) => {
  const raw = p?.primary_image || p?.main_image
  if (!raw) return `https://placehold.co/120x120/F2F0EB/9C9894?text=•`
  return raw.startsWith('http') ? raw : `/MyShop/backend/${raw}`
}
const priceOf = (p) => Number(p?.sale_price || p?.base_price || 0)

/**
 * Compact rail of products commonly bought with what's in the cart.
 * Used in the cart drawer (variant="drawer") and on the cart page (variant="page").
 */
export default function CartRecommendations({ variant = 'drawer', onItemAdded }) {
  const dispatch = useDispatch()
  const user     = useSelector(selectUser)
  const cart     = useSelector(selectCartItems)
  const toast    = useToast()
  const { format } = useCurrency()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(null)

  // Refetch whenever the cart composition changes so suggestions stay relevant.
  const cartKey = (cart || []).map(i => `${i.product_id}x${i.quantity}`).join(',')
  useEffect(() => {
    setLoading(true)
    getCartRecommendations()
      .then(r => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [cartKey])

  const add = async (p) => {
    if (Number(p.variant_count || 0) > 0) {
      // Variant products can't be one-tap added — bounce to the product page.
      onItemAdded?.()
      return
    }
    if (!user) { toast.info('Please login to add to cart'); return }
    setAdding(p.id)
    const r = await dispatch(addToCartThunk({ product_id: p.id, quantity: 1 }))
    setAdding(null)
    if (!r.error) {
      toast.success(`${p.name} added`)
      onItemAdded?.()
    } else {
      toast.error(r.payload || 'Could not add')
    }
  }

  if (loading || items.length === 0) return null

  // ── Drawer variant — slim strip: small thumb + inline + button, 1-line text
  if (variant === 'drawer') {
    return (
      <div className="px-5 pt-3 pb-2 border-t border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9C9894' }}>
          You may also like
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {items.slice(0, 6).map(p => {
            const needsView = Number(p.variant_count || 0) > 0
            return (
              <div key={p.id} className="shrink-0" style={{ width: 78 }}>
                <Link to={`/products/${p.slug}`} onClick={onItemAdded} className="block relative">
                  <div className="rounded-lg overflow-hidden bg-surface-alt" style={{ width: 78, height: 78 }}>
                    <img src={imgUrl(p)} alt={p.name}
                      className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); add(p) }}
                    disabled={adding === p.id}
                    aria-label={needsView ? `View ${p.name}` : `Add ${p.name}`}
                    className="absolute bottom-1 right-1 rounded-full text-white font-bold flex items-center justify-center disabled:opacity-60 transition-transform active:scale-90"
                    style={{ background: '#0F0F0F', boxShadow: '0 2px 6px rgba(0,0,0,0.28)', width: 26, height: 26, fontSize: 16, lineHeight: 1 }}
                  >
                    {adding === p.id ? '…' : needsView ? '›' : '+'}
                  </button>
                </Link>
                <p className="text-[10px] font-semibold text-ink mt-1 line-clamp-1 leading-tight">{p.name}</p>
                <p className="text-[10px] font-bold text-ink">{format(priceOf(p))}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Page variant — full grid ────────────────────────────────────────
  return (
    <div className="mt-8">
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-base font-bold text-ink">You may also like</h2>
        <p className="text-xs text-ink-tertiary">Customers who bought items in your cart also added these</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.slice(0, 4).map(p => (
          <div key={p.id} className="bg-white rounded-2xl p-3 border border-black/5 flex flex-col">
            <Link to={`/products/${p.slug}`}>
              <img src={imgUrl(p)} alt={p.name}
                className="w-full aspect-square object-cover rounded-xl bg-surface-alt"
                loading="lazy" />
            </Link>
            <p className="text-sm font-semibold text-ink mt-2 line-clamp-2 leading-tight">{p.name}</p>
            <p className="text-sm font-bold text-ink mt-1">{format(priceOf(p))}</p>
            <button
              onClick={() => add(p)}
              disabled={adding === p.id}
              className="w-full mt-2 text-xs font-bold uppercase tracking-wider py-2 rounded-lg disabled:opacity-60"
              style={{ background: '#0F0F0F', color: '#fff' }}
            >
              {adding === p.id ? 'Adding…' : Number(p.variant_count || 0) > 0 ? 'View product' : 'Add to cart'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
