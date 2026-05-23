import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getProduct, getProductReviews, createReview } from '../api/productApi'
import { getProductFilters } from '../api/filterApi'
import { addToCartThunk } from '../store/slices/cartSlice'
import { toggleWishlistThunk, selectIsWishlisted, selectWishlistItemId } from '../store/slices/wishlistSlice'
import { selectUser } from '../store/slices/authSlice'
import { useToast } from '../hooks/useToast'
import StarRating from '../components/common/StarRating'
import Spinner from '../components/ui/Spinner'
import ProductCard from '../components/product/ProductCard'

function FilterOptionPill({ label, active, soldOut, tooltip, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {tooltip && hover && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0F0F0F',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: '5px 9px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 5,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          }}
        >
          {tooltip}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #0F0F0F',
            }}
          />
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={soldOut}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: '8px 16px',
          borderRadius: '10px',
          fontSize: '13px', fontWeight: 600,
          border: active ? '2px solid #0F0F0F' : '1.5px solid #E4E1D9',
          background: active ? '#0F0F0F' : 'transparent',
          color: active ? '#fff' : soldOut ? '#C8C4BC' : '#0F0F0F',
          cursor: soldOut ? 'not-allowed' : 'pointer',
          opacity: soldOut ? 0.55 : 1,
          textDecoration: soldOut ? 'line-through' : 'none',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
    </div>
  )
}

