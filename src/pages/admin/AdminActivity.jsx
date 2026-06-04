import { useState, useEffect } from 'react'
import { getActivitySettings, updateActivitySettings, getRecentActivity } from '../../api/activityApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const field = 'w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors'

export default function AdminActivity() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState(null)
  const [preview, setPreview] = useState([])

  useEffect(() => {
    Promise.all([getActivitySettings(), getRecentActivity()])
      .then(([s, r]) => {
        setForm(s.data.data)
        setPreview(r.data.data?.items || [])
      })
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false))
  }, [])

  const patch = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async (e) => {
    e?.preventDefault()
    setSaving(true)
    try {
      const { data } = await updateActivitySettings(form)
      setForm(data.data)
      toast.success('Saved')
      // Refresh preview list so changes (max_age, items, city) show immediately
      getRecentActivity().then(r => setPreview(r.data.data?.items || [])).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally { setSaving(false) }
  }

  if (loading || !form) {
    return <div className="py-20 flex justify-center"><Spinner size="xl" className="text-ink-tertiary" /></div>
  }

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">Live Activity Ticker</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Controls the bottom-left bubble that shows real recent purchases (first name only) for social proof. The data
          is pulled live from your orders — no fake content.
        </p>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border border-black/5 p-5 space-y-5 mb-6">
        {/* Enable toggle */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Show the ticker</p>
            <p className="text-xs text-ink-tertiary mt-0.5">Turn the bubble on or off everywhere on the storefront.</p>
          </div>
          <button
            type="button"
            onClick={() => patch('enabled', form.enabled ? 0 : 1)}
            className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors shrink-0 mt-1"
            style={{ background: form.enabled ? '#16A34A' : '#D8D4CC' }}
            aria-label="Toggle ticker"
          >
            <span className="inline-block h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: form.enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
          </button>
        </div>

        {/* Show city toggle */}
        <div className="flex items-start justify-between gap-3 pt-4 border-t border-black/5">
          <div>
            <p className="text-sm font-bold text-ink">Show the customer's city</p>
            <p className="text-xs text-ink-tertiary mt-0.5">Off → bubble reads "Sara bought …". On → "Sara from Beirut bought …". First name only either way.</p>
          </div>
          <button
            type="button"
            onClick={() => patch('show_city', form.show_city ? 0 : 1)}
            className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors shrink-0 mt-1"
            style={{ background: form.show_city ? '#16A34A' : '#D8D4CC' }}
            aria-label="Toggle city"
          >
            <span className="inline-block h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: form.show_city ? 'translateX(22px)' : 'translateX(2px)' }} />
          </button>
        </div>

        {/* Numeric controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Time window (hours)</label>
            <input type="number" min={1} max={720} className={field}
              value={form.max_age_hours}
              onChange={e => patch('max_age_hours', Number(e.target.value))} />
            <p className="text-[11px] text-ink-tertiary mt-1">Only orders within this many hours appear.</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Items to cycle</label>
            <input type="number" min={1} max={50} className={field}
              value={form.max_items}
              onChange={e => patch('max_items', Number(e.target.value))} />
            <p className="text-[11px] text-ink-tertiary mt-1">How many recent orders the ticker rotates through.</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Bubble shows for (sec)</label>
            <input type="number" min={2} max={30} className={field}
              value={form.show_duration_sec}
              onChange={e => patch('show_duration_sec', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Gap between bubbles (sec)</label>
            <input type="number" min={1} max={20} className={field}
              value={form.gap_sec}
              onChange={e => patch('gap_sec', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">First-bubble delay (sec)</label>
            <input type="number" min={0} max={30} className={field}
              value={form.first_delay_sec}
              onChange={e => patch('first_delay_sec', Number(e.target.value))} />
            <p className="text-[11px] text-ink-tertiary mt-1">How long to wait after a page loads before the first bubble appears.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-black/5">
          <button type="submit" disabled={saving} className="text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-60" style={{ background: '#0F0F0F' }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Preview list */}
      <div className="bg-white rounded-2xl border border-black/5 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-tertiary mb-3">
          Currently in rotation ({preview.length})
        </h2>
        {preview.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            No orders within the last {form.max_age_hours} hours. Place a test order or widen the time window above.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {preview.map((p, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <img
                  src={p.product_image && (p.product_image.startsWith('http') ? p.product_image : `/MyShop/backend/${p.product_image}`)}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover bg-surface-alt shrink-0"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-semibold truncate">
                    {p.customer_name}{form.show_city && p.customer_city ? ` from ${p.customer_city}` : ''} bought {p.product_name}
                  </p>
                  <p className="text-xs text-ink-tertiary">
                    {new Date(String(p.created_at).replace(' ', 'T')).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
