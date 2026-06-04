import { useState, useEffect } from 'react'
import { getPopupSettings, updatePopupSettings } from '../../api/newsletterApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const field = 'w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors'

export default function AdminNewsletterPopup() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState(null)

  useEffect(() => {
    getPopupSettings()
      .then(r => setForm(r.data.data))
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false))
  }, [])

  const patch = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async (e) => {
    e?.preventDefault()
    setSaving(true)
    try {
      const { data } = await updatePopupSettings(form)
      setForm(data.data)
      toast.success('Saved')
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
        <h1 className="text-2xl font-black text-ink tracking-tight">Welcome Popup &amp; First-Order Discount</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          A delayed popup that asks visitors for their email and issues a unique single-use discount code. Each submission
          subscribes the email to your newsletter and creates a one-time coupon in the existing coupons table.
        </p>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border border-black/5 p-5 space-y-5 mb-6">
        {/* Enable + Delay */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Show the popup</p>
            <p className="text-xs text-ink-tertiary mt-0.5">Master toggle. Off → no popup ever appears.</p>
          </div>
          <button
            type="button"
            onClick={() => patch('enabled', form.enabled ? 0 : 1)}
            className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors shrink-0 mt-1"
            style={{ background: form.enabled ? '#16A34A' : '#D8D4CC' }}
          >
            <span className="inline-block h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: form.enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Show after (seconds)</label>
            <input type="number" min={0} max={120} className={field}
              value={form.delay_sec} onChange={e => patch('delay_sec', Number(e.target.value))} />
            <p className="text-[11px] text-ink-tertiary mt-1">How long after page load before the popup appears.</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Code expires in (days)</label>
            <input type="number" min={1} max={365} className={field}
              value={form.expires_days} onChange={e => patch('expires_days', Number(e.target.value))} />
          </div>
        </div>

        {/* Discount block */}
        <div className="pt-4 border-t border-black/5">
          <p className="text-sm font-bold text-ink mb-3">Discount</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Type</label>
              <select className={field}
                value={form.discount_type}
                onChange={e => patch('discount_type', e.target.value)}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Value</label>
              <input type="number" min={1} className={field}
                value={form.discount_value} onChange={e => patch('discount_value', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Min. order ($)</label>
              <input type="number" min={0} className={field}
                value={form.min_order} onChange={e => patch('min_order', Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="pt-4 border-t border-black/5 space-y-3">
          <p className="text-sm font-bold text-ink">Popup copy</p>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Title</label>
            <input className={field} value={form.title} onChange={e => patch('title', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Subtitle</label>
            <input className={field} value={form.subtitle} onChange={e => patch('subtitle', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Button label</label>
              <input className={field} value={form.cta_label} onChange={e => patch('cta_label', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Image URL (optional)</label>
              <input className={field} value={form.image_url} onChange={e => patch('image_url', e.target.value)} placeholder="https://… or leave blank" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-black/5">
          <button type="submit" disabled={saving} className="text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-60" style={{ background: '#0F0F0F' }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Mini preview */}
      <div className="bg-white rounded-2xl border border-black/5 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-tertiary mb-3">Preview</p>
        <div className="rounded-2xl overflow-hidden border border-black/5 max-w-sm mx-auto">
          {form.image_url && (
            <div style={{ aspectRatio: '16/9', background: '#EEECE6', overflow: 'hidden' }}>
              <img src={form.image_url.startsWith('http') ? form.image_url : `/MyShop/backend/${form.image_url}`}
                alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none' }} />
            </div>
          )}
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-2">Welcome</p>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl text-ink font-semibold leading-tight">
              {form.title || '—'}
            </h3>
            <p className="text-sm text-ink-secondary mt-1">{form.subtitle || '—'}</p>
            <div className="mt-3 h-10 rounded-xl border border-border bg-surface-alt" />
            <button type="button" className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white" style={{ background: '#0F0F0F' }}>
              {form.cta_label || 'Get my code'}
            </button>
            <p className="text-[10px] text-ink-tertiary mt-2">
              Will issue a single-use {form.discount_type === 'percent' ? `${form.discount_value}% off` : `$${form.discount_value} off`} code,
              valid {form.expires_days} days
              {form.min_order > 0 ? `, min order $${form.min_order}` : ''}.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-ink-tertiary mt-3 text-center">
          Each visitor sees this once per browser session. Clear sessionStorage to test again.
        </p>
      </div>
    </div>
  )
}
