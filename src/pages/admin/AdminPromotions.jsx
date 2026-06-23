import { useState, useEffect, useCallback } from 'react'
import {
  getAdminPromotions, createAdminPromotion,
  updateAdminPromotion, deleteAdminPromotion,
  getAdminCategories, getAdminProducts,
} from '../../api/adminApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const blankBogo = () => ({
  id: null, name: '', type: 'bogo', is_active: 1,
  starts_at: '', ends_at: '',
  buy_quantity: 2, get_quantity: 1, discount_percent: 100,
  scope_type: 'all', scope_ids: [],
  min_subtotal: '', gift_product_id: '',
})

const blankGift = () => ({
  id: null, name: '', type: 'gift', is_active: 1,
  starts_at: '', ends_at: '',
  buy_quantity: '', get_quantity: '', discount_percent: '',
  scope_type: 'all', scope_ids: [],
  min_subtotal: 75, gift_product_id: '',
})

function describe(p) {
  if (p.type === 'bogo') {
    const scope = p.scope_type === 'all' ? 'any item'
                : p.scope_type === 'category' ? `${(p.scope_ids || []).length} category${(p.scope_ids || []).length === 1 ? '' : 'ies'}`
                : `${(p.scope_ids || []).length} product${(p.scope_ids || []).length === 1 ? '' : 's'}`
    return `Buy ${p.buy_quantity}, get ${p.get_quantity} at ${p.discount_percent}% off · ${scope}`
  }
  return `Spend $${Number(p.min_subtotal).toFixed(2)} → free product #${p.gift_product_id}`
}

