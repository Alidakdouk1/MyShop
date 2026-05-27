import { useState, useEffect, useCallback } from 'react'
import { getFlashSales, createFlashSale, deleteFlashSale } from '../../api/flashApi'
import { getProducts } from '../../api/productApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

function saleStatus(s) {
  const now   = Date.now()
  const start = new Date(String(s.starts_at).replace(' ', 'T')).getTime()
  const end   = new Date(String(s.ends_at).replace(' ', 'T')).getTime()
  if (now < start) return { label: 'Scheduled', bg: '#EFF6FF', color: '#0284C7' }
  if (now >= end)  return { label: 'Ended',     bg: '#F4F4F4', color: '#9C9894' }
  return { label: 'Active', bg: '#F0FDF4', color: '#16A34A' }
}

const fmt = (ts) => new Date(String(ts).replace(' ', 'T')).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})

export default function AdminFlashSales() {
  const toast = useToast()
  const [sales, setSales]     = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle]       = useState('')
  const [percent, setPercent]   = useState(20)
  const [startsAt, setStartsAt] = useState(toLocalInput(new Date()))
  const [endsAt, setEndsAt]     = useState(toLocalInput(new Date(Date.now() + 86400000)))
  const [selected, setSelected] = useState([]) // [{id, name}]
  const [search, setSearch]     = useState('')
  const [results, setResults]   = useState([])
  const [saving, setSaving]     = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getFlashSales()
      .then(r => setSales(r.data.data || []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Debounced product search for the picker.
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      getProducts({ search: q, limit: 12 })
        .then(r => setResults(r.data.data || []))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const toggleProduct = (p) => {
    setSelected(sel => sel.some(x => x.id === p.id)
      ? sel.filter(x => x.id !== p.id)
      : [...sel, { id: p.id, name: p.name }])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim())          return toast.error('Enter a title')
    if (percent <= 0 || percent > 95) return toast.error('Discount must be 1–95%')
    if (selected.length === 0)  return toast.error('Select at least one product')
    if (new Date(endsAt) <= new Date(startsAt)) return toast.error('End must be after start')

    setSaving(true)
    try {
      await createFlashSale({
        title: title.trim(),
        discount_percent: Number(percent),
        starts_at: startsAt,
        ends_at: endsAt,
        product_ids: selected.map(s => s.id),
      })
      toast.success('Flash sale created')
      setTitle(''); setPercent(20); setSelected([]); setSearch(''); setResults([])
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create flash sale')
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this flash sale?')) return
    try {
      await deleteFlashSale(id)
      toast.success('Flash sale deleted')
      setSales(list => list.filter(s => s.id !== id))
    } catch {
      toast.error('Could not delete')
    }
  }

  const field = 'w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors'

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">Flash Sales</h1>
        <p className="text-sm text-ink-tertiary mt-1">Schedule time-limited discounts. Prices drop automatically while a sale is live and revert when it ends.</p>
      </div>

      {/* Create form */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-black/5 p-5 mb-8 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-tertiary">New Flash Sale</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-secondary">Title</label>
            <input className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="Weekend Flash Sale" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary">Discount %</label>
            <input type="number" min={1} max={95} className={field} value={percent} onChange={e => setPercent(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary">Starts</label>
            <input type="datetime-local" className={field} value={startsAt} onChange={e => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary">Ends</label>
            <input type="datetime-local" className={field} value={endsAt} onChange={e => setEndsAt(e.target.value)} />
          </div>
        </div>

        {/* Product picker */}
        <div>
          <label className="text-xs font-semibold text-ink-secondary">Products</label>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {selected.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1.5 text-xs font-medium bg-ink text-white px-2.5 py-1 rounded-full">
                  {p.name}
                  <button type="button" onClick={() => setSelected(sel => sel.filter(x => x.id !== p.id))} className="hover:text-accent">×</button>
                </span>
              ))}
            </div>
          )}
          <input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products to add…" />
          {results.length > 0 && (
            <div className="mt-2 border border-border rounded-xl overflow-hidden divide-y divide-border max-h-56 overflow-y-auto">
              {results.map(p => {
                const on = selected.some(x => x.id === p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${on ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`}
                  >
                    <span className="text-ink line-clamp-1">{p.name}</span>
                    <span className={`text-xs font-bold ${on ? 'text-accent' : 'text-ink-tertiary'}`}>{on ? 'Remove' : 'Add'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className="text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-60" style={{ background: '#0F0F0F' }}>
          {saving ? 'Creating…' : 'Create Flash Sale'}
        </button>
      </form>

      {/* Existing sales */}
      {loading ? (
        <div className="py-20 flex justify-center"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 py-16 text-center">
          <p className="text-ink-secondary font-semibold">No flash sales yet.</p>
          <p className="text-sm text-ink-tertiary mt-1">Create one above to start a timed promotion.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map(s => {
            const st = saleStatus(s)
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-black/5 p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    <h3 className="font-bold text-ink truncate">{s.title}</h3>
                  </div>
                  <p className="text-sm text-ink-secondary mt-1">
                    <span className="font-bold text-accent">−{Number(s.discount_percent)}%</span>
                    {' · '}{s.product_count} product{Number(s.product_count) === 1 ? '' : 's'}
                  </p>
                  <p className="text-xs text-ink-tertiary mt-0.5">{fmt(s.starts_at)} → {fmt(s.ends_at)}</p>
                </div>
                <button onClick={() => remove(s.id)} className="text-sm font-bold px-4 py-2 rounded-xl border transition-all hover:opacity-70" style={{ borderColor: '#C0392B', color: '#C0392B' }}>
                  Delete
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
