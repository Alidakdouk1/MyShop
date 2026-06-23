import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getProduct } from '../../api/productApi'
import { addToCartThunk } from '../../store/slices/cartSlice'
import { toggleWishlistThunk, selectIsWishlisted, selectWishlistItemId } from '../../store/slices/wishlistSlice'
import { selectUser } from '../../store/slices/authSlice'
import { useToast } from '../../hooks/useToast'
import Modal from '../ui/Modal'
import StarRating from '../common/StarRating'
import Spinner from '../ui/Spinner'
import { flyToCart } from '../../lib/flyToCart'
import { heartBurst } from '../../lib/heartBurst'
import { useAddedToCart } from '../../context/AddedToCartContext'

const imgUrl = (src) => {
  if (!src) return `https://placehold.co/600x600/F2F0EB/9C9894?text=No+Image`
  return src.startsWith('http') ? src : `/MyShop/backend/${src}`
}

// Compact product preview shown from product grids. Fetches the full product on
// open (for variants/description) and supports add-to-cart without leaving the page.
export default function QuickView({ slug, open, onClose }) {
  const dispatch = useDispatch()
  const toast    = useToast()
  const addedToCart = useAddedToCart()
  const user     = useSelector(selectUser)
  const [product, setProduct] = useState(null)
  const [qty, setQty]         = useState(1)
  const [adding, setAdding]   = useState(false)
  const [variant, setVariant] = useState(null)
  const [imgIdx, setImgIdx]   = useState(0)

  const isWished = useSelector(selectIsWishlisted(product?.id))
  const wItemId  = useSelector(selectWishlistItemId(product?.id))

  // Fetch on open. Resets happen inside the async callback (not synchronously in
  // the effect body) and a cancel flag guards against out-of-order responses.
  useEffect(() => {
    if (!open || !slug) return
    let cancelled = false
    getProduct(slug)
      .then(r => {
        if (cancelled) return
        const p = r.data.data
        setProduct(p)
        setVariant(p.variants?.length ? p.variants[0] : null)
        setQty(1)
        setImgIdx(0)
      })
      .catch(() => { if (!cancelled) toast.error('Could not load product') })
    return () => { cancelled = true }
  }, [open, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const variants    = product?.variants || []
  const hasVariants = variants.length > 0
  const basePrice   = Number(product?.base_price || 0)
  const salePrice   = product?.sale_price ? Number(product.sale_price) : null
  const modifier    = variant ? Number(variant.price_modifier || 0) : 0
  const price       = (salePrice ?? basePrice) + modifier
  const discount    = salePrice && salePrice < basePrice ? Math.round((1 - salePrice / basePrice) * 100) : null
  const images      = (product?.images || []).map(i => i.image_url || i).filter(Boolean)
  // Respect stock reservations — available_stock = raw - other carts' active holds.
  // Falls back to raw stock_qty so older payloads keep working.
  const stockQty    = hasVariants
    ? Number(variant?.available_stock ?? variant?.stock_qty ?? 0)
    : Number(product?.available_stock ?? product?.stock_qty ?? 0)

  const addToCart = async () => {
    if (!user) { toast.info('Please login to add to cart'); return }
    if (hasVariants && !variant) { toast.info('Please select an option'); return }
    // Snapshot the modal's currently-visible image BEFORE we close so we have
    // a valid source rect for the fly-to-cart animation.
    const sourceImg = document.querySelector('[data-quickview-image]')
    setAdding(true)
    const payload = { product_id: product.id, quantity: qty }
    if (variant) payload.variant_id = variant.id
    const r = await dispatch(addToCartThunk(payload))
    setAdding(false)
    if (!r.error) {
      flyToCart(sourceImg)
      addedToCart.show({ product, qty, image: imgUrl(images[imgIdx] || images[0]) })
      onClose?.()
    } else toast.error(r.payload || 'Failed to add')
  }

  const toggleWish = async (e) => {
    if (!user) { toast.info('Please login to save items'); return }
    const heartBtn  = e?.currentTarget
    const wasWished = isWished
    await dispatch(toggleWishlistThunk({ productId: product.id, wishlistItemId: isWished ? wItemId : null }))
    if (!wasWished && heartBtn) heartBurst(heartBtn)
  }

  return (
    <Modal open={open} onClose={onClose} size="xl">
      {!product ? (
        <div className="h-72 flex items-center justify-center">
          <Spinner size="lg" className="text-ink-tertiary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Image carousel — arrows + dots when >1 image */}
          <div>
            <div className="relative rounded-xl overflow-hidden bg-surface-alt aspect-square">
              <img
                src={imgUrl(images[imgIdx] || images[0])}
                alt={product.name}
                data-quickview-image
                className="w-full h-full object-cover transition-opacity duration-200"
              />
              {discount && (
                <span className="absolute top-3 left-3 bg-accent text-white text-xs font-bold px-2 py-1 rounded-lg">
                  −{discount}%
                </span>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                    aria-label="Previous image"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center text-ink shadow-md hover:bg-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" data-rtl-flip>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImgIdx(i => (i + 1) % images.length)}
                    aria-label="Next image"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center text-ink shadow-md hover:bg-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" data-rtl-flip>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full transition-all"
                        style={{
                          background: i === imgIdx ? '#0F172A' : 'rgba(15,23,42,0.30)',
                          width: i === imgIdx ? 16 : 6,
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="hidden sm:flex gap-2 mt-2">
                {images.slice(0, 5).map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImgIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`w-12 h-12 rounded-lg overflow-hidden bg-surface-alt border-2 transition-colors ${
                      i === imgIdx ? 'border-ink' : 'border-transparent hover:border-ink/30'
                    }`}
                  >
                    <img src={imgUrl(src)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {product.category_name && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
                {product.category_name}
              </span>
            )}
            <h3 className="text-xl font-bold text-ink mt-1 leading-snug">{product.name}</h3>

            {(product.review_stats?.avg_rating || product.rating_avg) > 0 && (
              <div className="mt-2">
                <StarRating value={product.review_stats?.avg_rating || product.rating_avg} size="sm" showValue />
              </div>
            )}

            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl font-bold text-ink">${price.toFixed(2)}</span>
              {discount && <span className="text-sm text-ink-tertiary line-through">${basePrice.toFixed(2)}</span>}
            </div>

            {product.description && (
              <p className="text-sm text-ink-secondary mt-3 line-clamp-3 leading-relaxed">{product.description}</p>
            )}

            {/* Variants */}
            {hasVariants && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-secondary mb-2">
                  {variant ? `${variant.size}${variant.color ? ` · ${variant.color}` : ''}` : 'Select an option'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => {
                    const out = Number(v.stock_qty) === 0
                    const active = variant?.id === v.id
                    return (
                      <button
                        key={v.id}
                        disabled={out}
                        onClick={() => { setVariant(v); setQty(1) }}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all
                          ${active ? 'bg-ink text-white border-ink' : 'border-border text-ink hover:border-ink/40'}
                          ${out ? 'opacity-50 line-through cursor-not-allowed' : ''}`}
                      >
                        {v.size}{v.color ? ` / ${v.color}` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Qty + stock */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center border border-border rounded-xl overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center hover:bg-surface-alt text-ink">−</button>
                <span className="w-9 text-center text-sm font-bold">{qty}</span>
                <button onClick={() => setQty(q => Math.min(stockQty || 99, q + 1))}
                  disabled={stockQty > 0 && qty >= stockQty}
                  className="w-9 h-9 flex items-center justify-center hover:bg-surface-alt text-ink disabled:text-ink-tertiary disabled:cursor-not-allowed">+</button>
              </div>
              {stockQty > 0 && stockQty <= 10 && (
                <span className="text-xs font-semibold text-warning bg-warning-light px-2 py-1 rounded-md">Only {stockQty} left</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <button
                onClick={addToCart}
                disabled={adding || stockQty === 0}
                className="shine flex-1 bg-ink text-white font-bold text-sm py-3 rounded-xl hover:bg-ink/85 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {stockQty === 0 ? 'Out of Stock' : adding ? 'Adding…' : 'Add to Cart'}
              </button>
              <button
                onClick={toggleWish}
                aria-label="Toggle wishlist"
                className={`w-12 rounded-xl border flex items-center justify-center transition-all active:scale-90
                  ${isWished ? 'border-accent bg-accent-light text-accent' : 'border-border text-ink-tertiary hover:text-accent hover:border-accent'}`}
              >
                <svg className="w-5 h-5" fill={isWished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>

            <Link
              to={`/products/${product.slug}`}
              onClick={onClose}
              className="mt-4 text-sm font-semibold text-ink-secondary hover:text-ink transition-colors inline-flex items-center gap-1 self-start"
            >
              View full details <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      )}
    </Modal>
  )
}