export default function AdminPromotions() {
  const toast = useToast()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [cats,    setCats]    = useState([])
  const [prods,   setProds]   = useState([])

  const refresh = useCallback(() => {
    setLoading(true)
    getAdminPromotions()
      .then(r => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
    getAdminCategories().then(r => setCats(r.data.data || [])).catch(() => {})
    getAdminProducts({ per_page: 200 }).then(r => setProds(r.data.data || [])).catch(() => {})
  }, [refresh])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      // Tidy null-equivalents the backend will normalize, but cheaper bytes:
      if (payload.type === 'bogo') {
        delete payload.min_subtotal; delete payload.gift_product_id
      } else {
        delete payload.buy_quantity; delete payload.get_quantity
        delete payload.discount_percent; delete payload.scope_type; delete payload.scope_ids
      }
      if (form.id) {
        const r = await updateAdminPromotion(form.id, payload)
        setItems(list => list.map(p => p.id === form.id ? r.data.data : p))
        toast.success('Updated')
      } else {
        const r = await createAdminPromotion(payload)
        setItems(list => [r.data.data, ...list])
        toast.success('Created')
      }
      setForm(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const toggleActive = async (p) => {
    try {
      const r = await updateAdminPromotion(p.id, { is_active: p.is_active ? 0 : 1 })
      setItems(list => list.map(x => x.id === p.id ? r.data.data : x))
    } catch { toast.error('Could not update') }
  }

  const remove = async (p) => {
    if (!confirm(`Delete promotion "${p.name}"?`)) return
    try {
      await deleteAdminPromotion(p.id)
      setItems(list => list.filter(x => x.id !== p.id))
      toast.success('Deleted')
    } catch { toast.error('Could not delete') }
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">Promotions</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            Cart-side rules that fire automatically — no coupon code needed. Stack on top of coupons.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setForm(blankBogo())}
            className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors">
            + BOGO
          </button>
          <button onClick={() => setForm(blankGift())}
            className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-white border border-border text-ink hover:bg-surface-alt transition-colors">
            + Free Gift
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Spinner size="xl" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
          <p className="text-lg font-bold text-ink">No promotions yet.</p>
          <p className="text-sm text-ink-tertiary mt-1">Create a BOGO ("buy 2 get 1 50% off") or a free-gift offer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-tertiary border-b border-black/5">
                <th className="px-5 py-3">Name</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Rule</th>
                <th className="px-3 py-3">Window</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-b border-black/5 last:border-b-0">
                  <td className="px-5 py-3 font-semibold text-ink text-sm">{p.name}</td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                      style={{ background: p.type === 'gift' ? '#FEF3C7' : '#DCFCE7',
                               color:      p.type === 'gift' ? '#92400E' : '#15803D' }}>
                      {p.type === 'gift' ? 'Free Gift' : 'BOGO'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-ink-secondary">{describe(p)}</td>
                  <td className="px-3 py-3 text-[11px] text-ink-tertiary">
                    {p.starts_at || p.ends_at ? (
                      <>
                        {p.starts_at ? new Date(p.starts_at).toLocaleDateString() : 'Anytime'}
                        {' → '}
                        {p.ends_at ? new Date(p.ends_at).toLocaleDateString() : 'No end'}
                      </>
                    ) : 'Always on'}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => toggleActive(p)}
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                      style={{ background: p.is_active ? '#DCFCE7' : '#F3F4F6',
                               color:      p.is_active ? '#15803D' : '#6B7280' }}>
                      {p.is_active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setForm({ ...p })}
                      className="text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-ink text-white hover:bg-ink/90 transition-colors mr-2">
                      Edit
                    </button>
                    <button onClick={() => remove(p)}
                      className="text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-accent-light text-accent hover:bg-accent hover:text-white transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {form && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setForm(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <form onSubmit={save}
            className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            style={{ animation: 'pop-in 0.22s var(--ease-out-back)' }}>

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink text-lg">
                {form.id ? 'Edit' : 'New'} {form.type === 'gift' ? 'Free Gift' : 'BOGO'} Promotion
              </h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Internal name" value={form.name}
                onChange={v => setForm(f => ({ ...f, name: v }))} required
                placeholder="e.g. Summer T-shirt BOGO" />

              {form.type === 'bogo' ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Buy qty" type="number" min={1} value={form.buy_quantity}
                      onChange={v => setForm(f => ({ ...f, buy_quantity: Number(v) }))} required />
                    <Field label="Get qty" type="number" min={1} value={form.get_quantity}
                      onChange={v => setForm(f => ({ ...f, get_quantity: Number(v) }))} required />
                    <Field label="% off" type="number" min={1} max={100} value={form.discount_percent}
                      onChange={v => setForm(f => ({ ...f, discount_percent: Number(v) }))} required />
                  </div>
                  <div>
                    <Label>Applies to</Label>
                    <select value={form.scope_type}
                      onChange={e => setForm(f => ({ ...f, scope_type: e.target.value, scope_ids: [] }))}
                      className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink">
                      <option value="all">All products</option>
                      <option value="category">Specific categories</option>
                      <option value="products">Specific products</option>
                    </select>
                  </div>
                  {form.scope_type !== 'all' && (
                    <div>
                      <Label>{form.scope_type === 'category' ? 'Categories' : 'Products'}</Label>
                      <select multiple value={(form.scope_ids || []).map(String)}
                        onChange={e => setForm(f => ({
                          ...f,
                          scope_ids: Array.from(e.target.selectedOptions, o => Number(o.value)),
                        }))}
                        className="w-full text-sm rounded-xl px-3 py-2 outline-none border border-border bg-white text-ink focus:border-ink"
                        size={Math.min(6, form.scope_type === 'category' ? cats.length : prods.length)}>
                        {(form.scope_type === 'category' ? cats : prods).map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-ink-tertiary mt-1">Hold Ctrl/Cmd to select multiple.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Field label="Minimum cart subtotal ($)" type="number" min={1} step="0.01"
                    value={form.min_subtotal}
                    onChange={v => setForm(f => ({ ...f, min_subtotal: Number(v) }))} required />
                  <div>
                    <Label>Gift product</Label>
                    <select value={form.gift_product_id}
                      onChange={e => setForm(f => ({ ...f, gift_product_id: Number(e.target.value) }))}
                      className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink" required>
                      <option value="">Select a product…</option>
                      {prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <p className="text-[10px] text-ink-tertiary mt-1">Promo skips silently if the gift is out of stock at checkout.</p>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts (optional)" type="datetime-local" value={form.starts_at?.replace(' ', 'T').slice(0,16) || ''}
                  onChange={v => setForm(f => ({ ...f, starts_at: v ? v.replace('T', ' ') + ':00' : '' }))} />
                <Field label="Ends (optional)" type="datetime-local" value={form.ends_at?.replace(' ', 'T').slice(0,16) || ''}
                  onChange={v => setForm(f => ({ ...f, ends_at: v ? v.replace('T', ' ') + ':00' : '' }))} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
                  className="accent-ink" />
                <span className="text-sm text-ink-secondary">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-5 border-t border-border">
              <button type="button" onClick={() => setForm(null)} className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-surface-alt text-ink hover:bg-border transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Promotion'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Label({ children }) {
  return <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">{children}</label>
}

function Field({ label, value, onChange, ...rest }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        {...rest}
        className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
      />
    </div>
  )
}
