import { useState, useEffect } from 'react'
import { getWhishSettings, updateWhishSettings } from '../../api/paymentApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const field = 'w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors'

export default function AdminWhish() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState(null)

  useEffect(() => {
    getWhishSettings()
      .then(r => setForm(r.data.data))
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false))
  }, [])

  const patch = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async (e) => {
    e?.preventDefault()
    setSaving(true)
    try {
      const { data } = await updateWhishSettings(form)
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
        <h1 className="text-2xl font-black text-ink tracking-tight">Whish Money</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Show shoppers your Whish phone number at checkout so they can pay directly from their Whish app. Each order gets a
          unique reference (<span className="font-mono font-semibold">MS-&lt;order id&gt;</span>) the customer adds to the
          Whish "note" field — that's how you match the transfer to the order in <span className="font-semibold">Admin → Orders</span>.
        </p>
        <p className="text-xs text-ink-tertiary mt-2">
          The phone number you enter must be the one registered to your Whish account. Whish transfers between users are free and instant.
        </p>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
        {/* Enable toggle */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Enable Whish Money at checkout</p>
            <p className="text-xs text-ink-tertiary mt-0.5">
              When on, "Whish Money" appears as a payment option alongside Cash on Delivery.
            </p>
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

        {/* Fields */}
        <div className="pt-4 border-t border-black/5 space-y-3">
          <p className="text-sm font-bold text-ink">Your Whish details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Whish phone number</label>
              <input className={`${field} font-mono`} value={form.whish_phone}
                onChange={e => patch('whish_phone', e.target.value)}
                placeholder="+961 76 820 617" />
              <p className="text-[11px] text-ink-tertiary mt-1">Use international format including +961.</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Registered name (optional)</label>
              <input className={field} value={form.whish_name}
                onChange={e => patch('whish_name', e.target.value)}
                placeholder="Name on your Whish account" />
              <p className="text-[11px] text-ink-tertiary mt-1">Reassures customers they're sending to the right person.</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Currency note</label>
              <input className={field} value={form.currency_note}
                onChange={e => patch('currency_note', e.target.value)}
                placeholder="USD / Fresh USD / LBP" />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="pt-4 border-t border-black/5">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Instructions for the customer</label>
          <textarea rows={4}
            className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
            value={form.instructions}
            onChange={e => patch('instructions', e.target.value)} />
          <p className="text-[11px] text-ink-tertiary mt-1">Step-by-step instructions shown under the Whish details.</p>
        </div>

        <div className="pt-4 border-t border-black/5">
          <button type="submit" disabled={saving} className="text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-60" style={{ background: '#0F0F0F' }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div className="mt-5 text-xs text-ink-tertiary leading-relaxed">
        <p className="font-semibold text-ink-secondary">Tip:</p>
        Whish-paid orders show up in <span className="font-semibold">Admin → Orders</span> with a yellow "Awaiting payment" pill. Once
        the money appears in your Whish app (usually within seconds), click <span className="font-semibold">Mark Paid</span> on the row.
      </div>
    </div>
  )
}