export default function ProductDetail() {
  const { slug }    = useParams()
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const toast       = useToast()
  const user        = useSelector(selectUser)
  const [product, setProduct]     = useState(null)
  const [reviews, setReviews]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [qty, setQty]             = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [adding, setAdding]       = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab]             = useState('description')
  const [related, setRelated]     = useState([])
  const [imgLoaded, setImgLoaded] = useState(false)
  const [productFilters, setProductFilters] = useState([])
  const [pickedFilters, setPickedFilters]   = useState({}) // { [filter_id]: optionId }
  const tabsRef = useRef(null)

  const isWished = useSelector(selectIsWishlisted(product?.id))
  const wItemId  = useSelector(selectWishlistItemId(product?.id))

  useEffect(() => {
    setLoading(true)
    setRelated([])
    setImgLoaded(false)
    setProductFilters([])
    setPickedFilters({})
    getProduct(slug).then(r => {
      const p = r.data.data
      setProduct(p)
      setActiveImg(0)
      setQty(1)
      setSelectedVariant((p.variants && p.variants.length > 0) ? p.variants[0] : null)
      if (p?.id) {
        getProductReviews(p.id).then(r2 => setReviews(r2.data.data || []))
        getProductFilters(p.id)
          .then(r3 => setProductFilters(r3.data.data || []))
          .catch(() => setProductFilters([]))
      }
      setRelated(Array.isArray(p.related) ? p.related : [])
    }).catch(() => navigate('/not-found', { replace: true }))
      .finally(() => setLoading(false))
  }, [slug])

  const variants    = product?.variants || []
  const hasVariants = variants.length > 0

  // Filters the customer must pick from (visible + has selectable options)
  const visibleFilters = productFilters.filter(f =>
    Number(f.is_visible) !== 0 &&
    f.filter_type !== 'range' &&
    (f.options || []).length > 0
  )
  const missingPicks = visibleFilters.filter(f => pickedFilters[f.filter_id] == null)
  const allPicked    = missingPicks.length === 0

  // Per-option stock cap = min of every picked option's quantity (ignore nulls)
  const pickedOptionStocks = visibleFilters
    .map(f => {
      const pid = pickedFilters[f.filter_id]
      if (pid == null) return null
      const opt = f.options.find(o => o.id === pid)
      return opt && opt.quantity != null ? Number(opt.quantity) : null
    })
    .filter(v => v != null)

  const optionStockCap = pickedOptionStocks.length > 0
    ? Math.min(...pickedOptionStocks)
    : null

  const stockQty = hasVariants
    ? (selectedVariant ? Number(selectedVariant.stock_qty) : 0)
    : optionStockCap != null
      ? optionStockCap
      : Number(product?.stock_qty || 0)

  // Keep qty inside the available stock as picks change
  useEffect(() => {
    if (qty > stockQty) setQty(Math.max(1, stockQty))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockQty])

  if (loading) return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Spinner size="xl" className="text-ink-tertiary" />
    </div>
  )
  if (!product) return null

  const priceModifier  = selectedVariant ? Number(selectedVariant.price_modifier || 0) : 0
  const basePrice      = Number(product.base_price || 0)
  const salePriceBase  = product.sale_price ? Number(product.sale_price) : null
  const effectivePrice = (salePriceBase ?? basePrice) + priceModifier
  const discount = salePriceBase && salePriceBase < basePrice
    ? Math.round((1 - salePriceBase / basePrice) * 100) : null

  const images = (product.images || []).map(i => i.image_url || i).filter(Boolean)

  const imgUrl = (src) => {
    if (!src) return `https://placehold.co/800x800/F2F0EB/9C9894?text=No+Image`
    if (src.startsWith('http://') || src.startsWith('https://')) return src
    return `/MyShop/backend/${src}`
  }

  const avgRating = product.review_stats?.avg_rating || product.avg_rating || 0

  const handleAddToCart = async () => {
    if (!user) { toast.info('Please login to add to cart'); navigate('/login'); return }
    if (hasVariants && !selectedVariant) { toast.info('Please select a size/option'); return }

    // Block until the customer picks one value from every visible filter
    if (!allPicked) {
      const names = missingPicks.map(f => f.filter_name).join(', ')
      toast.error(`Please pick a value for: ${names}`)
      return
    }
    // Reject over-purchase against the picked options' stock
    if (optionStockCap != null && qty > optionStockCap) {
      toast.error(`Only ${optionStockCap} left for the selected option${optionStockCap === 1 ? '' : 's'}.`)
      return
    }

    setAdding(true)
    const payload = { product_id: product.id, quantity: qty }
    if (selectedVariant) payload.variant_id = selectedVariant.id
    const selectedOptionIds = visibleFilters
      .map(f => pickedFilters[f.filter_id])
      .filter(Boolean)
    if (selectedOptionIds.length) payload.selected_option_ids = selectedOptionIds
    const r = await dispatch(addToCartThunk(payload))
    setAdding(false)
    if (!r.error) toast.success('Added to cart!')
    else toast.error(r.payload || 'Failed')
  }

  const handleWishlist = async () => {
    if (!user) { toast.info('Please login to save items'); return }
    await dispatch(toggleWishlistThunk({ productId: product.id, wishlistItemId: isWished ? wItemId : null }))
  }

  const handleReview = async (e) => {
    e.preventDefault()
    if (!user) { toast.info('Login to write a review'); return }
    setSubmitting(true)
    try {
      await createReview({ product_id: product.id, ...reviewForm })
      toast.success('Review submitted!')
      setReviewForm({ rating: 5, comment: '' })
      const r = await getProductReviews(product.id)
      setReviews(r.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review')
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{ background: '#FAFAF8' }}>

      {/* ── Breadcrumb ────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-5 md:px-10 pt-7 pb-2">
        <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-ink-tertiary">
          <Link to="/" className="hover:text-ink transition-colors">Home</Link>
          <span style={{ opacity: 0.35 }}>—</span>
          <Link to="/shop" className="hover:text-ink transition-colors">Shop</Link>
          {product.category_name && <>
            <span style={{ opacity: 0.35 }}>—</span>
            <Link to={`/shop?category_id=${product.category_id}`} className="hover:text-ink transition-colors">
              {product.category_name}
            </Link>
          </>}
          <span style={{ opacity: 0.35 }}>—</span>
          <span className="text-ink font-semibold line-clamp-1">{product.name}</span>
        </nav>
      </div>

      {/* ── Main Grid ─────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-5 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 lg:gap-16 items-start">

          {/* ── Image Gallery (sticky) ─────────────────── */}
          <div className="lg:sticky lg:top-8">
            {/* Main image */}
            <div
              style={{
                background: '#EEECE6',
                borderRadius: '20px',
                overflow: 'hidden',
                aspectRatio: '1 / 1',
                position: 'relative',
              }}
            >
              <img
                key={activeImg}
                src={imgUrl(images[activeImg])}
                alt={product.name}
                onLoad={() => setImgLoaded(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: imgLoaded ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                }}
              />
              {/* Discount badge overlay */}
              {discount && (
                <div style={{
                  position: 'absolute', top: 16, left: 16,
                  background: '#C0392B', color: '#fff',
                  fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '5px 10px', borderRadius: '8px',
                }}>
                  −{discount}%
                </div>
              )}
              {stockQty === 0 && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(250,250,248,0.6)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    background: '#0F0F0F', color: '#fff',
                    fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    padding: '10px 20px', borderRadius: '100px',
                  }}>Out of Stock</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', overflowX: 'auto' }}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveImg(i); setImgLoaded(false) }}
                    style={{
                      flexShrink: 0,
                      width: '72px', height: '72px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: `2px solid ${i === activeImg ? '#0F0F0F' : 'transparent'}`,
                      background: '#EEECE6',
                      transition: 'border-color 0.2s',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <img src={imgUrl(img)} alt={`View ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ───────────────────────────── */}
          <div style={{ animation: 'fadeIn 0.5s ease both' }}>

            {/* Category tag */}
            {product.category_name && (
              <Link
                to={`/shop?category_id=${product.category_id}`}
                style={{
                  fontSize: '10px', fontWeight: 600,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: '#9C9894', textDecoration: 'none',
                  borderBottom: '1px solid transparent',
                  transition: 'color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.target.style.color = '#0F0F0F'; e.target.style.borderBottomColor = '#0F0F0F' }}
                onMouseLeave={e => { e.target.style.color = '#9C9894'; e.target.style.borderBottomColor = 'transparent' }}
              >
                {product.category_name}
              </Link>
            )}

            {/* Product name */}
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: '#0F0F0F',
              marginTop: '10px',
              marginBottom: '16px',
            }}>
              {product.name}
            </h1>

            {/* Rating */}
            {avgRating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <StarRating value={avgRating} size="sm" showValue />
                <span style={{ fontSize: '12px', color: '#9C9894' }}>
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            )}

            {/* Thin rule */}
            <div style={{ height: '1px', background: '#E4E1D9', margin: '20px 0' }} />

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#0F0F0F', letterSpacing: '-0.02em' }}>
                ${Number(effectivePrice).toFixed(2)}
              </span>
              {discount && (
                <span style={{ fontSize: '1.1rem', color: '#9C9894', textDecoration: 'line-through' }}>
                  ${Number(basePrice).toFixed(2)}
                </span>
              )}
              {discount && (
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: '#C0392B', background: '#FEF2F2',
                  padding: '3px 8px', borderRadius: '6px',
                }}>
                  Save {discount}%
                </span>
              )}
            </div>

            {/* Thin rule */}
            <div style={{ height: '1px', background: '#E4E1D9', margin: '0 0 24px' }} />

            {/* Variant selector */}
            {hasVariants && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{
                  fontSize: '11px', fontWeight: 600,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: '#5C5854', marginBottom: '10px',
                }}>
                  {selectedVariant
                    ? `${selectedVariant.size}${selectedVariant.color ? ` · ${selectedVariant.color}` : ''}`
                    : 'Select an option'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {variants.map(v => {
                    const vStock    = Number(v.stock_qty)
                    const isActive  = selectedVariant?.id === v.id
                    const isSoldOut = vStock === 0
                    return (
                      <button
                        key={v.id}
                        onClick={() => { if (!isSoldOut) { setSelectedVariant(v); setQty(1) } }}
                        disabled={isSoldOut}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          fontSize: '13px', fontWeight: 600,
                          border: isActive ? '2px solid #0F0F0F' : '1.5px solid #E4E1D9',
                          background: isActive ? '#0F0F0F' : 'transparent',
                          color: isActive ? '#fff' : isSoldOut ? '#C8C4BC' : '#0F0F0F',
                          cursor: isSoldOut ? 'not-allowed' : 'pointer',
                          opacity: isSoldOut ? 0.5 : 1,
                          transition: 'all 0.15s',
                          textDecoration: isSoldOut ? 'line-through' : 'none',
                        }}
                      >
                        {v.size}{v.color ? ` / ${v.color}` : ''}
                        {Number(v.price_modifier) !== 0 && (
                          <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '4px' }}>
                            {Number(v.price_modifier) > 0
                              ? `+$${Number(v.price_modifier).toFixed(2)}`
                              : `-$${Math.abs(Number(v.price_modifier)).toFixed(2)}`}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dynamic filters (Size, Color, Material, …) — only those the admin marked visible */}
            {productFilters.filter(f => Number(f.is_visible) !== 0).length > 0 && (
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {productFilters.filter(f => Number(f.is_visible) !== 0).map(f => {
                  if (f.filter_type === 'range') {
                    if (f.min_value == null && f.max_value == null) return null
                    return (
                      <div key={f.filter_id}>
                        <p style={{
                          fontSize: '11px', fontWeight: 600,
                          letterSpacing: '0.15em', textTransform: 'uppercase',
                          color: '#5C5854', marginBottom: '8px',
                        }}>
                          {f.filter_name}
                        </p>
                        <p style={{ fontSize: '14px', color: '#0F0F0F', fontWeight: 600 }}>
                          {f.min_value ?? '—'} – {f.max_value ?? '—'}{f.filter_unit ? ` ${f.filter_unit}` : ''}
                        </p>
                      </div>
                    )
                  }
                  if (!f.options || f.options.length === 0) return null
                  const picked = pickedFilters[f.filter_id]
                  return (
                    <div key={f.filter_id}>
                      <p style={{
                        fontSize: '11px', fontWeight: 600,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: '#5C5854', marginBottom: '10px',
                      }}>
                        {f.filter_name}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {f.options.map(o => {
                          const active     = picked === o.id
                          const qty        = o.quantity
                          const hasQty     = qty != null
                          const soldOut    = hasQty && Number(qty) === 0
                          const customHint = o.hover_text && String(o.hover_text).trim()
                          const tipText    = customHint
                            ? customHint
                            : !hasQty ? null
                              : soldOut ? 'Out of stock'
                              : `${qty} in stock`
                          return (
                            <FilterOptionPill
                              key={o.id}
                              label={`${o.value}${f.filter_unit ? ` ${f.filter_unit}` : ''}`}
                              active={active}
                              soldOut={soldOut}
                              tooltip={tipText}
                              onClick={() => {
                                if (soldOut) return
                                setPickedFilters(s => ({
                                  ...s,
                                  [f.filter_id]: active ? null : o.id,
                                }))
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quantity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5C5854',
              }}>Qty</span>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1.5px solid #E4E1D9', borderRadius: '12px',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{
                    width: '40px', height: '40px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '18px', color: '#0F0F0F',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F2F0EB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >−</button>
                <span style={{
                  width: '44px', textAlign: 'center',
                  fontWeight: 700, fontSize: '14px', color: '#0F0F0F',
                }}>{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(stockQty, q + 1))}
                  disabled={qty >= stockQty || stockQty === 0}
                  style={{
                    width: '40px', height: '40px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none',
                    cursor: qty >= stockQty || stockQty === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    color: qty >= stockQty || stockQty === 0 ? '#C8C4BC' : '#0F0F0F',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (qty < stockQty) e.currentTarget.style.background = '#F2F0EB' }}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >+</button>
              </div>
              {stockQty > 0 && stockQty <= 10 && (
                <span style={{
                  fontSize: '11px', fontWeight: 600,
                  letterSpacing: '0.05em', color: '#D97706',
                  background: '#FFFBEB', padding: '3px 8px', borderRadius: '6px',
                }}>
                  Only {stockQty} left
                </span>
              )}
              {stockQty > 10 && (
                <span style={{ fontSize: '12px', color: '#9C9894' }}>{stockQty} in stock</span>
              )}
            </div>

            {/* Inline hint when filter picks are missing */}
            {!allPicked && (
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FCD34D',
                  color: '#92400E',
                  fontSize: '12px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  fontWeight: 600,
                }}
              >
                Please select: {missingPicks.map(f => f.filter_name).join(', ')}
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
              <button
                onClick={handleAddToCart}
                disabled={adding || stockQty === 0}
                style={{
                  flex: 1,
                  height: '52px',
                  background: stockQty === 0 ? '#E4E1D9' : '#0F0F0F',
                  color: stockQty === 0 ? '#9C9894' : '#fff',
                  border: 'none', borderRadius: '14px',
                  fontSize: '13px', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: stockQty === 0 || adding ? 'not-allowed' : 'pointer',
                  opacity: adding ? 0.7 : 1,
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (stockQty > 0 && !adding) e.currentTarget.style.background = '#2D2D2D' }}
                onMouseLeave={e => { if (stockQty > 0) e.currentTarget.style.background = '#0F0F0F' }}
              >
                {adding ? (
                  <>
                    <svg style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Adding…
                  </>
                ) : stockQty === 0 ? 'Out of Stock' : (
                  <>
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>
              <button
                onClick={handleWishlist}
                style={{
                  width: '52px', height: '52px',
                  borderRadius: '14px',
                  border: isWished ? '2px solid #C0392B' : '1.5px solid #E4E1D9',
                  background: isWished ? '#FEF2F2' : 'transparent',
                  color: isWished ? '#C0392B' : '#9C9894',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  if (!isWished) {
                    e.currentTarget.style.borderColor = '#C0392B'
                    e.currentTarget.style.color = '#C0392B'
                    e.currentTarget.style.background = '#FEF2F2'
                  }
                }}
                onMouseLeave={e => {
                  if (!isWished) {
                    e.currentTarget.style.borderColor = '#E4E1D9'
                    e.currentTarget.style.color = '#9C9894'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <svg style={{ width: 20, height: 20, transition: 'transform 0.2s' }}
                  fill={isWished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>

            {/* Thin rule */}
            <div style={{ height: '1px', background: '#E4E1D9', marginBottom: '24px' }} />

            {/* Trust signals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12L19 8M10 12v4M14 12v4" />,
                  label: 'Free Shipping', sub: 'On orders over $50',
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
                  label: '30-Day Returns', sub: 'Hassle-free returns',
                },
                {
                  icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>,
                  label: 'Secure Payment', sub: 'SSL encrypted checkout',
                },
              ].map(t => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '36px', height: '36px', flexShrink: 0,
                    background: '#F2F0EB', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg style={{ width: 16, height: 16, color: '#5C5854' }}
                      fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      {t.icon}
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F0F0F', margin: 0 }}>{t.label}</p>
                    <p style={{ fontSize: '12px', color: '#9C9894', margin: 0 }}>{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div ref={tabsRef} style={{
        maxWidth: '1280px', margin: '40px auto 0',
        padding: '0 20px', borderBottom: '1px solid #E4E1D9',
      }}>
        <div style={{ display: 'flex', gap: '40px' }}>
          {['description', 'reviews'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                paddingBottom: '14px',
                fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: tab === t ? '#0F0F0F' : '#9C9894',
                border: 'none', borderBottom: tab === t ? '2px solid #0F0F0F' : '2px solid transparent',
                background: 'none', cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {t}{t === 'reviews' && reviews.length > 0 ? ` (${reviews.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* ── Description Tab ───────────────────────────────── */}
      {tab === 'description' && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 20px 0' }}>
          <div style={{
            maxWidth: '640px',
            fontSize: '15px', lineHeight: 1.8, color: '#5C5854',
            fontFamily: "'Figtree', sans-serif",
          }}>
            {product.description || 'No description available.'}
          </div>
        </div>
      )}

      {/* ── Reviews Tab ───────────────────────────────────── */}
      {tab === 'reviews' && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 20px 0' }}>
          <div style={{ maxWidth: '640px' }}>
            {reviews.length === 0 ? (
              <p style={{ color: '#9C9894', fontSize: '14px' }}>No reviews yet. Be the first!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {reviews.map((r, i) => (
                  <div key={r.id} style={{
                    padding: '20px 0',
                    borderBottom: i < reviews.length - 1 ? '1px solid #E4E1D9' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: '#F2F0EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, color: '#5C5854',
                        }}>
                          {r.user_name?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F0F0F' }}>{r.user_name}</span>
                      </div>
                      <StarRating value={r.rating} size="sm" />
                    </div>
                    <p style={{ fontSize: '14px', color: '#5C5854', lineHeight: 1.6, margin: '0 0 6px' }}>{r.comment}</p>
                    <p style={{ fontSize: '11px', color: '#C8C4BC' }}>{new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Review form */}
            <div style={{
              marginTop: '32px', padding: '28px',
              background: '#F2F0EB', borderRadius: '20px',
            }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 400, color: '#0F0F0F', margin: '0 0 20px' }}>
                Write a Review
              </h3>
              <form onSubmit={handleReview}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C5854', marginBottom: '10px' }}>
                    Rating
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setReviewForm(f => ({ ...f, rating: s }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                        <svg style={{ width: 28, height: 28, color: s <= reviewForm.rating ? '#B8922E' : '#D8D4CC', transition: 'color 0.15s' }}
                          fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Share your experience with this product…"
                  required rows={4}
                  style={{
                    width: '100%', border: '1.5px solid #E4E1D9',
                    borderRadius: '12px', padding: '14px 16px',
                    fontSize: '14px', color: '#0F0F0F',
                    background: '#fff', resize: 'none',
                    outline: 'none', fontFamily: "'Figtree', sans-serif",
                    boxSizing: 'border-box', marginBottom: '14px',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0F0F0F'}
                  onBlur={e => e.target.style.borderColor = '#E4E1D9'}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    height: '46px', padding: '0 28px',
                    background: '#0F0F0F', color: '#fff',
                    border: 'none', borderRadius: '12px',
                    fontSize: '12px', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Related Products ──────────────────────────────── */}
      {related.length > 0 && (
        <div style={{
          maxWidth: '1280px', margin: '64px auto 0',
          padding: '0 20px 80px',
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', borderTop: '1px solid #E4E1D9', paddingTop: '48px' }}>
            <div>
              <p style={{
                fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.25em', textTransform: 'uppercase',
                color: '#9C9894', marginBottom: '6px',
              }}>
                You Might Also Like
              </p>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                fontWeight: 400, letterSpacing: '0.03em',
                color: '#0F0F0F', margin: 0, lineHeight: 1,
              }}>
                More from {product.category_name || 'this category'}
              </h2>
            </div>
            <Link
              to={`/shop?category_id=${product.category_id}`}
              style={{
                fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#9C9894', textDecoration: 'none',
                borderBottom: '1px solid #C8C4BC',
                paddingBottom: '2px',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0F0F0F'; e.currentTarget.style.borderBottomColor = '#0F0F0F' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9C9894'; e.currentTarget.style.borderBottomColor = '#C8C4BC' }}
            >
              View All →
            </Link>
          </div>

          {/* Product grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {related.map((p, i) => (
              <div key={p.id} style={{ animation: `fadeIn 0.4s ease both`, animationDelay: `${Math.min(i * 0.06, 0.4)}s` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
