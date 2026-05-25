import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchWishlist, toggleWishlistThunk, selectWishlistItems } from '../../store/slices/wishlistSlice'
import { addToCartThunk } from '../../store/slices/cartSlice'
import { useToast } from '../../hooks/useToast'
import { resolveImg } from '../../lib/img'
import Badge from '../../components/ui/Badge'

export default function Wishlist() {
  const dispatch = useDispatch()
  const toast    = useToast()
  const items    = useSelector(selectWishlistItems)

  useEffect(() => { dispatch(fetchWishlist()) }, [dispatch])

  const handleRemove = async (itemId) => {
    await dispatch(toggleWishlistThunk({ productId: null, wishlistItemId: itemId }))
    toast.success('Removed from wishlist')
  }

  const handleAddToCart = async (productId) => {
    const r = await dispatch(addToCartThunk({ product_id: productId, quantity: 1 }))
    if (!r.error) toast.success('Added to cart!')
    else toast.error('Failed to add to cart')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="hero-display text-4xl text-ink mb-8 tracking-wide">MY WISHLIST</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">♡</div>
          <p className="font-semibold text-ink">Your wishlist is empty</p>
          <p className="text-sm text-ink-tertiary mt-1 mb-6">Save items you love for later</p>
          <Link to="/shop" className="bg-ink text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-ink/80 transition-colors">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => {
            const img      = item.image
              ? resolveImg(item.image)
              : `https://placehold.co/300x300/F2F0EB/9C9894?text=P`
            const price    = Number(item.sale_price || item.base_price)
            const original = Number(item.base_price)
            const discount = item.sale_price && item.sale_price < item.base_price
              ? Math.round((1 - item.sale_price / item.base_price) * 100) : null
            return (
              <div key={item.id} className="group bg-surface rounded-2xl overflow-hidden border border-border hover:border-ink/30 hover:shadow-lg transition-all">
                <div className="relative aspect-[3/4] overflow-hidden bg-surface-alt">
                  <Link to={`/products/${item.slug}`}>
                    <img src={img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
                  </Link>
                  {discount && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="sale">-{discount}%</Badge>
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow hover:bg-accent-light hover:text-accent transition-all opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-3">
                  <Link to={`/products/${item.slug}`}>
                    <p className="text-sm font-semibold text-ink hover:text-accent transition-colors line-clamp-2">{item.name}</p>
                  </Link>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-sm">${price.toFixed(2)}</span>
                      {discount && (
                        <span className="text-xs text-ink-tertiary line-through">${original.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToCart(item.product_id)}
                    className="w-full mt-2 bg-ink text-white text-xs font-semibold py-2 rounded-lg hover:bg-ink/80 transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
