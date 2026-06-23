import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAds, getMarketplaceSettings } from '../api/marketplaceApi'
import { AD_CATEGORIES } from '../lib/marketplace'
import { useCurrency } from '../context/CurrencyContext'
import { resolveImg } from '../lib/img'
import EmptyState from '../components/common/EmptyState'
import { ProductGridSkeleton } from '../components/ui/Skeleton'
import Seo from '../components/common/Seo'

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''

export default function Marketplace() {
  const [params, setParams] = useSearchParams()
  const { format } = useCurrency()
  const [ads, setAds]       = useState([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta]     = useState({ total: 0, page: 1, last_page: 1 })
  const [categories, setCategories] = useState(AD_CATEGORIES)

  useEffect(() => {
    getMarketplaceSettings()
      .then(r => {
        const c = r.data.data?.categories
        if (Array.isArray(c) && c.length) setCategories(c)
      })
      .catch(() => {})
  }, [])

  const search   = params.get('search')   || ''
  const category = params.get('category') || ''
  const page     = parseInt(params.get('page')) || 1

  useEffect(() => {
    setLoading(true)
    getAds({ search, category, page, limit: 24 })
      .then(r => {
        setAds(r.data.data?.ads || [])
        setMeta(r.data.data?.meta || { total: 0, page: 1, last_page: 1 })
      })
      .catch(() => setAds([]))
      .finally(() => setLoading(false))
  }, [search, category, page])

  const setFilter = (patch) => {
    const next = { search, category, ...patch }
    const clean = {}
    Object.entries(next).forEach(([k, v]) => { if (v) clean[k] = String(v) })
    setParams(clean)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <Seo title="Marketplace" canonical={ORIGIN ? `${ORIGIN}/marketplace` : undefined} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="hero-display text-4xl text-ink tracking-wide">MARKETPLACE</h1>
          <p className="text-sm text-ink-tertiary mt-1">Buy &amp; sell with people near you.</p>
        </div>
        <Link
          to="/marketplace/post"
          className="cta-glow inline-flex items-center gap-2 text-white font-bold text-sm px-5 py-3 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Post an Ad
        </Link>
      </div>

      {/* Search + category filter */}
      <div className="mb-5 space-y-3">
        <div className="relative max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setFilter({ search: e.target.value, page: '' })}
            placeholder="Search ads…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-surface text-ink outline-none focus:border-ink transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <Chip active={!category} onClick={() => setFilter({ category: '', page: '' })}>All</Chip>
          {categories.map(c => (
            <Chip key={c} active={category === c} onClick={() => setFilter({ category: c, page: '' })}>{c}</Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : ads.length === 0 ? (
        <EmptyState
          title="No ads here yet"
          description={search || category ? 'Try a different search or category.' : 'Be the first to post something for sale.'}
          primary={{ label: 'Post an Ad', to: '/marketplace/post' }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ads.map(ad => {
              const img = ad.images?.[0] ? resolveImg(ad.images[0]) : 'https://placehold.co/400/F2F0EB/9C9894?text=No+Photo'
              return (
                <Link key={ad.id} to={`/marketplace/${ad.id}`}
                  className="group bg-surface rounded-2xl overflow-hidden border hover:shadow-lg transition-all"
                  style={ad.is_featured == 1 ? { borderColor: 'rgba(184,146,46,0.5)' } : undefined}>
                  <div className="relative aspect-square overflow-hidden bg-surface-alt">
                    <img src={img} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
                    {ad.is_featured == 1 && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md text-white"
                        style={{ background: 'linear-gradient(135deg, #B8922E 0%, #D4AF37 100%)' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-ink text-sm">
                      {ad.price != null ? format(ad.price) : 'Contact for price'}
                    </p>
                    <p className="text-sm text-ink-secondary line-clamp-2 mt-0.5 leading-snug">{ad.title}</p>
                    {ad.location && (
                      <p className="text-[11px] text-ink-tertiary mt-1.5 inline-flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {ad.location}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>

          {meta.last_page > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: meta.last_page }).map((_, i) => (
                <button key={i} onClick={() => setFilter({ page: i + 1 })}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold ${page === i + 1 ? 'bg-ink text-white' : 'bg-surface border border-border text-ink-secondary'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
      style={active ? { background: '#0F172A', color: '#fff' } : { background: '#F2F0EB', color: '#5C5854' }}>
      {children}
    </button>
  )
}
