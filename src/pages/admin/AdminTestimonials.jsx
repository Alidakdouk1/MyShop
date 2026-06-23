import { useState, useEffect, useCallback } from 'react'
import {
  getAdminTestimonials, getTestimonialCandidates,
  createAdminTestimonial, updateAdminTestimonial, deleteAdminTestimonial,
} from '../../api/testimonialApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const imgUrl = (src) =>
  src ? (src.startsWith('http') ? src : `/MyShop/backend/${src}`) : null

function Star({ filled }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill={filled ? '#F59E0B' : '#E4E1D9'}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.013 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  )
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="cursor-pointer p-0.5 hover:scale-110 transition-transform"
          aria-label={`${i} star${i === 1 ? '' : 's'}`}
        >
          <Star filled={i <= value} />
        </button>
      ))}
    </div>
  )
}

function emptyForm(overrides = {}) {
  return {
    id:         null,
    name:       '', location: '', photo_url: '',
    rating:     5, body: '',
    source_review_id: null,
    is_active:  1, sort_order: 0,
    ...overrides,
  }
}

export default function AdminTestimonials() {
  const toast = useToast()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(null)            // null = closed
  const [picker, setPicker]     = useState(false)           // import-from-review picker
  const [candidates, setCands]  = useState([])
  const [saving, setSaving]     = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    getAdminTestimonials()
      .then(r => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const openPicker = async () => {
    setPicker(true)
    try {
      const r = await getTestimonialCandidates()
      setCands(r.data.data || [])
    } catch { setCands([]) }
  }

  const importFromReview = (r) => {
    setForm(emptyForm({
      name:             r.reviewer_name || 'Customer',
      body:             r.body,
      rating:           r.rating,
      source_review_id: r.id,
    }))
    setPicker(false)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.body.trim()) {
      toast.error('Name and body are required')
      return
    }
    setSaving(true)
    try {
      if (form.id) {
        const r = await updateAdminTestimonial(form.id, form)
        setItems(list => list.map(t => t.id === form.id ? r.data.data : t))
        toast.success('Updated')
      } else {
        const r = await createAdminTestimonial(form)
        setItems(list => [r.data.data, ...list])
        toast.success('Added')
      }
      setForm(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const toggleActive = async (t) => {
    try {
      const r = await updateAdminTestimonial(t.id, { is_active: t.is_active ? 0 : 1 })
      setItems(list => list.map(x => x.id === t.id ? r.data.data : x))
    } catch { toast.error('Could not update') }
  }

  const reorder = async (t, dir) => {
    const next = (Number(t.sort_order) || 0) + dir
    try {
      const r = await updateAdminTestimonial(t.id, { sort_order: Math.max(0, next) })
      // Re-fetch so the list re-sorts by sort_order.
      setItems(list => list.map(x => x.id === t.id ? r.data.data : x).sort(
        (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || b.id - a.id
      ))
    } catch { toast.error('Could not reorder') }
  }

  const remove = async (t) => {
    if (!confirm(`Delete this testimonial from ${t.name}?`)) return
    try {
      await deleteAdminTestimonial(t.id)
      setItems(list => list.filter(x => x.id !== t.id))
      toast.success('Deleted')
    } catch { toast.error('Could not delete') }
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">Testimonials</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            Hand-pick the social proof that shows on the homepage.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openPicker}
            className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-white border border-border text-ink hover:bg-surface-alt transition-colors"
          >
            Import from review
          </button>
          <button
            onClick={() => setForm(emptyForm())}
            className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors"
          >
            + Add Testimonial
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Spinner size="xl" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
          <p className="text-lg font-bold text-ink">No testimonials yet.</p>
          <p className="text-sm text-ink-tertiary mt-1">Add one or import from your existing 5-star reviews.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(t => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-black/5 p-4"
              style={{ opacity: t.is_active ? 1 : 0.55 }}
            >
              <div className="flex items-start gap-3">
                {t.photo_url ? (
                  <img src={imgUrl(t.photo_url)} alt={t.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(t.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">{t.name}</p>
                  {t.location && <p className="text-xs text-ink-tertiary">{t.location}</p>}
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} filled={i <= t.rating} />)}
                  </div>
                </div>
                {!t.is_active && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-surface-alt text-ink-tertiary">Hidden</span>
                )}
                {t.source_review_id && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-50 text-emerald-700" title={`Imported from review #${t.source_review_id}`}>
                    Imported
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-secondary mt-3 line-clamp-3 leading-relaxed">{t.body}</p>
              <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1">
                  <button onClick={() => reorder(t, -1)} className="w-7 h-7 rounded-md hover:bg-surface-alt text-ink-tertiary hover:text-ink transition-colors flex items-center justify-center" title="Move up (lower sort_order)">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => reorder(t, 1)} className="w-7 h-7 rounded-md hover:bg-surface-alt text-ink-tertiary hover:text-ink transition-colors flex items-center justify-center" title="Move down">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <span className="text-[10px] text-ink-tertiary ml-1">order: {t.sort_order}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(t)} className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-surface-alt text-ink hover:bg-border transition-colors">
                    {t.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => setForm({ ...t })} className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-ink text-white hover:bg-ink/90 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => remove(t)} className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-accent-light text-accent hover:bg-accent hover:text-white transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Form modal ─────────────────────────────────────── */}
      {form && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setForm(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <form
            onSubmit={save}
            className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            style={{ animation: 'pop-in 0.22s var(--ease-out-back)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink text-lg">{form.id ? 'Edit testimonial' : 'New testimonial'}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center">
                <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
                <Field label="Location (optional)" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="Beirut, Lebanon" />
              </div>
              <Field label="Photo URL (optional)" value={form.photo_url} onChange={v => setForm(f => ({ ...f, photo_url: v }))} placeholder="https://…" />
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">Rating</label>
                <StarPicker value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">
                  Testimonial body <span className="text-ink-tertiary font-normal lowercase tracking-normal">({form.body.length}/1000)</span>
                </label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  maxLength={1000} rows={4} required
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
                    className="accent-ink"
                  />
                  <span className="text-ink-secondary">Show on homepage</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Order</label>
                  <input
                    type="number" min={0}
                    value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-20 text-sm rounded-lg px-2 py-1.5 outline-none border border-border bg-white text-ink focus:border-ink text-right"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-5 border-t border-border">
              <button type="button" onClick={() => setForm(null)} className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-surface-alt text-ink hover:bg-border transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Import picker ──────────────────────────────────── */}
      {picker && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPicker(false) }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink text-lg">Import from review</h2>
              <button onClick={() => setPicker(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center">
                <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-ink-tertiary mb-4">
              4+ star reviews with at least 40 chars of body. Already-imported ones are hidden.
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm text-ink-tertiary text-center py-8">No eligible reviews to import.</p>
            ) : (
              <div className="space-y-2">
                {candidates.map(c => (
                  <button
                    key={c.id}
                    onClick={() => importFromReview(c)}
                    className="w-full text-left p-3 rounded-xl border border-border hover:border-ink hover:bg-surface-alt transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-ink text-sm">{c.reviewer_name || 'Customer'}</p>
                      <div className="flex">{[1, 2, 3, 4, 5].map(i => <Star key={i} filled={i <= c.rating} />)}</div>
                    </div>
                    <p className="text-xs text-ink-tertiary mb-1">on {c.product_name}</p>
                    <p className="text-xs text-ink-secondary line-clamp-2">{c.body}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
      />
    </div>
  )
}
