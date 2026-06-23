import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCategories } from '../api/productApi'
import { getProducts } from '../api/productApi'
import { useCurrency } from '../context/CurrencyContext'
import Seo from '../components/common/Seo'
import ImageSearchModal from '../components/search/ImageSearchModal'

/**
 * Alibaba-style browse-by-category landing page.
 *
 * Layout:
 *   ┌────────┬──────────────────────────────┐
 *   │  For   │  ┌──────── banner ───────┐   │
 *   │  you   │  └───────────────────────┘   │
 *   │ Women  │  Subcategories (circular)    │
 *   │  Men   │  ●  ●  ●                     │
 *   │ Kids   │                              │
 *   │  ...   │  Recommendations grid        │
 *   │        │  [tile] [tile]               │
 *   └────────┴──────────────────────────────┘
 *
 * Left menu is sticky on desktop, simply scrollable on mobile. Selecting a
 * category fetches its top products; "For you" shows trending across the catalog.
 */

const imgUrl = (src) => {
  if (!src) return null
  if (src.startsWith('http')) return src
  return `/MyShop/backend/${src}`
}

// Tiny placeholder when a category has no image.
const PLACEHOLDER = (label) =>
  `https://placehold.co/200x200/F2F0EB/9C9894?text=${encodeURIComponent(label?.slice(0, 8) || '?')}`

const FOR_YOU = { id: 0, name: 'For you', slug: 'for-you', children: [] }

