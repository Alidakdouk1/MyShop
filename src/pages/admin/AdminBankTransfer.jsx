import { useState, useEffect } from 'react'
import { getBankTransferSettings, updateBankTransferSettings } from '../../api/paymentApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const field = 'w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors font-mono'

export default function AdminBankTransfer() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState(null)

  useEffect(() => {
    getBankTransferSettings()
      .then(r => setForm(r.data.data))
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false))
  }, [])

  const patch = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async (e) => {
    e?.preventDefault()
    setSaving(true)
    try {
      const { data } = await updateBankTransferSettings(form)
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
        <h1 className="text-2xl font-black text-ink tracking-tight">Bank Transfer</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Show shoppers your bank details at checkout so they can pay by transfer. Each order shows a unique reference
          number (<span className="font-mono font-semibold">MS-&lt;order id&gt;</span>) — ask customers to include it so
          you can match the transfer to the right order in <span className="font-semibold">Admin → Orders</span>.
        </p>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
        {/* Enable toggle */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Enable bank transfer at checkout</p>
            <p className="text-xs text-ink-tertiary mt-0.5">
              When on, "Bank Transfer" appears as a payment option alongside Cash on Delivery.
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

        {/* Bank details */}
        <div className="pt-4 border-t border-black/5 space-y-3">
          <p className="text-sm font-bold text-ink">Your bank details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Bank name</label>
              <input className={field} value={form.bank_name} onChange={e => patch('bank_name', e.target.value)} placeholder="Bank of Beirut" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Account holder name</label>
              <input className={field} value={form.account_name} onChange={e => patch('account_name', e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Account number</label>
              <input className={field} value={form.account_number} onChange={e => patch('account_number', e.target.value)} placeholder="123-456789-001" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">IBAN</label>
              <input className={field} value={form.iban} onChange={e => patch('iban', e.target.value)} placeholder="LB62 0999 0000 …" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">SWIFT / BIC</label>
              <input className={field} value={form.swift} onChange={e => patch('swift', e.target.value)} placeholder="BABEBLB2XXX" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Currency note</label>
              <input className={field} value={form.currency_note} onChange={e => patch('currency_note', e.target.value)} placeholder="USD / LBP / fresh USD" />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="pt-4 border-t border-black/5">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-tertiary block mb-1">Instructions for the customer</label>
          <textarea rows={3}
            className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
            value={form.instructions}
            onChange={e => patch('instructions', e.target.value)}
            placeholder="Tell them anything they need to know — e.g., 'Send a screenshot of the transfer to our WhatsApp +961… to speed up confirmation.'" />
        </div>

        <div className="pt-4 border-t border-black/5">
          <button type="submit" disabled={saving} className="text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-60" style={{ background: '#0F0F0F' }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div className="mt-5 text-xs text-ink-tertiary leading-relaxed">
        <p className="font-semibold text-ink-secondary">Tip:</p>
        Once a customer places a bank-transfer order, you'll see it in <span className="font-semibold">Admin → Orders</span> with a yellow
        "Awaiting payment" pill. When the money lands in your account, click <span className="font-semibold">Mark Paid</span> on the row —
        the order will move from "Pending" to confirmed and you can ship it.
      </div>
    </div>
  )
}
