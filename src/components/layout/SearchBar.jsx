import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts, getCategoriesFlat } from '../../api/productApi'
import { getRecentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } from '../../lib/recentSearches'

// Categories rarely change — fetch once and share across every SearchBar instance.
let _catCache = null

function highlight(text = '', q = '') {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i === -1) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-accent font-semibold">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

const imgOf = (p) => {
  const raw = p.primary_image || p.main_image
  return raw
    ? (raw.startsWith('http') ? raw : `/MyShop/backend/${raw}`)
    : 'https://placehold.co/80x80/F2F0EB/9C9894?text=P'
}

export default function SearchBar({
  className = '',
  enableShortcut = false,
  placeholder = 'Search products…',
  autoFocus = false,
  overlay = false,
  onClose,
}) {
  const navigate = useNavigate()
  const [query, setQuery]       = useState('')
  const [products, setProducts] = useState([])
  const [cats, setCats]         = useState(_catCache || [])
  const [open, setOpen]         = useState(overlay)
  const [loading, setLoading]   = useState(false)
  const [active, setActive]     = useState(-1)
  const [recent, setRecent]     = useState([])
  const rootRef  = useRef(null)
  const inputRef = useRef(null)

  const q = query.trim()

  useEffect(() => {
    if (_catCache) { setCats(_catCache); return }
    getCategoriesFlat()
      .then(r => { _catCache = r.data.data || []; setCats(_catCache) })
      .catch(() => {})
  }, [])

  // Instant, local category matches — no network per keystroke.
  const catMatches = useMemo(() => {
    if (q.length < 2) return []
    const lc = q.toLowerCase()
    return cats.filter(c => c.name?.toLowerCase().includes(lc)).slice(0, 3)
  }, [q, cats])

  // Debounced product suggestions.
  useEffect(() => {
    if (q.length < 2) { setProducts([]); setLoading(false); return }
    setLoading(true)
    const t = setTimeout(() => {
      getProducts({ search: q, limit: 6 })
        .then(r => setProducts(r.data.data || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  // Reset highlight whenever the result set changes.
  useEffect(() => { setActive(-1) }, [q, products.length, catMatches.length])

  // Overlay opens immediately and locks focus; dropdown opens on focus.
  useEffect(() => {
    if (overlay) { setOpen(true); setRecent(getRecentSearches()) }
  }, [overlay])

  useEffect(() => { if (autoFocus) inputRef.current?.focus() }, [autoFocus])

  useEffect(() => {
    if (overlay) return // overlay is dismissed by its own container, not outside-click
    const onClick = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [overlay])

  useEffect(() => {
    if (!enableShortcut) return
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setRecent(getRecentSearches())
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enableShortcut])

  // Flat, keyboard-navigable list: categories first, then products.
  const items = useMemo(() => ([
    ...catMatches.map(c => ({ kind: 'category', key: `c${c.id}`, label: c.name, to: `/shop?category_id=${c.id}` })),
    ...products.map(p => ({ kind: 'product', key: `p${p.id}`, product: p, to: `/products/${p.slug}` })),
  ]), [catMatches, products])

  const close = () => { setOpen(false); setActive(-1) }
  const reset = () => { setQuery(''); setProducts([]); close() }

  const go = (to, term) => {
    if (term) addRecentSearch(term)
    reset()
    onClose?.()
    navigate(to)
  }

  const submit = (e) => {
    e?.preventDefault?.()
    if (!q) return
    go(`/shop?search=${encodeURIComponent(q)}`, q)
  }

  const onFocus = () => { setRecent(getRecentSearches()); setOpen(true) }

  const showRecent  = open && q.length < 2 && recent.length > 0
  const showResults = open && q.length >= 2
  const showHint    = open && q.length < 2 && recent.length === 0
  const showPanel   = showRecent || showResults

  const onKeyDown = (e) => {
    if (!open) return
    const seeAll = items.length // index of the "see all" row
    if (e.key === 'ArrowDown')      { e.preventDefault(); setActive(a => Math.min(a + 1, seeAll)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    else if (e.key === 'Enter') {
      if (active >= 0 && active < items.length) {
        e.preventDefault()
        const it = items[active]
        go(it.to, it.kind === 'product' ? q : null)
      } else {
        submit(e)
      }
    } else if (e.key === 'Escape') { overlay ? onClose?.() : close() }
  }

  const inputEl = (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showPanel}
        aria-autocomplete="list"
        className="w-full bg-surface-alt border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm
          text-ink placeholder-ink-tertiary outline-none
          focus:bg-white focus:border-ink focus:ring-2 focus:ring-ink/10 transition-all"
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary"
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {loading && (
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary animate-spin"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      )}
    </div>
  )

  const panelBody = (
    <>
      {/* Recent searches (empty query) */}
      {showRecent && (
        <div className="py-1">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">Recent</span>
            <button
              type="button"
              onClick={() => { clearRecentSearches(); setRecent([]) }}
              className="text-[11px] font-semibold text-ink-tertiary hover:text-accent transition-colors"
            >
              Clear
            </button>
          </div>
          {recent.map(term => (
            <div key={term} className="group flex items-center gap-3 px-3 py-2 hover:bg-surface-alt transition-colors">
              <button
                type="button"
                onClick={() => go(`/shop?search=${encodeURIComponent(term)}`, term)}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                <svg className="w-4 h-4 text-ink-tertiary shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-ink line-clamp-1">{term}</span>
              </button>
              <button
                type="button"
                aria-label={`Remove ${term}`}
                onClick={() => { removeRecentSearch(term); setRecent(getRecentSearches()) }}
                className="opacity-0 group-hover:opacity-100 text-ink-tertiary hover:text-accent transition-all p-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hint when there's nothing to show yet (overlay) */}
      {showHint && (
        <div className="px-4 py-10 text-center">
          <svg className="w-8 h-8 mx-auto text-ink-tertiary mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm text-ink-secondary">Search for products and categories</p>
          <p className="text-xs text-ink-tertiary mt-1">Type at least 2 characters</p>
        </div>
      )}

      {/* Category matches */}
      {showResults && catMatches.length > 0 && (
        <div className="py-1 border-b border-border">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">Categories</div>
          {catMatches.map((c, idx) => (
            <button
              key={`c${c.id}`}
              type="button"
              onMouseEnter={() => setActive(idx)}
              onClick={() => go(`/shop?category_id=${c.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${active === idx ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`}
            >
              <span className="w-9 h-9 rounded-lg bg-surface-alt flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-ink-secondary" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 text-sm text-ink line-clamp-1">{highlight(c.name, q)}</span>
              <span className="text-[11px] text-ink-tertiary shrink-0">in Category</span>
            </button>
          ))}
        </div>
      )}

      {/* Product matches */}
      {showResults && products.length > 0 && (
        <div className="py-1">
          {catMatches.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">Products</div>
          )}
          {products.map((p, idx) => {
            const i = catMatches.length + idx
            const price = p.sale_price || p.base_price || p.price || 0
            return (
              <button
                key={`p${p.id}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(`/products/${p.slug}`, q)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${active === i ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`}
              >
                <img src={imgOf(p)} alt="" className="w-10 h-10 rounded-lg object-cover bg-surface-alt shrink-0" />
                <span className="flex-1 min-w-0 text-sm font-medium text-ink line-clamp-1">{highlight(p.name, q)}</span>
                <span className="text-sm font-bold text-ink shrink-0">${Number(price).toFixed(2)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {showResults && !loading && items.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-ink-secondary">No matches for <span className="font-semibold text-ink">“{q}”</span></p>
          <p className="text-xs text-ink-tertiary mt-1">Try a different keyword.</p>
        </div>
      )}

      {/* See all */}
      {showResults && (
        <button
          type="button"
          onMouseEnter={() => setActive(items.length)}
          onClick={submit}
          className={`w-full text-center text-xs font-bold text-accent py-3 border-t border-border transition-colors ${active === items.length ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`}
        >
          See all results for “{q}”
        </button>
      )}
    </>
  )

  // ── Full-screen overlay layout (mobile) ──────────────────────────────
  if (overlay) {
    return (
      <div className="flex flex-col h-full bg-surface">
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border shrink-0">
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close search"
            className="p-2 rounded-xl hover:bg-surface-alt text-ink shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <form onSubmit={submit} className="flex-1">{inputEl}</form>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{panelBody}</div>
      </div>
    )
  }

  // ── Inline dropdown layout (desktop + mobile menu) ───────────────────
  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <form onSubmit={submit}>{inputEl}</form>
      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-slide-down">
          {panelBody}
        </div>
      )}
    </div>
  )
}
