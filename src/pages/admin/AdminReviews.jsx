import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAdminReviews } from '../../api/adminApi'
import { deleteReview } from '../../api/productApi'
import { useToast } from '../../hooks/useToast'
import StarRating from '../../components/common/StarRating'
import Spinner from '../../components/ui/Spinner'

const photoSrc = (src) => src && (src.startsWith('http') ? src : `/MyShop/backend/${src}`)
const fmt = (ts) => new Date(String(ts).replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function AdminReviews() {
  const toast = useToast()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch]     = useState('')
  const [minRating, setMinRating] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    getAdminReviews({ page, limit: 15, search: search || undefined, min_rating: minRating || undefined })
      .then(r => {
        setItems(r.data.data || [])
        setTotalPages(r.data.meta?.last_page || 1)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [page, search, minRating])

  useEffect(() => { load() }, [load])

  const remove = async (r) => {
    if (!confirm(`Delete this ${r.rating}-star review of "${r.product_name}"?`)) return
    try {
      await deleteReview(r.id)
      setItems(list => list.filter(x => x.id !== r.id))
      toast.success('Review deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete')
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">Reviews</h1>
          <p className="text-sm text-ink-tertiary mt-1">Every customer review across the store. Filter by keyword or rating; delete to remove anything inappropriate.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search product or reviewer…"
            className="text-sm rounded-xl px-3 py-2 outline-none border border-border bg-white text-ink focus:border-ink w-56 transition-colors"
          />
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-black/5">
            {[0, 5, 4, 3, 2, 1].map(r => (
              <button
                key={r}
                onClick={() => { setMinRating(r); setPage(1) }}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${minRating === r ? 'bg-ink text-white' : 'text-ink-tertiary hover:text-ink'}`}
              >
                {r === 0 ? 'All' : `${r}★+`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 py-16 text-center">
          <p className="text-ink-secondary font-semibold">No reviews match your filter.</p>
          <p className="text-sm text-ink-tertiary mt-1">Try clearing the search or rating filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-black/5 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link to={`/products/${r.product_slug}`} className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary hover:text-ink transition-colors">
                    {r.product_name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating value={r.rating} size="sm" />
                    {r.title && <span className="text-sm font-bold text-ink">{r.title}</span>}
                  </div>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    {r.reviewer_name} <span className="opacity-50">·</span> {r.reviewer_email} <span className="opacity-50">·</span> {fmt(r.created_at)}
                  </p>
                </div>
                <button onClick={() => remove(r)} aria-label="Delete review" className="text-ink-tertiary hover:text-accent transition-colors p-1 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {r.body && <p className="text-sm text-ink-secondary leading-relaxed mt-3">{r.body}</p>}
              {r.photos && r.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.photos.map((url, i) => (
                    <a key={i} href={photoSrc(url)} target="_blank" rel="noopener noreferrer"
                      className="w-16 h-16 rounded-lg overflow-hidden bg-surface-alt block">
                      <img src={photoSrc(url)} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-border disabled:opacity-40 text-ink">Prev</button>
              <span className="text-xs text-ink-tertiary">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-border disabled:opacity-40 text-ink">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
