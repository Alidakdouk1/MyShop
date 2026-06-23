import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getSharedWishlist } from '../api/userApi'
import { addToCartThunk } from '../store/slices/cartSlice'
import { selectUser } from '../store/slices/authSlice'
import { useToast } from '../hooks/useToast'
import { useCurrency } from '../context/CurrencyContext'
import { resolveImg } from '../lib/img'
import { ProductGridSkeleton } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'

export default function SharedWishlist() {
  const { token } = useParams()
  const dispatch  = useDispatch()
  const user      = useSelector(selectUser)
  const toast     = useToast()
  const { format } = useCurrency()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [addingId, setAddingId] = useState(null)

  useEffect(() => {
    setLoading(true)
    getSharedWishlist(token)
      .then(r => setData(r.data.data))
      .catch(err => setError(err.response?.status === 404
        ? 'This wishlist link is no longer active.'
        : 'Could not load wishlist.'
      ))
      .finally(() => setLoading(false))
  }, [token])

  const handleAddToCart = async (item) => {
    if (!user) { toast.info('Please log in to buy this'); return }
    setAddingId(item.product_id)
    const r = await dispatch(addToCartThunk({ product_id: item.product_id, quantity: 1 }))
    setAddingId(null)
    if (!r.error) toast.success('Added to your cart — gift on the way 🎁')
    else toast.error(r.payload || 'Could not add')
  }

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-10">
        <ProductGridSkeleton count={8} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-ink mb-2">Wishlist unavailable</h1>
        <p className="text-sm text-ink-tertiary mb-6">{error}</p>
        <Link to="/shop" className="inline-block bg-ink text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors">
          Browse the store
        </Link>
      </div>
    )
  }

  const items = data?.items || []
  const name  = data?.owner_name || 'Someone'

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-page-in">
      <div className="text-center mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink-tertiary mb-3">A gift list for you</p>
        <h1 className="hero-display text-4xl md:text-5xl text-ink tracking-wide">
          {name.toUpperCase()}'S WISHLIST
        </h1>
        <p className="text-sm text-ink-secondary mt-3 max-w-md mx-auto leading-relaxed">
          {items.length === 0
            ? `${name} hasn't added anything yet — check back soon.`
            : `${items.length} ${items.length === 1 ? 'item' : 'items'} ${name} would love. Tap any one to buy it as a surprise gift.`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-6xl mb-4">🎁</div>
          <Link to="/shop" className="inline-block text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors">
            Browse the store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => {
            const img      = item.image ? resolveImg(item.image)
                                        : `https://placehold.co/300x300/F2F0EB/9C9894?text=Gift`
            const price    = Number(item.sale_price || item.base_price)
            const original = Number(item.base_price)
            const discount = item.sale_price && item.sale_price < item.base_price
              ? Math.round((1 - item.sale_price / item.base_price) * 100) : null
            const outOfStock = Number(item.stock_qty || 0) === 0
            return (
              <div key={item.id} className="group bg-surface rounded-2xl overflow-hidden border border-border hover:border-ink/30 hover:shadow-lg transition-all">
                <div className="relative aspect-3/4 overflow-hidden bg-surface-alt">
                  <Link to={`/products/${item.slug}`}>
                    <img src={img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
                  </Link>
                  {discount && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="sale">-{discount}%</Badge>
                    </div>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="bg-ink/85 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                        Out of stock
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <Link to={`/products/${item.slug}`}>
                    <p className="text-sm font-semibold text-ink hover:text-accent transition-colors line-clamp-2">{item.name}</p>
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-bold text-ink text-sm">{format(price)}</span>
                    {discount && (
                      <span className="text-xs text-ink-tertiary line-through">{format(original)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={outOfStock || addingId === item.product_id}
                    className="w-full mt-2 bg-ink text-white text-xs font-semibold py-2 rounded-lg hover:bg-ink/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingId === item.product_id ? 'Adding…'
                      : outOfStock ? 'Out of stock'
                      : '🎁 Buy as gift'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Soft CTA — encourage viewers to start their own list */}
      <div className="text-center mt-12 py-8 border-t border-border">
        <p className="text-sm text-ink-secondary">
          Want a wishlist of your own?{' '}
          <Link to={user ? '/account/wishlist' : '/register'} className="font-bold text-ink underline underline-offset-4 hover:no-underline">
            {user ? 'View yours' : 'Create one'}
          </Link>
        </p>
      </div>
    </div>
  )
}
