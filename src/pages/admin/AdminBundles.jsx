import { useState, useEffect, useCallback } from 'react'
import { getAdminBundles, createBundle, updateBundle, deleteBundle } from '../../api/bundleApi'
import { getProducts } from '../../api/productApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const field = 'w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors'

export default function AdminBundles() {
  const toast = useToast()
  const [bundles, setBundles] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle]     = useState('')
  const [price, setPrice]     = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [active, setActive]   = useState(true)
  const [selected, setSelected] = useState([])
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState([])
  const [saving, setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getAdminBundles()
      .then(r => setBundles(r.data.data || []))
      .catch(() => setBundles([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Debounced product search (variants excluded — bundle add-to-cart only works for simple products).
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      getProducts({ search: q, limit: 12 })
        .then(r => {
          const list = (r.data.data || []).filter(p => Number(p.variant_count || 0) === 0)
          setResults(list)
        })
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
    if (!(Number(price) > 0))    return toast.error('Bundle price must be greater than 0')
    if (selected.length < 2)    return toast.error('Pick at least 2 products')
    setSaving(true)
    try {
      await createBundle({
        title: title.trim(),
        bundle_price: Number(price),
        image_url: imageUrl.trim() || null,
        is_active: active ? 1 : 0,
        product_ids: selected.map(s => s.id),
      })
      toast.success('Bundle created')
      setTitle(''); setPrice(''); setImageUrl(''); setSelected([]); setSearch(''); setResults([])
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create bundle')
    } finally { setSaving(false) }
  }

  const toggleActive = async (b) => {
    const next = b.is_active ? 0 : 1
    setBundles(list => list.map(x => x.id === b.id ? { ...x, is_active: next } : x))
    try { await updateBundle(b.id, { is_active: next }) }
    catch { toast.error('Could not update'); load() }
  }

  const remove = async (b) => {
    if (!confirm(`Delete bundle "${b.title}"?`)) return
    try {
      await deleteBundle(b.id)
      toast.success('Bundle deleted')
      setBundles(list => list.filter(x => x.id !== b.id))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete')
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">Product Bundles</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Create "buy together for $X" deals. Bundles appear on each participating product page; the discount is applied
          when the shopper clicks <span className="font-semibold">Add Bundle to Cart</span>. Only simple (non-variant) products can be bundled.
        </p>
      </div>

      {/* Create form */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-black/5 p-5 mb-8 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-tertiary">New Bundle</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-secondary">Title</label>
            <input className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="Summer Outfit Bundle" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary">Bundle price (USD)</label>
            <input type="number" min="0" step="0.01" className={field} value={price} onChange={e => setPrice(e.target.value)} placeholder="59.99" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-ink-secondary">Image URL (optional)</label>
            <input className={field} value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://… or leave blank to show product thumbs" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-ink" />
            Active (show on product pages)
          </label>
        </div>

        {/* Product picker */}
        <div>
          <label className="text-xs font-semibold text-ink-secondary">Products (at least 2 simple products)</label>
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
          <input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products to add (variant products are excluded)…" />
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
          {saving ? 'Creating…' : 'Create Bundle'}
        </button>
      </form>

      {/* Existing bundles */}
      {loading ? (
        <div className="py-20 flex justify-center"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : bundles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 py-16 text-center">
          <p className="text-ink-secondary font-semibold">No bundles yet.</p>
          <p className="text-sm text-ink-tertiary mt-1">Create one above to start cross-selling.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-black/5 p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: b.is_active ? '#F0FDF4' : '#F4F4F4', color: b.is_active ? '#16A34A' : '#9C9894' }}>
                    {b.is_active ? 'Active' : 'Hidden'}
                  </span>
                  <h3 className="font-bold text-ink truncate">{b.title}</h3>
                </div>
                <p className="text-sm text-ink-secondary">
                  <span className="font-bold text-accent">${Number(b.bundle_price).toFixed(2)}</span>
                  {' · '}{b.item_count} product{Number(b.item_count) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(b)} className="text-sm font-bold px-4 py-2 rounded-xl border" style={{ borderColor: '#E4E1D9', color: '#0F0F0F' }}>
                  {b.is_active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => remove(b)} className="text-sm font-bold px-4 py-2 rounded-xl border transition-all hover:opacity-70" style={{ borderColor: '#C0392B', color: '#C0392B' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
