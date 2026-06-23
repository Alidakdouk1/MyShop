import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchWishlist, toggleWishlistThunk, selectWishlistItems } from '../../store/slices/wishlistSlice'
import { addToCartThunk } from '../../store/slices/cartSlice'
import { useToast } from '../../hooks/useToast'
import { resolveImg } from '../../lib/img'
import EmptyState from '../../components/common/EmptyState'
import {
  getWishlistShare, enableWishlistShare, disableWishlistShare,
} from '../../api/userApi'
import Badge from '../../components/ui/Badge'

export default function Wishlist() {
  const dispatch = useDispatch()
  const toast    = useToast()
  const items    = useSelector(selectWishlistItems)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareToken, setShareToken] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { dispatch(fetchWishlist()) }, [dispatch])

  const openShare = async () => {
    setShareOpen(true)
    setShareLoading(true)
    try {
      const r = await getWishlistShare()
      setShareToken(r.data.data?.token || null)
    } catch { /* ignore */ }
    finally { setShareLoading(false) }
  }

  const enableShare = async () => {
    setShareLoading(true)
    try {
      const r = await enableWishlistShare()
      setShareToken(r.data.data.token)
      toast.success('Sharing enabled')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setShareLoading(false) }
  }

  const disableShare = async () => {
    if (!confirm('Anyone with the old link will no longer be able to view your wishlist. Continue?')) return
    setShareLoading(true)
    try {
      await disableWishlistShare()
      setShareToken(null)
      toast.success('Sharing disabled')
    } catch { toast.error('Failed') }
    finally { setShareLoading(false) }
  }

  const shareUrl = shareToken ? `${window.location.origin}/wishlist/${shareToken}` : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy')
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) { copyLink(); return }
    try {
      await navigator.share({
        title: 'My Wishlist',
        text:  'Check out my wishlist on Pick&Go LB',
        url:   shareUrl,
      })
    } catch { /* user dismissed */ }
  }

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
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <h1 className="hero-display text-4xl text-ink tracking-wide">MY WISHLIST</h1>
        {items.length > 0 && (
          <button
            onClick={openShare}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Share
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          accent="lime"
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here. We'll keep your picks safe for later."
          primary={{   label: "Find something to love", to: "/shop" }}
          secondary={{ label: "Browse categories",      to: "/categories" }}
        />
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
            const stockQty = Number(item.stock_qty ?? item.available_stock ?? 1)
            const outOfStock = stockQty <= 0
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
                  {outOfStock && (
                    /* Auto-watch is already happening on the backend when the
                       item was wishlisted — this badge just tells the customer
                       it's covered so they don't tap "Notify me" twice. */
                    <div
                      className="absolute bottom-2 left-2 right-2 inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                      style={{ background: 'rgba(0,216,200,0.92)', color: '#0F172A', backdropFilter: 'blur(4px)' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      We'll alert you
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
                    disabled={outOfStock}
                    className={`w-full mt-2 text-xs font-semibold py-2 rounded-lg transition-colors ${
                      outOfStock
                        ? 'bg-surface-alt text-ink-tertiary cursor-not-allowed'
                        : 'bg-ink text-white hover:bg-ink/80'
                    }`}
                  >
                    {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {shareOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShareOpen(false) }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6"
            style={{ animation: 'pop-in 0.22s var(--ease-out-back)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink text-lg">Share your wishlist</h2>
              <button
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {shareLoading && !shareToken ? (
              <p className="text-sm text-ink-tertiary py-8 text-center">Loading…</p>
            ) : !shareToken ? (
              <>
                <p className="text-sm text-ink-secondary leading-relaxed mb-5">
                  Send your wishlist to friends and family — they'll be able to view your items and buy them as a gift. They won't need an account.
                </p>
                <button
                  onClick={enableShare}
                  disabled={shareLoading}
                  className="shine w-full bg-ink text-white font-bold text-sm py-3 rounded-xl hover:bg-ink/90 transition-colors disabled:opacity-60"
                >
                  {shareLoading ? 'Enabling…' : 'Enable Sharing'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-tertiary mb-2">Your share link</p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 text-xs font-mono px-3 py-2.5 rounded-xl border border-border bg-surface-alt text-ink outline-none"
                  />
                  <button
                    onClick={copyLink}
                    className="text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors whitespace-nowrap"
                  >
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={nativeShare}
                    className="w-full inline-flex items-center justify-center gap-2 bg-surface-alt text-ink font-semibold text-sm py-3 rounded-xl hover:bg-border transition-colors mb-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                    </svg>
                    Share via…
                  </button>
                )}

                <div className="border-t border-border pt-4 mt-2">
                  <p className="text-[11px] text-ink-tertiary leading-relaxed mb-3">
                    Anyone with this link can see your wishlist. Disable sharing to invalidate the link.
                  </p>
                  <button
                    onClick={disableShare}
                    disabled={shareLoading}
                    className="w-full text-xs font-bold uppercase tracking-wider text-accent hover:bg-accent-light py-2.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    Disable Sharing
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
