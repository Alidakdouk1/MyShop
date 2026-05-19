import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts, getCategoriesFlat } from '../api/productApi'
import ProductGrid from '../components/product/ProductGrid'
import ProductFilters from '../components/product/ProductFilters'
import Pagination from '../components/common/Pagination'

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, currentPage: 1 })
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filters = {
    search:      searchParams.get('search')      || '',
    category_id: searchParams.get('category_id') || '',
    sort:        searchParams.get('sort')         || 'newest',
    on_sale:     searchParams.get('on_sale')      || '',
    price_min:   searchParams.get('price_min')    || '',
    price_max:   searchParams.get('price_max')    || '',
    in_stock:    searchParams.get('in_stock')     === '1',
    page:        parseInt(searchParams.get('page')) || 1,
    limit:       20,
  }

  const applyFilters = useCallback((newFilters) => {
    const params = {}
    Object.entries({ ...filters, ...newFilters }).forEach(([k, v]) => {
      if (v !== '' && v !== false && v !== undefined && v !== null) params[k] = String(v)
    })
    setSearchParams(params)
  }, [searchParams]) // eslint-disable-line

  useEffect(() => {
    getCategoriesFlat().then(r => setCategories(r.data.data || []))
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
  }, [searchParams.toString()])

  return (
    <div
      className="max-w-screen-xl mx-auto px-4 flex flex-col"
      style={{ height: 'calc(100dvh - 96px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between py-6 shrink-0">
        <div>
          <h1 className="hero-display text-4xl text-ink tracking-wide">
            {filters.search ? `"${filters.search}"` : 'All Products'}
          </h1>
          {!loading && <p className="text-sm text-ink-tertiary mt-1">{meta.total} results</p>}
        </div>
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className="lg:hidden flex items-center gap-2 border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M10 12h4" />
          </svg>
          Filters
        </button>
      </div>

      <div className="flex gap-8 flex-1 min-h-0 overflow-hidden">
        {/* Sidebar filters — desktop, scrolls independently */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0">
          <div className="bg-surface rounded-2xl border border-border p-5 overflow-y-auto flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary mb-4">Filter & Sort</p>
            <ProductFilters filters={filters} onChange={applyFilters} categories={categories} />
          </div>
        </aside>

        {/* Mobile filter drawer */}
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

        {/* Products — scrolls independently */}
        <div className="flex-1 min-w-0 overflow-y-auto pb-8 pr-1">
          {/* Active filter chips */}
          {(filters.search || filters.category_id || filters.on_sale || filters.price_min || filters.price_max) && (
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
              <button onClick={() => setSearchParams({})} className="text-xs text-accent font-semibold hover:underline">
                Clear all
              </button>
            </div>
          )}

          <ProductGrid products={products} loading={loading} cols={4} />
          <Pagination currentPage={meta.currentPage} totalPages={meta.totalPages}
            onPageChange={p => applyFilters({ page: p })} />
        </div>
      </div>
    </div>
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
