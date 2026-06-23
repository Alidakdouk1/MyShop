import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getReels, recordReelView, getReelSettings } from '../api/reelsApi'
import { addToCartThunk } from '../store/slices/cartSlice'
import { toggleWishlistThunk, selectIsWishlisted, selectWishlistItemId } from '../store/slices/wishlistSlice'
import { selectUser } from '../store/slices/authSlice'
import { useToast } from '../hooks/useToast'
import { useCurrency } from '../context/CurrencyContext'
import { useAddedToCart } from '../context/AddedToCartContext'
import { resolveImg } from '../lib/img'
import { heartBurst } from '../lib/heartBurst'
import Seo from '../components/common/Seo'
import ReelComments from '../components/reels/ReelComments'

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''

// Resolve any video URL: full http(s) stays untouched (YouTube embed), local
// uploads get the backend prefix.
function resolveVideo(url) {
  if (!url) return ''
  return /^https?:\/\//.test(url) ? url : `/MyShop/backend/${url}`
}

// Pull a YouTube ID out of an embed URL so we can build a proper iframe src
// with autoplay + mute + no controls for the reel viewport.
function ytId(url) {
  const m = String(url || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)
  return m ? m[1] : null
}

// "1.2K" / "11K" / "1.3M" — keeps the view chip compact when counts grow.
function formatViews(n) {
  const v = Number(n) || 0
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K'
  return String(v)
}

