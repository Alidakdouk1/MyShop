import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addToCartThunk } from '../../store/slices/cartSlice'
import { toggleWishlistThunk, selectIsWishlisted, selectWishlistItemId } from '../../store/slices/wishlistSlice'
import { selectUser } from '../../store/slices/authSlice'
import { useToast } from '../../hooks/useToast'
import Badge from '../ui/Badge'
import StarRating from '../common/StarRating'

export default function ProductCard({ product }) {
  const dispatch  = useDispatch()
  const toast     = useToast()
  const user      = useSelector(selectUser)
  const isWished  = useSelector(selectIsWishlisted(product.id))
  const wItemId   = useSelector(selectWishlistItemId(product.id))
  const [adding, setAdding] = useState(false)

  // API returns base_price + optional sale_price; effective price is sale_price ?? base_price
  const effectivePrice = product.sale_price || product.base_price || product.price || 0
  const basePrice      = product.base_price || product.price || 0
  const discountPct = product.sale_price && product.sale_price < basePrice
    ? Math.round((1 - product.sale_price / basePrice) * 100)
    : 0
  const discount = discountPct > 0 ? discountPct : null

  const hasVariants = Number(product.variant_count) > 0

  const rawSrc = product.primary_image || product.main_image
  const imgSrc = rawSrc
    ? (rawSrc.startsWith('http') ? rawSrc : `/MyShop/backend/${rawSrc}`)
    : `https://placehold.co/400x400/F2F0EB/9C9894?text=${encodeURIComponent(product.name?.slice(0, 10) || 'Product')}`

  const handleAddToCart = async (e) => {
    e.preventDefault()
    if (!user) { toast.info('Please login to add to cart'); return }
    setAdding(true)
    const result = await dispatch(addToCartThunk({ product_id: product.id, quantity: 1 }))
    setAdding(false)
    if (!result.error) toast.success('Added to cart!')
    else toast.error(result.payload || 'Failed to add')
  }

  const handleWishlist = async (e) => {
    e.preventDefault()
    if (!user) { toast.info('Please login to save items'); return }
    await dispatch(toggleWishlistThunk({ productId: product.id, wishlistItemId: isWished ? wItemId : null }))
  }

  return (
    <Link to={`/products/${product.slug}`} className="group product-card block">
      <div className="bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Image */}
        <div className="relative overflow-hidden bg-surface-alt aspect-[3/4]">
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover product-card-img"
            loading="lazy"
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount && <Badge variant="sale">-{discount}%</Badge>}
            {product.is_new && <Badge variant="new">New</Badge>}
          </div>
          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center
              transition-all duration-200 shadow-md
              ${isWished
                ? 'bg-accent text-white scale-100'
                : 'bg-white/80 text-ink-tertiary hover:text-accent hover:bg-white'
              }`}
          >
            <svg className="w-4.5 h-4.5" fill={isWished ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          {/* Quick add — only for products without variants */}
          {!hasVariants && (
            <div className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="w-full bg-ink text-white text-sm font-semibold py-2.5 rounded-xl
                  hover:bg-ink/90 active:scale-[0.98] transition-all duration-150
                  disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding…' : 'Quick Add'}
              </button>
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-3.5">
          <h3 className="text-sm font-semibold text-ink line-clamp-2 leading-snug mb-2">
            {product.name}
          </h3>
          {(product.rating_avg || product.avg_rating) > 0 && (
            <div className="mb-2">
              <StarRating value={product.rating_avg || product.avg_rating} count={product.review_count} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">${Number(effectivePrice).toFixed(2)}</span>
            {discount && (
              <span className="text-xs text-ink-tertiary line-through">
                ${Number(basePrice).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
