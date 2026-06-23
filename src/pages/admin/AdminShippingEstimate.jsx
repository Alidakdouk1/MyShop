import { useState, useEffect, useMemo } from 'react'
import { getShippingEstimateAdmin, updateShippingEstimateAdmin } from '../../api/shippingApi'
import { computeDeliveryWindow, formatDeliveryWindow } from '../../lib/shippingEstimate'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const DEFAULTS = {
  enabled: 1,
  processing_days_min: 1, processing_days_max: 2,
  transit_days_min: 2,    transit_days_max: 4,
  cutoff_hour: 14, weekend_skip: 1,
}

export default function AdminShippingEstimate() {
  const toast = useToast()
  const [s, setS]           = useState(DEFAULTS)
  const [loading, setLoad]  = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getShippingEstimateAdmin()
      .then(r => setS(prev => ({ ...prev, ...r.data.data })))
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0)
            : e.target.type === 'number'   ? Number(e.target.value)
            : e.target.value
    setS(prev => ({ ...prev, [k]: v }))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await updateShippingEstimateAdmin(s)
      setS(prev => ({ ...prev, ...r.data.data }))
      toast.success('Saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally { setSaving(false) }
  }

  // Live preview: what would a shopper see right now? + at the boundary?
  const previewNow = useMemo(() => formatDeliveryWindow(computeDeliveryWindow(s)), [s])

  if (loading) return <div className="p-10 flex justify-center"><Spinner size="xl" /></div>

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">Shipping Estimate</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Controls the "Get it by …" badge on every product page. Tune to match your real fulfilment timing.
        </p>
      </div>

      {/* Live preview */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">Preview (right now)</p>
        {s.enabled ? (
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <svg className="w-5 h-5" style={{ color: '#15803D' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13l5 5v5h-3a2 2 0 11-4 0H10a2 2 0 11-4 0H3V7z" />
            </svg>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#15803D' }}>Estimated delivery</p>
              <p className="font-bold text-ink">Get it {previewNow || '…'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-tertiary">Disabled — no badge will appear on product pages.</p>
        )}
      </div>

      {/* Settings */}
      <form onSubmit={save} className="bg-white rounded-2xl border border-black/5 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-ink">Settings</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!s.enabled} onChange={set('enabled')} className="accent-ink" />
            <span className="text-sm font-semibold text-ink">{s.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        <fieldset className="border-t border-border pt-4 mb-4">
          <legend className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary px-2">Processing time</legend>
          <p className="text-xs text-ink-tertiary mb-3">How long from order placed to handed off to the carrier.</p>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Minimum days" min={0} value={s.processing_days_min} onChange={set('processing_days_min')} />
            <NumField label="Maximum days" min={0} value={s.processing_days_max} onChange={set('processing_days_max')} />
          </div>
        </fieldset>

        <fieldset className="border-t border-border pt-4 mb-4">
          <legend className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary px-2">Transit time</legend>
          <p className="text-xs text-ink-tertiary mb-3">How long the carrier needs to deliver after pickup.</p>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Minimum days" min={0} value={s.transit_days_min} onChange={set('transit_days_min')} />
            <NumField label="Maximum days" min={0} value={s.transit_days_max} onChange={set('transit_days_max')} />
          </div>
        </fieldset>

        <fieldset className="border-t border-border pt-4 mb-4">
          <legend className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary px-2">Cutoff & calendar</legend>
          <p className="text-xs text-ink-tertiary mb-3">Orders placed after the cutoff hour count as next-day for processing.</p>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Cutoff hour (0-23)" min={0} max={23} value={s.cutoff_hour} onChange={set('cutoff_hour')} hint={`Currently ${s.cutoff_hour}:00 (24-hour clock)`} />
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <input type="checkbox" checked={!!s.weekend_skip} onChange={set('weekend_skip')} className="accent-ink" />
                <span className="text-sm text-ink">Skip weekends (Sat &amp; Sun)</span>
              </label>
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-ink text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-ink/90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

function NumField({ label, hint, ...input }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">{label}</label>
      <input
        type="number"
        {...input}
        className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      />
      {hint && <p className="text-[10px] text-ink-tertiary mt-1.5">{hint}</p>}
    </div>
  )
}