export default function Reels() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user     = useSelector(selectUser)
  const toast    = useToast()
  const { format } = useCurrency()
  const addedToCart = useAddedToCart()

  const [reels,   setReels]   = useState([])
  const [loading, setLoading] = useState(true)
  // Admin-configurable settings; sensible defaults until they load.
  const [settings, setSettings] = useState({
    enabled: 1, autoplay: 1, default_muted: 1, loop: 1,
    show_comments: 1, show_view_count: 1, show_share: 1, items_per_load: 24,
  })
  const [muted,   setMuted]   = useState(true)
  // Which reel's comments drawer is currently open. null = no drawer.
  const [openCommentsFor, setOpenCommentsFor] = useState(null)
  const containerRef = useRef(null)

  // Keep per-reel comment_count in sync when the user adds/deletes from the drawer.
  const updateCommentCount = (reelId, nextCount) => {
    setReels(prev => prev.map(r => r.reel_id === reelId ? { ...r, comment_count: nextCount } : r))
  }

  useEffect(() => {
    // Load settings first, then fetch reels with the configured page size.
    getReelSettings()
      .then(r => {
        const s = r.data.data || {}
        setSettings(s)
        setMuted(!!Number(s.default_muted))
        return getReels({ limit: Number(s.items_per_load) || 24 })
      })
      .then(r => setReels(r?.data?.data?.reels || []))
      .catch(() => {
        // Settings failed — still try a default fetch so reels aren't blank.
        getReels({ limit: 24 }).then(r => setReels(r.data.data?.reels || [])).catch(() => setReels([]))
      })
      .finally(() => setLoading(false))
  }, [])

  // Restore the scroll position the user left from when they tapped "View" on a
  // reel and then came back. We snap (no smooth) so they land instantly on the
  // same reel instead of watching the feed scroll past everything.
  useEffect(() => {
    if (loading || reels.length === 0) return
    const saved = Number(sessionStorage.getItem('reels_scroll') || 0)
    if (saved > 0 && containerRef.current) {
      // Wait one frame so the slides have laid out at full height.
      requestAnimationFrame(() => {
        if (containerRef.current) containerRef.current.scrollTop = saved
      })
    }
  }, [loading, reels.length])

  // Persist scroll position as the user scrolls so we can restore it on return.
  const handleScroll = (e) => {
    sessionStorage.setItem('reels_scroll', String(e.currentTarget.scrollTop))
  }

  // Only the currently visible reel plays. Pause the others to save CPU /
  // battery and to stop overlapping audio. Also fires a view-count POST after
  // the slide has stayed visible for 2 seconds — anything shorter is a scroll-
  // through and shouldn't pad the count.
  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    // Track per-slide "in-view" timers so we only count one view per visit.
    const timers   = new Map()   // reel_id -> setTimeout id
    const counted  = new Set()   // reel_ids already counted this session

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          const el  = e.target
          const rid = el.dataset.reelId
          const v   = el.querySelector('video')

          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            // Respect the admin autoplay setting + the user's manual pause:
            // a slide tagged data-user-paused stays paused even while visible.
            if (v) {
              v.muted = muted
              if (Number(settings.autoplay) && el.dataset.userPaused !== '1') {
                v.play().catch(() => {})
              }
            }
            // Start the 2s view timer if we haven't counted it yet.
            if (rid && !counted.has(rid) && !timers.has(rid)) {
              timers.set(rid, setTimeout(() => {
                counted.add(rid)
                recordReelView(rid).catch(() => {})
                timers.delete(rid)
              }, 2000))
            }
          } else {
            if (v) v.pause()
            // Bailed before 2s — cancel the pending count.
            if (rid && timers.has(rid)) {
              clearTimeout(timers.get(rid))
              timers.delete(rid)
            }
          }
        })
      },
      { root, threshold: [0, 0.6, 1] }
    )
    root.querySelectorAll('[data-reel-slide]').forEach(el => observer.observe(el))
    return () => {
      observer.disconnect()
      timers.forEach(t => clearTimeout(t))
    }
  }, [reels, muted, settings.autoplay])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height:                  '100dvh',
        background:              '#000',
        overflowY:               'scroll',
        scrollSnapType:          'y mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth:          'none',
      }}
    >
      <Seo title="Reels" canonical={ORIGIN ? `${ORIGIN}/reels` : undefined} />
      <style>{`
        [data-reel-scroll]::-webkit-scrollbar { display: none; }
      `}</style>

      {loading && (
        <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <p style={{ fontSize: 14, opacity: 0.6 }}>Loading reels…</p>
        </div>
      )}

      {!loading && !Number(settings.enabled) && (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🎬</p>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Reels are currently off</p>
          <p style={{ fontSize: 13, opacity: 0.6, margin: '8px 0 18px' }}>Check back soon.</p>
          <Link to="/shop" style={{ background: 'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)', color: '#fff', textDecoration: 'none', padding: '12px 28px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Browse Shop
          </Link>
        </div>
      )}

      {!loading && Number(settings.enabled) && reels.length === 0 && (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🎬</p>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>No reels yet</p>
          <p style={{ fontSize: 13, opacity: 0.6, margin: '8px 0 18px' }}>
            Admins can upload videos on any product to make it appear here.
          </p>
          <Link
            to="/shop"
            style={{
              background: 'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)',
              color: '#fff', textDecoration: 'none',
              padding: '12px 28px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            Browse Shop
          </Link>
        </div>
      )}

      {Number(settings.enabled) === 1 && reels.map(reel => (
        <ReelSlide
          key={reel.reel_id}
          reel={reel}
          settings={settings}
          muted={muted}
          onToggleMute={() => setMuted(m => !m)}
          onOpenComments={() => setOpenCommentsFor(reel.reel_id)}
          onAddedToCart={addedToCart.show}
          dispatch={dispatch}
          user={user}
          toast={toast}
          format={format}
          navigate={navigate}
        />
      ))}

      <ReelComments
        reelId={openCommentsFor}
        open={openCommentsFor !== null}
        onClose={() => setOpenCommentsFor(null)}
        onCountChange={(n) => updateCommentCount(openCommentsFor, n)}
      />
    </div>
  )
}

function ReelSlide({ reel, settings = {}, muted, onToggleMute, onOpenComments, onAddedToCart, dispatch, user, toast, format, navigate }) {
  const isVideo = reel.media_type === 'video'
  const yt      = !isVideo ? ytId(reel.video_url) : null
  const price   = Number(reel.sale_price || reel.base_price || 0)
  const poster  = reel.poster ? resolveImg(reel.poster) : null
  const main    = reel.main_image ? resolveImg(reel.main_image) : poster
  const isWished = useSelector(selectIsWishlisted(reel.product_id))
  const wItemId  = useSelector(selectWishlistItemId(reel.product_id))
  const [adding, setAdding] = useState(false)
  const [paused, setPaused] = useState(false)
  const videoRef  = useRef(null)
  const slideRef  = useRef(null)

  // Tap anywhere on the video to pause/resume. We set data-user-paused on the
  // slide so the IntersectionObserver in the parent won't auto-resume a video
  // the user deliberately paused.
  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setPaused(false)
      if (slideRef.current) slideRef.current.dataset.userPaused = '0'
    } else {
      v.pause()
      setPaused(true)
      if (slideRef.current) slideRef.current.dataset.userPaused = '1'
    }
  }

  const handleAdd = async (e) => {
    if (!user) { toast.info('Login to add to cart'); navigate('/login'); return }
    setAdding(true)
    const r = await dispatch(addToCartThunk({ product_id: reel.product_id, quantity: 1 }))
    setAdding(false)
    if (!r.error) {
      onAddedToCart({ product: { id: reel.product_id, name: reel.product_name, base_price: reel.base_price, sale_price: reel.sale_price }, qty: 1, image: main })
    } else toast.error(r.payload || 'Could not add')
  }

  const handleWish = async (e) => {
    if (!user) { toast.info('Login to save items'); return }
    const btn = e.currentTarget
    const wasWished = isWished
    await dispatch(toggleWishlistThunk({ productId: reel.product_id, wishlistItemId: isWished ? wItemId : null }))
    if (!wasWished) heartBurst(btn)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/products/${reel.product_slug}`
    if (navigator.share) {
      try { await navigator.share({ title: reel.product_name, url }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); toast.success('Link copied') } catch {}
    }
  }

  return (
    <div
      ref={slideRef}
      data-reel-slide
      data-reel-id={reel.reel_id}
      data-user-paused="0"
      style={{
        position:        'relative',
        height:          '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop:  'always',
        background:      '#000',
        overflow:        'hidden',
      }}
    >
      {/* Media layer */}
      {yt ? (
        <iframe
          src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3`}
          title={reel.product_name}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', border: 0,
            // Cover-style scale for full-bleed look on portrait viewports.
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <video
          ref={videoRef}
          src={resolveVideo(reel.video_url)}
          poster={poster || undefined}
          loop={Number(settings.loop) !== 0}
          muted={muted}
          playsInline
          preload="metadata"
          onClick={togglePlay}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            background: '#000',
            cursor: 'pointer',
          }}
        />
      )}

      {/* Dark gradient at the bottom to keep overlay copy readable */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 35%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Center play icon — shown only while the user has paused this video.
          Tapping it (or the video) resumes. Pointer-events none so the tap
          falls through to the video's onClick. */}
      {isVideo && paused && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute', inset: 0, zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            animation: 'scaleIn 0.18s ease both',
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      )}

      {/* Top-left: pinned + view count badges */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 5, display: 'flex', gap: 8 }}>
        {reel.is_pinned == 1 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(163,255,18,0.95)', color: '#0F172A',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '4px 8px', borderRadius: 999,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
            Pinned
          </span>
        )}
        {Number(settings.show_view_count) !== 0 && Number(reel.view_count || 0) > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', color: '#fff',
            fontSize: 11, fontWeight: 700,
            padding: '4px 8px', borderRadius: 999,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            {formatViews(reel.view_count)}
          </span>
        )}
      </div>

      {/* Top-right: mute toggle */}
      {isVideo && (
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 5,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
            border: 'none', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {muted
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          }
        </button>
      )}

      {/* Right-rail actions: wish + share */}
      <div
        style={{
          position: 'absolute', right: 14, bottom: 200, zIndex: 5,
          display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={handleWish}
          aria-label="Wishlist"
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <span style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: isWished ? '#FF456B' : '#fff',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isWished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>
            </svg>
          </span>
        </button>

        {Number(settings.show_comments) !== 0 && (
        <button
          type="button"
          onClick={onOpenComments}
          aria-label={`Comments${reel.comment_count ? ` (${reel.comment_count})` : ''}`}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <span style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </span>
          {Number(reel.comment_count || 0) > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              {reel.comment_count}
            </span>
          )}
        </button>
        )}

        {Number(settings.show_share) !== 0 && (
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share"
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <span style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </span>
        </button>
        )}
      </div>

      {/* Bottom-left: product card overlay */}
      <div
        style={{
          position: 'absolute', left: 16, right: 80, bottom: 'calc(80px + env(safe-area-inset-bottom))',
          zIndex: 5, color: '#fff',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>
          {reel.category_name || 'Product'}
        </p>
        <h2 style={{ margin: '4px 0 8px', fontSize: 22, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          {reel.product_name}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em' }}>
            {format(price)}
          </span>
          {reel.sale_price && Number(reel.sale_price) < Number(reel.base_price) && (
            <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.55, textDecoration: 'line-through' }}>
              {format(Number(reel.base_price))}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || Number(reel.stock_qty) <= 0}
            style={{
              flex: 1.4, height: 46, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: Number(reel.stock_qty) <= 0
                ? 'rgba(255,255,255,0.18)'
                : 'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)',
              color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              boxShadow: '0 8px 24px -8px rgba(0,216,200,0.55)',
            }}
          >
            {Number(reel.stock_qty) <= 0 ? 'Out of stock' : adding ? 'Adding…' : 'Add to cart'}
          </button>
          <Link
            to={`/products/${reel.product_slug}`}
            style={{
              height: 46, padding: '0 18px',
              borderRadius: 999, border: '1.5px solid rgba(255,255,255,0.5)',
              color: '#fff', textDecoration: 'none', background: 'rgba(0,0,0,0.25)',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            View
          </Link>
        </div>
      </div>
    </div>
  )
}