export default function Categories() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { format } = useCurrency()

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingProds, setLoadingProds] = useState(true)
  const [imgSearchOpen, setImgSearchOpen] = useState(false)

  // Active category id from URL — defaults to "For you" (id=0).
  const activeId = Number(searchParams.get('cat') || 0)

  // Load all categories once.
  useEffect(() => {
    getCategories()
      .then(r => setCategories(r.data.data || []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false))
  }, [])

  // Re-load products whenever the active category changes.
  useEffect(() => {
    setLoadingProds(true)
    const params = activeId
      ? { category_id: activeId, sort: 'popular', limit: 12 }
      : { sort: 'popular', limit: 12 }
    getProducts(params)
      .then(r => setProducts(r.data.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProds(false))
  }, [activeId])

  // Top-level categories for the left menu (skip children — they appear as
  // circular tiles on the right when the parent is selected).
  const topLevel = useMemo(
    () => [FOR_YOU, ...categories.filter(c => !c.parent_id)],
    [categories]
  )

  const activeCategory = activeId
    ? categories.find(c => c.id === activeId)
    : FOR_YOU
  const subcategories = activeCategory?.children || []

  const selectCategory = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('cat', String(id))
    else next.delete('cat')
    setSearchParams(next, { replace: true })
    // Scroll right column back to the top on category change.
    rightColRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const rightColRef = useRef(null)

  return (
    <div style={{ background: '#F0EEE9', minHeight: '100vh' }}>
      <Seo title="Categories" />

      {/* Top bar — title only; the rest of the navbar lives in <Layout /> */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E4E1D9',
        padding: '14px 16px',
      }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A',
          letterSpacing: '-0.01em',
        }}>
          Categories
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', minHeight: 'calc(100vh - 56px)' }}
           className="categories-layout">
        {/* ── Left vertical menu ──────────────────────────── */}
        <aside style={{
          background: '#FAFAF8', borderRight: '1px solid #E4E1D9',
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          maxHeight: 'calc(100vh - 56px - 68px)',  /* 68 = mobile bottom nav */
          position: 'sticky', top: 0,
        }}>
          {loadingCats ? (
            // Skeletons keep the layout stable while the API responds.
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 56, margin: 8, borderRadius: 8, background: '#EEECE6' }} />
            ))
          ) : (
            topLevel.map(c => {
              const active = c.id === activeId
              return (
                <button
                  key={c.id}
                  onClick={() => selectCategory(c.id)}
                  style={{
                    width: '100%', textAlign: 'start',
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#0F172A' : '#5C5854',
                    fontWeight: active ? 700 : 500,
                    fontSize: 12, lineHeight: 1.3,
                    padding: '14px 8px', cursor: 'pointer',
                    border: 'none', position: 'relative',
                    transition: 'background 0.15s',
                  }}
                >
                  {active && (
                    <span style={{
                      position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
                      background: '#00D1C1', borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  {c.name}
                </button>
              )
            })
          )}
        </aside>

        {/* ── Right content ────────────────────────────────── */}
        <div ref={rightColRef} style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Hero banner — local-stock messaging like Alibaba's */}
          <div style={{ padding: '12px 12px 0' }}>
            <div style={{
              borderRadius: 12, padding: '14px 16px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#fff',
            }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 800,
                letterSpacing: '-0.01em',
              }}>
                Local stock
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#A3FF12' }}>✓</span> Fastest delivery in 5 days
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#A3FF12' }}>✓</span> No import charges
              </p>
            </div>
          </div>

          {/* Search by image — tile that opens the Vision modal */}
          <div style={{ padding: '10px 12px 0' }}>
            <button
              onClick={() => setImgSearchOpen(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(0,209,193,0.10) 0%, rgba(163,255,18,0.08) 100%)',
                border: '1px solid rgba(0,209,193,0.30)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, borderRadius: 10,
                background: '#fff', color: '#0AAFA3', flexShrink: 0,
                boxShadow: '0 2px 6px rgba(15,23,42,0.06)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                  Search by image
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#5C5854' }}>
                  Snap a photo and find similar products instantly.
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" data-rtl-flip>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Subcategories — circular tiles, only when a parent is selected */}
          {subcategories.length > 0 && (
            <div style={{ padding: '14px 12px 0' }}>
              <p style={{
                fontSize: 13, fontWeight: 800, color: '#0F172A',
                margin: '0 0 10px',
              }}>
                {activeCategory.name} categories
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {subcategories.map(s => (
                  <Link
                    key={s.id}
                    to={`/shop?category_id=${s.id}`}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '10px 4px',
                      textDecoration: 'none', color: '#0F172A',
                    }}
                  >
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: s.image_url ? `url(${imgUrl(s.image_url)}) center/cover` : '#F2F0EB',
                      border: '2px solid #fff',
                      boxShadow: '0 4px 12px rgba(15,15,15,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#9C9894',
                    }}>
                      {!s.image_url && (s.name?.slice(0, 2).toUpperCase())}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, textAlign: 'center',
                      lineHeight: 1.2, color: '#0F0F0F',
                    }}>
                      {s.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations / top products grid */}
          <div style={{ padding: '16px 12px 80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Recommendations
              </p>
              {activeId > 0 && (
                <Link to={`/shop?category_id=${activeId}`}
                  style={{
                    fontSize: 11, fontWeight: 700, color: '#00D1C1',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                  Browse all →
                </Link>
              )}
            </div>

            {loadingProds ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    aspectRatio: '1/1.4',
                    background: '#EEECE6', borderRadius: 10,
                    animation: 'pg-cat-skeleton 1.4s ease-in-out infinite alternate',
                  }} />
                ))}
                <style>{`@keyframes pg-cat-skeleton { from { opacity: 0.55; } to { opacity: 1; } }`}</style>
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9C9894' }}>
                <p style={{ margin: 0, fontSize: 13 }}>No products in this category yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {products.map(p => {
                  const sale     = Number(p.sale_price || 0)
                  const base     = Number(p.base_price || p.price || 0)
                  const onSale   = sale > 0 && sale < base
                  const showPrice = onSale ? sale : base
                  const img = p.primary_image
                    ? imgUrl(p.primary_image)
                    : PLACEHOLDER(p.name)
                  return (
                    <Link
                      key={p.id}
                      to={`/products/${p.slug}`}
                      style={{
                        display: 'block', textDecoration: 'none', color: 'inherit',
                        background: '#fff', borderRadius: 10, overflow: 'hidden',
                        border: '1px solid #E4E1D9',
                      }}
                    >
                      <div style={{ aspectRatio: '1/1', background: `#EEECE6 url(${img}) center/cover` }} />
                      <div style={{ padding: '8px 10px 10px' }}>
                        <p style={{
                          margin: 0, fontSize: 12, color: '#0F172A',
                          fontWeight: 600, lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {p.name}
                        </p>
                        <p style={{
                          margin: '6px 0 0', fontSize: 13, fontWeight: 800, color: '#0F0F0F',
                          letterSpacing: '-0.01em',
                        }}>
                          {format(showPrice)}
                          {onSale && (
                            <span style={{
                              marginLeft: 6, fontSize: 10, fontWeight: 500,
                              color: '#9C9894', textDecoration: 'line-through',
                            }}>
                              {format(base)}
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Larger left menu on desktop — gives parent names more room. */}
      <style>{`
        @media (min-width: 768px) {
          .categories-layout { grid-template-columns: 200px 1fr !important; }
          .categories-layout aside button { padding: 16px 14px !important; font-size: 13px !important; }
        }
      `}</style>

      <ImageSearchModal open={imgSearchOpen} onClose={() => setImgSearchOpen(false)} />
    </div>
  )
}
