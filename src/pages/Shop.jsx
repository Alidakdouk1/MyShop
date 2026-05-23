import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts, getCategoriesFlat, getCategorySections } from '../api/productApi'
import { getHomepageSettings } from '../api/adminApi'
import ProductGrid from '../components/product/ProductGrid'
import ProductFilters from '../components/product/ProductFilters'
import CategoryBar from '../components/product/CategoryBar'
import Pagination from '../components/common/Pagination'

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('/')) return url
  return `/MyShop/backend/${url}`
}

const DEFAULT_SHOP = {
  banner: {
    title:           'All Products',
    subtitle:        '',
    bg_color:        '',
    bg_image:        '',
    text_color:      '#0F0F0F',
    side_image:      '',
    overlay_opacity: 0.4,
  },
  grid: {
    cols:        4,
    mobile_cols: 2,
    card_shape:  'rounded',
  },
  sort: {
    default_sort: 'newest',
    per_page:     20,
  },
  card: {
    show_rating:    true,
    show_quick_add: true,
    show_badges:    true,
    image_ratio:    '3/4',
  },
  empty_state: {
    icon:     '🛍️',
    title:    'No products found',
    subtitle: 'Try adjusting your filters',
  },
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products,     setProducts]     = useState([])
  const [categories,   setCategories]   = useState([])
  const [catSections,  setCatSections]  = useState([])
  const [meta,         setMeta]         = useState({ total: 0, totalPages: 1, currentPage: 1 })
  const [loading,      setLoading]      = useState(true)
  const [filtersOpen,  setFiltersOpen]  = useState(false)
  const [shopSettings, setShopSettings] = useState(DEFAULT_SHOP)

  const filters = {
    search:      searchParams.get('search')      || '',
    category_id: searchParams.get('category_id') || '',
    sort:        searchParams.get('sort')         || shopSettings.sort.default_sort || 'newest',
    on_sale:     searchParams.get('on_sale')      || '',
    price_min:   searchParams.get('price_min')    || '',
    price_max:   searchParams.get('price_max')    || '',
    in_stock:    ['1', 'true'].includes(searchParams.get('in_stock') ?? ''),
    filters:     searchParams.get('filters')      || '',
    page:        parseInt(searchParams.get('page')) || 1,
    per_page:    Number(shopSettings.sort.per_page) || 20,
  }
  // Per-filter range params (e.g. f_3_min, f_3_max) pass through transparently
  searchParams.forEach((v, k) => {
    if (/^f_\d+_(min|max)$/.test(k)) filters[k] = v
  })

  const applyFilters = useCallback((newFilters) => {
    const params = {}
    Object.entries({ ...filters, ...newFilters }).forEach(([k, v]) => {
      if (v !== '' && v !== false && v !== undefined && v !== null) params[k] = String(v)
    })
    setSearchParams(params)
  }, [searchParams]) // eslint-disable-line

  useEffect(() => {
    getCategoriesFlat().then(r => setCategories(r.data.data || []))
    getCategorySections().then(r => setCatSections(r.data.data || [])).catch(() => setCatSections([]))
    getHomepageSettings()
      .then(res => {
        const d = res.data?.data || {}
        if (d.shop_page) {
          setShopSettings(prev => ({
            banner:      { ...prev.banner,      ...(d.shop_page.banner      || {}) },
            grid:        { ...prev.grid,        ...(d.shop_page.grid        || {}) },
            sort:        { ...prev.sort,        ...(d.shop_page.sort        || {}) },
            card:        { ...prev.card,        ...(d.shop_page.card        || {}) },
            empty_state: { ...prev.empty_state, ...(d.shop_page.empty_state || {}) },
          }))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '' && v !== false && v !== undefined)
    )
    getProducts(params).then(r => {
      setProducts(r.data.data || [])
      setMeta({
        total:       r.data.meta?.total        || 0,
        totalPages:  r.data.meta?.last_page    || 1,
        currentPage: r.data.meta?.current_page || 1,
      })
    }).catch(() => setProducts([])).finally(() => setLoading(false))
  }, [searchParams.toString(), shopSettings.sort.per_page, shopSettings.sort.default_sort])

  const banner      = shopSettings.banner
  const grid        = shopSettings.grid
  const card        = shopSettings.card
  const emptyState  = shopSettings.empty_state
  const hasBannerBg = !!(banner.bg_image || banner.bg_color)

  return (
    <>
      {/* ── Category row — full-width bar flush under the search header ── */}
      <CategoryBar
        categories={categories}
        sections={catSections}
        activeId={filters.category_id}
        onSelect={(id) => applyFilters({ category_id: id, page: 1 })}
      />

      <div className="max-w-screen-xl mx-auto px-4 flex flex-col">
      {/* ── Banner / Header ─────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden shrink-0 flex items-center justify-between gap-4 ${
          hasBannerBg ? 'rounded-2xl my-4' : 'py-6'
        }`}
        style={hasBannerBg ? {
          ...(banner.bg_image ? {
            backgroundImage:    `url("${imgSrc(banner.bg_image)}")`,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
            backgroundRepeat:   'no-repeat',
          } : {
            backgroundColor: banner.bg_color,
          }),
          padding:   '20px 28px',
          minHeight: '120px',
        } : {}}
      >
        {/* Dark overlay for bg image readability */}
        {banner.bg_image && (
          <div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{ opacity: banner.overlay_opacity ?? 0.4 }}
          />
        )}

        {/* Left: title + subtitle + count */}
        <div className="relative z-10 flex-1 min-w-0">
          <h1
            className="hero-display text-4xl tracking-wide"
            style={{ color: banner.text_color || '#0F0F0F' }}
          >
            {filters.search ? `"${filters.search}"` : (banner.title || 'All Products')}
          </h1>
          {!filters.search && banner.subtitle && (
            <p
              className="text-sm mt-0.5"
              style={{ color: (banner.text_color || '#5C5854') + 'aa' }}
            >
              {banner.subtitle}
            </p>
          )}
          {!loading && (
            <p
              className="text-sm mt-1"
              style={{ color: hasBannerBg ? (banner.text_color || '#ffffff') + '99' : '#9C9894' }}
            >
              {meta.total} results
            </p>
          )}
        </div>

        {/* Right: side image (hidden on very small screens) */}
        {banner.side_image && !filters.search && (
          <div className="relative z-10 shrink-0 hidden sm:block">
            <img
              src={imgSrc(banner.side_image)}
              alt=""
              className="max-h-28 w-auto object-contain"
            />
          </div>
        )}

        {/* Mobile filter button — always rightmost */}
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className={`relative z-10 lg:hidden flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shrink-0 ${
            hasBannerBg
              ? 'border-white/30 text-white bg-white/10 hover:bg-white/20'
              : 'border-border hover:bg-surface-alt'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M10 12h4" />
          </svg>
          Filters
        </button>
      </div>

      <div className="flex gap-8">
        {/* ── Sidebar filters — desktop ────────────────────────── */}
        <aside className="hidden lg:block w-60 shrink-0 sticky top-24 self-start max-h-[calc(100vh-96px)] overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-border p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary mb-4">Filter</p>
            <ProductFilters filters={filters} onChange={applyFilters} categories={categories} />
          </div>
        </aside>

        {/* ── Mobile filter drawer ─────────────────────────────── */}
        {filtersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
            <div className="relative bg-surface w-72 h-full p-5 overflow-y-auto animate-slide-down ml-auto shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <p className="font-bold text-ink">Filters</p>
                <button onClick={() => setFiltersOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-alt">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ProductFilters
                filters={filters}
                onChange={(f) => { applyFilters(f); setFiltersOpen(false) }}
                categories={categories}
              />
            </div>
          </div>
        )}

        {/* ── Products ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 pb-8 pr-1">
          {/* Sort By dropdown */}
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <SortDropdown
              value={filters.sort}
              onChange={(v) => applyFilters({ sort: v, page: 1 })}
            />
            {!loading && (
              <span className="text-sm text-ink-tertiary">
                {meta.total} {meta.total === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          {/* Active filter chips */}
          {(filters.search || filters.category_id || filters.on_sale || filters.price_min || filters.price_max || filters.filters) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.search && (
                <Chip label={`Search: "${filters.search}"`} onRemove={() => applyFilters({ search: '', page: 1 })} />
              )}
              {filters.category_id && (
                <Chip
                  label={categories.find(c => c.id == filters.category_id)?.name || 'Category'}
                  onRemove={() => applyFilters({ category_id: '', page: 1 })}
                />
              )}
              {filters.on_sale && (
                <Chip label="On Sale" onRemove={() => applyFilters({ on_sale: '', page: 1 })} />
              )}
              {(filters.price_min || filters.price_max) && (
                <Chip
                  label={`$${filters.price_min || '0'} – $${filters.price_max || '∞'}`}
                  onRemove={() => applyFilters({ price_min: '', price_max: '', page: 1 })}
                />
              )}
              {filters.filters && (
                <Chip
                  label={`${filters.filters.split(';').reduce((n, p) => n + (p.split(':')[1]?.split(',').length || 0), 0)} filter${filters.filters.split(';').reduce((n, p) => n + (p.split(':')[1]?.split(',').length || 0), 0) === 1 ? '' : 's'}`}
                  onRemove={() => applyFilters({ filters: '', page: 1 })}
                />
              )}
              <button onClick={() => setSearchParams({})} className="text-xs text-accent font-semibold hover:underline">
                Clear all
              </button>
            </div>
          )}

          <ProductGrid
            products={products}
            loading={loading}
            cols={grid.cols}
            mobileCols={grid.mobile_cols}
            cardShape={grid.card_shape}
            cardSettings={card}
            emptyState={emptyState}
          />
          <Pagination
            currentPage={meta.currentPage}
            totalPages={meta.totalPages}
            onPageChange={p => applyFilters({ page: p })}
          />
        </div>
      </div>
      </div>
    </>
  )
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1 text-xs font-medium text-ink">
      {label}
      <button onClick={onRemove} className="text-ink-tertiary hover:text-ink transition-colors leading-none">×</button>
    </span>
  )
}

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommend' },
  { value: 'bestselling', label: 'Most Popular' },
  { value: 'newest',      label: 'New Arrivals' },
  { value: 'rating',      label: 'Top Rated' },
  { value: 'price_asc',   label: 'Price Low to High' },
  { value: 'price_desc',  label: 'Price High to Low' },
]

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = SORT_OPTIONS.find(o => o.value === value) || SORT_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 text-sm transition-colors
          ${open ? 'bg-surface-alt border-ink' : 'bg-surface border-border hover:bg-surface-alt'}`}
      >
        <span className="text-ink-tertiary">Sort By</span>
        <span className="font-bold text-ink">{current.label}</span>
        <svg
          className={`w-3.5 h-3.5 text-ink transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-60 bg-surface border border-border rounded-xl shadow-xl py-2 animate-slide-down">
          {SORT_OPTIONS.map(o => {
            const active = o.value === value
            return (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors
                  ${active ? 'text-ink font-bold bg-surface-alt/60' : 'text-ink-secondary hover:bg-surface-alt'}`}
              >
                <span>{o.label}</span>
                {active && (
                  <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
