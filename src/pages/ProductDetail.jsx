import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getProduct, getProductReviews, createReview, notifyBackInStock, uploadReviewPhoto, getReviewability } from '../api/productApi'
import { getProductQuestions, askQuestion } from '../api/questionApi'
import { getProductFilters } from '../api/filterApi'
import { addToCartThunk } from '../store/slices/cartSlice'
import { toggleWishlistThunk, selectIsWishlisted, selectWishlistItemId } from '../store/slices/wishlistSlice'
import { selectUser } from '../store/slices/authSlice'
import { useToast } from '../hooks/useToast'
import { useCurrency } from '../context/CurrencyContext'
import StarRating from '../components/common/StarRating'
import Spinner from '../components/ui/Spinner'
import ProductCard from '../components/product/ProductCard'
import FrequentlyBoughtTogether from '../components/product/FrequentlyBoughtTogether'
import BundleCard from '../components/product/BundleCard'
import FlashCountdown from '../components/product/FlashCountdown'
import { ProductDetailSkeleton } from '../components/ui/Skeleton'
import Seo from '../components/common/Seo'
import { getRecentlyViewed, addRecentlyViewed } from '../lib/recentlyViewed'
import { toggleCompare, isInCompare, useCompare, COMPARE_MAX } from '../lib/compare'

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
  const { format }  = useCurrency()
  const user        = useSelector(selectUser)
  const [product, setProduct]     = useState(null)
  const [reviews, setReviews]     = useState([])
  const [reviewPhotos, setReviewPhotos] = useState([])
  const [photoFiles, setPhotoFiles] = useState([])
  const [reviewability, setReviewability] = useState({ status: 'login_required' })
  const [loading, setLoading]     = useState(true)
  const [qty, setQty]             = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [adding, setAdding]       = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [questions, setQuestions]   = useState([])
  const [qText, setQText]           = useState('')
  const [qSubmitting, setQSubmitting] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySent, setNotifySent]   = useState(false)
  const [tab, setTab]             = useState('description')
  const [related, setRelated]     = useState([])
  const [boughtTogether, setBoughtTogether] = useState([])
  const [bundles, setBundles]               = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [zoom, setZoom]           = useState({ on: false, x: 50, y: 50 })
  const [imgLoaded, setImgLoaded] = useState(false)
  const [flashExpired, setFlashExpired] = useState(false)
  const [liveViews, setLiveViews] = useState(0)
  const [stickyVisible, setStickyVisible] = useState(false)
  const [productFilters, setProductFilters] = useState([])
  const [pickedFilters, setPickedFilters]   = useState({}) // { [filter_id]: optionId }
  const tabsRef = useRef(null)
  const scrollRef = useRef(null)

  const scrollTo = (i) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' })
    setActiveImg(i)
  }
  const onCarouselScroll = (e) => {
    const w = e.currentTarget.clientWidth
    if (!w) return
    const i = Math.round(e.currentTarget.scrollLeft / w)
    if (i !== activeImg) setActiveImg(i)
  }

  const isWished = useSelector(selectIsWishlisted(product?.id))
  const wItemId  = useSelector(selectWishlistItemId(product?.id))
  const compareList = useCompare()
  const inCompare   = product?.id && isInCompare(product.id) && compareList.length >= 0

  useEffect(() => {
    setLoading(true)
    setRelated([])
    setBoughtTogether([])
    setBundles([])
    setImgLoaded(false)
    setProductFilters([])
    setPickedFilters({})
    setQuestions([])
    setQText('')
    setFlashExpired(false)
    setReviewPhotos([])
    setPhotoFiles([])
    setReviewability({ status: 'login_required' })
    // Show items viewed *before* this one, then record the current product.
    setRecentlyViewed(getRecentlyViewed().filter(rp => rp.slug !== slug).slice(0, 6))
    getProduct(slug).then(r => {
      const p = r.data.data
      setProduct(p)
      setActiveImg(0)
      setQty(1)
      setZoom({ on: false, x: 50, y: 50 })
      setSelectedVariant((p.variants && p.variants.length > 0) ? p.variants[0] : null)
      if (p?.id) {
        getProductReviews(p.id).then(r2 => {
          setReviews(r2.data.data || [])
          setReviewPhotos(r2.data.photos || [])
        })
        getProductQuestions(p.id).then(rq => setQuestions(rq.data.data || [])).catch(() => setQuestions([]))
        getReviewability(p.id).then(rr => setReviewability(rr.data.data || { status: 'login_required' })).catch(() => {})
        getProductFilters(p.id)
          .then(r3 => setProductFilters(r3.data.data || []))
          .catch(() => setProductFilters([]))
      }
      setRelated(Array.isArray(p.related) ? p.related : [])
      setBoughtTogether(Array.isArray(p.bought_together) ? p.bought_together : [])
      setBundles(Array.isArray(p.bundles) ? p.bundles : [])
      addRecentlyViewed(p)
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

  // Believable "viewers right now" — anchored to the product's real views_count
  // with a small jitter that refreshes every 22s.
  useEffect(() => {
    if (!product?.id) return
    const base = Math.max(3, Math.min(42, Math.floor((Number(product.views_count) || 0) / 30) + 3))
    const tick = () => setLiveViews(base + Math.floor(Math.random() * 5) - 2)
    tick()
    const iv = setInterval(tick, 22000)
    return () => clearInterval(iv)
  }, [product?.id, product?.views_count])

  // Reveal the mobile sticky CTA bar once the shopper has scrolled into the page.
  useEffect(() => {
    const onScroll = () => setStickyVisible(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) return <ProductDetailSkeleton />
  if (!product) return null

  const priceModifier  = selectedVariant ? Number(selectedVariant.price_modifier || 0) : 0
  const basePrice      = Number(product.base_price || 0)
  const salePriceBase  = product.sale_price ? Number(product.sale_price) : null
  const flash          = (product.flash_sale && !flashExpired) ? product.flash_sale : null
  const flashBase      = flash ? Number(flash.flash_price) : null
  const effectiveBase  = flashBase ?? (salePriceBase ?? basePrice)
  const effectivePrice = effectiveBase + priceModifier
  const discount = effectiveBase < basePrice
    ? Math.round((1 - effectiveBase / basePrice) * 100) : null

  // Pre-order: product has a release date in the future. Replaces Add to Cart
  // with a Notify Me flow and disables the quantity controls.
  const releaseDateObj = product.release_date
    ? new Date(String(product.release_date).slice(0, 10) + 'T00:00')
    : null
  const isPreorder = !!releaseDateObj && releaseDateObj > new Date()
  const releaseLabel = isPreorder
    ? releaseDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  // Full media list (images + youtube + uploaded videos) for the gallery.
  // `images` stays as plain image URLs for SEO/JSON-LD.
  const mediaItems = (product.images || []).filter(m => {
    if (typeof m === 'string') return true
    if (m.media_type === 'youtube' || m.media_type === 'video') return !!m.video_url
    return !!m.image_url
  })
  const images = mediaItems
    .filter(m => !m.media_type || m.media_type === 'image')
    .map(m => (typeof m === 'string' ? m : m.image_url))
    .filter(Boolean)

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

  const handleCompare = () => {
    const res = toggleCompare(product)
    if (res.ok && res.action === 'added')   toast.success('Added to compare')
    if (res.ok && res.action === 'removed') toast.info('Removed from compare')
    if (!res.ok && res.reason === 'full')   toast.error(`Compare list is full (max ${COMPARE_MAX})`)
  }

  const handleNotify = async (e) => {
    e.preventDefault()
    if (!notifyEmail.trim()) return
    try {
      const { data } = await notifyBackInStock(product.id, notifyEmail.trim())
      toast.success(data?.message || "We'll let you know!")
      setNotifySent(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not subscribe')
    }
  }

  const handleReview = async (e) => {
    e.preventDefault()
    if (!user) { toast.info('Login to write a review'); return }
    setSubmitting(true)
    try {
      const { data } = await createReview({ product_id: product.id, ...reviewForm })
      const newId = data?.data?.id
      let uploaded = 0
      if (newId && photoFiles.length) {
        for (const f of photoFiles) {
          try {
            const fd = new FormData(); fd.append('photo', f)
            await uploadReviewPhoto(newId, fd)
            uploaded++
          } catch { /* skip the bad file but keep the review */ }
        }
      }
      if (photoFiles.length && uploaded < photoFiles.length) {
        toast.info(`Review submitted · ${uploaded}/${photoFiles.length} photos uploaded`)
      } else {
        toast.success('Review submitted!')
      }
      setReviewForm({ rating: 5, comment: '' })
      setPhotoFiles([])
      const r = await getProductReviews(product.id)
      setReviews(r.data.data || [])
      setReviewPhotos(r.data.photos || [])
      getReviewability(product.id).then(rr => setReviewability(rr.data.data || {})).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review')
    } finally { setSubmitting(false) }
  }

  const photoSrc = (src) => src && (src.startsWith('http') ? src : `/MyShop/backend/${src}`)
  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || [])
    setPhotoFiles(prev => [...prev, ...files].slice(0, 4))
    e.target.value = '' // allow re-selecting the same file
  }

  const handleAskQuestion = async (e) => {
    e.preventDefault()
    if (!user) { toast.info('Login to ask a question'); navigate('/login'); return }
    if (qText.trim().length < 5) { toast.error('Please enter a question (at least 5 characters)'); return }
    setQSubmitting(true)
    try {
      await askQuestion(product.id, qText.trim())
      toast.success('Question submitted! We’ll answer it soon.')
      setQText('')
      const r = await getProductQuestions(product.id)
      setQuestions(r.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit question')
    } finally { setQSubmitting(false) }
  }

  const absImg = (src) => !src ? undefined : (src.startsWith('http') ? src : `${window.location.origin}/MyShop/backend/${src}`)

  return (
    <div className="animate-page-in" style={{ background: '#FAFAF8' }}>
      <Seo
        title={product.name}
        description={(product.description || '').trim().slice(0, 160) || `Buy ${product.name} at MyShop.`}
        image={absImg(images[0])}
        type="product"
        canonical={`${window.location.origin}/products/${product.slug}`}
        jsonLd={{
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.name,
          image: images.map(absImg).filter(Boolean),
          description: product.description || undefined,
          sku: product.sku || undefined,
          category: product.category_name || undefined,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: Number(effectivePrice).toFixed(2),
            availability: stockQty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${window.location.origin}/products/${product.slug}`,
          },
          ...(avgRating > 0 ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: Number(avgRating).toFixed(1),
              reviewCount: reviews.length || 1,
            },
          } : {}),
        }}
      />

      {/* ── Breadcrumb ────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-5 md:px-10 pt-3 md:pt-7 pb-2">
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
      <div className="max-w-screen-xl mx-auto px-5 md:px-10 py-3 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-4 lg:gap-16 items-start">

          {/* ── Media Gallery (sticky) — swipeable carousel + thumbnails ─ */}
          <div className="lg:sticky lg:top-8">
            <div
              className="animate-hero-in relative mx-auto w-full"
              style={{ background: '#EEECE6', borderRadius: 20, overflow: 'hidden' }}
            >
              <div
                ref={scrollRef}
                onScroll={onCarouselScroll}
                className="flex overflow-x-auto snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {mediaItems.map((m, i) => {
                  const isYT  = m.media_type === 'youtube'
                  const isVid = m.media_type === 'video'
                  const isImg = !isYT && !isVid
                  const thumbSrc = typeof m === 'string' ? m : m.image_url
                  const videoSrc = m.video_url
                  return (
                    <div
                      key={i}
                      className="shrink-0 w-full snap-start aspect-[16/10] lg:aspect-square max-h-[30vh] lg:max-h-none relative"
                      style={{ background: '#EEECE6' }}
                    >
                      {isYT && (
                        <iframe
                          src={videoSrc}
                          title={`${product.name} – video ${i + 1}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                        />
                      )}
                      {isVid && (
                        <video
                          src={videoSrc && videoSrc.startsWith('http') ? videoSrc : `/MyShop/backend/${videoSrc}`}
                          controls
                          playsInline
                          preload="metadata"
                          poster={thumbSrc ? imgUrl(thumbSrc) : undefined}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000', display: 'block' }}
                        />
                      )}
                      {isImg && (
                        <img
                          src={imgUrl(thumbSrc)}
                          alt={product.name}
                          loading={i === 0 ? 'eager' : 'lazy'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Discount + Out-of-stock overlays */}
              {discount && (
                <div style={{
                  position: 'absolute', top: 14, left: 14, zIndex: 2,
                  background: '#C0392B', color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '5px 10px', borderRadius: 8,
                  pointerEvents: 'none',
                }}>−{discount}%</div>
              )}
              {stockQty === 0 && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  background: 'rgba(250,250,248,0.6)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <span style={{
                    background: '#0F0F0F', color: '#fff',
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    padding: '10px 20px', borderRadius: 100,
                  }}>Out of Stock</span>
                </div>
              )}

              {/* Page counter pill (mobile) */}
              {mediaItems.length > 1 && (
                <div className="md:hidden" style={{
                  position: 'absolute', right: 12, bottom: 12, zIndex: 2,
                  background: 'rgba(15,15,15,0.78)', color: '#fff',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '4px 10px', borderRadius: 999,
                }}>
                  {Math.min(activeImg + 1, mediaItems.length)} / {mediaItems.length}
                </div>
              )}
            </div>

            {/* Dot indicators (mobile only) */}
            {mediaItems.length > 1 && (
              <div className="md:hidden" style={{
                display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10,
              }}>
                {mediaItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    aria-label={`Go to media ${i + 1}`}
                    style={{
                      width: i === activeImg ? 22 : 7,
                      height: 7,
                      borderRadius: 999,
                      background: i === activeImg ? '#0F0F0F' : '#D4D0CB',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Thumbnails */}
            {mediaItems.length > 1 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, overflowX: 'auto' }}>
                {mediaItems.map((m, i) => {
                  const isVideo = m.media_type === 'youtube' || m.media_type === 'video'
                  const thumb = typeof m === 'string' ? m : m.image_url
                  return (
                    <button
                      key={i}
                      onClick={() => scrollTo(i)}
                      style={{
                        position: 'relative', flexShrink: 0,
                        width: 72, height: 72, borderRadius: 12, overflow: 'hidden',
                        border: `2px solid ${i === activeImg ? '#0F0F0F' : 'transparent'}`,
                        background: '#EEECE6',
                        transition: 'border-color 0.2s',
                        cursor: 'pointer', padding: 0,
                      }}
                    >
                      {thumb ? (
                        <img src={imgUrl(thumb)} alt={`View ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#1A1A1A' }} />
                      )}
                      {isVideo && (
                        <span style={{
                          position: 'absolute', inset: 0, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                        }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg style={{ width: 12, height: 12, marginLeft: 2 }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Product Info ───────────────────────────── */}
          <div style={{ animation: 'slideInRight 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both' }}>

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

            {/* Live activity pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {liveViews > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 600, color: '#5C5854',
                  background: '#F4F2EC', padding: '5px 10px', borderRadius: 999,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#16A34A',
                    animation: 'pulseGlow 1.6s ease-in-out infinite', display: 'inline-block',
                  }} />
                  <span><b style={{ color: '#0F0F0F' }}>{liveViews}</b> viewing now</span>
                </span>
              )}
              {Number(product.views_count) > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 600, color: '#5C5854',
                  background: '#F4F2EC', padding: '5px 10px', borderRadius: 999,
                }}>
                  <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {Number(product.views_count).toLocaleString('en-US')} total views
                </span>
              )}
              {product.is_trending && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: 'linear-gradient(135deg,#F97316 0%,#C0392B 100%)',
                  padding: '5px 10px', borderRadius: 999,
                }}>
                  🔥 Trending now
                </span>
              )}
            </div>

            {/* Thin rule */}
            <div style={{ height: '1px', background: '#E4E1D9', margin: '20px 0' }} />

            {/* Pre-order banner */}
            {isPreorder && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)',
                borderRadius: 14, padding: '14px 18px', marginBottom: '20px', color: '#fff',
              }}>
                <svg style={{ width: 24, height: 24 }} fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M6 2a1 1 0 011 1v1h10V3a1 1 0 112 0v1h1a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zm14 8H4v10h16V10z" clipRule="evenodd" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Pre-order · Coming soon
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700 }}>
                    Available on {releaseLabel}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.85 }}>
                    Drop your email below — we'll let you know the moment it launches.
                  </p>
                </div>
              </div>
            )}

            {/* Flash sale banner */}
            {flash && !isPreorder && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                background: 'linear-gradient(90deg, #C0392B 0%, #9B2D22 100%)',
                borderRadius: 14, padding: '14px 18px', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg style={{ width: 22, height: 22, color: '#fff' }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 00-1.7-.7L3.3 9.3a1 1 0 00.7 1.7H8v6a1 1 0 001.7.7l6-7a1 1 0 00-.7-1.7H11V3z" />
                  </svg>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff' }}>
                      Flash Sale · −{flash.discount_percent}%
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{flash.title}</p>
                  </div>
                </div>
                <FlashCountdown endsAt={flash.ends_at} variant="boxed" onExpire={() => setFlashExpired(true)} />
              </div>
            )}

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#0F0F0F', letterSpacing: '-0.02em' }}>
                {format(effectivePrice)}
              </span>
              {discount && (
                <span style={{ fontSize: '1.1rem', color: '#9C9894', textDecoration: 'line-through' }}>
                  {format(basePrice)}
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
                              ? `+${format(v.price_modifier)}`
                              : `-${format(Math.abs(Number(v.price_modifier)))}`}
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
                disabled={adding || stockQty === 0 || isPreorder}
                style={{
                  flex: 1,
                  height: '52px',
                  background: isPreorder ? '#7C3AED' : stockQty === 0 ? '#E4E1D9' : '#0F0F0F',
                  color: isPreorder ? '#fff' : stockQty === 0 ? '#9C9894' : '#fff',
                  border: 'none', borderRadius: '14px',
                  fontSize: '13px', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: isPreorder || stockQty === 0 || adding ? 'not-allowed' : 'pointer',
                  opacity: adding ? 0.7 : 1,
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (!isPreorder && stockQty > 0 && !adding) e.currentTarget.style.background = '#2D2D2D' }}
                onMouseLeave={e => { if (!isPreorder && stockQty > 0) e.currentTarget.style.background = '#0F0F0F' }}
              >
                {isPreorder ? (
                  <>🗓 Coming {releaseLabel}</>
                ) : adding ? (
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
              <button
                onClick={handleCompare}
                aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
                aria-pressed={inCompare}
                title="Compare"
                style={{
                  width: '52px', height: '52px',
                  borderRadius: '14px',
                  border: inCompare ? '2px solid #0F0F0F' : '1.5px solid #E4E1D9',
                  background: inCompare ? '#0F0F0F' : 'transparent',
                  color: inCompare ? '#FFFFFF' : '#9C9894',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  if (!inCompare) {
                    e.currentTarget.style.borderColor = '#0F0F0F'
                    e.currentTarget.style.color = '#0F0F0F'
                  }
                }}
                onMouseLeave={e => {
                  if (!inCompare) {
                    e.currentTarget.style.borderColor = '#E4E1D9'
                    e.currentTarget.style.color = '#9C9894'
                  }
                }}
              >
                <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h13M3 12h9M3 18h6M17 6l4 3-4 3M21 18l-4-3 4-3" />
                </svg>
              </button>
            </div>

            {/* Notify Me — out of stock OR pre-order */}
            {(stockQty === 0 || isPreorder) && (
              <div style={{
                marginBottom: '24px', padding: '16px', borderRadius: '14px',
                background: isPreorder ? '#F5F3FF' : '#F2F0EB',
                border: isPreorder ? '1px solid #DDD6FE' : 'none',
              }}>
                {notifySent ? (
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#16A34A', margin: 0 }}>
                    {isPreorder
                      ? `✓ We'll email you on ${releaseLabel} — get ready!`
                      : "✓ We'll email you the moment this is back in stock."}
                  </p>
                ) : (
                  <>
                    <p style={{
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: isPreorder ? '#6D28D9' : '#5C5854',
                      marginBottom: '10px',
                    }}>
                      {isPreorder
                        ? `Notify me when available · ${releaseLabel}`
                        : 'Out of stock — get notified'}
                    </p>
                    <form onSubmit={handleNotify} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="email" required
                        value={notifyEmail}
                        onChange={e => setNotifyEmail(e.target.value)}
                        placeholder="your@email.com"
                        style={{ flex: 1, border: '1.5px solid #E4E1D9', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', outline: 'none', background: '#fff', color: '#0F0F0F' }}
                      />
                      <button type="submit" style={{
                        background: isPreorder ? '#7C3AED' : '#0F0F0F',
                        color: '#fff', border: 'none', borderRadius: '10px',
                        padding: '0 20px', fontSize: '13px', fontWeight: 700,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                        Notify Me
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

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

      {/* ── Bundle Deals ──────────────────────────────────── */}
      {bundles.length > 0 && (
        <div style={{ maxWidth: 1280, margin: '8px auto 0', padding: '0 20px' }}>
          <div style={{ borderTop: '1px solid #E4E1D9', paddingTop: 48 }}>
            <p style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.25em',
              textTransform: 'uppercase', color: '#9C9894', marginBottom: 6,
            }}>
              Save With a Bundle
            </p>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
              fontWeight: 400, letterSpacing: '0.03em',
              color: '#0F0F0F', margin: '0 0 24px', lineHeight: 1,
            }}>
              {bundles.length === 1 ? 'Bundle Deal' : 'Bundle Deals'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bundles.map(b => (
                <BundleCard key={b.id} bundle={b} currentProductId={product.id} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Frequently Bought Together ────────────────────── */}
      <FrequentlyBoughtTogether
        current={product}
        items={boughtTogether}
        currentAddable={!hasVariants && visibleFilters.length === 0 && Number(product.stock_qty || 0) > 0}
      />

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div ref={tabsRef} style={{
        maxWidth: '1280px', margin: '40px auto 0',
        padding: '0 20px', borderBottom: '1px solid #E4E1D9',
      }}>
        <div style={{ display: 'flex', gap: '40px' }}>
          {['description', 'reviews', 'qa'].map(t => {
            const label = t === 'qa' ? 'Q&A' : t
            const count = t === 'reviews' ? reviews.length : t === 'qa' ? questions.length : 0
            return (
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
                {label}{count > 0 ? ` (${count})` : ''}
              </button>
            )
          })}
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
            {reviewPhotos.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <p style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: '#9C9894', marginBottom: '10px',
                }}>
                  Photos from customers · {reviewPhotos.length}
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                  gap: 8,
                }}>
                  {reviewPhotos.map((p, i) => (
                    <a key={i} href={photoSrc(p.image_url)} target="_blank" rel="noopener noreferrer"
                      title={`From ${p.reviewer_name}`}
                      style={{
                        display: 'block', aspectRatio: '1/1', borderRadius: 10,
                        overflow: 'hidden', background: '#EEECE6',
                      }}>
                      <img src={photoSrc(p.image_url)} alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
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
                          overflow: 'hidden',
                        }}>
                          {r.avatar_url
                            ? <img src={r.avatar_url.startsWith('http') ? r.avatar_url : `/MyShop/backend/${r.avatar_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (r.reviewer_name?.[0]?.toUpperCase() || '?')}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F0F0F' }}>{r.reviewer_name}</span>
                      </div>
                      <StarRating value={r.rating} size="sm" />
                    </div>
                    <p style={{ fontSize: '14px', color: '#5C5854', lineHeight: 1.6, margin: '0 0 6px' }}>{r.body || r.comment}</p>
                    {r.photos && r.photos.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 8px' }}>
                        {r.photos.map((url, idx) => (
                          <a key={idx} href={photoSrc(url)} target="_blank" rel="noopener noreferrer"
                            style={{
                              width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
                              background: '#EEECE6', display: 'block',
                            }}>
                            <img src={photoSrc(url)} alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </a>
                        ))}
                      </div>
                    )}
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
              {reviewability.status === 'login_required' && (
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', color: '#0F0F0F', margin: '0 0 6px' }}>Want to write a review?</p>
                  <p style={{ fontSize: 14, color: '#5C5854', margin: 0 }}>
                    <Link to="/login" style={{ color: '#C0392B', fontWeight: 600 }}>Sign in</Link> to share your experience.
                  </p>
                </div>
              )}
              {reviewability.status === 'no_purchase' && (
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', color: '#0F0F0F', margin: '0 0 6px' }}>Reviews are for customers</p>
                  <p style={{ fontSize: 14, color: '#5C5854', margin: 0 }}>
                    You can leave a review once you've received a delivered order for this product.
                  </p>
                </div>
              )}
              {reviewability.status === 'already_reviewed' && (
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', color: '#0F0F0F', margin: '0 0 6px' }}>Thanks for your review!</p>
                  <p style={{ fontSize: 14, color: '#5C5854', margin: 0 }}>
                    You've already reviewed this product. We appreciate it.
                  </p>
                </div>
              )}
              {reviewability.status === 'allowed' && (
              <>
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

                {/* Photo upload */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: photoFiles.length > 0 ? 10 : 0 }}>
                    {photoFiles.map((f, idx) => (
                      <div key={idx} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', background: '#EEECE6' }}>
                        <img src={URL.createObjectURL(f)} alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setPhotoFiles(prev => prev.filter((_, i) => i !== idx))}
                          aria-label="Remove photo"
                          style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'rgba(15,15,15,0.75)', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            fontSize: 12, lineHeight: 1, padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>×</button>
                      </div>
                    ))}
                    {photoFiles.length < 4 && (
                      <label style={{
                        width: 72, height: 72, borderRadius: 10,
                        border: '1.5px dashed #C8C4BC', background: '#FAFAF8',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 2, cursor: 'pointer', color: '#9C9894',
                      }}>
                        <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>Photo</span>
                        <input type="file" accept="image/*" multiple onChange={onPickPhotos} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#9C9894', margin: 0 }}>
                    Add up to 4 photos (JPEG, PNG, WebP — max 5 MB each).
                  </p>
                </div>
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
              </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Q&A Tab ───────────────────────────────────────── */}
      {tab === 'qa' && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 20px 0' }}>
          <div style={{ maxWidth: '720px' }}>

            {/* Ask a question */}
            <div style={{ padding: '24px', background: '#F2F0EB', borderRadius: '20px', marginBottom: '28px' }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 400, color: '#0F0F0F', margin: '0 0 6px' }}>
                Have a question?
              </h3>
              <p style={{ fontSize: '13px', color: '#9C9894', margin: '0 0 16px' }}>
                Ask anything about this product — we’ll answer it here for everyone.
              </p>
              <form onSubmit={handleAskQuestion}>
                <textarea
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  placeholder={user ? 'Type your question…' : 'Log in to ask a question'}
                  rows={3}
                  required
                  style={{
                    width: '100%', border: '1.5px solid #E4E1D9', borderRadius: '12px',
                    padding: '14px 16px', fontSize: '14px', color: '#0F0F0F',
                    background: '#fff', resize: 'none', outline: 'none',
                    fontFamily: "'Figtree', sans-serif", boxSizing: 'border-box', marginBottom: '12px',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0F0F0F'}
                  onBlur={e => e.target.style.borderColor = '#E4E1D9'}
                />
                <button
                  type="submit"
                  disabled={qSubmitting}
                  style={{
                    height: '46px', padding: '0 28px',
                    background: '#0F0F0F', color: '#fff', border: 'none', borderRadius: '12px',
                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: qSubmitting ? 'not-allowed' : 'pointer', opacity: qSubmitting ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {qSubmitting ? 'Submitting…' : 'Ask Question'}
                </button>
              </form>
            </div>

            {/* Questions list */}
            {questions.length === 0 ? (
              <p style={{ color: '#9C9894', fontSize: '14px' }}>No questions yet. Be the first to ask!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ padding: '20px 0', borderBottom: i < questions.length - 1 ? '1px solid #E4E1D9' : 'none' }}>
                    {/* Question */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{
                        width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                        background: '#0F0F0F', color: '#fff', fontSize: '12px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>Q</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', color: '#0F0F0F', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>{q.question}</p>
                        <p style={{ fontSize: '11px', color: '#C8C4BC', marginTop: '4px' }}>
                          {q.asker_name} · {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Answer */}
                    {q.answer ? (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', marginLeft: '0' }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                          background: '#C0392B', color: '#fff', fontSize: '12px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>A</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', color: '#5C5854', lineHeight: 1.6, margin: 0 }}>{q.answer}</p>
                          <p style={{ fontSize: '11px', color: '#C8C4BC', marginTop: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#9C9894', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store</span>
                            {q.answered_at ? ` · ${new Date(q.answered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p style={{
                        marginTop: '10px', marginLeft: '36px', display: 'inline-block',
                        fontSize: '11px', fontWeight: 600, color: '#B8922E',
                        background: '#FFFBEB', padding: '4px 10px', borderRadius: '6px',
                      }}>
                        Awaiting an answer
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
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

      {/* ── Recently Viewed ───────────────────────────────── */}
      {recentlyViewed.length > 0 && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', borderTop: '1px solid #E4E1D9', paddingTop: '48px' }}>
            <div>
              <p style={{
                fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.25em', textTransform: 'uppercase',
                color: '#9C9894', marginBottom: '6px',
              }}>
                Keep Exploring
              </p>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                fontWeight: 400, letterSpacing: '0.03em',
                color: '#0F0F0F', margin: 0, lineHeight: 1,
              }}>
                Recently Viewed
              </h2>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {recentlyViewed.map((p, i) => (
              <div key={p.id} style={{ animation: 'fadeIn 0.4s ease both', animationDelay: `${Math.min(i * 0.06, 0.4)}s` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile sticky add-to-cart bar ─────────────────── */}
      <div
        className="md:hidden fixed left-0 right-0 z-30 transition-transform duration-300"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)',
          transform: stickyVisible ? 'translateY(0)' : 'translateY(110%)',
          background: '#fff',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 -6px 18px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
          <img
            src={imgUrl(images[0])}
            alt=""
            style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', background: '#EEECE6', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: '#0F0F0F', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.name}
            </p>
            <p style={{ fontSize: 14, color: '#0F0F0F', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              {format(effectivePrice)}
              {discount && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: '#9C9894', textDecoration: 'line-through' }}>
                  {format(basePrice)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={adding || stockQty === 0 || isPreorder}
            style={{
              height: 42, padding: '0 18px', flexShrink: 0,
              background: isPreorder ? '#7C3AED' : stockQty === 0 ? '#E4E1D9' : '#0F0F0F',
              color: isPreorder ? '#fff' : stockQty === 0 ? '#9C9894' : '#fff',
              border: 'none', borderRadius: 12,
              fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: isPreorder || stockQty === 0 || adding ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {isPreorder ? 'Pre-order' : adding ? 'Adding…' : stockQty === 0 ? 'Out' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
